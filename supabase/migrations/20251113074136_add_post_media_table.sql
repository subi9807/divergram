/*
  # Add support for multiple media files per post

  1. New Tables
    - `post_media`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts)
      - `media_url` (text, URL of the media file)
      - `media_type` (text, either 'image' or 'video')
      - `order_index` (integer, order of media in the carousel)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `post_media` table
    - Add policies for authenticated users to read media
    - Add policies for users to manage their own post media
  
  3. Indexes
    - Add index on post_id for fast lookups
    - Add index on (post_id, order_index) for ordered retrieval
*/

CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_media_type CHECK (media_type IN ('image', 'video'))
);

ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post media"
  ON post_media FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own post media"
  ON post_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own post media"
  ON post_media FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own post media"
  ON post_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_post_order ON post_media(post_id, order_index);