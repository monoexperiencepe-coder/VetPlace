-- ============================================================
-- CARWASHPLACE — Vertical-specific tables
-- Run after shared/base_schema.sql + shared/rls_base.sql
-- ============================================================

-- Vehicles (the "sub-entity" for car wash, equivalent to pets in VetPlace)
CREATE TABLE IF NOT EXISTS vehicles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plate      TEXT NOT NULL,
  brand      TEXT,
  model      TEXT,
  color      TEXT,
  year       INTEGER,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add vehicle_id to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);

-- RLS for vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_vehicles_all" ON vehicles;
CREATE POLICY "rls_vehicles_all" ON vehicles
  FOR ALL USING (clinic_id = auth_clinic_id()) WITH CHECK (clinic_id = auth_clinic_id());

CREATE INDEX IF NOT EXISTS idx_vehicles_clinic_id  ON vehicles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_client_id  ON vehicles(client_id);
