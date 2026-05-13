-- ============================================================
-- VetPlace — Portal del cliente (pasaporte virtual)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Token único por cliente (acceso directo desde bot)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS portal_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Generar tokens para clientes que ya existen
UPDATE clients SET portal_token = gen_random_uuid()::text
  WHERE portal_token IS NULL;

-- 2. Slug amigable por clínica (para la URL pública)
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generar slugs para clínicas existentes basados en el nombre
UPDATE clinics
  SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
  WHERE slug IS NULL OR slug = '';

-- 3. OTP temporal para login por teléfono (expira en 10 min)
CREATE TABLE IF NOT EXISTS portal_otps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  code        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_otps_phone ON portal_otps(phone);
CREATE INDEX IF NOT EXISTS idx_portal_otps_expires ON portal_otps(expires_at);

-- Limpiar OTPs vencidos automáticamente (ejecutar periódicamente)
-- DELETE FROM portal_otps WHERE expires_at < now();

ALTER TABLE portal_otps ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '✅ Portal tables ready';
