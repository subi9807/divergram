/*
  # Add video_url field to posts table

  1. Changes
    - Add video_url column to posts table for storing video URLs
    - This enables posts to have either image_url or video_url
    - Posts with video_url will be displayed as Reels
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE posts ADD COLUMN video_url text;
  END IF;
END $$;
