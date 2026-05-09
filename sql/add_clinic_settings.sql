-- Add settings JSONB column to clinics table
-- This column stores all tab configurations (logistica, zonas, horarios, bot, etc.)
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Also add delivery_time to bookings while we're here
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(5) DEFAULT NULL;
