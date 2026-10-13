ALTER TABLE app_profiles
  ADD COLUMN IF NOT EXISTS resort_booking_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS app_resort_bookings (
  id TEXT PRIMARY KEY,
  resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL,
  price_id TEXT REFERENCES app_resort_prices(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  participants INTEGER NOT NULL DEFAULT 1 CHECK (participants BETWEEN 1 AND 50),
  dive_type TEXT NOT NULL DEFAULT 'fun_diving',
  applicant_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  admin_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','cancelled','completed')),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_resort_bookings_user_idx ON app_resort_bookings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_resort_bookings_resort_idx ON app_resort_bookings(resort_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS app_resort_bookings_status_idx ON app_resort_bookings(status, created_at DESC);

CREATE TABLE IF NOT EXISTS app_resort_booking_history (
  id BIGSERIAL PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES app_resort_bookings(id) ON DELETE CASCADE,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

