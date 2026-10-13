ALTER TABLE app_profiles
  ADD COLUMN IF NOT EXISTS resort_booking_deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resort_booking_deposit_currency TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE app_resort_bookings
  ADD COLUMN IF NOT EXISTS booking_number TEXT,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS deposit_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booking_terms_accepted BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS app_resort_bookings_number_uidx
  ON app_resort_bookings(booking_number)
  WHERE booking_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS app_resort_bookings_active_date_idx
  ON app_resort_bookings(user_id, resort_id, booking_date)
  WHERE status IN ('pending', 'confirmed');
