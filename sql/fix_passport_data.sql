-- ============================================================
-- FIX PASSPORT DATA — Re-seeds bookings + medical records
-- for the SuperVet demo clinic.
--
-- Run in Supabase SQL Editor.
-- Solves:
--  1. Bookings referencing old (deleted) pet IDs → empty Citas tab
--  2. Missing medical records → empty Historial tab
--  3. scheduled_at vs date/time column mismatch → portal API gets nulls
-- ============================================================

DO $$
DECLARE
  v_clinic_id UUID := '65c3308c-fae3-4e58-aaaf-0d61b7e65c12';

  -- Current pet IDs (looked up by name after re-link)
  p1 UUID;  -- Luna   (María Fernández)
  p2 UUID;  -- Mochi  (María Fernández)
  p3 UUID;  -- Rocky  (Carlos Quispe)
  p4 UUID;  -- Bella  (Lucía Vargas)
  p5 UUID;  -- Simba  (Diego Ramos)
  p6 UUID;  -- Max    (Ana Torres)

  -- Service type IDs
  s_consulta   UUID;
  s_bano       UUID;
  s_vacuna     UUID;
  s_desparasit UUID;
  s_cirugia    UUID;

  today DATE := CURRENT_DATE;

BEGIN

  -- ── 1. Resolve current pet IDs by name ──────────────────────────────────
  SELECT id INTO p1 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Luna'  LIMIT 1;
  SELECT id INTO p2 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Mochi' LIMIT 1;
  SELECT id INTO p3 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Rocky' LIMIT 1;
  SELECT id INTO p4 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Bella' LIMIT 1;
  SELECT id INTO p5 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Simba' LIMIT 1;
  SELECT id INTO p6 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Max'   LIMIT 1;

  IF p1 IS NULL THEN RAISE EXCEPTION 'Pet Luna not found — check clinic_id'; END IF;
  IF p2 IS NULL THEN RAISE EXCEPTION 'Pet Mochi not found — check clinic_id'; END IF;

  RAISE NOTICE 'Pets: Luna=%, Mochi=%, Rocky=%, Bella=%, Simba=%, Max=%',
    p1, p2, p3, p4, p5, p6;

  -- ── 2. Resolve service type IDs ─────────────────────────────────────────
  SELECT id INTO s_consulta   FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Consulta%'        LIMIT 1;
  SELECT id INTO s_bano       FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Baño%'            LIMIT 1;
  SELECT id INTO s_vacuna     FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Vacun%'           LIMIT 1;
  SELECT id INTO s_desparasit FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Desparasit%'      LIMIT 1;
  SELECT id INTO s_cirugia    FROM service_types WHERE clinic_id = v_clinic_id AND name ILIKE '%Cirug%'           LIMIT 1;

  -- ── 3. Clear broken bookings + payments ─────────────────────────────────
  -- Remove payments first (FK dependency)
  BEGIN
    DELETE FROM payments WHERE clinic_id = v_clinic_id;
    RAISE NOTICE 'Payments cleared';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'payments table not found, skipping';
  END;

  DELETE FROM bookings WHERE clinic_id = v_clinic_id;
  RAISE NOTICE 'Bookings cleared';

  -- ── 4. Clear and re-seed medical records ────────────────────────────────
  BEGIN
    DELETE FROM medical_records WHERE clinic_id = v_clinic_id;
    RAISE NOTICE 'Medical records cleared';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'medical_records table not found, skipping';
  END;

  -- ── 5. Re-insert bookings using date + time columns ─────────────────────
  -- These match what the portal token API queries (.select('id, date, time, status, notes, service_type_id'))

  -- December (6 months ago)
  INSERT INTO bookings (clinic_id, pet_id, service_type_id, date, time, status, payment_status, price, notes)
  VALUES
    (v_clinic_id, p1, s_consulta,   today - 165, '10:00', 'COMPLETED', 'paid', 60,  'Revisión rutinaria'),
    (v_clinic_id, p3, s_bano,       today - 160, '11:30', 'COMPLETED', 'paid', 55,  'Baño completo'),
    (v_clinic_id, p5, s_vacuna,     today - 158, '09:00', 'COMPLETED', 'paid', 45,  'Vacuna antirrábica'),
    (v_clinic_id, p2, s_desparasit, today - 155, '14:00', 'COMPLETED', 'paid', 35,  ''),
    (v_clinic_id, p4, s_consulta,   today - 150, '10:00', 'COMPLETED', 'paid', 60,  'Chequeo general'),
    (v_clinic_id, p6, s_bano,       today - 148, '15:00', 'COMPLETED', 'paid', 55,  '');

  -- January
  INSERT INTO bookings (clinic_id, pet_id, service_type_id, date, time, status, payment_status, price, notes)
  VALUES
    (v_clinic_id, p1, s_bano,       today - 130, '10:00', 'COMPLETED', 'paid', 55,  ''),
    (v_clinic_id, p3, s_cirugia,    today - 128, '09:00', 'COMPLETED', 'paid', 250, 'Extracción dental'),
    (v_clinic_id, p2, s_consulta,   today - 125, '11:00', 'COMPLETED', 'paid', 60,  'Control rutinario Mochi'),
    (v_clinic_id, p5, s_desparasit, today - 122, '14:30', 'COMPLETED', 'paid', 35,  ''),
    (v_clinic_id, p4, s_vacuna,     today - 120, '10:00', 'COMPLETED', 'paid', 45,  'Combo 5en1'),
    (v_clinic_id, p6, s_consulta,   today - 118, '09:30', 'COMPLETED', 'paid', 60,  ''),
    (v_clinic_id, p1, s_consulta,   today - 115, '15:00', 'COMPLETED', 'paid', 60,  '');

  -- February
  INSERT INTO bookings (clinic_id, pet_id, service_type_id, date, time, status, payment_status, price, notes)
  VALUES
    (v_clinic_id, p3, s_bano,       today - 95, '10:00', 'COMPLETED', 'paid', 55,  ''),
    (v_clinic_id, p1, s_vacuna,     today - 92, '09:00', 'COMPLETED', 'paid', 45,  ''),
    (v_clinic_id, p5, s_consulta,   today - 90, '11:00', 'COMPLETED', 'paid', 60,  'Alergia en piel'),
    (v_clinic_id, p2, s_bano,       today - 88, '14:00', 'COMPLETED', 'paid', 55,  'Baño mensual Mochi'),
    (v_clinic_id, p4, s_cirugia,    today - 85, '09:00', 'COMPLETED', 'paid', 250, 'Esterilización'),
    (v_clinic_id, p6, s_vacuna,     today - 83, '10:30', 'COMPLETED', 'paid', 45,  ''),
    (v_clinic_id, p3, s_consulta,   today - 80, '15:00', 'COMPLETED', 'paid', 60,  ''),
    (v_clinic_id, p1, s_desparasit, today - 78, '09:00', 'COMPLETED', 'paid', 35,  '');

  -- March
  INSERT INTO bookings (clinic_id, pet_id, service_type_id, date, time, status, payment_status, price, notes)
  VALUES
    (v_clinic_id, p2, s_consulta,   today - 62, '10:00', 'COMPLETED', 'paid', 60,  'Revisión dental Mochi'),
    (v_clinic_id, p5, s_bano,       today - 60, '11:30', 'COMPLETED', 'paid', 55,  ''),
    (v_clinic_id, p1, s_bano,       today - 58, '09:00', 'COMPLETED', 'paid', 55,  ''),
    (v_clinic_id, p3, s_vacuna,     today - 55, '14:00', 'COMPLETED', 'paid', 45,  ''),
    (v_clinic_id, p6, s_consulta,   today - 53, '10:00', 'COMPLETED', 'paid', 60,  ''),
    (v_clinic_id, p4, s_bano,       today - 50, '15:00', 'COMPLETED', 'paid', 55,  ''),
    (v_clinic_id, p2, s_desparasit, today - 48, '09:30', 'COMPLETED', 'paid', 35,  ''),
    (v_clinic_id, p5, s_cirugia,    today - 45, '10:00', 'COMPLETED', 'paid', 250, 'Cirugía de ligamento'),
    (v_clinic_id, p1, s_consulta,   today - 43, '11:00', 'COMPLETED', 'paid', 60,  '');

  -- April
  INSERT INTO bookings (clinic_id, pet_id, service_type_id, date, time, status, payment_status, price, notes)
  VALUES
    (v_clinic_id, p3, s_bano,       today - 30, '09:00', 'COMPLETED', 'paid', 55,  ''),
    (v_clinic_id, p1, s_vacuna,     today - 28, '10:00', 'COMPLETED', 'paid', 45,  ''),
    (v_clinic_id, p6, s_bano,       today - 26, '14:00', 'COMPLETED', 'paid', 55,  ''),
    (v_clinic_id, p2, s_consulta,   today - 24, '09:00', 'COMPLETED', 'paid', 60,  'Tos leve'),
    (v_clinic_id, p5, s_bano,       today - 22, '11:00', 'COMPLETED', 'paid', 55,  ''),
    (v_clinic_id, p4, s_vacuna,     today - 20, '10:30', 'COMPLETED', 'paid', 45,  ''),
    (v_clinic_id, p1, s_bano,       today - 18, '09:00', 'COMPLETED', 'paid', 55,  ''),
    (v_clinic_id, p3, s_consulta,   today - 16, '14:00', 'COMPLETED', 'paid', 60,  'Dolor articular'),
    (v_clinic_id, p2, s_cirugia,    today - 14, '10:00', 'COMPLETED', 'paid', 250, 'Extracción de masa Mochi'),
    (v_clinic_id, p6, s_desparasit, today - 12, '15:00', 'COMPLETED', 'paid', 35,  ''),
    (v_clinic_id, p5, s_consulta,   today - 10, '09:00', 'COMPLETED', 'paid', 60,  '');

  -- May (this month)
  INSERT INTO bookings (clinic_id, pet_id, service_type_id, date, time, status, payment_status, price, notes)
  VALUES
    (v_clinic_id, p1, s_consulta,   today - 8, '10:00', 'COMPLETED', 'paid', 60,  ''),
    (v_clinic_id, p4, s_bano,       today - 7, '09:00', 'COMPLETED', 'paid', 55,  ''),
    (v_clinic_id, p3, s_vacuna,     today - 6, '11:00', 'COMPLETED', 'paid', 45,  ''),
    (v_clinic_id, p6, s_consulta,   today - 5, '14:00', 'COMPLETED', 'paid', 60,  ''),
    (v_clinic_id, p2, s_bano,       today - 4, '09:00', 'COMPLETED', 'paid', 55,  'Baño mensual Mochi'),
    (v_clinic_id, p5, s_desparasit, today - 3, '10:30', 'COMPLETED', 'paid', 35,  ''),
    (v_clinic_id, p1, s_bano,       today - 2, '09:00', 'COMPLETED', 'paid', 55,  ''),
    (v_clinic_id, p4, s_consulta,   today - 1, '14:00', 'COMPLETED', 'paid', 60,  ''),
    (v_clinic_id, p3, s_bano,       today,     '10:00', 'COMPLETED', 'paid', 55,  '');

  -- Upcoming (future agenda — for Citas tab in passport)
  INSERT INTO bookings (clinic_id, pet_id, service_type_id, date, time, status, payment_status, price, notes)
  VALUES
    (v_clinic_id, p1, s_bano,     today + 1,  '10:00', 'CONFIRMED', 'pending', 55, 'Baño mensual Luna'),
    (v_clinic_id, p3, s_consulta, today + 2,  '11:00', 'CONFIRMED', 'pending', 60, 'Control post-op Rocky'),
    (v_clinic_id, p5, s_vacuna,   today + 3,  '09:00', 'CONFIRMED', 'pending', 45, 'Refuerzo anual Simba'),
    (v_clinic_id, p2, s_bano,     today + 5,  '14:00', 'CONFIRMED', 'pending', 55, 'Baño Mochi');

  RAISE NOTICE 'Bookings re-seeded successfully';

  -- ── 6. Re-insert payments ────────────────────────────────────────────────
  BEGIN
    INSERT INTO payments (clinic_id, booking_id, amount, method, paid_at)
    SELECT
      b.clinic_id,
      b.id,
      b.price,
      CASE (RANDOM() * 2)::INT WHEN 0 THEN 'cash' WHEN 1 THEN 'card' ELSE 'transfer' END,
      (b.date + b.time)::TIMESTAMPTZ + INTERVAL '1 hour'
    FROM bookings b
    WHERE b.clinic_id = v_clinic_id
      AND b.payment_status = 'paid';
    RAISE NOTICE 'Payments re-seeded';
  EXCEPTION
    WHEN undefined_column THEN
      -- paid_at column may not exist — try without it
      INSERT INTO payments (clinic_id, booking_id, amount, method)
      SELECT
        b.clinic_id, b.id, b.price,
        CASE (RANDOM() * 2)::INT WHEN 0 THEN 'cash' WHEN 1 THEN 'card' ELSE 'transfer' END
      FROM bookings b
      WHERE b.clinic_id = v_clinic_id AND b.payment_status = 'paid';
      RAISE NOTICE 'Payments re-seeded (without paid_at)';
    WHEN undefined_table THEN
      RAISE NOTICE 'payments table missing, skipping';
  END;

  -- ── 7. Add medical records for Luna + Mochi (Historial tab) ─────────────
  BEGIN
    INSERT INTO medical_records (clinic_id, pet_id, date, type, diagnosis, treatment, notes, vet, weight)
    VALUES
      -- Luna's history
      (v_clinic_id, p1, today - 165, 'checkup',
        'Control rutinario anual', 'Sin tratamiento requerido',
        'Peso saludable. Dientes en buen estado.', 'Dr. Ramírez', 22.5),
      (v_clinic_id, p1, today - 92,  'vaccine',
        'Vacunación antirrábica', 'Vacuna antirrábica + leptospirosis',
        'Sin reacciones adversas.', 'Dr. Ramírez', 23.0),
      (v_clinic_id, p1, today - 78,  'deworming',
        'Desparasitación interna y externa', 'Milbemax + pipeta antiparasitaria',
        'Próxima desparasitación en 3 meses.', 'Dra. Soto', 23.0),
      (v_clinic_id, p1, today - 43,  'checkup',
        'Revisión post-baño. Dermatitis leve', 'Champú medicado Malaseb x 2 semanas',
        'Área de la papada con irritación. Mejoría esperada en 2 semanas.', 'Dra. Soto', 23.2),
      (v_clinic_id, p1, today - 28,  'vaccine',
        'Vacuna bivalente canina', 'Vacuna polivalente 5en1',
        'Tolera bien. Revisión en 1 año.', 'Dr. Ramírez', 23.1),
      (v_clinic_id, p1, today - 8,   'checkup',
        'Consulta por cojera leve pata delantera derecha',
        'AINE (Meloxicam) 5 días + reposo',
        'Probable esguince leve. Radiografía no requerida.', 'Dr. Ramírez', 23.3),
      -- Mochi's history
      (v_clinic_id, p2, today - 155, 'deworming',
        'Desparasitación interna felina', 'Milbemax gatos',
        'Peso estable. Come bien.', 'Dra. Soto', 4.2),
      (v_clinic_id, p2, today - 125, 'checkup',
        'Control rutinario anual', 'Sin tratamiento requerido',
        'Gato en excelente condición. Uñas recortadas.', 'Dra. Soto', 4.3),
      (v_clinic_id, p2, today - 88,  'grooming',
        'Baño + profilaxis dental', 'Limpieza dental manual',
        'Sarro leve en molares. Repetir en 6 meses.', 'Dra. Soto', 4.3),
      (v_clinic_id, p2, today - 62,  'checkup',
        'Revisión dental por sarro leve', 'Croquetas dentales Hill''s',
        'Mejora respecto a visita anterior.', 'Dr. Ramírez', 4.4),
      (v_clinic_id, p2, today - 48,  'deworming',
        'Desparasitación preventiva', 'Milbemax + pipeta Frontline',
        'Sin parásitos encontrados.', 'Dra. Soto', 4.4),
      (v_clinic_id, p2, today - 24,  'checkup',
        'Tos leve + mucosidad nasal', 'Amoxicilina 7 días + suero fisiológico nasal',
        'Probable rinotraqueítis viral leve. Mejoría en 5 días.', 'Dr. Ramírez', 4.3),
      (v_clinic_id, p2, today - 14,  'surgery',
        'Extracción de masa subcutánea lateral derecha',
        'Cirugía bajo anestesia general. Sutura absorbible.',
        'Biopsia enviada a laboratorio. Retiro puntos en 10 días.', 'Dr. Ramírez', 4.3);
    RAISE NOTICE 'Medical records added for Luna and Mochi';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'medical_records table not found — skipping';
    WHEN others THEN
      RAISE NOTICE 'Error inserting medical_records: %', SQLERRM;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '✅ fix_passport_data.sql complete!';
  RAISE NOTICE '   Luna and Mochi: bookings (past + future) + 6 medical records each';
  RAISE NOTICE '   All other pets: 6 months of bookings re-linked to current pet IDs';
  RAISE NOTICE '   Payments: re-inserted for all paid bookings';

END $$;
