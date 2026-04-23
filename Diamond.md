# CLAUDE.md — Diamondstudio Booking Platform

## What this project is

A multi-tenant SaaS booking platform for barbershops and salons in Costa Rica. The first customer is **Diamond Studio** in Heredia. The platform replaces manual WhatsApp-based booking with a web app that the receptionist uses to enter appointments, and clients can self-book via a PWA (installed from a QR code at reception).

### Business context
- The receptionist currently takes WhatsApp messages and enters them into a wellness software app, which sends WhatsApp confirmations. We're replacing that software.
- Clients don't need accounts — they book with just name + phone number.
- The system must send WhatsApp confirmations (Phase 1: via the receptionist manually; Phase 2: automated via Meta Cloud API / Twilio).
- This will be sold as a subscription SaaS to other barbershops/salons. Multi-tenancy is required from day one.
- All UI must be in **Spanish** (Costa Rican Spanish).

## Tech stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite + Tailwind CSS 3 | PWA-enabled for "Add to Home Screen" via QR |
| Backend | Node.js + Express | REST API, JSON responses |
| Database | PostgreSQL + Prisma ORM | Multi-tenant via `tenantId` on all tables |
| Auth | Simple JWT for admin portal | No auth needed for client booking |
| Hosting target | Railway or Fly.io | NOT EKS — keep costs under $20/mo for 1 tenant |
| WhatsApp (future) | Meta Cloud API or Twilio | Phase 2 — not MVP |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Client PWA                      │
│  (React + Tailwind, installable via QR)          │
│  /book/:tenantSlug → public booking flow         │
│  No login required                               │
└──────────────┬──────────────────────────────────┘
               │ REST API
┌──────────────▼──────────────────────────────────┐
│              Admin Dashboard                      │
│  /admin → login required (JWT)                   │
│  Manage barbers, schedules, view bookings        │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│           Node.js + Express API                   │
│  /api/v1/tenants                                 │
│  /api/v1/barbers                                 │
│  /api/v1/schedules                               │
│  /api/v1/bookings                                │
│  /api/v1/auth                                    │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│         PostgreSQL (via Prisma)                    │
│  Row-level multi-tenancy (tenantId FK)           │
└─────────────────────────────────────────────────┘
```

## Database schema (Prisma models)

```prisma
model Tenant {
  id        String   @id @default(cuid())
  name      String   // "Diamond Studio"
  slug      String   @unique // "diamond-studio" — used in URLs
  phone     String?
  address   String?
  logoUrl   String?
  timezone  String   @default("America/Costa_Rica")
  createdAt DateTime @default(now())
  barbers   Barber[]
  bookings  Booking[]
  admins    Admin[]
}

model Admin {
  id        String   @id @default(cuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  email     String   @unique
  password  String   // bcrypt hashed
  name      String
  role      String   @default("admin") // "admin" | "superadmin"
  createdAt DateTime @default(now())
}

model Barber {
  id        String   @id @default(cuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  name      String
  specialty String?
  avatar    String?  // emoji or URL
  color     String   @default("#B8860B") // accent color for UI
  active    Boolean  @default(true)
  schedule  Schedule[]
  overrides ScheduleOverride[]
  bookings  Booking[]
  createdAt DateTime @default(now())
}

model Schedule {
  id        String   @id @default(cuid())
  barberId  String
  barber    Barber   @relation(fields: [barberId], references: [id], onDelete: Cascade)
  dayOfWeek Int      // 0=Sunday, 1=Monday ... 6=Saturday
  slots     String[] // ["09:00", "09:45", "10:30", ...]
}

model ScheduleOverride {
  id        String   @id @default(cuid())
  barberId  String
  barber    Barber   @relation(fields: [barberId], references: [id], onDelete: Cascade)
  date      DateTime @db.Date // specific date override
  slots     String[] // empty array = day off
  reason    String?  // "Vacaciones", "Cita médica"
}

model Booking {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  barberId    String
  barber      Barber   @relation(fields: [barberId], references: [id])
  date        DateTime @db.Date
  time        String   // "10:30"
  clientName  String
  clientPhone String
  status      String   @default("confirmed") // "confirmed" | "cancelled" | "completed" | "no-show"
  notes       String?
  createdAt   DateTime @default(now())
  createdBy   String?  // admin ID if booked by receptionist, null if self-booked

  @@unique([barberId, date, time]) // prevent double-booking
}
```

## Project structure

```
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
```

## Conventions

- **Language**: TypeScript everywhere (strict mode)
- **API responses**: `{ success: boolean, data?: T, error?: string }`
- **Naming**: camelCase for code, kebab-case for URLs, PascalCase for React components
- **Dates**: Store as UTC in Postgres, display in `America/Costa_Rica` timezone on frontend
- **Validation**: Use Zod on the API side for request validation
- **Error handling**: Express error middleware, never expose stack traces in production
- **Environment variables**: `.env` with `DATABASE_URL`, `JWT_SECRET`, `PORT`, `FRONTEND_URL`

## Design system

- **Primary dark**: `#0a0806`
- **Primary cream**: `#f5efe5`
- **Gold accent**: `#D4AF37`
- **Gold dark**: `#8B6914`
- **Headline font**: Playfair Display (Google Fonts)
- **Body font**: Inter (Google Fonts)
- **Border radius**: 2px (sharp, premium feel)
- **Spacing**: generous — 48px sections, 24px card padding

## Build order

### Phase 0: Scaffold
- [ ] Initialize monorepo with apps/api and apps/web
- [ ] Set up Prisma with schema
- [ ] Seed database with Diamond Studio tenant + sample barbers

### Phase 1: Admin panel (receptionist-first)
- [ ] Admin login (email/password → JWT)
- [ ] Dashboard: today's bookings at a glance
- [ ] Manage barbers (CRUD)
- [ ] Manage schedules (default weekly + per-day overrides)
- [ ] Manage bookings (view, create on behalf of client, cancel)

### Phase 2: Client booking PWA
- [ ] Public booking flow: /book/diamond-studio
- [ ] Select barber → date → time → enter name + phone → confirm
- [ ] PWA manifest + service worker for "Add to Home Screen"
- [ ] QR code generation for reception poster

### Phase 3: WhatsApp integration
- [ ] Meta Cloud API or Twilio for outbound confirmations
- [ ] Inbound bot for self-service booking via WhatsApp

### Phase 4: Reports (v1)
- [ ] Client traffic dashboard
- [ ] Low-traffic day identification + promo suggestions
- [ ] No-show tracking

### Phase 5: Multi-service expansion (v3)
- [ ] Nail salon as separate service category under same tenant
- [ ] Product catalog and POS-lite

## Running locally

```bash
# Prerequisites: Node 20+, PostgreSQL running locally or via Docker
git clone https://github.com/jalta506/Diamondstudio.git
cd Diamondstudio
npm install

# Set up environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Database
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed

# Run both apps
cd ../..
npm run dev  # runs api on :3001, web on :5173
```

## Important rules for Claude Code

- Always scope database queries by `tenantId` — never return data across tenants
- The booking flow is PUBLIC — no auth on `/api/v1/bookings` POST or GET (filtered by tenant slug)
- Admin routes require JWT auth AND tenant scoping
- All user-facing strings must be in Spanish (Costa Rican)
- Keep dependencies minimal — this runs cheaply on Railway
- Prefer Prisma query methods over raw SQL
- The `@@unique([barberId, date, time])` constraint prevents double-booking at DB level — API should also check and return a friendly error
- When creating React components, reference the design system colors and fonts above
- PWA must work offline for viewing existing bookings (service worker caches last-fetched data)
