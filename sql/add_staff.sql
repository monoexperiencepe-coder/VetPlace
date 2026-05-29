-- ============================================================
-- ADD STAFF COLUMNS + STAFF_ID TO BOOKINGS
-- staff_members table already exists — this adds color + role
-- and links bookings to staff
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add missing columns to staff_members
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS color text DEFAULT '#601EF9';
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS role  text DEFAULT 'groomer';

-- 2. Add staff_id to bookings (nullable FK)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff_members(id) ON DELETE SET NULL;

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON bookings(staff_id) WHERE staff_id IS NOT NULL;

SELECT 'Staff columns + bookings.staff_id ready ✅' AS result;
