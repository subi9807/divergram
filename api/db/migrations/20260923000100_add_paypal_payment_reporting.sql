ALTER TABLE app_resort_payment_intents
  ADD COLUMN IF NOT EXISTS payer_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payer_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payer_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_source TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settlement_currency TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS app_resort_payment_intents_provider_created_idx
  ON app_resort_payment_intents(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS app_resort_payment_intents_payer_email_idx
  ON app_resort_payment_intents(lower(payer_email))
  WHERE payer_email <> '';
