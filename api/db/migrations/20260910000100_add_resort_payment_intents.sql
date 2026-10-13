CREATE TABLE IF NOT EXISTS app_resort_payment_intents (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES app_resort_bookings(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'apple_pay',
  idempotency_key TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','succeeded','failed','cancelled','refunded')),
  provider_intent_id TEXT NOT NULL DEFAULT '',
  provider_payment_id TEXT NOT NULL DEFAULT '',
  failure_code TEXT NOT NULL DEFAULT '',
  failure_message TEXT NOT NULL DEFAULT '',
  receipt_url TEXT NOT NULL DEFAULT '',
  token_fingerprint TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS app_resort_payment_intents_booking_idx
  ON app_resort_payment_intents(booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS app_resort_payment_intents_status_idx
  ON app_resort_payment_intents(status, created_at DESC);

CREATE TABLE IF NOT EXISTS app_resort_payment_events (
  id BIGSERIAL PRIMARY KEY,
  payment_intent_id TEXT REFERENCES app_resort_payment_intents(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS app_resort_payment_events_intent_idx
  ON app_resort_payment_events(payment_intent_id, created_at DESC);
