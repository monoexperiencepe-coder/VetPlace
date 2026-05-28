-- ============================================================
-- CLEAN DEMO CLIENTS — Remove clients without pets
-- Keeps only the 5 clients tied to real data in the demo
-- Run in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  v_clinic_id UUID := '65c3308c-fae3-4e58-aaaf-0d61b7e65c12';
  deleted_count INT;
BEGIN
  -- Delete payments linked to bookings of clients with no pets
  -- (cascades won't handle this chain automatically)
  DELETE FROM payments
  WHERE clinic_id = v_clinic_id
    AND client_id IN (
      SELECT c.id FROM clients c
      WHERE c.clinic_id = v_clinic_id
        AND NOT EXISTS (
          SELECT 1 FROM pets p WHERE p.clinic_id = v_clinic_id AND p.user_id = c.id
        )
    );

  -- Delete bookings of clients with no pets (if any got linked by client_id)
  DELETE FROM bookings
  WHERE clinic_id = v_clinic_id
    AND pet_id IS NULL;

  -- Delete the clients themselves (no pets = not part of demo data)
  DELETE FROM clients
  WHERE clinic_id = v_clinic_id
    AND NOT EXISTS (
      SELECT 1 FROM pets p WHERE p.clinic_id = v_clinic_id AND p.user_id = clients.id
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE '✅ Removed % client(s) without pets', deleted_count;
  RAISE NOTICE 'Remaining clients: María Fernández, Carlos Quispe, Lucía Vargas, Diego Ramos, Ana Torres';
END $$;
