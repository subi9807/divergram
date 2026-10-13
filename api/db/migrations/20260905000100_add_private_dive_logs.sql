BEGIN;
CREATE TABLE IF NOT EXISTS app_dive_logs (
  user_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS app_dive_logs_owner_page_idx ON app_dive_logs(user_id, id);
CREATE TABLE IF NOT EXISTS app_dive_log_sources (
  user_id TEXT NOT NULL,
  log_id TEXT NOT NULL,
  original_data JSONB NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('USER', 'UNVERIFIED_IMPORT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, log_id),
  FOREIGN KEY (user_id, log_id) REFERENCES app_dive_logs(user_id, id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS app_dive_log_revisions (
  user_id TEXT NOT NULL,
  log_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, log_id, revision),
  FOREIGN KEY (user_id, log_id) REFERENCES app_dive_logs(user_id, id) ON DELETE CASCADE
);
COMMIT;
