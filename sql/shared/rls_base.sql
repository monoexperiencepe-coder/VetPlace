-- ============================================================
-- SHARED RLS — Base policies for all verticals
-- Run after base_schema.sql
-- ============================================================

CREATE OR REPLACE FUNCTION auth_clinic_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM clinics WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- clinics
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_clinics_all" ON clinics;
CREATE POLICY "rls_clinics_all" ON clinics
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_clients_all" ON clients;
CREATE POLICY "rls_clients_all" ON clients
  FOR ALL USING (clinic_id = auth_clinic_id()) WITH CHECK (clinic_id = auth_clinic_id());

-- service_types
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_service_types_all" ON service_types;
CREATE POLICY "rls_service_types_all" ON service_types
  FOR ALL USING (clinic_id = auth_clinic_id()) WITH CHECK (clinic_id = auth_clinic_id());

-- bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_bookings_all" ON bookings;
CREATE POLICY "rls_bookings_all" ON bookings
  FOR ALL USING (clinic_id = auth_clinic_id()) WITH CHECK (clinic_id = auth_clinic_id());

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_payments_all" ON payments;
CREATE POLICY "rls_payments_all" ON payments
  FOR ALL USING (clinic_id = auth_clinic_id()) WITH CHECK (clinic_id = auth_clinic_id());
