-- ─────────────────────────────────────────────────────────────────────────────
-- AUTOMATIONS — Reglas del automation engine (Event → Condition → Action)
-- Ejecutar en Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  icon             TEXT DEFAULT '⚡',
  category         TEXT DEFAULT 'General',
  trigger_event    TEXT NOT NULL,   -- tipo de domain_event que dispara esta automation
  condition_json   JSONB NOT NULL DEFAULT '{}',
  -- Ejemplos:
  --   {} = sin condición, siempre ejecutar
  --   { "days_ahead": 1 }    = booking es mañana
  --   { "inactive_days": 45 } = cliente sin actividad en 45 días
  action_type      TEXT NOT NULL DEFAULT 'send_message'
                   CHECK (action_type IN ('send_message', 'create_booking', 'create_event')),
  message_template TEXT,
  -- Variables disponibles en el template:
  --   {client_name}, {pet_name}, {booking_date}, {booking_time}, {fecha}, {hora}
  delay_minutes    INTEGER NOT NULL DEFAULT 0,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_trigger
  ON automations(clinic_id, trigger_event, active)
  WHERE active = TRUE;

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_isolation" ON automations
  USING (clinic_id = (
    ((auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid)
  ));

-- ─── Función helper para updated_at automático ────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automations_updated_at
  BEFORE UPDATE ON automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Automations por defecto para CADA clínica existente
-- Esto corre una vez — inserta las 6 automations base para cada clinic_id
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTA: Reemplazar este INSERT si querés solo para UNA clínica específica.
-- Para producción multi-tenant, este seed corre al crear cada nueva clínica.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM clinics LOOP

    -- Solo insertar si esta clínica no tiene automations todavía
    IF NOT EXISTS (SELECT 1 FROM automations WHERE clinic_id = r.id) THEN

      INSERT INTO automations
        (clinic_id, name, description, icon, category, trigger_event, condition_json, action_type, message_template, delay_minutes, active)
      VALUES

        -- 1. Recordatorio de turno (1 día antes)
        (r.id,
         'Recordatorio de turno',
         'Confirma el turno agendado con el cliente el día anterior.',
         '📅', 'Citas',
         'booking_created',
         '{"days_ahead": 1}',
         'send_message',
         'Hola {client_name} 👋' || chr(10) ||
         'Te recordamos que mañana a las {booking_time} tenés turno para {pet_name}.' || chr(10) || chr(10) ||
         'Si necesitás reprogramar, respondé este mensaje. ¡Nos vemos! 🐾',
         0, TRUE),

        -- 2. Baño completado → sugerir próximo
        (r.id,
         'Sugerir próximo baño',
         'Sugiere agendar el próximo baño al completar un servicio.',
         '🛁', 'Fidelización',
         'booking_completed',
         '{}',
         'send_message',
         '¡Listo! {pet_name} terminó su baño 🛁✨' || chr(10) || chr(10) ||
         'Cuando quieras agendar el próximo, avisanos y lo coordinamos. ¡Hasta la próxima! 🐾',
         0, TRUE),

        -- 3. Bienvenida a nuevo cliente
        (r.id,
         'Bienvenida a nuevo cliente',
         'Saluda al cliente la primera vez que se registra.',
         '🎉', 'Captación',
         'client_created',
         '{}',
         'send_message',
         'Hola {client_name} 👋' || chr(10) ||
         '¡Bienvenido/a a nuestra clínica! 🐾' || chr(10) || chr(10) ||
         'Para agendar un turno o hacer una consulta, respondé este mensaje. ¡Estamos para ayudarte!',
         0, TRUE),

        -- 4. Baño próximo a vencer (generado por check-events cron)
        (r.id,
         'Recordatorio de baño próximo',
         'Avisa al cliente que el próximo baño de su mascota está próximo.',
         '✂️', 'Cuidado',
         'pet_grooming_due',
         '{}',
         'send_message',
         'Hola {client_name} 👋' || chr(10) ||
         '¡Recordamos que {pet_name} tiene su baño programado en 2 días!' || chr(10) || chr(10) ||
         'Si necesitás cambiar la fecha, respondé este mensaje. ✂️🐾',
         0, TRUE),

        -- 5. Evento veterinario próximo (vacuna, control, etc.)
        (r.id,
         'Recordatorio de evento veterinario',
         'Notifica cuando una vacuna o control está próximo.',
         '💉', 'Salud',
         'pet_event_due',
         '{}',
         'send_message',
         'Hola {client_name} 👋' || chr(10) ||
         'Queremos recordarte que {pet_name} tiene un evento programado para el {fecha}.' || chr(10) || chr(10) ||
         'Si necesitás reagendar, respondé este mensaje. 🏥',
         0, TRUE),

        -- 6. Cliente inactivo
        (r.id,
         'Reactivar cliente inactivo',
         'Reactiva clientes que no agendaron servicio en 45 días.',
         '🔔', 'Reactivación',
         'booking_completed',
         '{"inactive_days": 45}',
         'send_message',
         'Hola {client_name} 👋' || chr(10) ||
         'Hace un tiempo que no vemos a {pet_name} por la clínica. 🐾' || chr(10) || chr(10) ||
         '¿Todo bien? Si necesitás agendar un baño o consulta, estamos disponibles. ¡Escribinos! 😊',
         0, FALSE);  -- inactive por defecto, el usuario la activa

    END IF;
  END LOOP;
END $$;
