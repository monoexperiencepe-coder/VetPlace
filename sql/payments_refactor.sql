-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENTS REFACTOR — Agregar timestamps y reforzar link con bookings
-- Ejecutar en Supabase SQL Editor (después de routes.sql)
-- ─────────────────────────────────────────────────────────────────────────────

-- Agregar payment_completed_at (puede diferir de created_at si el cobro se registra después)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMPTZ;

-- Para payments ya existentes, usar created_at como fallback
UPDATE payments
  SET payment_completed_at = created_at
  WHERE payment_completed_at IS NULL;

-- Asegurarse de que booking_id existe (puede ya estar)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Index para consultar pagos de un booking específico
CREATE INDEX IF NOT EXISTS idx_payments_booking
  ON payments(booking_id)
  WHERE booking_id IS NOT NULL;

-- ─── TRIGGER: cuando se inserta un pago con booking_id → marcar booking como pagado ──
CREATE OR REPLACE FUNCTION mark_booking_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_id IS NOT NULL THEN
    UPDATE bookings
      SET payment_status = 'paid',
          updated_at = NOW()
      WHERE id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payment_created ON payments;
CREATE TRIGGER on_payment_created
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION mark_booking_paid();
