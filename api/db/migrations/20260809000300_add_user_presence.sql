CREATE TABLE IF NOT EXISTS app_user_presence (
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL DEFAULT 'default',
  platform TEXT NOT NULL DEFAULT 'unknown',
  app_version TEXT NOT NULL DEFAULT '',
  build_number TEXT NOT NULL DEFAULT '',
  current_route TEXT NOT NULL DEFAULT '',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);
CREATE INDEX IF NOT EXISTS app_user_presence_last_seen_idx ON app_user_presence(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS app_user_presence_user_idx ON app_user_presence(user_id);
