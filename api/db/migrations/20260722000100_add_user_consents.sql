CREATE TABLE IF NOT EXISTS app_user_consents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  consent_key TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  agreed BOOLEAN NOT NULL,
  agreed_at TIMESTAMPTZ,
  source TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ko',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_user_consents_user_idx
  ON app_user_consents(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS app_user_consents_policy_idx
  ON app_user_consents(user_id, consent_key, policy_version);
