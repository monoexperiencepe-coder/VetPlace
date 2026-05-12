-- ============================================================
-- VetPlace — Demo Data Seed (corregido)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

DO $$
DECLARE
  v_clinic_id uuid;

  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid();

  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
  p4 uuid := gen_random_uuid();
  p5 uuid := gen_random_uuid();
  p6 uuid := gen_random_uuid();

  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  s3 uuid := gen_random_uuid();
  s4 uuid := gen_random_uuid();
  s5 uuid := gen_random_uuid();

  conv1 uuid := gen_random_uuid();
  conv2 uuid := gen_random_uuid();
  conv3 uuid := gen_random_uuid();

  today date := CURRENT_DATE;
BEGIN

  SELECT id INTO v_clinic_id FROM clinics LIMIT 1;
  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ninguna clínica.';
  END IF;

  RAISE NOTICE 'Limpiando datos para clinic_id: %', v_clinic_id;

  -- LIMPIAR
  DELETE FROM messages
    WHERE conversation_id IN (SELECT id FROM conversations WHERE clinic_id = v_clinic_id);
  DELETE FROM conversations  WHERE clinic_id = v_clinic_id;
  DELETE FROM domain_events  WHERE clinic_id = v_clinic_id;
  DELETE FROM automations    WHERE clinic_id = v_clinic_id;
  DELETE FROM bookings       WHERE clinic_id = v_clinic_id;
  DELETE FROM events         WHERE clinic_id = v_clinic_id;
  DELETE FROM pets           WHERE clinic_id = v_clinic_id;
  DELETE FROM clients        WHERE clinic_id = v_clinic_id;
  DELETE FROM service_types  WHERE clinic_id = v_clinic_id;

  -- ─────────────────────────────────────────────────────────
  -- TIPOS DE SERVICIO
  -- ─────────────────────────────────────────────────────────
  INSERT INTO service_types (id, clinic_id, name, price, active, sort_order) VALUES
    (s1, v_clinic_id, 'Consulta general',        50.00, true, 1),
    (s2, v_clinic_id, 'Vacuna antirrábica',       80.00, true, 2),
    (s3, v_clinic_id, 'Baño y corte',             60.00, true, 3),
    (s4, v_clinic_id, 'Desparasitación',          45.00, true, 4),
    (s5, v_clinic_id, 'Control post-operatorio',  70.00, true, 5);

  -- ─────────────────────────────────────────────────────────
  -- CLIENTES  (id, clinic_id, name, phone, email, address, notes)
  -- ─────────────────────────────────────────────────────────
  INSERT INTO clients (id, clinic_id, name, phone, email, address, notes) VALUES
    (c1, v_clinic_id, 'María Fernández',
      '987654321', 'maria.fernandez@gmail.com',
      'Av. Javier Prado 1245, San Isidro',
      'Cliente frecuente. Muy puntual. Trae siempre a Toby y Mía juntos.'),
    (c2, v_clinic_id, 'Carlos Quispe',
      '976543210', 'cquispe@hotmail.com',
      'Jr. Huallaga 450, Cercado de Lima',
      'Prefiere citas en la mañana. Rocky tiene vacuna vencida.'),
    (c3, v_clinic_id, 'Ana Lucía Torres',
      '965432109', 'anatorres@gmail.com',
      'Calle Las Begonias 320, Miraflores',
      'Tiene 2 mascotas. Muy detallista. Simba tiene dieta renal.'),
    (c4, v_clinic_id, 'Jorge Mamani',
      '954321098', 'jmamani@outlook.com',
      'Av. Túpac Amaru 892, Comas',
      'Cliente nuevo referido por María. Primera visita con Coco.');

  -- ─────────────────────────────────────────────────────────
  -- MASCOTAS  (id, clinic_id, user_id, name, type, birth_date, default_price)
  -- ─────────────────────────────────────────────────────────
  INSERT INTO pets (id, clinic_id, user_id, name, type, birth_date, default_price) VALUES
    (p1, v_clinic_id, c1, 'Toby',  'dog', (today - interval '3 years')::date,  50.00),
    (p2, v_clinic_id, c1, 'Mía',   'cat', (today - interval '2 years')::date,  50.00),
    (p3, v_clinic_id, c2, 'Rocky', 'dog', (today - interval '5 years')::date,  50.00),
    (p4, v_clinic_id, c3, 'Luna',  'dog', (today - interval '1 year')::date,   60.00),
    (p5, v_clinic_id, c3, 'Simba', 'cat', (today - interval '4 years')::date,  50.00),
    (p6, v_clinic_id, c4, 'Coco',  'dog', (today - interval '8 months')::date, 50.00);

  -- ─────────────────────────────────────────────────────────
  -- CITAS  (status: PENDING | CONFIRMED | CANCELLED | COMPLETED)
  -- ─────────────────────────────────────────────────────────
  INSERT INTO bookings (clinic_id, pet_id, date, time, status, notes, service_type_id, price, requires_pickup) VALUES
    -- HOY
    (v_clinic_id, p1, today,     '10:00', 'CONFIRMED', 'Control anual + vacuna antirrábica.',        s2, 80.00, false),
    (v_clinic_id, p4, today,     '14:30', 'CONFIRMED', 'Baño y corte. Estilo show poodle.',          s3, 60.00, false),
    -- MAÑANA
    (v_clinic_id, p3, today + 1, '09:00', 'CONFIRMED', 'Vacuna antirrábica URGENTE — vencida 30d.', s2, 80.00, false),
    (v_clinic_id, p5, today + 1, '11:00', 'CONFIRMED', 'Control dieta renal. Traer análisis.',      s1, 50.00, false),
    -- PASADO MAÑANA
    (v_clinic_id, p2, today + 2, '10:30', 'PENDING',   'Triple felina — primer refuerzo.',           s2, 80.00, false),
    -- PRÓXIMA SEMANA
    (v_clinic_id, p6, today + 7, '15:00', 'PENDING',   'Desparasitación mensual + plan vacunal.',   s4, 45.00, false);

  -- ─────────────────────────────────────────────────────────
  -- EVENTOS  (type: grooming|vaccine|checkup|deworming  /  status: PENDING|NOTIFIED|COMPLETED|CANCELLED)
  -- ─────────────────────────────────────────────────────────
  INSERT INTO events (clinic_id, pet_id, type, scheduled_date, status) VALUES
    (v_clinic_id, p3, 'vaccine',   today - 30,   'NOTIFIED'),
    (v_clinic_id, p5, 'checkup',   today + 1,    'PENDING'),
    (v_clinic_id, p2, 'vaccine',   today + 2,    'PENDING'),
    (v_clinic_id, p4, 'grooming',  today + 30,   'PENDING'),
    (v_clinic_id, p6, 'deworming', today + 7,    'PENDING'),
    (v_clinic_id, p1, 'vaccine',   today + 365,  'PENDING');

  -- ─────────────────────────────────────────────────────────
  -- CONVERSACIONES DEL BOT
  -- ─────────────────────────────────────────────────────────
  INSERT INTO conversations (id, clinic_id, phone, client_name, bot_active, unread_count, last_message, last_message_at) VALUES
    (conv1, v_clinic_id, '51987654321', 'María Fernández',  true,  0,
      'Perfecto, nos vemos mañana 🐶', now() - interval '2 hours'),
    (conv2, v_clinic_id, '51976543210', 'Carlos Quispe',    true,  2,
      '¿A qué hora debo llegar con Rocky?', now() - interval '25 minutes'),
    (conv3, v_clinic_id, '51965432109', 'Ana Lucía Torres', false, 0,
      'Gracias, confirmo para mañana las 11am 🙏', now() - interval '1 day');

  -- Conversación 1: María agenda a Toby
  INSERT INTO messages (conversation_id, from_type, body, created_at) VALUES
    (conv1, 'client', 'Hola! Quería una cita para Toby, le toca su vacuna antirrábica 🐾', now() - interval '3 hours'),
    (conv1, 'bot',    '¡Hola María! 👋 Con gusto. ¿Para cuándo la necesitas?', now() - interval '3 hours' + interval '8 seconds'),
    (conv1, 'client', 'Para esta semana si hay disponibilidad', now() - interval '2 hours' - interval '50 minutes'),
    (conv1, 'bot',    'Tengo disponible hoy a las 10:00am o mañana a las 3:00pm. ¿Cuál te viene mejor?', now() - interval '2 hours' - interval '49 minutes'),
    (conv1, 'client', 'Hoy a las 10 perfecto', now() - interval '2 hours' - interval '10 minutes'),
    (conv1, 'bot',    '✅ ¡Cita confirmada! Toby · Vacuna antirrábica · Hoy ' || to_char(today, 'DD/MM') || ' · 10:00am. Te aviso 1h antes 🔔', now() - interval '2 hours' - interval '9 seconds'),
    (conv1, 'client', 'Perfecto, nos vemos mañana 🐶', now() - interval '2 hours');

  -- Conversación 2: Bot reactiva a Carlos — vacuna vencida
  INSERT INTO messages (conversation_id, from_type, body, created_at) VALUES
    (conv2, 'bot',    '⏰ Hola Carlos! La vacuna antirrábica de Rocky venció hace 30 días. ¿Te agendamos esta semana? 💉', now() - interval '1 hour'),
    (conv2, 'client', 'Ay sí, me olvidé! Sí por favor', now() - interval '50 minutes'),
    (conv2, 'bot',    'No te preocupes 😊 Tengo disponible mañana a las 9:00am. ¿Confirmamos?', now() - interval '49 minutes'),
    (conv2, 'client', 'Sí, confirmado para mañana', now() - interval '30 minutes'),
    (conv2, 'bot',    '✅ Rocky · Vacuna antirrábica · Mañana ' || to_char(today + 1, 'DD/MM') || ' · 9:00am. ¡Hasta mañana! 🐕', now() - interval '29 minutes'),
    (conv2, 'client', '¿A qué hora debo llegar con Rocky?', now() - interval '25 minutes');

  -- Conversación 3: Ana agenda a Simba
  INSERT INTO messages (conversation_id, from_type, body, created_at) VALUES
    (conv3, 'client', 'Hola! Quiero agendar control para Simba, tiene dieta especial renal', now() - interval '1 day' - interval '2 hours'),
    (conv3, 'bot',    '¡Hola Ana! Anoto la dieta renal 🐱 Tengo disponible mañana a las 11:00am. ¿Confirmas?', now() - interval '1 day' - interval '1 hour' - interval '55 minutes'),
    (conv3, 'client', 'Gracias, confirmo para mañana las 11am 🙏', now() - interval '1 day');

  -- ─────────────────────────────────────────────────────────
  -- AUTOMATIZACIONES
  -- ─────────────────────────────────────────────────────────
  INSERT INTO automations (clinic_id, name, description, icon, category, trigger_event, condition_json, action_type, message_template, delay_minutes, active) VALUES
    (v_clinic_id,
      'Recordatorio de turno',
      'Confirma el turno agendado con el cliente el día anterior.',
      '📅', 'Citas', 'booking_created',
      '{"days_ahead": 1}'::jsonb, 'send_message',
      'Hola {client_name} 👋 Te recordamos que mañana a las {booking_time} tienes turno para {pet_name}. Si necesitas reprogramar, responde este mensaje. ¡Nos vemos! 🐾',
      0, true),

    (v_clinic_id,
      'Seguimiento post-consulta',
      'Pregunta cómo está la mascota 48h después del servicio.',
      '🏥', 'Fidelización', 'booking_completed',
      '{}'::jsonb, 'send_message',
      'Hola {client_name} 👋 ¿Cómo está {pet_name} después de su consulta? Recuerda seguir las indicaciones del Dr. Ante cualquier duda, aquí estamos. 🐾',
      0, true),

    (v_clinic_id,
      'Recordatorio de vacuna próxima',
      'Avisa cuando una vacuna o evento veterinario está por vencer.',
      '💉', 'Salud', 'pet_event_due',
      '{}'::jsonb, 'send_message',
      'Hola {client_name} 👋 Queremos recordarte que {pet_name} tiene un evento programado para el {fecha}. Si necesitas reagendar, responde este mensaje. 🏥',
      0, true),

    (v_clinic_id,
      'Reactivar cliente inactivo',
      'Reactiva clientes que no agendaron servicio en 45 días.',
      '🔔', 'Reactivación', 'booking_completed',
      '{"inactive_days": 45}'::jsonb, 'send_message',
      'Hola {client_name} 👋 Hace un tiempo que no vemos a {pet_name} por la clínica. ¿Todo bien? Si necesitas agendar un baño o consulta, ¡escríbenos! 😊',
      0, false);

  RAISE NOTICE '✅ Demo data cargada para clinic_id: %', v_clinic_id;
  RAISE NOTICE '   4 clientes · 6 mascotas · 6 citas · 6 eventos · 3 conversaciones · 4 automatizaciones';
END $$;
