BEGIN;

ALTER TABLE app_marine_life_sightings
  ADD COLUMN IF NOT EXISTS species_scientific_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS species_summary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS species_habitat TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS species_identification_tips JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
