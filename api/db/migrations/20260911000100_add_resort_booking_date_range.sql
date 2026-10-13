ALTER TABLE app_resort_bookings
  ADD COLUMN IF NOT EXISTS booking_end_date DATE;

UPDATE app_resort_bookings
   SET booking_end_date = booking_date
 WHERE booking_end_date IS NULL;

ALTER TABLE app_resort_bookings
  ALTER COLUMN booking_end_date SET NOT NULL,
  ALTER COLUMN booking_end_date DROP DEFAULT;

ALTER TABLE app_resort_bookings
  DROP CONSTRAINT IF EXISTS app_resort_bookings_date_range_check;

ALTER TABLE app_resort_bookings
  ADD CONSTRAINT app_resort_bookings_date_range_check
  CHECK (booking_end_date >= booking_date AND booking_end_date <= booking_date + 30);

CREATE INDEX IF NOT EXISTS app_resort_bookings_active_range_idx
  ON app_resort_bookings(resort_id, booking_date, booking_end_date)
  WHERE status IN ('pending', 'confirmed');
