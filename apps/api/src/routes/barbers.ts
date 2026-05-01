import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

const barberSchema = z.object({
  name: z.string().min(1),
  specialty: z.string().optional(),
  avatar: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  active: z.boolean().optional(),
  serviceType: z.enum(['barberia', 'salon']).optional(),
});

// Public: list active barbers for a tenant
router.get('/public/:tenantSlug', asyncHandler(async (req: Request, res: Response) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.tenantSlug } });
  if (!tenant) {
    res.status(404).json({ success: false, error: 'Negocio no encontrado' });
    return;
  }

  const { serviceType } = req.query;
  const barbers = await prisma.barber.findMany({
    where: {
      tenantId: tenant.id,
      active: true,
      ...(typeof serviceType === 'string' ? { serviceType } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ success: true, data: barbers });
}));

// Admin: list all barbers
router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const barbers = await prisma.barber.findMany({
    where: { tenantId: req.auth!.tenantId },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ success: true, data: barbers });
}));

// Admin: create barber
router.post('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const parsed = barberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const barber = await prisma.barber.create({
    data: { ...parsed.data, tenantId: req.auth!.tenantId },
  });

  res.status(201).json({ success: true, data: barber });
}));

// Admin: update barber
router.patch('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.barber.findFirst({
    where: { id: req.params.id, tenantId: req.auth!.tenantId },
  });

  if (!existing) {
    res.status(404).json({ success: false, error: 'Barbero no encontrado' });
    return;
  }

  const parsed = barberSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const barber = await prisma.barber.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.json({ success: true, data: barber });
}));

// Admin: delete barber
router.delete('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.barber.findFirst({
    where: { id: req.params.id, tenantId: req.auth!.tenantId },
  });

  if (!existing) {
    res.status(404).json({ success: false, error: 'Barbero no encontrado' });
    return;
  }

  await prisma.barber.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: null });
}));

export default router;
