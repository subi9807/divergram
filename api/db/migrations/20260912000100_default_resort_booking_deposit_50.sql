ALTER TABLE app_profiles
  ALTER COLUMN resort_booking_deposit_amount SET DEFAULT 50;

UPDATE app_profiles
SET resort_booking_deposit_amount = 50
WHERE lower(coalesce(account_type, '')) = 'resort'
  AND resort_booking_enabled = true
  AND resort_booking_deposit_amount = 100;

UPDATE app_resort_bookings
SET deposit_amount = 50,
    updated_at = now()
WHERE status = 'pending'
  AND deposit_status = 'pending'
  AND deposit_amount = 100;
