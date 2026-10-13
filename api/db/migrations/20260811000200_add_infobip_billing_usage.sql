CREATE TABLE IF NOT EXISTS app_infobip_billing_usage (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT UNIQUE,
  sent_since DATE NOT NULL,
  sent_until DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  failure_message TEXT NOT NULL DEFAULT '',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_infobip_billing_usage_period_idx
  ON app_infobip_billing_usage(sent_since DESC, sent_until DESC, requested_at DESC);
