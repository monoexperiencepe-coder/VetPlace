-- ============================================================
-- CREATE STAFF MEMBERS + SEED DEMO DATA
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Create staff_members table
CREATE TABLE IF NOT EXISTS staff_members (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id  uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  role       text DEFAULT 'groomer',
  color      text DEFAULT '#601EF9',
  email      text,
  active     boolean DEFAULT true,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add staff_id to bookings (nullable FK)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff_members(id) ON DELETE SET NULL;

-- 3. RLS
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'staff_members' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON staff_members USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON bookings(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_clinic    ON staff_members(clinic_id) WHERE active = true;

-- 5. Seed demo employees for SuperVet clinic
DO $$
DECLARE
  v_clinic_id UUID := '65c3308c-fae3-4e58-aaaf-0d61b7e65c12';
BEGIN
  -- Only insert if no staff exist for this clinic yet
  IF NOT EXISTS (SELECT 1 FROM staff_members WHERE clinic_id = v_clinic_id) THEN
    INSERT INTO staff_members (clinic_id, name, role, color) VALUES
      (v_clinic_id, 'Karen Ríos',    'groomer',    '#601EF9'),
      (v_clinic_id, 'Miguel López',  'groomer',    '#0ea5e9'),
      (v_clinic_id, 'Sofía Paredes', 'veterinario','#10b981'),
      (v_clinic_id, 'Jorge Castro',  'asistente',  '#f59e0b');
    RAISE NOTICE '✅ 4 demo employees seeded for SuperVet';
  ELSE
    RAISE NOTICE 'ℹ️  Staff already exists — skipping seed';
  END IF;
END $$;

SELECT 'staff_members ready ✅' AS result;
