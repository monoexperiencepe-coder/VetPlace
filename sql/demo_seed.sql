-- ============================================================
-- VetPlace — Demo Data Seed completo (clientes nuevos + antiguos + pagos)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- PREREQUISITOS: correr payments.sql y medical_records.sql primero
-- ============================================================

DO $$
DECLARE
  v_clinic_id uuid;

  -- Clientes activos (recientes)
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid();
  c5 uuid := gen_random_uuid();

  -- Clientes históricos (con historial pagado)
  h1 uuid := gen_random_uuid();
  h2 uuid := gen_random_uuid();
  h3 uuid := gen_random_uuid();
  h4 uuid := gen_random_uuid();
  h5 uuid := gen_random_uuid();

  -- Mascotas de clientes activos
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
  p4 uuid := gen_random_uuid();
  p5 uuid := gen_random_uuid();
  p6 uuid := gen_random_uuid();
  p7 uuid := gen_random_uuid();

  -- Mascotas de clientes históricos
  ph1 uuid := gen_random_uuid();
  ph2 uuid := gen_random_uuid();
  ph3 uuid := gen_random_uuid();
  ph4 uuid := gen_random_uuid();
  ph5 uuid := gen_random_uuid();
  ph6 uuid := gen_random_uuid();

  -- Service types
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  s3 uuid := gen_random_uuid();
  s4 uuid := gen_random_uuid();
  s5 uuid := gen_random_uuid();

  -- Bookings activos
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

  -- Bookings históricos (45-90 días atrás)
  bh1  uuid := gen_random_uuid();
  bh2  uuid := gen_random_uuid();
  bh3  uuid := gen_random_uuid();
  bh4  uuid := gen_random_uuid();
  bh5  uuid := gen_random_uuid();
  bh6  uuid := gen_random_uuid();
  bh7  uuid := gen_random_uuid();
  bh8  uuid := gen_random_uuid();
  bh9  uuid := gen_random_uuid();
  bh10 uuid := gen_random_uuid();
  bh11 uuid := gen_random_uuid();
  bh12 uuid := gen_random_uuid();

  -- Conversations
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

  -- ── LIMPIAR ────────────────────────────────────────────
  DELETE FROM messages
    WHERE conversation_id IN (SELECT id FROM conversations WHERE clinic_id = v_clinic_id);
  DELETE FROM conversations  WHERE clinic_id = v_clinic_id;
  DELETE FROM domain_events  WHERE clinic_id = v_clinic_id;
  DELETE FROM automations    WHERE clinic_id = v_clinic_id;

  BEGIN
    EXECUTE format('DELETE FROM medical_records WHERE clinic_id = %L', v_clinic_id);
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    EXECUTE format('DELETE FROM payments WHERE clinic_id = %L', v_clinic_id);
  EXCEPTION WHEN undefined_table THEN NULL; END;

  DELETE FROM bookings       WHERE clinic_id = v_clinic_id;
  DELETE FROM events         WHERE clinic_id = v_clinic_id;
  DELETE FROM pets           WHERE clinic_id = v_clinic_id;
  DELETE FROM clients        WHERE clinic_id = v_clinic_id;
  DELETE FROM service_types  WHERE clinic_id = v_clinic_id;

  -- ── TIPOS DE SERVICIO ──────────────────────────────────
  INSERT INTO service_types (id, clinic_id, name, price, active, sort_order) VALUES
    (s1, v_clinic_id, 'Consulta general',        50.00, true, 1),
    (s2, v_clinic_id, 'Vacuna antirrábica',       80.00, true, 2),
    (s3, v_clinic_id, 'Baño y corte',             60.00, true, 3),
    (s4, v_clinic_id, 'Desparasitación',          45.00, true, 4),
    (s5, v_clinic_id, 'Control post-operatorio',  70.00, true, 5);

  -- ── CLIENTES ACTIVOS ───────────────────────────────────
  INSERT INTO clients (id, clinic_id, name, phone, email, address, notes) VALUES
    (c1, v_clinic_id, 'María Fernández',  '987654321', 'maria.fernandez@gmail.com',
      'Av. Javier Prado 1245, San Isidro', 'Cliente frecuente. Muy puntual.'),
    (c2, v_clinic_id, 'Carlos Quispe',    '976543210', 'cquispe@hotmail.com',
      'Jr. Huallaga 450, Cercado de Lima', 'Prefiere citas en la manana.'),
    (c3, v_clinic_id, 'Ana Lucía Torres', '965432109', 'anatorres@gmail.com',
      'Calle Las Begonias 320, Miraflores', 'Simba tiene dieta renal especial.'),
    (c4, v_clinic_id, 'Jorge Mamani',     '954321098', 'jmamani@outlook.com',
      'Av. Tupac Amaru 892, Comas', 'Cliente nuevo referido por María.'),
    (c5, v_clinic_id, 'Lucía Vargas',     '943210987', 'lvargas@gmail.com',
      'Av. Benavides 1560, Surco', 'Tiene 2 gatos. Prefiere sabados.');

  -- ── CLIENTES HISTÓRICOS (con servicios ya pagados) ────
  INSERT INTO clients (id, clinic_id, name, phone, email, address, notes) VALUES
    (h1, v_clinic_id, 'Rosa Delgado',    '932109876', 'rdelgado@gmail.com',
      'Av. Brasil 520, Breña', 'Cliente desde hace 2 años. Muy puntual.'),
    (h2, v_clinic_id, 'Pedro Salinas',   '921098765', 'psalinas@outlook.com',
      'Calle Lima 88, San Borja', 'Tiene perro mediano. Trae siempre a tiempo.'),
    (h3, v_clinic_id, 'Carmen Huanca',   '910987654', 'chuanca@gmail.com',
      'Jr. Arequipa 234, Lince', 'Gata anciana. Visitas de control cada mes.'),
    (h4, v_clinic_id, 'Manuel Ramos',    '909876543', 'mramos@hotmail.com',
      'Av. Colonial 1100, Lima', 'Tres mascotas. Cliente VIP.'),
    (h5, v_clinic_id, 'Sandra Cjuno',    '898765432', 'scjuno@gmail.com',
      'Av. Angamos 670, Surquillo', 'Recién llegó al barrio. Recomendada.');

  -- ── MASCOTAS (clientes activos) ───────────────────────
  INSERT INTO pets (id, clinic_id, user_id, name, type, birth_date, default_price) VALUES
    (p1, v_clinic_id, c1, 'Toby',  'dog', (today-interval'3 years')::date,  50.00),
    (p2, v_clinic_id, c1, 'Mía',   'cat', (today-interval'2 years')::date,  50.00),
    (p3, v_clinic_id, c2, 'Rocky', 'dog', (today-interval'5 years')::date,  50.00),
    (p4, v_clinic_id, c3, 'Luna',  'dog', (today-interval'1 year')::date,   60.00),
    (p5, v_clinic_id, c3, 'Simba', 'cat', (today-interval'4 years')::date,  50.00),
    (p6, v_clinic_id, c4, 'Coco',  'dog', (today-interval'8 months')::date, 50.00),
    (p7, v_clinic_id, c5, 'Nube',  'cat', (today-interval'6 years')::date,  50.00);

  -- ── MASCOTAS (clientes históricos) ────────────────────
  INSERT INTO pets (id, clinic_id, user_id, name, type, birth_date, default_price) VALUES
    (ph1, v_clinic_id, h1, 'Bella',  'dog', (today-interval'4 years')::date,  55.00),
    (ph2, v_clinic_id, h2, 'Max',    'dog', (today-interval'7 years')::date,  50.00),
    (ph3, v_clinic_id, h3, 'Kitty',  'cat', (today-interval'9 years')::date,  50.00),
    (ph4, v_clinic_id, h4, 'Paco',   'dog', (today-interval'2 years')::date,  50.00),
    (ph5, v_clinic_id, h4, 'Nina',   'cat', (today-interval'3 years')::date,  50.00),
    (ph6, v_clinic_id, h5, 'Bruno',  'dog', (today-interval'1 year')::date,   60.00);

  -- ── CITAS RECIENTES (3 semanas atrás hasta hoy + futuras) ─
  INSERT INTO bookings (id, clinic_id, pet_id, date, time, status, notes, service_type_id, price, requires_pickup, payment_status) VALUES
    (b1,  v_clinic_id, p3, today-21, '09:00', 'COMPLETED', 'Control anual Rocky.',            s1, 50.00, false, 'paid'),
    (b2,  v_clinic_id, p5, today-21, '11:30', 'COMPLETED', 'Revisión dieta renal Simba.',     s1, 50.00, false, 'paid'),
    (b3,  v_clinic_id, p1, today-21, '15:00', 'COMPLETED', 'Baño y corte Toby.',              s3, 60.00, false, 'paid'),
    (b4,  v_clinic_id, p2, today-14, '10:00', 'COMPLETED', 'Vacuna triple felina Mía.',       s2, 80.00, false, 'paid'),
    (b5,  v_clinic_id, p7, today-14, '12:00', 'COMPLETED', 'Desparasitación Nube.',           s4, 45.00, false, 'paid'),
    (b6,  v_clinic_id, p4, today-14, '16:00', 'COMPLETED', 'Baño y corte poodle Luna.',       s3, 60.00, false, 'paid'),
    (b7,  v_clinic_id, p1, today-7,  '10:00', 'COMPLETED', 'Control post-operatorio Toby.',   s5, 70.00, false, 'paid'),
    (b8,  v_clinic_id, p6, today-7,  '14:00', 'COMPLETED', 'Primera consulta Coco.',          s1, 50.00, false, 'paid'),
    (b9,  v_clinic_id, p3, today-5,  '09:30', 'COMPLETED', 'Vacuna antirrábica Rocky.',       s2, 80.00, false, 'paid'),
    (b10, v_clinic_id, p5, today-1,  '11:00', 'COMPLETED', 'Seguimiento dieta renal Simba.',  s1, 50.00, false, 'paid'),
    (b11, v_clinic_id, p7, today-1,  '15:30', 'COMPLETED', 'Baño Nube.',                      s3, 60.00, false, 'paid'),
    -- HOY
    (b12, v_clinic_id, p1, today,    '10:00', 'CONFIRMED', 'Control anual + vacuna antirrábica.', s2, 80.00, false, 'pending'),
    (b13, v_clinic_id, p4, today,    '14:30', 'CONFIRMED', 'Baño y corte. Estilo show poodle.',   s3, 60.00, false, 'pending'),
    -- MAÑANA
    (b14, v_clinic_id, p3, today+1,  '09:00', 'CONFIRMED', 'Vacuna antirrábica URGENTE.',         s2, 80.00, false, 'pending'),
    -- PRÓXIMA SEMANA (PENDING)
    (b15, v_clinic_id, p6, today+7,  '15:00', 'PENDING',   'Desparasitación mensual Coco.',       s4, 45.00, false, 'pending');

  -- ── CITAS HISTÓRICAS (45–90 días) ─────────────────────
  INSERT INTO bookings (id, clinic_id, pet_id, date, time, status, notes, service_type_id, price, requires_pickup, payment_status) VALUES
    (bh1,  v_clinic_id, ph1, today-85, '09:00', 'COMPLETED', 'Consulta general Bella.',          s1, 55.00, false, 'paid'),
    (bh2,  v_clinic_id, ph2, today-85, '11:00', 'COMPLETED', 'Vacuna antirrábica Max.',           s2, 80.00, false, 'paid'),
    (bh3,  v_clinic_id, ph3, today-80, '10:30', 'COMPLETED', 'Control geriátrico Kitty.',         s1, 50.00, false, 'paid'),
    (bh4,  v_clinic_id, ph4, today-75, '09:00', 'COMPLETED', 'Baño y corte Paco.',                s3, 60.00, false, 'paid'),
    (bh5,  v_clinic_id, ph5, today-75, '14:00', 'COMPLETED', 'Desparasitación Nina.',             s4, 45.00, false, 'paid'),
    (bh6,  v_clinic_id, ph1, today-60, '10:00', 'COMPLETED', 'Baño y corte Bella.',               s3, 60.00, false, 'paid'),
    (bh7,  v_clinic_id, ph2, today-55, '09:00', 'COMPLETED', 'Control anual Max.',                s1, 50.00, false, 'paid'),
    (bh8,  v_clinic_id, ph3, today-50, '11:30', 'COMPLETED', 'Consulta + análisis Kitty.',        s1, 50.00, false, 'paid'),
    (bh9,  v_clinic_id, ph6, today-48, '15:00', 'COMPLETED', 'Primera consulta Bruno.',           s1, 60.00, false, 'paid'),
    (bh10, v_clinic_id, ph4, today-45, '10:00', 'COMPLETED', 'Vacuna antirrábica Paco.',          s2, 80.00, false, 'paid'),
    (bh11, v_clinic_id, ph1, today-30, '09:30', 'COMPLETED', 'Control rutina Bella.',             s1, 55.00, false, 'paid'),
    (bh12, v_clinic_id, ph6, today-28, '14:00', 'COMPLETED', 'Desparasitación Bruno.',            s4, 45.00, false, 'paid');

  -- ── EVENTOS ───────────────────────────────────────────
  INSERT INTO events (clinic_id, pet_id, type, scheduled_date, status) VALUES
    (v_clinic_id, p3, 'vaccine',   today-30,  'NOTIFIED'),
    (v_clinic_id, p5, 'checkup',   today+1,   'PENDING'),
    (v_clinic_id, p2, 'vaccine',   today+2,   'PENDING'),
    (v_clinic_id, p4, 'grooming',  today+30,  'PENDING'),
    (v_clinic_id, p6, 'deworming', today+7,   'PENDING'),
    (v_clinic_id, p1, 'vaccine',   today+365, 'PENDING'),
    (v_clinic_id, p7, 'checkup',   today+14,  'PENDING'),
    (v_clinic_id, ph1,'vaccine',   today+15,  'PENDING'),
    (v_clinic_id, ph2,'checkup',   today+20,  'PENDING');

  -- ── PAGOS (recientes) ─────────────────────────────────
  BEGIN
    INSERT INTO payments (clinic_id, booking_id, client_id, pet_id, amount, method, description, date) VALUES
      (v_clinic_id, b1,  c2, p3, 50.00, 'yape',     'Consulta Rocky',              today-21),
      (v_clinic_id, b2,  c3, p5, 50.00, 'transfer', 'Consulta Simba',              today-21),
      (v_clinic_id, b3,  c1, p1, 60.00, 'cash',     'Baño y corte Toby',           today-21),
      (v_clinic_id, b4,  c1, p2, 80.00, 'yape',     'Vacuna triple Mía',           today-14),
      (v_clinic_id, b5,  c5, p7, 45.00, 'cash',     'Desparasitación Nube',        today-14),
      (v_clinic_id, b6,  c3, p4, 60.00, 'card',     'Baño Luna',                   today-14),
      (v_clinic_id, b7,  c1, p1, 70.00, 'transfer', 'Post-operatorio Toby',        today-7),
      (v_clinic_id, b8,  c4, p6, 50.00, 'yape',     'Consulta Coco',               today-7),
      (v_clinic_id, b9,  c2, p3, 80.00, 'cash',     'Vacuna antirrábica Rocky',    today-5),
      (v_clinic_id, b10, c3, p5, 50.00, 'yape',     'Seguimiento dieta Simba',     today-1),
      (v_clinic_id, b11, c5, p7, 60.00, 'cash',     'Baño Nube',                   today-1),
      -- Pagos históricos (clientes antiguos)
      (v_clinic_id, bh1,  h1, ph1, 55.00, 'cash',     'Consulta Bella',            today-85),
      (v_clinic_id, bh2,  h2, ph2, 80.00, 'yape',     'Vacuna antirrábica Max',    today-85),
      (v_clinic_id, bh3,  h3, ph3, 50.00, 'transfer', 'Control geriátrico Kitty',  today-80),
      (v_clinic_id, bh4,  h4, ph4, 60.00, 'cash',     'Baño y corte Paco',         today-75),
      (v_clinic_id, bh5,  h4, ph5, 45.00, 'yape',     'Desparasitación Nina',      today-75),
      (v_clinic_id, bh6,  h1, ph1, 60.00, 'card',     'Baño Bella',                today-60),
      (v_clinic_id, bh7,  h2, ph2, 50.00, 'cash',     'Control anual Max',         today-55),
      (v_clinic_id, bh8,  h3, ph3, 50.00, 'transfer', 'Consulta + análisis Kitty', today-50),
      (v_clinic_id, bh9,  h5, ph6, 60.00, 'yape',     'Consulta Bruno',            today-48),
      (v_clinic_id, bh10, h4, ph4, 80.00, 'cash',     'Vacuna antirrábica Paco',   today-45),
      (v_clinic_id, bh11, h1, ph1, 55.00, 'yape',     'Control Bella',             today-30),
      (v_clinic_id, bh12, h5, ph6, 45.00, 'cash',     'Desparasitación Bruno',     today-28);
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Tabla payments no existe - correr payments.sql primero.';
  END;

  -- ── HISTORIA CLÍNICA ──────────────────────────────────
  BEGIN
    INSERT INTO medical_records (clinic_id, pet_id, date, type, diagnosis, treatment, notes, vet, weight) VALUES
      (v_clinic_id, p1, today-21, 'grooming',    NULL, 'Baño antialérgico + corte cocker.', 'Pelaje en buen estado.', 'Técnico Vet', 12.5),
      (v_clinic_id, p3, today-21, 'consultation','Paciente sano.', 'Vitaminas A+D 30 días.', 'Peso estable.', 'Dr. Mendoza', 28.0),
      (v_clinic_id, p5, today-21, 'consultation','ERC estadio 2.', 'Dieta Hills k/d.', 'Creatinina 2.1.', 'Dra. Castillo', 4.8),
      (v_clinic_id, p2, today-14, 'vaccine',     NULL, 'Triple felina refuerzo.', 'Sin reacción adversa.', 'Dr. Mendoza', 3.9),
      (v_clinic_id, p7, today-14, 'deworming',   NULL, 'Milbemax 1 comprimido.', 'Próxima en 90 días.', 'Técnico Vet', 5.2),
      (v_clinic_id, p4, today-14, 'grooming',    NULL, 'Baño + corte poodle show.', 'Cepillado diario recomendado.', 'Técnico Vet', 7.1),
      (v_clinic_id, p1, today-7,  'other',       'Post-op esterilización día 7.', 'Antibiótico 3 días más.', 'Herida cicatrizando bien.', 'Dr. Mendoza', 12.3),
      (v_clinic_id, p6, today-7,  'consultation','Cachorro sano.', 'Plan vacunal iniciado.', 'Sin parásitos.', 'Dra. Castillo', 3.2),
      (v_clinic_id, p3, today-5,  'vaccine',     NULL, 'Vacuna antirrábica lote R-2024.', 'Vacuna al día.', 'Dr. Mendoza', 27.5),
      (v_clinic_id, p5, today-1,  'consultation','ERC estadio 2 — seguimiento.', 'Mantener dieta. Agregar Omega-3.', 'Creatinina 1.9 — mejoría.', 'Dra. Castillo', 4.9),
      -- Históricos
      (v_clinic_id, ph1, today-85, 'consultation','Control anual. Sana.', 'Vacuna pentavalente.', 'Peso ideal.', 'Dr. Mendoza', 18.0),
      (v_clinic_id, ph2, today-85, 'vaccine',    NULL, 'Antirrábica refuerzo.', 'Sin reacción.', 'Dr. Mendoza', 30.5),
      (v_clinic_id, ph3, today-80, 'consultation','Gata geriátrica. Artritis leve.', 'Meloxicam 0.5mg/kg.', 'Movilidad reducida. Dieta senior.', 'Dra. Castillo', 3.8),
      (v_clinic_id, ph1, today-60, 'grooming',   NULL, 'Baño suave + corte.', 'Pelaje brillante.', 'Técnico Vet', 18.2),
      (v_clinic_id, ph6, today-48, 'consultation','Cachorro sano. Primera visita.', 'Plan vacunal iniciado.', 'Excelente condición.', 'Dr. Mendoza', 8.5);
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Tabla medical_records no existe - correr medical_records.sql primero.';
  END;

  -- ── CONVERSACIONES ────────────────────────────────────
  INSERT INTO conversations (id, clinic_id, phone, client_name, bot_active, unread_count, last_message, last_message_at) VALUES
    (conv1, v_clinic_id, '51987654321', 'María Fernández',  true,  0,
      'Perfecto, nos vemos manana', now()-interval'2 hours'),
    (conv2, v_clinic_id, '51976543210', 'Carlos Quispe',    true,  2,
      'A qué hora debo llegar con Rocky?', now()-interval'25 minutes'),
    (conv3, v_clinic_id, '51965432109', 'Ana Lucía Torres', false, 0,
      'Gracias, confirmo para manana las 11am', now()-interval'1 day'),
    (conv4, v_clinic_id, '51943210987', 'Lucía Vargas',     true,  1,
      'Quisiera una cita para Nube esta semana', now()-interval'3 hours');

  INSERT INTO messages (conversation_id, from_type, body, created_at) VALUES
    (conv1,'client','Hola! Quería cita para Toby, le toca vacuna', now()-interval'3 hours'),
    (conv1,'bot',   'Hola María! Tengo hoy 10:00am. Confirmamos?', now()-interval'3 hours'+interval'8 seconds'),
    (conv1,'client','Hoy a las 10 perfecto', now()-interval'2 hours'-interval'10 minutes'),
    (conv1,'bot',   '✅ Confirmado! Toby · Vacuna · Hoy '||to_char(today,'DD/MM')||' · 10:00am', now()-interval'2 hours'-interval'9 seconds'),
    (conv1,'client','Perfecto, nos vemos manana', now()-interval'2 hours'),
    (conv2,'bot',   '⏰ Hola Carlos! La vacuna de Rocky venció hace 30 días. Lo agendamos? 💉', now()-interval'1 hour'),
    (conv2,'client','Ay sí, me olvidé! Por favor', now()-interval'50 minutes'),
    (conv2,'bot',   'Tengo manana 9:00am. Confirmamos?', now()-interval'49 minutes'),
    (conv2,'client','Sí, confirmado', now()-interval'30 minutes'),
    (conv2,'bot',   '✅ Rocky · Vacuna · Manana '||to_char(today+1,'DD/MM')||' · 9:00am', now()-interval'29 minutes'),
    (conv2,'client','A qué hora debo llegar con Rocky?', now()-interval'25 minutes'),
    (conv3,'client','Hola! Quiero agendar control para Simba, tiene dieta renal', now()-interval'1 day'-interval'2 hours'),
    (conv3,'bot',   'Hola Ana! Anoto dieta renal. Tengo manana 11am. Confirmas?', now()-interval'1 day'-interval'2 hours'+interval'5 seconds'),
    (conv3,'client','Gracias, confirmo manana 11am', now()-interval'1 day'),
    (conv4,'client','Hola! Quisiera cita para Nube esta semana', now()-interval'3 hours'),
    (conv4,'bot',   'Hola Lucía! Qué servicio necesita Nube? Consulta, baño o vacuna?', now()-interval'3 hours'+interval'6 seconds');

  -- ── AUTOMATIZACIONES ──────────────────────────────────
  INSERT INTO automations (clinic_id, name, description, icon, category, trigger_event, condition_json, action_type, message_template, delay_minutes, active) VALUES
    (v_clinic_id,'Recordatorio de turno','Confirma el turno el día anterior.',
      '📅','Citas','booking_created','{"days_ahead":1}'::jsonb,'send_message',
      'Hola {client_name} Mañana a las {booking_time} tienes turno para {pet_name}. Nos vemos!',0,true),
    (v_clinic_id,'Seguimiento post-consulta','Pregunta cómo está la mascota 48h después.',
      '🏥','Fidelización','booking_completed','{}'::jsonb,'send_message',
      'Hola {client_name} Cómo está {pet_name} después de su consulta?',0,true),
    (v_clinic_id,'Recordatorio de vacuna','Avisa cuando una vacuna está por vencer.',
      '💉','Salud','pet_event_due','{}'::jsonb,'send_message',
      'Hola {client_name} {pet_name} tiene un evento para el {fecha}. Lo agendamos?',0,true),
    (v_clinic_id,'Reactivar cliente inactivo','Reactiva clientes sin cita en 45 días.',
      '🔔','Reactivación','booking_completed','{"inactive_days":45}'::jsonb,'send_message',
      'Hola {client_name} Hace tiempo que no vemos a {pet_name}. Agendamos?',0,false);

  RAISE NOTICE '✅ Demo data cargada: 10 clientes, 13 mascotas, 27 citas, 22 pagos, 15 registros clínicos';
END $$;
