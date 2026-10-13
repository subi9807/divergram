BEGIN;

CREATE TABLE IF NOT EXISTS app_memberships (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  platform TEXT NOT NULL DEFAULT 'admin',
  store_product_id TEXT,
  store_transaction_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renews BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_memberships_plan_check CHECK (plan_code IN ('annual_ai')),
  CONSTRAINT app_memberships_status_check CHECK (status IN ('active', 'expired', 'cancelled', 'refunded')),
  CONSTRAINT app_memberships_platform_check CHECK (platform IN ('ios', 'android', 'web', 'admin')),
  CONSTRAINT app_memberships_period_check CHECK (expires_at > started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS app_memberships_store_transaction_uniq
  ON app_memberships(platform, store_transaction_id)
  WHERE store_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS app_memberships_active_user_idx
  ON app_memberships(user_id, expires_at DESC)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS app_ai_usage_monthly (
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL,
  period_start DATE NOT NULL,
  used_credits INTEGER NOT NULL DEFAULT 0 CHECK (used_credits >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature_code, period_start)
);

COMMIT;
