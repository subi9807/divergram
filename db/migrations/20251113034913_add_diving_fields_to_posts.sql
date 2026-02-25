/*
  # Add Diving-Specific Fields to Posts

  1. Changes
    - Add dive_type column (scuba or freediving)
    - Add dive_date column for when the dive occurred
    - Add max_depth column in meters
    - Add water_temperature column in celsius
    - Add dive_duration column in minutes (for scuba diving)
    - Add dive_site column for specific location name
    - Add visibility column in meters
    - Add buddy_name column for dive partner information
  
  2. Details
    - dive_type is required to distinguish between scuba and freediving
    - All other fields are optional as they may not apply to all dives
    - Existing posts will have NULL values for these fields
    - Default values are not set to allow flexibility

  3. Notes
    - This transforms the platform from a general social network to a diving-specific community
    - Posts will now focus on dive logs and underwater photography
    - Caption field remains for dive notes and experiences
*/

-- Add diving-related columns to posts table
DO $$ 
BEGIN
  -- Add dive_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'dive_type'
  ) THEN
    ALTER TABLE posts ADD COLUMN dive_type text CHECK (dive_type IN ('scuba', 'freediving'));
  END IF;

  -- Add dive_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'dive_date'
  ) THEN
    ALTER TABLE posts ADD COLUMN dive_date date;
  END IF;

  -- Add max_depth column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'max_depth'
  ) THEN
    ALTER TABLE posts ADD COLUMN max_depth numeric(5,1);
  END IF;

  -- Add water_temperature column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'water_temperature'
  ) THEN
    ALTER TABLE posts ADD COLUMN water_temperature numeric(4,1);
  END IF;

  -- Add dive_duration column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'dive_duration'
  ) THEN
    ALTER TABLE posts ADD COLUMN dive_duration integer;
  END IF;

  -- Add dive_site column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'dive_site'
  ) THEN
    ALTER TABLE posts ADD COLUMN dive_site text;
  END IF;

  -- Add visibility column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE posts ADD COLUMN visibility numeric(4,1);
  END IF;

  -- Add buddy_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'buddy_name'
  ) THEN
    ALTER TABLE posts ADD COLUMN buddy_name text;
  END IF;
END $$;

-- Add comments to describe the columns
COMMENT ON COLUMN posts.dive_type IS 'Type of diving: scuba or freediving';
COMMENT ON COLUMN posts.dive_date IS 'Date when the dive took place';
COMMENT ON COLUMN posts.max_depth IS 'Maximum depth reached during dive in meters';
COMMENT ON COLUMN posts.water_temperature IS 'Water temperature in celsius';
COMMENT ON COLUMN posts.dive_duration IS 'Duration of dive in minutes (mainly for scuba)';
COMMENT ON COLUMN posts.dive_site IS 'Name of the dive site';
COMMENT ON COLUMN posts.visibility IS 'Underwater visibility in meters';
COMMENT ON COLUMN posts.buddy_name IS 'Name of dive buddy/partner';
