CREATE TABLE IF NOT EXISTS app_payment_environment_settings (
  provider text PRIMARY KEY,
  environment text NOT NULL DEFAULT 'sandbox',
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_payment_environment_provider_check CHECK (provider IN ('paypal')),
  CONSTRAINT app_payment_environment_value_check CHECK (environment IN ('sandbox', 'production'))
);

INSERT INTO app_payment_environment_settings(provider, environment)
VALUES ('paypal', 'sandbox')
ON CONFLICT (provider) DO NOTHING;
