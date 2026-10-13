BEGIN;

ALTER TABLE app_profiles
  ADD COLUMN IF NOT EXISTS profile_content_visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS feed_content_visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS reels_content_visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS dive_log_content_visibility TEXT NOT NULL DEFAULT 'followers',
  ADD COLUMN IF NOT EXISTS marine_life_content_visibility TEXT NOT NULL DEFAULT 'private';

ALTER TABLE app_posts
  ADD COLUMN IF NOT EXISTS visibility_type TEXT NOT NULL DEFAULT 'inherit';

ALTER TABLE app_marine_life_sightings
  ADD COLUMN IF NOT EXISTS visibility_type TEXT NOT NULL DEFAULT 'inherit';

ALTER TABLE app_profiles
  DROP CONSTRAINT IF EXISTS app_profiles_profile_content_visibility_check,
  ADD CONSTRAINT app_profiles_profile_content_visibility_check CHECK (profile_content_visibility IN ('public','followers','private')),
  DROP CONSTRAINT IF EXISTS app_profiles_feed_content_visibility_check,
  ADD CONSTRAINT app_profiles_feed_content_visibility_check CHECK (feed_content_visibility IN ('public','followers','private')),
  DROP CONSTRAINT IF EXISTS app_profiles_reels_content_visibility_check,
  ADD CONSTRAINT app_profiles_reels_content_visibility_check CHECK (reels_content_visibility IN ('public','followers','private')),
  DROP CONSTRAINT IF EXISTS app_profiles_dive_log_content_visibility_check,
  ADD CONSTRAINT app_profiles_dive_log_content_visibility_check CHECK (dive_log_content_visibility IN ('public','followers','private')),
  DROP CONSTRAINT IF EXISTS app_profiles_marine_life_content_visibility_check,
  ADD CONSTRAINT app_profiles_marine_life_content_visibility_check CHECK (marine_life_content_visibility IN ('public','followers','private'));

ALTER TABLE app_posts
  DROP CONSTRAINT IF EXISTS app_posts_visibility_type_check,
  ADD CONSTRAINT app_posts_visibility_type_check CHECK (visibility_type IN ('inherit','public','followers','private'));

ALTER TABLE app_marine_life_sightings
  DROP CONSTRAINT IF EXISTS app_marine_life_sightings_visibility_type_check,
  ADD CONSTRAINT app_marine_life_sightings_visibility_type_check CHECK (visibility_type IN ('inherit','public','followers','private'));

COMMIT;
