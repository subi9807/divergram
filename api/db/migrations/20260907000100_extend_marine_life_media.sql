BEGIN;

ALTER TABLE app_marine_life_sightings
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS media_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS species_category TEXT NOT NULL DEFAULT 'other';

UPDATE app_marine_life_sightings
   SET media_url = image_url
 WHERE media_url = '';

ALTER TABLE app_marine_life_sightings
  DROP CONSTRAINT IF EXISTS app_marine_life_sightings_media_type_check,
  ADD CONSTRAINT app_marine_life_sightings_media_type_check
    CHECK (media_type IN ('image', 'video')),
  DROP CONSTRAINT IF EXISTS app_marine_life_sightings_media_url_check,
  ADD CONSTRAINT app_marine_life_sightings_media_url_check
    CHECK (char_length(media_url) BETWEEN 8 AND 2000),
  DROP CONSTRAINT IF EXISTS app_marine_life_sightings_species_category_check,
  ADD CONSTRAINT app_marine_life_sightings_species_category_check
    CHECK (species_category IN (
      'fish', 'coral', 'marine_mammal', 'reptile', 'mollusk', 'crustacean',
      'echinoderm', 'cnidarian', 'sponge', 'algae', 'other'
    ));

COMMIT;
