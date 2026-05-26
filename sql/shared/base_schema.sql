-- ============================================================
-- SHARED BASE SCHEMA — Used across all verticals
-- Run this in every Supabase project (VetPlace, BarberPlace, etc.)
-- ============================================================

-- Clinics / Shops (the tenant unit — one per business owner)
CREATE TABLE IF NOT EXISTS clinics (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  phone      TEXT,
  email      TEXT,
  address    TEXT,
  logo_url   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients (customers of the business)
CREATE TABLE IF NOT EXISTS clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  address      TEXT,
  district     TEXT,
  notes        TEXT,
  portal_token UUID UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Service types catalog
CREATE TABLE IF NOT EXISTS service_types (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  duration  INTEGER,   -- minutes
  price     NUMERIC(10,2),
  color     TEXT DEFAULT '#6366f1',
  active    BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings / Appointments
CREATE TABLE IF NOT EXISTS bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_type_id  UUID REFERENCES service_types(id),
  date             DATE NOT NULL,
  time             TIME NOT NULL,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  notes            TEXT,
  payment_status   TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES bookings(id),
  client_id   UUID REFERENCES clients(id),
  amount      NUMERIC(10,2) NOT NULL,
  method      TEXT DEFAULT 'efectivo',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_clinic_id   ON clients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bookings_clinic_date ON bookings(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_payments_clinic_id   ON payments(clinic_id);
