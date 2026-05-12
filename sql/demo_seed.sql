-- ============================================================
-- VetPlace — Demo Data Seed (completo con pagos e historial)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

DO $$
DECLARE
  v_clinic_id uuid;

  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid();
  c5 uuid := gen_random_uuid();

  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
  p4 uuid := gen_random_uuid();
  p5 uuid := gen_random_uuid();
  p6 uuid := gen_random_uuid();
  p7 uuid := gen_random_uuid();

  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  s3 uuid := gen_random_uuid();
  s4 uuid := gen_random_uuid();
  s5 uuid := gen_random_uuid();

  b1  uuid := gen_random_uuid();
  b2  uuid := gen_random_uuid();
  b3  uuid := gen_random_uuid();
  b4  uuid := gen_random_uuid();
  b5  uuid := gen_random_uuid();
  b6  uuid := gen_random_uuid();
  b7  uuid := gen_random_uuid();
  b8  uuid := gen_random_uuid();
  b9  uuid := gen_random_uuid();
  b10 uuid := gen_random_uuid();
  b11 uuid := gen_random_uuid();
  b12 uuid := gen_random_uuid();
  b13 uuid := gen_random_uuid();
  b14 uuid := gen_random_uuid();
  b15 uuid := gen_random_uuid();

  conv1 uuid := gen_random_uuid();
  conv2 uuid := gen_random_uuid();
  conv3 uuid := gen_random_uuid();
  conv4 uuid := gen_random_uuid();

  today date := CURRENT_DATE;
BEGIN

  SELECT id INTO v_clinic_id FROM clinics LIMIT 1;
  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro ninguna clinica.';
  END IF;

  RAISE NOTICE 'Limpiando datos para clinic_id: %', v_clinic_id;

  -- LIMPIAR
  DELETE FROM messages
    WHERE conversation_id IN (SELECT id FROM conversations WHERE clinic_id = v_clinic_id);
  DELETE FROM conversations  WHERE clinic_id = v_clinic_id;
  DELETE FROM domain_events  WHERE clinic_id = v_clinic_id;
  DELETE FROM automations    WHERE clinic_id = v_clinic_id;

  BEGIN
    EXECUTE format('DELETE FROM medical_records WHERE clinic_id = %L', v_clinic_id);
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Tabla medical_records no existe - omitiendo.';
  END;

  BEGIN
    EXECUTE format('DELETE FROM payments WHERE clinic_id = %L', v_clinic_id);
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Tabla payments no existe - omitiendo.';
  END;

  DELETE FROM bookings       WHERE clinic_id = v_clinic_id;
  DELETE FROM events         WHERE clinic_id = v_clinic_id;
  DELETE FROM pets           WHERE clinic_id = v_clinic_id;
  DELETE FROM clients        WHERE clinic_id = v_clinic_id;
  DELETE FROM service_types  WHERE clinic_id = v_clinic_id;

  -- TIPOS DE SERVICIO
  INSERT INTO service_types (id, clinic_id, name, price, active, sort_order) VALUES
    (s1, v_clinic_id, 'Consulta general',        50.00, true, 1),
    (s2, v_clinic_id, 'Vacuna antirrábica',       80.00, true, 2),
    (s3, v_clinic_id, 'Baño y corte',             60.00, true, 3),
    (s4, v_clinic_id, 'Desparasitación',          45.00, true, 4),
    (s5, v_clinic_id, 'Control post-operatorio',  70.00, true, 5);

  -- CLIENTES
  INSERT INTO clients (id, clinic_id, name, phone, email, address, notes) VALUES
    (c1, v_clinic_id, 'María Fernández',
      '987654321', 'maria.fernandez@gmail.com',
      'Av. Javier Prado 1245, San Isidro',
      'Cliente frecuente. Muy puntual.'),
    (c2, v_clinic_id, 'Carlos Quispe',
      '976543210', 'cquispe@hotmail.com',
      'Jr. Huallaga 450, Cercado de Lima',
      'Prefiere citas en la manana.'),
    (c3, v_clinic_id, 'Ana Lucía Torres',
      '965432109', 'anatorres@gmail.com',
      'Calle Las Begonias 320, Miraflores',
      'Simba tiene dieta renal especial.'),
    (c4, v_clinic_id, 'Jorge Mamani',
      '954321098', 'jmamani@outlook.com',
      'Av. Tupac Amaru 892, Comas',
      'Cliente nuevo referido por María.'),
    (c5, v_clinic_id, 'Lucía Vargas',
      '943210987', 'lvargas@gmail.com',
      'Av. Benavides 1560, Surco',
      'Tiene 2 gatos. Prefiere citas los sabados.');

  -- MASCOTAS
  INSERT INTO pets (id, clinic_id, user_id, name, type, birth_date, default_price) VALUES
    (p1, v_clinic_id, c1, 'Toby',  'dog', (today - interval '3 years')::date,  50.00),
    (p2, v_clinic_id, c1, 'Mía',   'cat', (today - interval '2 years')::date,  50.00),
    (p3, v_clinic_id, c2, 'Rocky', 'dog', (today - interval '5 years')::date,  50.00),
    (p4, v_clinic_id, c3, 'Luna',  'dog', (today - interval '1 year')::date,   60.00),
    (p5, v_clinic_id, c3, 'Simba', 'cat', (today - interval '4 years')::date,  50.00),
    (p6, v_clinic_id, c4, 'Coco',  'dog', (today - interval '8 months')::date, 50.00),
    (p7, v_clinic_id, c5, 'Nube',  'cat', (today - interval '6 years')::date,  50.00);

  -- CITAS (pasadas COMPLETED + hoy + futuras)
  INSERT INTO bookings (id, clinic_id, pet_id, date, time, status, notes, service_type_id, price, requires_pickup, payment_status) VALUES
    (b1,  v_clinic_id, p3, today-21, '09:00', 'COMPLETED', 'Control anual Rocky.',               s1, 50.00, false, 'paid'),
    (b2,  v_clinic_id, p5, today-21, '11:30', 'COMPLETED', 'Revisión dieta renal Simba.',         s1, 50.00, false, 'paid'),
    (b3,  v_clinic_id, p1, today-21, '15:00', 'COMPLETED', 'Baño y corte Toby.',                  s3, 60.00, false, 'paid'),
    (b4,  v_clinic_id, p2, today-14, '10:00', 'COMPLETED', 'Vacuna triple felina Mía.',           s2, 80.00, false, 'paid'),
    (b5,  v_clinic_id, p7, today-14, '12:00', 'COMPLETED', 'Desparasitación Nube.',               s4, 45.00, false, 'paid'),
    (b6,  v_clinic_id, p4, today-14, '16:00', 'COMPLETED', 'Baño y corte poodle Luna.',           s3, 60.00, false, 'paid'),
    (b7,  v_clinic_id, p1, today-7,  '10:00', 'COMPLETED', 'Control post-operatorio Toby.',       s5, 70.00, false, 'paid'),
    (b8,  v_clinic_id, p6, today-7,  '14:00', 'COMPLETED', 'Primera consulta Coco.',              s1, 50.00, false, 'paid'),
    (b9,  v_clinic_id, p3, today-5,  '09:30', 'COMPLETED', 'Vacuna antirrábica Rocky.',           s2, 80.00, false, 'paid'),
    (b10, v_clinic_id, p5, today-1,  '11:00', 'COMPLETED', 'Seguimiento dieta renal Simba.',      s1, 50.00, false, 'paid'),
    (b11, v_clinic_id, p7, today-1,  '15:30', 'COMPLETED', 'Baño Nube.',                          s3, 60.00, false, 'paid'),
    (b12, v_clinic_id, p1, today,    '10:00', 'CONFIRMED', 'Control anual + vacuna antirrábica.', s2, 80.00, false, 'pending'),
    (b13, v_clinic_id, p4, today,    '14:30', 'CONFIRMED', 'Baño y corte. Estilo show poodle.',   s3, 60.00, false, 'pending'),
    (b14, v_clinic_id, p3, today+1,  '09:00', 'CONFIRMED', 'Vacuna antirrábica URGENTE.',         s2, 80.00, false, 'pending'),
    (b15, v_clinic_id, p6, today+7,  '15:00', 'PENDING',   'Desparasitación mensual Coco.',       s4, 45.00, false, 'pending');

  -- EVENTOS
  INSERT INTO events (clinic_id, pet_id, type, scheduled_date, status) VALUES
    (v_clinic_id, p3, 'vaccine',   today-30,  'NOTIFIED'),
    (v_clinic_id, p5, 'checkup',   today+1,   'PENDING'),
    (v_clinic_id, p2, 'vaccine',   today+2,   'PENDING'),
    (v_clinic_id, p4, 'grooming',  today+30,  'PENDING'),
    (v_clinic_id, p6, 'deworming', today+7,   'PENDING'),
    (v_clinic_id, p1, 'vaccine',   today+365, 'PENDING'),
    (v_clinic_id, p7, 'checkup',   today+14,  'PENDING');

  -- PAGOS
  BEGIN
    INSERT INTO payments (clinic_id, booking_id, client_id, pet_id, amount, method, description, date) VALUES
      (v_clinic_id, b1,  c2, p3, 50.00, 'yape',     'Consulta general Rocky',          today-21),
      (v_clinic_id, b2,  c3, p5, 50.00, 'transfer', 'Consulta general Simba',           today-21),
      (v_clinic_id, b3,  c1, p1, 60.00, 'cash',     'Baño y corte Toby',                today-21),
      (v_clinic_id, b4,  c1, p2, 80.00, 'yape',     'Vacuna triple felina Mía',         today-14),
      (v_clinic_id, b5,  c5, p7, 45.00, 'cash',     'Desparasitación Nube',             today-14),
      (v_clinic_id, b6,  c3, p4, 60.00, 'card',     'Baño y corte Luna',                today-14),
      (v_clinic_id, b7,  c1, p1, 70.00, 'transfer', 'Control post-operatorio Toby',     today-7),
      (v_clinic_id, b8,  c4, p6, 50.00, 'yape',     'Primera consulta Coco',            today-7),
      (v_clinic_id, b9,  c2, p3, 80.00, 'cash',     'Vacuna antirrábica Rocky',         today-5),
      (v_clinic_id, b10, c3, p5, 50.00, 'yape',     'Seguimiento dieta renal Simba',    today-1),
      (v_clinic_id, b11, c5, p7, 60.00, 'cash',     'Baño Nube',                        today-1);
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Tabla payments no existe - omitiendo pagos.';
  END;

  -- HISTORIA CLÍNICA
  BEGIN
    INSERT INTO medical_records (clinic_id, pet_id, date, type, diagnosis, treatment, notes, vet, weight) VALUES
      (v_clinic_id, p1, today-21, 'grooming',
        NULL, 'Baño shampoo antialérgico + corte estilo cocker.',
        'Pelaje en buen estado. Sin irritaciones.', 'Técnico Vet', 12.5),
      (v_clinic_id, p3, today-21, 'consultation',
        'Paciente sano. Control anual.', 'Vitaminas A+D oral 30 días.',
        'Peso estable. Dientes en buen estado.', 'Dr. Mendoza', 28.0),
      (v_clinic_id, p5, today-21, 'consultation',
        'Enfermedad renal crónica estadio 2.', 'Dieta renal Hills k/d + hidratación.',
        'Creatinina 2.1 mg/dL. Repetir análisis en 30 días.', 'Dra. Castillo', 4.8),
      (v_clinic_id, p2, today-14, 'vaccine',
        NULL, 'Triple felina refuerzo anual. Lote V-2024.',
        'Sin reacción adversa.', 'Dr. Mendoza', 3.9),
      (v_clinic_id, p7, today-14, 'deworming',
        NULL, 'Milbemax 1 comprimido oral.',
        'Próxima desparasitación en 90 días.', 'Técnico Vet', 5.2),
      (v_clinic_id, p4, today-14, 'grooming',
        NULL, 'Baño + corte estilo poodle show.',
        'Pelaje muy denso. Se recomienda cepillado diario.', 'Técnico Vet', 7.1),
      (v_clinic_id, p1, today-7, 'other',
        'Post-op esterilización (día 7).', 'Antibiótico amoxicilina 250mg 3 días más.',
        'Herida cicatrizando bien. Retirar puntos en 3 días.', 'Dr. Mendoza', 12.3),
      (v_clinic_id, p6, today-7, 'consultation',
        'Cachorro sano. Primera visita.', 'Plan vacunal iniciado. Puppy 1ra dosis.',
        'Sin parásitos. Peso normal para edad.', 'Dra. Castillo', 3.2),
      (v_clinic_id, p3, today-5, 'vaccine',
        NULL, 'Vacuna antirrábica. Lote R-2024.',
        'Vacuna vencida hace 30 días. Ahora al día.', 'Dr. Mendoza', 27.5),
      (v_clinic_id, p5, today-1, 'consultation',
        'ERC estadio 2. Seguimiento mensual.', 'Mantener dieta renal. Agregar Omega-3.',
        'Creatinina 1.9 - ligera mejoría.', 'Dra. Castillo', 4.9);
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Tabla medical_records no existe - omitiendo historial.';
  END;

  -- CONVERSACIONES
  INSERT INTO conversations (id, clinic_id, phone, client_name, bot_active, unread_count, last_message, last_message_at) VALUES
    (conv1, v_clinic_id, '51987654321', 'María Fernández',  true,  0,
      'Perfecto, nos vemos manana', now() - interval '2 hours'),
    (conv2, v_clinic_id, '51976543210', 'Carlos Quispe',    true,  2,
      'A qué hora debo llegar con Rocky?', now() - interval '25 minutes'),
    (conv3, v_clinic_id, '51965432109', 'Ana Lucía Torres', false, 0,
      'Gracias, confirmo para manana las 11am', now() - interval '1 day'),
    (conv4, v_clinic_id, '51943210987', 'Lucía Vargas',     true,  1,
      'Quisiera una cita para Nube esta semana', now() - interval '3 hours');

  INSERT INTO messages (conversation_id, from_type, body, created_at) VALUES
    (conv1, 'client', 'Hola! Quería una cita para Toby, le toca su vacuna', now() - interval '3 hours'),
    (conv1, 'bot',    '¡Hola María! Tengo hoy a las 10:00am. ¿Confirmamos?', now() - interval '3 hours' + interval '8 seconds'),
    (conv1, 'client', 'Hoy a las 10 perfecto', now() - interval '2 hours' - interval '10 minutes'),
    (conv1, 'bot',    '✅ Cita confirmada! Toby · Vacuna · Hoy ' || to_char(today,'DD/MM') || ' · 10:00am', now() - interval '2 hours' - interval '9 seconds'),
    (conv1, 'client', 'Perfecto, nos vemos manana', now() - interval '2 hours'),
    (conv2, 'bot',    '⏰ Hola Carlos! La vacuna de Rocky venció hace 30 días. ¿Lo agendamos? 💉', now() - interval '1 hour'),
    (conv2, 'client', 'Ay sí, me olvidé! Sí por favor', now() - interval '50 minutes'),
    (conv2, 'bot',    'Tengo manana a las 9:00am. ¿Confirmamos?', now() - interval '49 minutes'),
    (conv2, 'client', 'Sí, confirmado', now() - interval '30 minutes'),
    (conv2, 'bot',    '✅ Rocky · Vacuna · Manana ' || to_char(today+1,'DD/MM') || ' · 9:00am', now() - interval '29 minutes'),
    (conv2, 'client', 'A qué hora debo llegar con Rocky?', now() - interval '25 minutes'),
    (conv3, 'client', 'Hola! Quiero agendar control para Simba, tiene dieta renal', now() - interval '1 day' - interval '2 hours'),
    (conv3, 'bot',    '¡Hola Ana! Anoto la dieta renal. Tengo manana 11:00am. ¿Confirmas?', now() - interval '1 day' - interval '2 hours' + interval '5 seconds'),
    (conv3, 'client', 'Gracias, confirmo para manana las 11am', now() - interval '1 day'),
    (conv4, 'client', 'Hola! Quisiera una cita para Nube esta semana', now() - interval '3 hours'),
    (conv4, 'bot',    '¡Hola Lucía! ¿Qué servicio necesita Nube? ¿Consulta, baño o vacuna?', now() - interval '3 hours' + interval '6 seconds');

  -- AUTOMATIZACIONES
  INSERT INTO automations (clinic_id, name, description, icon, category, trigger_event, condition_json, action_type, message_template, delay_minutes, active) VALUES
    (v_clinic_id, 'Recordatorio de turno', 'Confirma el turno el día anterior.',
      '📅', 'Citas', 'booking_created', '{"days_ahead": 1}'::jsonb, 'send_message',
      'Hola {client_name} 👋 Mañana a las {booking_time} tienes turno para {pet_name}. ¡Nos vemos! 🐾',
      0, true),
    (v_clinic_id, 'Seguimiento post-consulta', 'Pregunta cómo está la mascota 48h después.',
      '🏥', 'Fidelización', 'booking_completed', '{}'::jsonb, 'send_message',
      'Hola {client_name} 👋 ¿Cómo está {pet_name} después de su consulta? 🐾',
      0, true),
    (v_clinic_id, 'Recordatorio de vacuna', 'Avisa cuando una vacuna está por vencer.',
      '💉', 'Salud', 'pet_event_due', '{}'::jsonb, 'send_message',
      'Hola {client_name} 👋 {pet_name} tiene un evento para el {fecha}. ¿Lo agendamos? 🏥',
      0, true),
    (v_clinic_id, 'Reactivar cliente inactivo', 'Reactiva clientes sin cita en 45 días.',
      '🔔', 'Reactivación', 'booking_completed', '{"inactive_days": 45}'::jsonb, 'send_message',
      'Hola {client_name} 👋 Hace tiempo que no vemos a {pet_name}. ¿Agendamos? 😊',
      0, false);

  RAISE NOTICE '✅ Demo data cargada para clinic_id: %', v_clinic_id;
END $$;
