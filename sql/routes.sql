-- ─────────────────────────────────────────────────────────────────────────────
-- ROUTES + ROUTE_STOPS — Sistema de logística pickup/delivery
-- Ejecutar en Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS routes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,              -- "Ruta Norte – Mañana"
  date         DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'in_progress', 'completed')),
  driver_name  TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_clinic_date
  ON routes(clinic_id, date DESC);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_isolation" ON routes
  USING (clinic_id = (
    ((auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid)
  ));

CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─── ROUTE STOPS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS route_stops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
  stop_order  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'completed', 'skipped')),
  arrived_at  TIMESTAMPTZ,
  notes       TEXT,
  -- Snapshot de la dirección al momento de crear la parada
  -- (por si el cliente cambia dirección después)
  address     TEXT,
  distrito    TEXT,
  client_name TEXT,
  pet_name    TEXT,
  UNIQUE(route_id, stop_order)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route
  ON route_stops(route_id, stop_order ASC);

CREATE INDEX IF NOT EXISTS idx_route_stops_booking
  ON route_stops(booking_id);

ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_isolation" ON route_stops
  USING (route_id IN (
    SELECT id FROM routes WHERE clinic_id = (
      ((auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid)
    )
  ));


-- ─── REFACTOR BOOKINGS: agregar campos de logística y pago ────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS logistic_status TEXT NOT NULL DEFAULT 'none'
    CHECK (logistic_status IN ('none', 'pickup_pending', 'in_route', 'delivered')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid')),
  ADD COLUMN IF NOT EXISTS requires_pickup BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pickup_address TEXT,
  ADD COLUMN IF NOT EXISTS service_type_id UUID REFERENCES service_types(id) ON DELETE SET NULL;

-- Index para consultas de "bookings pendientes de pago" (tab finanzas)
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
  ON bookings(clinic_id, payment_status)
  WHERE payment_status = 'pending';

-- Index para "bookings con pickup pendiente" (módulo rutas)
CREATE INDEX IF NOT EXISTS idx_bookings_pickup
  ON bookings(clinic_id, date, logistic_status)
  WHERE requires_pickup = TRUE AND logistic_status = 'pickup_pending';
