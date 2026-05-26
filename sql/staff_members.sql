-- ============================================================
-- STAFF MEMBERS
-- Allows clinic owners to invite staff (receptionists,
-- groomers, vet techs) who can log in with their own
-- Supabase auth account and access the platform with
-- limited permissions (no financials).
--
-- Run after: rls_complete.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'staff'
              CHECK (role IN ('staff', 'manager')),
  -- 'staff'   → sees bookings, clients, pets, events, chats
  -- 'manager' → same as staff + can see basic revenue stats (not full finanzas)
  invited_at  TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_staff_members_clinic_id ON staff_members(clinic_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id   ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_email     ON staff_members(email);

-- RLS
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_staff_members_all" ON staff_members;
CREATE POLICY "rls_staff_members_all" ON staff_members
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ── Helper function: get clinic_id for a staff member ──────────────────────
-- Extends auth_clinic_id() to also work for staff (not just owners)
CREATE OR REPLACE FUNCTION auth_clinic_id_any()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM clinics WHERE owner_id = auth.uid()
  UNION ALL
  SELECT clinic_id FROM staff_members WHERE user_id = auth.uid() AND active = TRUE
  LIMIT 1;
$$;

-- ── Verification ───────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ staff_members table ready';
  RAISE NOTICE '   Roles: staff (default), manager';
  RAISE NOTICE '   auth_clinic_id_any() works for both owners and staff';
  RAISE NOTICE '';
  RAISE NOTICE '📌 To invite a staff member:';
  RAISE NOTICE '   INSERT INTO staff_members (clinic_id, name, email)';
  RAISE NOTICE '   VALUES (''<clinic_id>'', ''María'', ''maria@clinica.com'');';
  RAISE NOTICE '   Then send them a Supabase magic link invitation.';
END $$;
