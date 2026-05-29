-- ============================================================
-- DEMO DAY PREP — Run tonight or tomorrow morning before 9am
-- Fixes: agenda for May 29, inactive clients, eventos tab
-- ============================================================

DO $$
DECLARE
  v_clinic_id UUID := '65c3308c-fae3-4e58-aaaf-0d61b7e65c12';
  p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID; p6 UUID;
  c_diego UUID; c_ana UUID;
  s_consulta UUID; s_bano UUID; s_vacuna UUID; s_desparasit UUID;
  today DATE := CURRENT_DATE;
BEGIN
  -- Resolve IDs
  SELECT id INTO p1 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Luna'  LIMIT 1;
  SELECT id INTO p2 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Mochi' LIMIT 1;
  SELECT id INTO p3 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Rocky' LIMIT 1;
  SELECT id INTO p4 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Bella' LIMIT 1;
  SELECT id INTO p5 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Simba' LIMIT 1;
  SELECT id INTO p6 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Max'   LIMIT 1;

  SELECT id INTO c_diego FROM clients WHERE clinic_id = v_clinic_id AND name ILIKE '%Diego%'    LIMIT 1;
  SELECT id INTO c_ana   FROM clients WHERE clinic_id = v_clinic_id AND name ILIKE '%Ana Torre%' LIMIT 1;

  SELECT id INTO s_consulta   FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Consulta%'   LIMIT 1;
  SELECT id INTO s_bano       FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Baño%'       LIMIT 1;
  SELECT id INTO s_vacuna     FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Vacun%'      LIMIT 1;
  SELECT id INTO s_desparasit FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Desparasit%' LIMIT 1;

  -- ── 1. AGENDA: Move today's CONFIRMED bookings to today (CURRENT_DATE) ───
  -- This ensures the 6 demo bookings always show in the "Hoy" tab on demo day.
  -- Delete whatever was there before for today
  DELETE FROM bookings
  WHERE clinic_id = v_clinic_id
    AND date = today
    AND status IN ('CONFIRMED', 'PENDING', 'COMPLETED');

  -- Re-insert them with today's date
  INSERT INTO bookings (clinic_id, pet_id, service_type_id, date, time, status, payment_status, price, notes)
  VALUES
    (v_clinic_id, p3, s_consulta,   today, '09:00', 'CONFIRMED', 'pending', 60,  'Control anual Rocky'),
    (v_clinic_id, p1, s_bano,       today, '10:00', 'CONFIRMED', 'pending', 55,  'Baño y corte Luna'),
    (v_clinic_id, p5, s_vacuna,     today, '11:30', 'CONFIRMED', 'pending', 45,  'Vacuna antirrábica Simba'),
    (v_clinic_id, p2, s_consulta,   today, '14:00', 'PENDING',   'pending', 60,  'Revisión Mochi'),
    (v_clinic_id, p6, s_desparasit, today, '15:30', 'CONFIRMED', 'pending', 35,  'Desparasitación Max'),
    (v_clinic_id, p4, s_bano,       today, '16:30', 'PENDING',   'pending', 55,  'Baño show Bella');

  RAISE NOTICE '✅ Agenda: 6 bookings set for % (today)', today;

  -- ── 2. RECUPERAR TAB: Make 2 clients appear as inactive ──────────────────
  -- The finance API needs: created_at > 60 days ago AND last booking > 60 days ago
  -- We backdate 2 clients and remove their recent bookings (past 60 days)
  IF c_diego IS NOT NULL THEN
    UPDATE clients SET created_at = NOW() - INTERVAL '90 days'
    WHERE id = c_diego;

    DELETE FROM bookings
    WHERE clinic_id = v_clinic_id
      AND pet_id = p5
      AND date > today - 61
      AND date < today;

    RAISE NOTICE '✅ Diego Ramos marked as inactive (last visit 61+ days ago)';
  END IF;

  IF c_ana IS NOT NULL THEN
    UPDATE clients SET created_at = NOW() - INTERVAL '85 days'
    WHERE id = c_ana;

    DELETE FROM bookings
    WHERE clinic_id = v_clinic_id
      AND pet_id = p6
      AND date > today - 61
      AND date < today;

    RAISE NOTICE '✅ Ana Torres marked as inactive (last visit 61+ days ago)';
  END IF;

  -- ── 3. EVENTOS TAB: Re-seed events for Luna and Mochi ───────────────────
  -- Delete old events and reinsert so the passport Eventos tab has content
  DELETE FROM events WHERE clinic_id = v_clinic_id;

  INSERT INTO events (clinic_id, pet_id, type, scheduled_date, status)
  VALUES
    -- Luna
    (v_clinic_id, p1, 'vaccine',   today + 14,  'PENDING'),
    (v_clinic_id, p1, 'deworming', today + 83,  'PENDING'),
    -- Mochi
    (v_clinic_id, p2, 'checkup',   today + 7,   'PENDING'),
    (v_clinic_id, p2, 'grooming',  today + 21,  'PENDING'),
    (v_clinic_id, p2, 'vaccine',   today + 30,  'PENDING'),
    -- Rocky
    (v_clinic_id, p3, 'vaccine',   today + 30,  'PENDING'),
    -- Bella
    (v_clinic_id, p4, 'grooming',  today + 14,  'PENDING');

  RAISE NOTICE '✅ Eventos: 7 upcoming reminders seeded (Luna: 2, Mochi: 3, Rocky: 1, Bella: 1)';

  RAISE NOTICE '';
  RAISE NOTICE '🎯 Demo ready for %', today;
  RAISE NOTICE '   Agenda Hoy: 6 services  |  Recuperar: 2 inactive clients  |  Eventos: working';

END $$;
