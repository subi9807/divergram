/*
  # Make image_url nullable in posts table

  1. Changes
    - Allow posts to have either image_url or video_url
    - Remove NOT NULL constraint from image_url
*/

ALTER TABLE posts ALTER COLUMN image_url DROP NOT NULL;
