-- ============================================================
-- BARBERPLACE — Vertical-specific tables
-- Run after shared/base_schema.sql + shared/rls_base.sql
-- ============================================================

-- Barbers (staff members)
CREATE TABLE IF NOT EXISTS barbers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  color      TEXT DEFAULT '#9333ea',
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add barber_id to bookings (BarberPlace links each booking to a barber)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS barber_id UUID REFERENCES barbers(id);

-- Default services for a new barbershop
-- (INSERT after creating the clinic)
-- INSERT INTO service_types (clinic_id, name, duration, price) VALUES
--   ('<clinic_id>', 'Corte clásico',    30, 30),
--   ('<clinic_id>', 'Corte + Barba',    45, 45),
--   ('<clinic_id>', 'Diseño de barba',  20, 30),
--   ('<clinic_id>', 'Afeitado navaja',  30, 25),
--   ('<clinic_id>', 'Corte + Tinte',    60, 60);

-- RLS for barbers
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_barbers_all" ON barbers;
CREATE POLICY "rls_barbers_all" ON barbers
  FOR ALL USING (clinic_id = auth_clinic_id()) WITH CHECK (clinic_id = auth_clinic_id());

CREATE INDEX IF NOT EXISTS idx_barbers_clinic_id ON barbers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);
