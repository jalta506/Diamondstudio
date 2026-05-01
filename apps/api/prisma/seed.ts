import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'diamond-studio' },
    update: {},
    create: {
      name: 'Diamond Studio',
      slug: 'diamond-studio',
      phone: '+50688888888',
      address: 'Heredia, Costa Rica',
      timezone: 'America/Costa_Rica',
    },
  });

  console.log('Tenant created:', tenant.name);

  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@diamondstudio.cr' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@diamondstudio.cr',
      password: adminPassword,
      name: 'Administrador',
      role: 'admin',
    },
  });

  console.log('Admin created:', admin.email);

  const weekdays = [1, 2, 3, 4, 5];
  const saturday = [6];
  const weekdaySlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const saturdaySlots = ['09:00', '10:00', '11:00', '12:00'];

  const barbersData = [
    {
      name: 'Carlos Méndez',
      specialty: 'Cortes clásicos y degradados',
      avatar: '✂️',
      color: '#D4AF37',
      serviceType: 'barberia',
    },
    {
      name: 'Andrés Vargas',
      specialty: 'Barba y diseños',
      avatar: '🪒',
      color: '#8B6914',
      serviceType: 'barberia',
    },
    {
      name: 'Luis Bermúdez',
      specialty: 'Cortes modernos y coloración',
      avatar: '💈',
      color: '#B8860B',
      serviceType: 'barberia',
    },
    {
      name: 'María Jiménez',
      specialty: 'Manicure y nail art',
      avatar: '💅',
      color: '#B76E79',
      serviceType: 'salon',
    },
    {
      name: 'Sofía Rodríguez',
      specialty: 'Pedicure y gel',
      avatar: '✨',
      color: '#C9A8B4',
      serviceType: 'salon',
    },
  ];

  for (const data of barbersData) {
    const existing = await prisma.barber.findFirst({
      where: { tenantId: tenant.id, name: data.name },
    });

    const barber = existing
      ? await prisma.barber.update({ where: { id: existing.id }, data })
      : await prisma.barber.create({ data: { ...data, tenantId: tenant.id } });

    console.log('Barber upserted:', barber.name);

    await prisma.schedule.deleteMany({ where: { barberId: barber.id } });

    const scheduleRows = [
      ...weekdays.map((day) => ({ barberId: barber.id, dayOfWeek: day, slots: weekdaySlots })),
      ...saturday.map((day) => ({ barberId: barber.id, dayOfWeek: day, slots: saturdaySlots })),
    ];

    await prisma.schedule.createMany({ data: scheduleRows });
    console.log(`  Schedule created for ${barber.name}`);
  }

  console.log('\nSeed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
