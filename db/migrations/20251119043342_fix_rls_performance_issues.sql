/*
  # Fix RLS Performance Issues

  1. Changes
    - Update posts table policies to use (select auth.uid()) pattern
    - Update post_media table policies to use (select auth.uid()) pattern
    - Update reports table policies to use (select auth.uid()) pattern

  2. Security
    - Maintains same security constraints
    - Improves query performance by preventing auth.uid() re-evaluation for each row
    - Uses subquery pattern recommended by Supabase
*/

-- Drop and recreate posts policies with optimized pattern
DROP POLICY IF EXISTS "Users can update own posts" ON posts;

CREATE POLICY "Users can update own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Drop and recreate post_media policies with optimized pattern
DROP POLICY IF EXISTS "Users can delete their own post media" ON post_media;
DROP POLICY IF EXISTS "Users can insert their own post media" ON post_media;
DROP POLICY IF EXISTS "Users can update their own post media" ON post_media;

CREATE POLICY "Users can delete their own post media"
  ON post_media
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM posts
      WHERE posts.id = post_media.post_id 
      AND posts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert their own post media"
  ON post_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM posts
      WHERE posts.id = post_media.post_id 
      AND posts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own post media"
  ON post_media
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM posts
      WHERE posts.id = post_media.post_id 
      AND posts.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM posts
      WHERE posts.id = post_media.post_id 
      AND posts.user_id = (select auth.uid())
    )
  );

-- Drop and recreate reports policies with optimized pattern
DROP POLICY IF EXISTS "Users can create their own reports" ON reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;

CREATE POLICY "Users can create their own reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can view their own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));
