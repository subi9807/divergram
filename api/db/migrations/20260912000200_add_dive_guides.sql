CREATE TABLE IF NOT EXISTS app_dive_guides (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'skills',
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  cover_image_url TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_dive_guides_category_check CHECK (category IN ('safety','equipment','skills','environment','travel','marine_life','news')),
  CONSTRAINT app_dive_guides_status_check CHECK (status IN ('draft','published'))
);

CREATE INDEX IF NOT EXISTS app_dive_guides_public_idx
  ON app_dive_guides(status, featured DESC, sort_order DESC, published_at DESC, created_at DESC);

