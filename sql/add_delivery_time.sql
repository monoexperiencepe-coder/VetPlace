-- Add delivery_time column to bookings
-- delivery_time stores the scheduled return/delivery window start time (HH:MM)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(5) DEFAULT NULL;
