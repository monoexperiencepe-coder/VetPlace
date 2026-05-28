-- ============================================================
-- DEMO SEED — VetPlace meeting demo
-- Run in Supabase SQL Editor
-- Fills 6 months of payments + bookings for SuperVet clinic
-- ============================================================

DO $$
DECLARE
  v_clinic_id  UUID := '65c3308c-fae3-4e58-aaaf-0d61b7e65c12';
  v_owner_id   UUID := 'f58df629-6de4-40ef-828a-7c417c654fd8';

  -- Client IDs
  c1 UUID; c2 UUID; c3 UUID; c4 UUID; c5 UUID;
  c6 UUID; c7 UUID; c8 UUID;

  -- Pet IDs
  p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID; p6 UUID;

  -- Service type IDs
  s_consulta   UUID; s_bano      UUID; s_vacuna UUID;
  s_desparasit UUID; s_cirugia   UUID;

BEGIN

-- ── 1. Make sure the clinic name is nice ─────────────────────────────────
UPDATE clinics SET name = 'SuperVet', owner_id = v_owner_id
WHERE id = v_clinic_id;

-- ── 2. Service types ──────────────────────────────────────────────────────
INSERT INTO service_types (id, clinic_id, name, price, duration_minutes)
VALUES
  (gen_random_uuid(), v_clinic_id, 'Consulta general',     60,  30),
  (gen_random_uuid(), v_clinic_id, 'Baño y corte',         55,  60),
  (gen_random_uuid(), v_clinic_id, 'Vacunación',           45,  15),
  (gen_random_uuid(), v_clinic_id, 'Desparasitación',      35,  15),
  (gen_random_uuid(), v_clinic_id, 'Cirugía menor',       250, 120)
ON CONFLICT DO NOTHING;

SELECT id INTO s_consulta   FROM service_types WHERE clinic_id = v_clinic_id AND name = 'Consulta general'  LIMIT 1;
SELECT id INTO s_bano       FROM service_types WHERE clinic_id = v_clinic_id AND name = 'Baño y corte'      LIMIT 1;
SELECT id INTO s_vacuna     FROM service_types WHERE clinic_id = v_clinic_id AND name = 'Vacunación'        LIMIT 1;
SELECT id INTO s_desparasit FROM service_types WHERE clinic_id = v_clinic_id AND name = 'Desparasitación'   LIMIT 1;
SELECT id INTO s_cirugia    FROM service_types WHERE clinic_id = v_clinic_id AND name = 'Cirugía menor'     LIMIT 1;

-- ── 3. Clients ────────────────────────────────────────────────────────────
INSERT INTO clients (id, clinic_id, name, phone, email)
VALUES
  (gen_random_uuid(), v_clinic_id, 'María Fernández',  '+51987001001', 'maria@email.com'),
  (gen_random_uuid(), v_clinic_id, 'Carlos Quispe',    '+51987002002', 'carlos@email.com'),
  (gen_random_uuid(), v_clinic_id, 'Lucía Vargas',     '+51987003003', 'lucia@email.com'),
  (gen_random_uuid(), v_clinic_id, 'Diego Ramos',      '+51987004004', 'diego@email.com'),
  (gen_random_uuid(), v_clinic_id, 'Ana Torres',       '+51987005005', 'ana@email.com'),
  (gen_random_uuid(), v_clinic_id, 'Pedro Salinas',    '+51987006006', 'pedro@email.com'),
  (gen_random_uuid(), v_clinic_id, 'Sofía Mendoza',    '+51987007007', 'sofia@email.com'),
  (gen_random_uuid(), v_clinic_id, 'Roberto Huanca',   '+51987008008', 'roberto@email.com')
ON CONFLICT DO NOTHING;

SELECT id INTO c1 FROM clients WHERE clinic_id = v_clinic_id AND name = 'María Fernández' LIMIT 1;
SELECT id INTO c2 FROM clients WHERE clinic_id = v_clinic_id AND name = 'Carlos Quispe'   LIMIT 1;
SELECT id INTO c3 FROM clients WHERE clinic_id = v_clinic_id AND name = 'Lucía Vargas'    LIMIT 1;
SELECT id INTO c4 FROM clients WHERE clinic_id = v_clinic_id AND name = 'Diego Ramos'     LIMIT 1;
SELECT id INTO c5 FROM clients WHERE clinic_id = v_clinic_id AND name = 'Ana Torres'      LIMIT 1;
SELECT id INTO c6 FROM clients WHERE clinic_id = v_clinic_id AND name = 'Pedro Salinas'   LIMIT 1;
SELECT id INTO c7 FROM clients WHERE clinic_id = v_clinic_id AND name = 'Sofía Mendoza'   LIMIT 1;
SELECT id INTO c8 FROM clients WHERE clinic_id = v_clinic_id AND name = 'Roberto Huanca'  LIMIT 1;

-- ── 4. Pets ───────────────────────────────────────────────────────────────
INSERT INTO pets (id, clinic_id, user_id, name, type, breed, birth_date)
VALUES
  (gen_random_uuid(), v_clinic_id, c1, 'Luna',    'dog', 'Labrador',        '2020-03-15'),
  (gen_random_uuid(), v_clinic_id, c1, 'Mochi',   'cat', 'Persa',           '2021-07-20'),
  (gen_random_uuid(), v_clinic_id, c2, 'Rocky',   'dog', 'Golden Retriever','2019-11-05'),
  (gen_random_uuid(), v_clinic_id, c3, 'Bella',   'dog', 'Poodle',          '2022-01-10'),
  (gen_random_uuid(), v_clinic_id, c4, 'Simba',   'cat', 'Siamés',          '2020-06-18'),
  (gen_random_uuid(), v_clinic_id, c5, 'Max',     'dog', 'Bulldog Francés', '2021-09-22')
ON CONFLICT DO NOTHING;

SELECT id INTO p1 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Luna'  LIMIT 1;
SELECT id INTO p2 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Mochi' LIMIT 1;
SELECT id INTO p3 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Rocky' LIMIT 1;
SELECT id INTO p4 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Bella' LIMIT 1;
SELECT id INTO p5 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Simba' LIMIT 1;
SELECT id INTO p6 FROM pets WHERE clinic_id = v_clinic_id AND name = 'Max'   LIMIT 1;

-- ── 5. Bookings + Payments (6 months back → today) ───────────────────────
-- December (slow month)
INSERT INTO bookings (clinic_id, pet_id, service_type_id, scheduled_at, status, payment_status, price, notes)
VALUES
  (v_clinic_id, p1, s_consulta,   NOW() - INTERVAL '165 days', 'COMPLETED', 'paid', 60,  'Revisión rutinaria'),
  (v_clinic_id, p3, s_bano,       NOW() - INTERVAL '160 days', 'COMPLETED', 'paid', 55,  'Baño completo'),
  (v_clinic_id, p5, s_vacuna,     NOW() - INTERVAL '158 days', 'COMPLETED', 'paid', 45,  'Vacuna antirrábica'),
  (v_clinic_id, p2, s_desparasit, NOW() - INTERVAL '155 days', 'COMPLETED', 'paid', 35,  ''),
  (v_clinic_id, p4, s_consulta,   NOW() - INTERVAL '150 days', 'COMPLETED', 'paid', 60,  'Chequeo general'),
  (v_clinic_id, p6, s_bano,       NOW() - INTERVAL '148 days', 'COMPLETED', 'paid', 55,  '');

-- January
INSERT INTO bookings (clinic_id, pet_id, service_type_id, scheduled_at, status, payment_status, price, notes)
VALUES
  (v_clinic_id, p1, s_bano,       NOW() - INTERVAL '130 days', 'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p3, s_cirugia,    NOW() - INTERVAL '128 days', 'COMPLETED', 'paid', 250, 'Extracción dental'),
  (v_clinic_id, p2, s_consulta,   NOW() - INTERVAL '125 days', 'COMPLETED', 'paid', 60,  ''),
  (v_clinic_id, p5, s_desparasit, NOW() - INTERVAL '122 days', 'COMPLETED', 'paid', 35,  ''),
  (v_clinic_id, p4, s_vacuna,     NOW() - INTERVAL '120 days', 'COMPLETED', 'paid', 45,  'Combo 5en1'),
  (v_clinic_id, p6, s_consulta,   NOW() - INTERVAL '118 days', 'COMPLETED', 'paid', 60,  ''),
  (v_clinic_id, p1, s_consulta,   NOW() - INTERVAL '115 days', 'COMPLETED', 'paid', 60,  '');

-- February
INSERT INTO bookings (clinic_id, pet_id, service_type_id, scheduled_at, status, payment_status, price, notes)
VALUES
  (v_clinic_id, p3, s_bano,       NOW() - INTERVAL '95 days',  'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p1, s_vacuna,     NOW() - INTERVAL '92 days',  'COMPLETED', 'paid', 45,  ''),
  (v_clinic_id, p5, s_consulta,   NOW() - INTERVAL '90 days',  'COMPLETED', 'paid', 60,  'Alergia en piel'),
  (v_clinic_id, p2, s_bano,       NOW() - INTERVAL '88 days',  'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p4, s_cirugia,    NOW() - INTERVAL '85 days',  'COMPLETED', 'paid', 250, 'Esterilización'),
  (v_clinic_id, p6, s_vacuna,     NOW() - INTERVAL '83 days',  'COMPLETED', 'paid', 45,  ''),
  (v_clinic_id, p3, s_consulta,   NOW() - INTERVAL '80 days',  'COMPLETED', 'paid', 60,  ''),
  (v_clinic_id, p1, s_desparasit, NOW() - INTERVAL '78 days',  'COMPLETED', 'paid', 35,  '');

-- March
INSERT INTO bookings (clinic_id, pet_id, service_type_id, scheduled_at, status, payment_status, price, notes)
VALUES
  (v_clinic_id, p2, s_consulta,   NOW() - INTERVAL '62 days',  'COMPLETED', 'paid', 60,  ''),
  (v_clinic_id, p5, s_bano,       NOW() - INTERVAL '60 days',  'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p1, s_bano,       NOW() - INTERVAL '58 days',  'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p3, s_vacuna,     NOW() - INTERVAL '55 days',  'COMPLETED', 'paid', 45,  ''),
  (v_clinic_id, p6, s_consulta,   NOW() - INTERVAL '53 days',  'COMPLETED', 'paid', 60,  ''),
  (v_clinic_id, p4, s_bano,       NOW() - INTERVAL '50 days',  'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p2, s_desparasit, NOW() - INTERVAL '48 days',  'COMPLETED', 'paid', 35,  ''),
  (v_clinic_id, p5, s_cirugia,    NOW() - INTERVAL '45 days',  'COMPLETED', 'paid', 250, 'Cirugía de ligamento'),
  (v_clinic_id, p1, s_consulta,   NOW() - INTERVAL '43 days',  'COMPLETED', 'paid', 60,  '');

-- April (last month — strong)
INSERT INTO bookings (clinic_id, pet_id, service_type_id, scheduled_at, status, payment_status, price, notes)
VALUES
  (v_clinic_id, p3, s_bano,       NOW() - INTERVAL '30 days',  'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p1, s_vacuna,     NOW() - INTERVAL '28 days',  'COMPLETED', 'paid', 45,  ''),
  (v_clinic_id, p6, s_bano,       NOW() - INTERVAL '26 days',  'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p2, s_consulta,   NOW() - INTERVAL '24 days',  'COMPLETED', 'paid', 60,  ''),
  (v_clinic_id, p5, s_bano,       NOW() - INTERVAL '22 days',  'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p4, s_vacuna,     NOW() - INTERVAL '20 days',  'COMPLETED', 'paid', 45,  ''),
  (v_clinic_id, p1, s_bano,       NOW() - INTERVAL '18 days',  'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p3, s_consulta,   NOW() - INTERVAL '16 days',  'COMPLETED', 'paid', 60,  'Dolor articular'),
  (v_clinic_id, p2, s_cirugia,    NOW() - INTERVAL '14 days',  'COMPLETED', 'paid', 250, 'Extracción de masa'),
  (v_clinic_id, p6, s_desparasit, NOW() - INTERVAL '12 days',  'COMPLETED', 'paid', 35,  ''),
  (v_clinic_id, p5, s_consulta,   NOW() - INTERVAL '10 days',  'COMPLETED', 'paid', 60,  '');

-- May (this month — growing)
INSERT INTO bookings (clinic_id, pet_id, service_type_id, scheduled_at, status, payment_status, price, notes)
VALUES
  (v_clinic_id, p1, s_consulta,   NOW() - INTERVAL '8 days',   'COMPLETED', 'paid', 60,  ''),
  (v_clinic_id, p4, s_bano,       NOW() - INTERVAL '7 days',   'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p3, s_vacuna,     NOW() - INTERVAL '6 days',   'COMPLETED', 'paid', 45,  ''),
  (v_clinic_id, p6, s_consulta,   NOW() - INTERVAL '5 days',   'COMPLETED', 'paid', 60,  ''),
  (v_clinic_id, p2, s_bano,       NOW() - INTERVAL '4 days',   'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p5, s_desparasit, NOW() - INTERVAL '3 days',   'COMPLETED', 'paid', 35,  ''),
  (v_clinic_id, p1, s_bano,       NOW() - INTERVAL '2 days',   'COMPLETED', 'paid', 55,  ''),
  (v_clinic_id, p4, s_consulta,   NOW() - INTERVAL '1 day',    'COMPLETED', 'paid', 60,  ''),
  (v_clinic_id, p3, s_bano,       NOW() - INTERVAL '12 hours', 'COMPLETED', 'paid', 55,  '');

-- ── 6. Payments from bookings ─────────────────────────────────────────────
INSERT INTO payments (clinic_id, booking_id, amount, method, paid_at)
SELECT
  b.clinic_id,
  b.id,
  b.price,
  CASE (RANDOM() * 2)::INT WHEN 0 THEN 'cash' WHEN 1 THEN 'card' ELSE 'transfer' END,
  b.scheduled_at + INTERVAL '1 hour'
FROM bookings b
WHERE b.clinic_id = v_clinic_id
  AND b.payment_status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.booking_id = b.id
  );

-- ── 7. Upcoming bookings (for the agenda) ────────────────────────────────
INSERT INTO bookings (clinic_id, pet_id, service_type_id, scheduled_at, status, payment_status, price, notes)
VALUES
  (v_clinic_id, p1, s_bano,     NOW() + INTERVAL '1 day 10 hours',  'CONFIRMED', 'pending', 55, 'Baño mensual'),
  (v_clinic_id, p3, s_consulta, NOW() + INTERVAL '2 days 11 hours', 'CONFIRMED', 'pending', 60, 'Control post-op'),
  (v_clinic_id, p5, s_vacuna,   NOW() + INTERVAL '3 days 9 hours',  'CONFIRMED', 'pending', 45, 'Refuerzo anual'),
  (v_clinic_id, p2, s_bano,     NOW() + INTERVAL '5 days 14 hours', 'CONFIRMED', 'pending', 55, '');

RAISE NOTICE '✅ Demo seed complete for clinic: SuperVet';
RAISE NOTICE '   Clients: 8, Pets: 6, Bookings: ~50, Payments: ~50';
RAISE NOTICE '   6 months of revenue data loaded';
END $$;
