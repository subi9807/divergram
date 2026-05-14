ALTER TABLE app_profiles
  ADD COLUMN IF NOT EXISTS resort_address TEXT,
  ADD COLUMN IF NOT EXISTS resort_region TEXT,
  ADD COLUMN IF NOT EXISTS resort_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS resort_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS resort_rating_avg NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resort_review_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS app_resort_reviews (
  id TEXT PRIMARY KEY,
  resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resort_reviews_resort ON app_resort_reviews(resort_id);
CREATE INDEX IF NOT EXISTS idx_resort_reviews_user ON app_resort_reviews(user_id);

ALTER TABLE app_resort_reviews OWNER TO divergram;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app_resort_reviews TO divergram;
GRANT SELECT, UPDATE ON TABLE app_profiles TO divergram;
