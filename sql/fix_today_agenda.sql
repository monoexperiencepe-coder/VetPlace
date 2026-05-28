-- ============================================================
-- FIX: Add CONFIRMED bookings for TODAY so the agenda shows data
-- Run in Supabase SQL Editor
-- The main issue: fix_passport_data.sql set today's booking as COMPLETED,
-- but getBookingsByDate() only fetches PENDING/CONFIRMED.
-- ============================================================

DO $$
DECLARE
  v_clinic_id UUID := '65c3308c-fae3-4e58-aaaf-0d61b7e65c12';
  p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID; p6 UUID;
  s_consulta   UUID; s_bano UUID; s_vacuna UUID; s_desparasit UUID;
  today DATE := CURRENT_DATE;
BEGIN
  -- Resolve current pet IDs
  SELECT id INTO p1 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Luna'  LIMIT 1;
  SELECT id INTO p2 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Mochi' LIMIT 1;
  SELECT id INTO p3 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Rocky' LIMIT 1;
  SELECT id INTO p4 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Bella' LIMIT 1;
  SELECT id INTO p5 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Simba' LIMIT 1;
  SELECT id INTO p6 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Max'   LIMIT 1;

  SELECT id INTO s_consulta   FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Consulta%'   LIMIT 1;
  SELECT id INTO s_bano       FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Baño%'       LIMIT 1;
  SELECT id INTO s_vacuna     FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Vacun%'      LIMIT 1;
  SELECT id INTO s_desparasit FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Desparasit%' LIMIT 1;

  -- Remove any existing bookings for today that are COMPLETED (they won't show in agenda)
  -- and add CONFIRMED ones instead
  DELETE FROM bookings
  WHERE clinic_id = v_clinic_id
    AND date = today
    AND status = 'COMPLETED';

  -- Today's agenda — mix of CONFIRMED and PENDING (morning + afternoon)
  -- These will show in the Hoy tab of the bookings page
  INSERT INTO bookings (clinic_id, pet_id, service_type_id, date, time, status, payment_status, price, notes)
  VALUES
    (v_clinic_id, p3, s_consulta,   today, '09:00', 'CONFIRMED', 'pending', 60, 'Control anual Rocky'),
    (v_clinic_id, p1, s_bano,       today, '10:00', 'CONFIRMED', 'pending', 55, 'Baño y corte Luna'),
    (v_clinic_id, p5, s_vacuna,     today, '11:30', 'CONFIRMED', 'pending', 45, 'Vacuna antirrábica Simba'),
    (v_clinic_id, p2, s_consulta,   today, '14:00', 'PENDING',   'pending', 60, 'Revisión Mochi'),
    (v_clinic_id, p6, s_desparasit, today, '15:30', 'CONFIRMED', 'pending', 35, 'Desparasitación Max'),
    (v_clinic_id, p4, s_bano,       today, '16:30', 'PENDING',   'pending', 55, 'Baño show Bella');

  -- Also make sure tomorrow has the Luna booking (don't add if it already exists)
  INSERT INTO bookings (clinic_id, pet_id, service_type_id, date, time, status, payment_status, price, notes)
  SELECT v_clinic_id, p1, s_bano, today + 1, '10:00', 'CONFIRMED', 'pending', 55, 'Baño mensual Luna'
  WHERE NOT EXISTS (
    SELECT 1 FROM bookings WHERE clinic_id = v_clinic_id AND pet_id = p1 AND date = today + 1
  );

  RAISE NOTICE '✅ Today agenda fixed: 6 CONFIRMED/PENDING bookings added for %', today;
  RAISE NOTICE '   9:00 Rocky - Consulta | 10:00 Luna - Baño | 11:30 Simba - Vacuna';
  RAISE NOTICE '   14:00 Mochi - Consulta | 15:30 Max - Desparasitación | 16:30 Bella - Baño';
END $$;
