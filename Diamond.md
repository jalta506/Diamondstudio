Diamondstudio/
├── CLAUDE.md
├── README.md
├── package.json           ← root workspace config
├── apps/
│   ├── api/               ← Express backend
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── barbers.ts
│   │   │   │   ├── bookings.ts
│   │   │   │   └── schedules.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   └── tenantScope.ts
│   │   │   └── lib/
│   │   │       └── prisma.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/               ← React frontend
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── pages/
│       │   │   ├── BookingFlow.tsx
│       │   │   ├── AdminLogin.tsx
│       │   │   ├── AdminDashboard.tsx
│       │   │   ├── AdminBarbers.tsx
│       │   │   ├── AdminSchedule.tsx
│       │   │   └── AdminBookings.tsx
│       │   ├── components/
│       │   │   ├── DatePicker.tsx
│       │   │   ├── TimeSlots.tsx
│       │   │   ├── BarberCard.tsx
│       │   │   └── BookingConfirmation.tsx
│       │   └── lib/
│       │       └── api.ts
│       ├── public/
│       │   ├── manifest.json
│       │   └── sw.js
│       ├── index.html
│       ├── package.json
│       ├── tailwind.config.js
│       ├── vite.config.ts
│       └── tsconfig.json
└── .gitignore
