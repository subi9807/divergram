BEGIN;

CREATE TABLE IF NOT EXISTS app_store_subscription_events (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES app_memberships(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  store_product_id TEXT NOT NULL,
  store_transaction_id TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_store_subscription_events_platform_check CHECK (platform IN ('ios', 'android')),
  CONSTRAINT app_store_subscription_events_status_check CHECK (status IN ('verified', 'rejected', 'expired', 'revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS app_store_subscription_events_identity_uidx
  ON app_store_subscription_events(platform, event_type, store_transaction_id, status);

CREATE INDEX IF NOT EXISTS app_store_subscription_events_user_idx
  ON app_store_subscription_events(user_id, created_at DESC);

COMMIT;
