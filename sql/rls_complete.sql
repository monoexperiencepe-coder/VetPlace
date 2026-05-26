-- ============================================================
-- VetPlace — Row Level Security (RLS) Completo
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- OBJETIVO: Garantizar aislamiento total entre clínicas.
-- Ninguna clínica puede ver, modificar ni eliminar datos de otra.
--
-- ARQUITECTURA DE SEGURIDAD:
--   • supabaseAdmin (service_role) → bypassa RLS → solo en API routes del servidor ✅
--   • supabase client (anon/authenticated) → respeta RLS → frontend y portales
--   • El portal de cliente usa supabaseAdmin en el servidor → no necesita políticas de portal aquí
--
-- COLUMNA CLAVE: clinics.owner_id = auth.uid() del dueño de la clínica
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN HELPER: Obtiene el clinic_id del usuario autenticado
-- Evita repetir la subquery en cada política
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth_clinic_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM clinics WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CLINICS
-- El dueño solo ve y edita su propia clínica
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner puede ver su clínica"       ON clinics;
DROP POLICY IF EXISTS "Owner puede actualizar su clínica" ON clinics;
DROP POLICY IF EXISTS "Owner puede crear su clínica"      ON clinics;
DROP POLICY IF EXISTS "rls_clinics_all"                   ON clinics;

CREATE POLICY "rls_clinics_all" ON clinics
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CLIENTS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic ve sus clients" ON clients;
DROP POLICY IF EXISTS "rls_clients_all"       ON clients;

CREATE POLICY "rls_clients_all" ON clients
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PETS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic ve sus pets" ON pets;
DROP POLICY IF EXISTS "rls_pets_all"       ON pets;

CREATE POLICY "rls_pets_all" ON pets
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. BOOKINGS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic ve sus bookings" ON bookings;
DROP POLICY IF EXISTS "rls_bookings_all"       ON bookings;

CREATE POLICY "rls_bookings_all" ON bookings
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. EVENTS (eventos veterinarios: vacunas, controles, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic ve sus events" ON events;
DROP POLICY IF EXISTS "rls_events_all"       ON events;

CREATE POLICY "rls_events_all" ON events
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. MEDICAL RECORDS (historia clínica)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_medical_records_all" ON medical_records;

CREATE POLICY "rls_medical_records_all" ON medical_records
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PAYMENTS (caja de ingresos)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_payments_all" ON payments;

CREATE POLICY "rls_payments_all" ON payments
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SERVICE TYPES (catálogo de servicios)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_service_types_all" ON service_types;

CREATE POLICY "rls_service_types_all" ON service_types
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. AUTOMATIONS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_isolation"    ON automations;
DROP POLICY IF EXISTS "rls_automations_all" ON automations;

CREATE POLICY "rls_automations_all" ON automations
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ROUTES (logística)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_isolation" ON routes;
DROP POLICY IF EXISTS "rls_routes_all"   ON routes;

CREATE POLICY "rls_routes_all" ON routes
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ROUTE_STOPS (paradas de ruta — acceso vía join con routes)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_route_stops_all" ON route_stops;

CREATE POLICY "rls_route_stops_all" ON route_stops
  FOR ALL USING (
    route_id IN (SELECT id FROM routes WHERE clinic_id = auth_clinic_id())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. DOMAIN EVENTS (cola interna del automation engine)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_isolation"       ON domain_events;
DROP POLICY IF EXISTS "rls_domain_events_all"  ON domain_events;

CREATE POLICY "rls_domain_events_all" ON domain_events
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. CONVERSATIONS (chats WhatsApp)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic ve sus conversations" ON conversations;
DROP POLICY IF EXISTS "rls_conversations_all"       ON conversations;

CREATE POLICY "rls_conversations_all" ON conversations
  FOR ALL USING (clinic_id = auth_clinic_id())
  WITH CHECK (clinic_id = auth_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. MESSAGES (mensajes de chat — acceso vía join con conversations)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic ve sus messages" ON messages;
DROP POLICY IF EXISTS "rls_messages_all"       ON messages;

CREATE POLICY "rls_messages_all" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE clinic_id = auth_clinic_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. PORTAL_OTPS (códigos OTP temporales — acceso solo server-side)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE portal_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_portal_otps_deny_all" ON portal_otps;

-- Nadie accede desde el cliente: solo el service_role (supabaseAdmin) puede operar esta tabla
CREATE POLICY "rls_portal_otps_deny_all" ON portal_otps
  FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- TAMBIÉN: Columnas extras que mejoran el perfil de cliente/mascota
-- (Si no las tienes aún, este ALTER es seguro de correr varias veces)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE pets    ADD COLUMN IF NOT EXISTS breed               TEXT;
ALTER TABLE pets    ADD COLUMN IF NOT EXISTS grooming_every_days INTEGER;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ RLS activado en todas las tablas de VetPlace';
  RAISE NOTICE '   clinics, clients, pets, bookings, events, medical_records';
  RAISE NOTICE '   payments, service_types, automations, routes, route_stops';
  RAISE NOTICE '   domain_events, conversations, messages, portal_otps';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Recuerda: supabaseAdmin (service_role) bypassa RLS automáticamente.';
  RAISE NOTICE '   Las API routes del servidor siguen funcionando sin cambios.';
END $$;
