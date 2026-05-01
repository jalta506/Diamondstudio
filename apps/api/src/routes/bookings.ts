import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

const createBookingSchema = z.object({
  tenantSlug: z.string(),
  barberId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().min(1),
  clientPhone: z.string().min(8),
  notes: z.string().optional(),
});

// Public: create booking (client self-booking)
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { tenantSlug, barberId, date, time, clientName, clientPhone, notes } = parsed.data;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    res.status(404).json({ success: false, error: 'Negocio no encontrado' });
    return;
  }

  const barber = await prisma.barber.findFirst({
    where: { id: barberId, tenantId: tenant.id, active: true },
  });
  if (!barber) {
    res.status(404).json({ success: false, error: 'Barbero no disponible' });
    return;
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        tenantId: tenant.id,
        barberId,
        date: new Date(date + 'T00:00:00Z'),
        time,
        clientName,
        clientPhone,
        notes,
      },
      include: { barber: { select: { name: true } } },
    });

    res.status(201).json({ success: true, data: booking });
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ success: false, error: 'Ese horario ya está reservado' });
      return;
    }
    throw err;
  }
}));

// Public: get bookings for a tenant (client can check their booking by phone)
router.get('/public/:tenantSlug', asyncHandler(async (req: Request, res: Response) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.tenantSlug } });
  if (!tenant) {
    res.status(404).json({ success: false, error: 'Negocio no encontrado' });
    return;
  }

  const { date, phone } = req.query;
  const where: Record<string, unknown> = { tenantId: tenant.id };

  if (date && typeof date === 'string') {
    where.date = new Date(date + 'T00:00:00Z');
  }
  if (phone && typeof phone === 'string') {
    where.clientPhone = phone;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { barber: { select: { name: true, avatar: true } } },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });

  res.json({ success: true, data: bookings });
}));

// Admin: list bookings
router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { date, barberId, status } = req.query;
  const where: Record<string, unknown> = { tenantId: req.auth!.tenantId };

  if (date && typeof date === 'string') {
    where.date = new Date(date + 'T00:00:00Z');
  }
  if (barberId && typeof barberId === 'string') {
    where.barberId = barberId;
  }
  if (status && typeof status === 'string') {
    where.status = status;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { barber: { select: { name: true, avatar: true, color: true } } },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });

  res.json({ success: true, data: bookings });
}));

// Admin: create booking on behalf of client
router.post('/admin', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schema = createBookingSchema.omit({ tenantSlug: true });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { barberId, date, time, clientName, clientPhone, notes } = parsed.data;

  const barber = await prisma.barber.findFirst({
    where: { id: barberId, tenantId: req.auth!.tenantId, active: true },
  });
  if (!barber) {
    res.status(404).json({ success: false, error: 'Barbero no disponible' });
    return;
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        tenantId: req.auth!.tenantId,
        barberId,
        date: new Date(date + 'T00:00:00Z'),
        time,
        clientName,
        clientPhone,
        notes,
        createdBy: req.auth!.adminId,
      },
      include: { barber: { select: { name: true } } },
    });

    res.status(201).json({ success: true, data: booking });
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ success: false, error: 'Ese horario ya está reservado' });
      return;
    }
    throw err;
  }
}));

// Admin: update booking status
router.patch('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.booking.findFirst({
    where: { id: req.params.id, tenantId: req.auth!.tenantId },
  });

  if (!existing) {
    res.status(404).json({ success: false, error: 'Reserva no encontrada' });
    return;
  }

  const schema = z.object({
    status: z.enum(['confirmed', 'cancelled', 'completed', 'no-show']).optional(),
    notes: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { barber: { select: { name: true } } },
  });

  res.json({ success: true, data: booking });
}));

export default router;
