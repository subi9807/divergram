ALTER TABLE app_resort_bookings
  ADD COLUMN IF NOT EXISTS booking_policy_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ;

ALTER TABLE app_resort_bookings
  DROP CONSTRAINT IF EXISTS app_resort_bookings_status_check;

ALTER TABLE app_resort_bookings
  ADD CONSTRAINT app_resort_bookings_status_check
  CHECK (status IN ('pending','confirmed','rejected','cancelled','completed','no_show'));

ALTER TABLE app_resort_bookings
  ALTER COLUMN refund_policy_version SET DEFAULT '2026-09-USD-v2';

UPDATE app_resort_bookings
SET booking_policy_accepted_at = COALESCE(booking_policy_accepted_at, created_at)
WHERE booking_terms_accepted = true;
