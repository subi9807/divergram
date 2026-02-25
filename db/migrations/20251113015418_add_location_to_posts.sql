/*
  # Add Location Field to Posts

  1. Changes
    - Add `location` column to `posts` table
      - `location` (text, optional): Location where the post was created
  
  2. Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Default value is NULL for existing posts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'location'
  ) THEN
    ALTER TABLE posts ADD COLUMN location text;
  END IF;
END $$;
