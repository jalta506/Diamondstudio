import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      tenant?: { id: string; slug: string; name: string; timezone: string };
    }
  }
}

export async function resolveTenantBySlug(req: Request, res: Response, next: NextFunction) {
  const slug = req.params.tenantSlug ?? req.query.tenantSlug as string;
  if (!slug) {
    res.status(400).json({ success: false, error: 'tenantSlug requerido' });
    return;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, timezone: true },
  });

  if (!tenant) {
    res.status(404).json({ success: false, error: 'Negocio no encontrado' });
    return;
  }

  req.tenant = tenant;
  next();
}
