import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

// Costa Rica is UTC-6, no DST
function crDateStr(offsetDays = 0): string {
  const ms = Date.now() - 6 * 3600 * 1000 + offsetDays * 86400 * 1000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00Z').getUTCDay();
}

// Admin: count unconfirmed barbers for today and tomorrow
router.get(
  '/unconfirmed',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.auth!;
    const todayStr = crDateStr(0);
    const tomorrowStr = crDateStr(1);

    const barbers = await prisma.barber.findMany({
      where: { tenantId, active: true },
      include: {
        schedule: true,
        dailySchedules: {
          where: {
            date: {
              in: [new Date(todayStr + 'T00:00:00Z'), new Date(tomorrowStr + 'T00:00:00Z')],
            },
          },
        },
      },
    });

    function unconfirmedFor(dateStr: string) {
      const dow = dayOfWeek(dateStr);
      return barbers.filter((b) => {
        const worksToday = b.schedule.some((s) => s.dayOfWeek === dow && s.slots.length > 0);
        if (!worksToday) return false;
        const ds = b.dailySchedules.find(
          (d) => new Date(d.date).toISOString().slice(0, 10) === dateStr
        );
        return !ds || ds.status === 'pending';
      });
    }

    const todayUnconfirmed = unconfirmedFor(todayStr);
    const tomorrowUnconfirmed = unconfirmedFor(tomorrowStr);

    res.json({
      success: true,
      data: {
        today: {
          date: todayStr,
          count: todayUnconfirmed.length,
          barbers: todayUnconfirmed.map((b) => ({ id: b.id, name: b.name })),
        },
        tomorrow: {
          date: tomorrowStr,
          count: tomorrowUnconfirmed.length,
          barbers: tomorrowUnconfirmed.map((b) => ({ id: b.id, name: b.name })),
        },
      },
    });
  })
);

// Admin: get all active barbers + their daily schedule info for a specific date
router.get(
  '/date/:date',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.auth!;
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ success: false, error: 'Fecha inválida (YYYY-MM-DD)' });
      return;
    }

    const dow = dayOfWeek(date);
    const dateVal = new Date(date + 'T00:00:00Z');

    const barbers = await prisma.barber.findMany({
      where: { tenantId, active: true },
      include: {
        schedule: { where: { dayOfWeek: dow } },
        dailySchedules: { where: { date: dateVal } },
      },
      orderBy: { name: 'asc' },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId,
        date: dateVal,
        status: { in: ['confirmed', 'completed'] },
      },
      select: { id: true, barberId: true, time: true, clientName: true, clientPhone: true },
    });

    const bookingsByBarber = bookings.reduce<Record<string, typeof bookings>>((acc, b) => {
      if (!acc[b.barberId]) acc[b.barberId] = [];
      acc[b.barberId].push(b);
      return acc;
    }, {});

    const result = barbers.map((b) => ({
      barber: { id: b.id, name: b.name, specialty: b.specialty, color: b.color },
      defaultSlots: b.schedule[0]?.slots ?? [],
      dailySchedule: b.dailySchedules[0] ?? null,
      bookings: bookingsByBarber[b.id] ?? [],
    }));

    res.json({ success: true, data: result });
  })
);

const upsertSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'absent']),
  slots: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
  notes: z.string().optional(),
  cancelBookingIds: z.array(z.string()).optional(),
});

// Admin: upsert daily schedule for a barber on a specific date
router.put(
  '/:barberId/:date',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, adminId } = req.auth!;
    const { barberId, date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ success: false, error: 'Fecha inválida (YYYY-MM-DD)' });
      return;
    }

    const barber = await prisma.barber.findFirst({ where: { id: barberId, tenantId } });
    if (!barber) {
      res.status(404).json({ success: false, error: 'Barbero no encontrado' });
      return;
    }

    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message });
      return;
    }

    const { status, slots, notes, cancelBookingIds } = parsed.data;
    const dateVal = new Date(date + 'T00:00:00Z');

    let cancelledCount = 0;
    if (cancelBookingIds && cancelBookingIds.length > 0) {
      const result = await prisma.booking.updateMany({
        where: { id: { in: cancelBookingIds }, barberId, date: dateVal, status: 'confirmed' },
        data: { status: 'cancelled' },
      });
      cancelledCount = result.count;
    }

    const isActioned = status === 'confirmed' || status === 'absent';
    const ds = await prisma.dailySchedule.upsert({
      where: { barberId_date: { barberId, date: dateVal } },
      create: {
        barberId,
        date: dateVal,
        status,
        slots,
        notes,
        confirmedBy: isActioned ? adminId : null,
        confirmedAt: isActioned ? new Date() : null,
      },
      update: {
        status,
        slots,
        notes,
        confirmedBy: isActioned ? adminId : null,
        confirmedAt: isActioned ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true, data: { dailySchedule: ds, cancelledCount } });
  })
);

export default router;
