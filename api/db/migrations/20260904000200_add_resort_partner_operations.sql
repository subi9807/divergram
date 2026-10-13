ALTER TABLE app_profiles
  ADD COLUMN IF NOT EXISTS resort_booking_timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS resort_booking_default_capacity INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS resort_booking_min_notice_days INTEGER NOT NULL DEFAULT 1;

ALTER TABLE app_resort_bookings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS external_reference TEXT,
  ADD COLUMN IF NOT EXISTS refund_policy_version TEXT NOT NULL DEFAULT '2026-09-USD-v1',
  ADD COLUMN IF NOT EXISTS refund_policy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS app_resort_bookings_external_reference_uniq
  ON app_resort_bookings(resort_id, external_reference)
  WHERE external_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS app_resort_booking_availability (
  id BIGSERIAL PRIMARY KEY,
  resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 20 CHECK(capacity BETWEEN 0 AND 500),
  is_open BOOLEAN NOT NULL DEFAULT true,
  note TEXT NOT NULL DEFAULT '',
  created_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resort_id, booking_date)
);

CREATE TABLE IF NOT EXISTS app_resort_partner_applications (
  id TEXT PRIMARY KEY,
  applicant_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  resort_id TEXT REFERENCES app_profiles(id) ON DELETE SET NULL,
  resort_name TEXT NOT NULL,
  legal_business_name TEXT NOT NULL,
  registration_number TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL,
  address TEXT NOT NULL,
  website TEXT NOT NULL DEFAULT '',
  representative_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','reviewing','approved','rejected')),
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  admin_note TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_resort_partner_applications_user_idx
  ON app_resort_partner_applications(applicant_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app_resort_partner_documents (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES app_resort_partner_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),
  review_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_resort_partner_documents_application_idx
  ON app_resort_partner_documents(application_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app_resort_api_keys (
  id TEXT PRIMARY KEY,
  resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_resort_api_keys_resort_idx
  ON app_resort_api_keys(resort_id, created_at DESC);
