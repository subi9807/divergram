CREATE TABLE IF NOT EXISTS app_resort_checkins (
  id BIGSERIAL PRIMARY KEY,
  resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE RESTRICT,
  member_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  checked_in_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  license_id TEXT NOT NULL,
  member_number TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'wallet_qr' CHECK (method IN ('wallet_qr', 'app_qr', 'manual')),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE app_resort_checkins ADD COLUMN IF NOT EXISTS license_id TEXT;
ALTER TABLE app_resort_checkins ADD COLUMN IF NOT EXISTS member_number TEXT;

CREATE INDEX IF NOT EXISTS app_resort_checkins_resort_time_idx
  ON app_resort_checkins(resort_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS app_resort_checkins_member_time_idx
  ON app_resort_checkins(member_user_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS app_resort_checkins_member_number_idx
  ON app_resort_checkins(member_number, checked_in_at DESC);
