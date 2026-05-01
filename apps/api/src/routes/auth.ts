import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });
    return;
  }

  const { email, password } = parsed.data;
  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
    return;
  }

  const token = jwt.sign(
    { adminId: admin.id, tenantId: admin.tenantId, role: admin.role },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' }
  );

  res.json({
    success: true,
    data: {
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    },
  });
}));

router.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.auth!.adminId },
    select: { id: true, name: true, email: true, role: true, tenantId: true },
  });

  if (!admin) {
    res.status(404).json({ success: false, error: 'Admin no encontrado' });
    return;
  }

  res.json({ success: true, data: admin });
}));

export default router;
