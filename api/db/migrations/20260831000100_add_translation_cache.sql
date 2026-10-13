CREATE TABLE IF NOT EXISTS app_translation_cache (
  id BIGSERIAL PRIMARY KEY,
  content_hash TEXT NOT NULL,
  source_language TEXT,
  target_language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_hash, target_language)
);

CREATE INDEX IF NOT EXISTS app_translation_cache_updated_idx
  ON app_translation_cache(updated_at DESC);
