-- ============================================================
-- DENTALPLACE — Vertical-specific tables
-- Run after shared/base_schema.sql + shared/rls_base.sql
-- ============================================================

-- Dental records per patient (more complex than bookings)
CREATE TABLE IF NOT EXISTS dental_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES bookings(id),
  tooth_number TEXT,           -- FDI notation: 11-48, or null for full-mouth
  procedure   TEXT NOT NULL,
  diagnosis   TEXT,
  treatment   TEXT,
  notes       TEXT,
  cost        NUMERIC(10,2),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Odontogram state (per client — JSON blob with tooth statuses)
CREATE TABLE IF NOT EXISTS odontograms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  data       JSONB NOT NULL DEFAULT '{}',  -- { "11": "caries", "21": "implant", ... }
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for dental tables
ALTER TABLE dental_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_dental_records_all" ON dental_records;
CREATE POLICY "rls_dental_records_all" ON dental_records
  FOR ALL USING (clinic_id = auth_clinic_id()) WITH CHECK (clinic_id = auth_clinic_id());

ALTER TABLE odontograms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_odontograms_all" ON odontograms;
CREATE POLICY "rls_odontograms_all" ON odontograms
  FOR ALL USING (clinic_id = auth_clinic_id()) WITH CHECK (clinic_id = auth_clinic_id());

CREATE INDEX IF NOT EXISTS idx_dental_records_clinic_id  ON dental_records(clinic_id);
CREATE INDEX IF NOT EXISTS idx_dental_records_client_id  ON dental_records(client_id);
CREATE INDEX IF NOT EXISTS idx_odontograms_clinic_id     ON odontograms(clinic_id);
