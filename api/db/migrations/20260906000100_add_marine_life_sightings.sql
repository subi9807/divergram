BEGIN;

CREATE TABLE IF NOT EXISTS app_marine_life_sightings (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  species_name TEXT NOT NULL CHECK (char_length(species_name) BETWEEN 1 AND 120),
  normalized_species_name TEXT NOT NULL CHECK (char_length(normalized_species_name) BETWEEN 1 AND 120),
  image_url TEXT NOT NULL CHECK (char_length(image_url) BETWEEN 8 AND 2000),
  observed_at DATE,
  location_name TEXT NOT NULL DEFAULT '' CHECK (char_length(location_name) <= 200),
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  source TEXT NOT NULL CHECK (source IN ('USER', 'AI_CONFIRMED')),
  ai_confidence TEXT CHECK (ai_confidence IS NULL OR ai_confidence IN ('low', 'medium', 'high')),
  ai_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_marine_life_sightings_owner_created_idx
  ON app_marine_life_sightings(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS app_marine_life_sightings_owner_image_species_uidx
  ON app_marine_life_sightings(user_id, image_url, normalized_species_name);

COMMIT;
