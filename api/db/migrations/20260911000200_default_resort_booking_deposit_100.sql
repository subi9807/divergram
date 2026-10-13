ALTER TABLE app_profiles
  ALTER COLUMN resort_booking_deposit_amount SET DEFAULT 100;

-- Existing bookings retain their accepted deposit snapshot. Only future bookings
-- created from currently enabled resorts use the corrected USD 100 default.
UPDATE app_profiles
SET resort_booking_deposit_amount = 100
WHERE resort_booking_enabled = true;
