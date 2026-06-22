/*
  # Add operational profile / resort / post fields

  1. Profiles
    - Add scuba/freediving certification fields
    - Add license verification image + metadata
    - Add resort account metadata for verified dive resorts

  2. Posts
    - Add publish targets, gas info, and GPS coordinates used by feed/log editing
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_type text DEFAULT 'personal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'scuba_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN scuba_level text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'freediving_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN freediving_level text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'license_image_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN license_image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'license_agency'
  ) THEN
    ALTER TABLE profiles ADD COLUMN license_agency text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'license_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN license_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'license_issued_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN license_issued_at text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'website'
  ) THEN
    ALTER TABLE profiles ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'resort_country'
  ) THEN
    ALTER TABLE profiles ADD COLUMN resort_country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'resort_region'
  ) THEN
    ALTER TABLE profiles ADD COLUMN resort_region text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'resort_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN resort_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'resort_lat'
  ) THEN
    ALTER TABLE profiles ADD COLUMN resort_lat numeric(10,6);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'resort_lng'
  ) THEN
    ALTER TABLE profiles ADD COLUMN resort_lng numeric(10,6);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'resort_rating_avg'
  ) THEN
    ALTER TABLE profiles ADD COLUMN resort_rating_avg numeric(3,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'resort_review_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN resort_review_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'publish_to_feed'
  ) THEN
    ALTER TABLE posts ADD COLUMN publish_to_feed boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'publish_to_reels'
  ) THEN
    ALTER TABLE posts ADD COLUMN publish_to_reels boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'gas_type'
  ) THEN
    ALTER TABLE posts ADD COLUMN gas_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'gas_percent'
  ) THEN
    ALTER TABLE posts ADD COLUMN gas_percent numeric(5,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'location_lat'
  ) THEN
    ALTER TABLE posts ADD COLUMN location_lat numeric(10,6);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'location_lng'
  ) THEN
    ALTER TABLE posts ADD COLUMN location_lng numeric(10,6);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'buddy'
  ) THEN
    ALTER TABLE posts ADD COLUMN buddy text;
  END IF;
END $$;
