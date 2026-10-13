ALTER TABLE app_resort_bookings
  ADD COLUMN IF NOT EXISTS cancellation_type TEXT NOT NULL DEFAULT '';

ALTER TABLE app_resort_bookings
  DROP CONSTRAINT IF EXISTS app_resort_bookings_cancellation_type_check;

ALTER TABLE app_resort_bookings
  ADD CONSTRAINT app_resort_bookings_cancellation_type_check
  CHECK (cancellation_type IN ('', 'pre_payment', 'customer', 'provider'));

UPDATE app_resort_bookings
SET cancellation_type = CASE
  WHEN status = 'cancelled' AND deposit_status = 'pending' THEN 'pre_payment'
  WHEN status = 'cancelled' THEN 'customer'
  ELSE ''
END
WHERE cancellation_type = '';
