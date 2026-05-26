# VetPlace Platform — Monorepo Guide

## Structure

```
VetPlace/
├── package.json          ← npm workspace root (Turborepo)
├── turbo.json            ← build pipeline config
├── vercel.json           ← {"rootDirectory": "web"} — VetPlace deploy
│
├── web/                  ← 🐾 VetPlace (vet clinics) — LIVE on Vercel
│
├── apps/
│   ├── barberplace/      ← ✂️  Phase 2 — Barbershops
│   ├── carwashplace/     ← 🚗  Phase 3 — Car wash
│   └── dentalplace/      ← 🦷  Phase 4 — Dental clinics
│
├── packages/
│   ├── ui/               ← Shared React components (Button, Input, Badge, Card)
│   ├── supabase/         ← Shared Supabase client factory + base types
│   └── core/             ← Shared utilities (phone, date, slugify, api-response)
│
└── sql/
    ├── shared/
    │   ├── base_schema.sql   ← Common tables for all verticals
    │   └── rls_base.sql      ← Common RLS policies
    └── verticals/
        ├── barberplace.sql   ← barbers table + bookings.barber_id
        ├── carwashplace.sql  ← vehicles table + bookings.vehicle_id
        └── dentalplace.sql   ← dental_records + odontograms tables
```

## Dev Commands

```bash
# Run VetPlace (port 3000)
npm run dev:vet

# Run BarberPlace (port 3001)
npm run dev:barber

# Run DentalPlace (port 3002)
npm run dev:dental

# Run CarWashPlace (port 3003)
npm run dev:carwash

# Build all apps
npm run build

# Install all workspace deps
npm install
```

## Deploying a New Vertical

Each app deploys independently on Vercel:
1. Create new Vercel project → link same GitHub repo
2. Set **Root Directory** to `apps/barberplace` (or the relevant app)
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Each vertical can use its own Supabase project OR share the same one with different `clinics` rows

## Shared Packages

### `@platform/ui`
Common UI components. Import in any app:
```tsx
import { Button, Input, Badge, Card } from '@platform/ui'
```

### `@platform/supabase`
Supabase client factory + shared types:
```ts
import { createClient, createAdminClient } from '@platform/supabase'
import type { Client, Booking } from '@platform/supabase'
```

### `@platform/core`
Utilities:
```ts
import { normalizePhone, formatDate, slugify, ok, err } from '@platform/core'
```

## Database Strategy

### Option A — Shared Supabase (recommended for MVP)
All verticals share the same Supabase project. The `clinics` table acts as tenant isolation. Each vertical has its own vertical-specific tables alongside the shared ones.

Run in order:
1. `sql/shared/base_schema.sql`
2. `sql/shared/rls_base.sql`
3. `sql/verticals/<vertical>.sql`

### Option B — Separate Supabase projects per vertical
Cleaner isolation, but more overhead. Use when you have paying customers on a vertical and need stronger data separation.

## Roadmap

| Phase | App          | Key Entities                        | Status        |
|-------|--------------|-------------------------------------|---------------|
| 1     | Monorepo     | Workspace setup, shared packages    | ✅ Done        |
| 2     | BarberPlace  | barbers, appointments, services     | 🚧 In progress |
| 3     | CarWashPlace | vehicles, appointments              | 📋 Planned    |
| 4     | DentalPlace  | dental_records, odontogram          | 📋 Planned    |
