-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN EVENTS — Cola de eventos de dominio para el automation engine
-- Ejecutar en Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS domain_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,       -- 'booking_created', 'booking_completed', etc.
  entity_type   TEXT NOT NULL,       -- 'booking', 'payment', 'client', 'pet'
  entity_id     UUID NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  processed     BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index principal para el cron (drena eventos no procesados por clínica)
CREATE INDEX IF NOT EXISTS idx_domain_events_unprocessed
  ON domain_events(clinic_id, processed, created_at ASC)
  WHERE processed = FALSE;

-- Index para auditoría / debug
CREATE INDEX IF NOT EXISTS idx_domain_events_type
  ON domain_events(clinic_id, type, created_at DESC);

-- RLS: solo la clínica dueña puede ver sus eventos
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_isolation" ON domain_events
  USING (clinic_id = (
    ((auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid)
  ));

-- ─── Tipos válidos (documentación, no constraint — para no romper al agregar) ──
-- booking_created
-- booking_confirmed
-- booking_completed
-- booking_cancelled
-- payment_received
-- client_created
-- pet_grooming_due
-- pet_event_due
