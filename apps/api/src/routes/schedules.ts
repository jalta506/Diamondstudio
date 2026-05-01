import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

const slotsSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  slots: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
});

const overrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
  reason: z.string().optional(),
});

// Public: get available slots for a barber on a date
router.get('/available/:barberId', asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    res.status(400).json({ success: false, error: 'Parámetro date requerido (YYYY-MM-DD)' });
    return;
  }

  const barber = await prisma.barber.findUnique({ where: { id: req.params.barberId } });
  if (!barber?.active) {
    res.status(404).json({ success: false, error: 'Barbero no disponible' });
    return;
  }

  const dateVal = new Date(date + 'T00:00:00Z');
  const dayOfWeek = new Date(date + 'T12:00:00Z').getUTCDay();

  // 1. Check DailySchedule first (highest priority)
  const dailySchedule = await prisma.dailySchedule.findUnique({
    where: { barberId_date: { barberId: barber.id, date: dateVal } },
  });

  let allSlots: string[];
  let confirmed: boolean;

  if (dailySchedule?.status === 'absent') {
    // Barber is absent — no slots at all
    res.json({ success: true, data: { slots: [], date, barberId: barber.id, confirmed: true } });
    return;
  } else if (dailySchedule?.status === 'confirmed') {
    allSlots = dailySchedule.slots;
    confirmed = true;
  } else {
    // No DailySchedule or status='pending' — fall back to ScheduleOverride then Schedule
    const override = await prisma.scheduleOverride.findFirst({
      where: { barberId: barber.id, date: dateVal },
    });

    if (override) {
      allSlots = override.slots;
    } else {
      const schedule = await prisma.schedule.findFirst({
        where: { barberId: barber.id, dayOfWeek },
      });
      allSlots = schedule?.slots ?? [];
    }
    confirmed = false;
  }

  const bookings = await prisma.booking.findMany({
    where: {
      barberId: barber.id,
      date: dateVal,
      status: { in: ['confirmed', 'completed'] },
    },
    select: { time: true },
  });

  const booked = new Set(bookings.map((b) => b.time));
  const available = allSlots.filter((s) => !booked.has(s));

  res.json({ success: true, data: { slots: available, date, barberId: barber.id, confirmed } });
}));

// Admin: get weekly schedule for a barber
router.get('/:barberId/weekly', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const barber = await prisma.barber.findFirst({
    where: { id: req.params.barberId, tenantId: req.auth!.tenantId },
  });
  if (!barber) {
    res.status(404).json({ success: false, error: 'Barbero no encontrado' });
    return;
  }

  const schedules = await prisma.schedule.findMany({
    where: { barberId: barber.id },
    orderBy: { dayOfWeek: 'asc' },
  });

  res.json({ success: true, data: schedules });
}));

// Admin: set default weekly schedule for a barber (replaces all)
router.put('/:barberId/weekly', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const barber = await prisma.barber.findFirst({
    where: { id: req.params.barberId, tenantId: req.auth!.tenantId },
  });
  if (!barber) {
    res.status(404).json({ success: false, error: 'Barbero no encontrado' });
    return;
  }

  const parsed = z.array(slotsSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  await prisma.schedule.deleteMany({ where: { barberId: barber.id } });
  await prisma.schedule.createMany({
    data: parsed.data.map((d) => ({ barberId: barber.id, ...d })),
  });

  res.json({ success: true, data: null });
}));

// Admin: list overrides for a barber
router.get('/:barberId/overrides', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const barber = await prisma.barber.findFirst({
    where: { id: req.params.barberId, tenantId: req.auth!.tenantId },
  });
  if (!barber) {
    res.status(404).json({ success: false, error: 'Barbero no encontrado' });
    return;
  }

  const overrides = await prisma.scheduleOverride.findMany({
    where: { barberId: barber.id },
    orderBy: { date: 'asc' },
  });

  res.json({ success: true, data: overrides });
}));

// Admin: upsert override for a specific date
router.post('/:barberId/overrides', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const barber = await prisma.barber.findFirst({
    where: { id: req.params.barberId, tenantId: req.auth!.tenantId },
  });
  if (!barber) {
    res.status(404).json({ success: false, error: 'Barbero no encontrado' });
    return;
  }

  const parsed = overrideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const dateVal = new Date(parsed.data.date + 'T00:00:00Z');
  const existing = await prisma.scheduleOverride.findFirst({
    where: { barberId: barber.id, date: dateVal },
  });

  const override = existing
    ? await prisma.scheduleOverride.update({
        where: { id: existing.id },
        data: { slots: parsed.data.slots, reason: parsed.data.reason },
      })
    : await prisma.scheduleOverride.create({
        data: { barberId: barber.id, date: dateVal, slots: parsed.data.slots, reason: parsed.data.reason },
      });

  res.json({ success: true, data: override });
}));

// Admin: delete an override
router.delete('/:barberId/overrides/:overrideId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const barber = await prisma.barber.findFirst({
    where: { id: req.params.barberId, tenantId: req.auth!.tenantId },
  });
  if (!barber) {
    res.status(404).json({ success: false, error: 'Barbero no encontrado' });
    return;
  }

  const override = await prisma.scheduleOverride.findFirst({
    where: { id: req.params.overrideId, barberId: barber.id },
  });
  if (!override) {
    res.status(404).json({ success: false, error: 'Excepción no encontrada' });
    return;
  }

  await prisma.scheduleOverride.delete({ where: { id: override.id } });
  res.json({ success: true, data: null });
}));

export default router;
