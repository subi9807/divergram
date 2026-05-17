/*
  # Remove Duplicate Permissive Policies

  1. Security Optimization
    - Remove duplicate SELECT policies that cause conflicts
    - Consolidate policies into single policies per operation
    - This improves security clarity and performance

  2. Tables Updated
    - story_highlights: Remove duplicate SELECT policy
    - highlight_stories: Remove duplicate SELECT policy
    - saved_posts: Remove duplicate SELECT policy
*/

-- For story_highlights: Drop existing manage policy and recreate specific ones
DROP POLICY IF EXISTS "Users can manage own highlights" ON story_highlights;
DROP POLICY IF EXISTS "Users can insert own highlights" ON story_highlights;
DROP POLICY IF EXISTS "Users can update own highlights" ON story_highlights;
DROP POLICY IF EXISTS "Users can delete own highlights" ON story_highlights;

CREATE POLICY "Users can insert own highlights" ON story_highlights
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own highlights" ON story_highlights
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own highlights" ON story_highlights
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- For highlight_stories: Drop existing and recreate specific policies
DROP POLICY IF EXISTS "Users can manage own highlight stories" ON highlight_stories;
DROP POLICY IF EXISTS "Users can insert own highlight stories" ON highlight_stories;
DROP POLICY IF EXISTS "Users can update own highlight stories" ON highlight_stories;
DROP POLICY IF EXISTS "Users can delete own highlight stories" ON highlight_stories;

CREATE POLICY "Users can insert own highlight stories" ON highlight_stories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_highlights
      WHERE story_highlights.id = highlight_stories.highlight_id
      AND story_highlights.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own highlight stories" ON highlight_stories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM story_highlights
      WHERE story_highlights.id = highlight_stories.highlight_id
      AND story_highlights.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_highlights
      WHERE story_highlights.id = highlight_stories.highlight_id
      AND story_highlights.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own highlight stories" ON highlight_stories
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM story_highlights
      WHERE story_highlights.id = highlight_stories.highlight_id
      AND story_highlights.user_id = (SELECT auth.uid())
    )
  );

-- For saved_posts: Remove duplicate and keep single policy for each operation
DROP POLICY IF EXISTS "Users can view their saved posts" ON saved_posts;
DROP POLICY IF EXISTS "Users can manage their saved posts" ON saved_posts;
DROP POLICY IF EXISTS "Users can insert saved posts" ON saved_posts;
DROP POLICY IF EXISTS "Users can delete saved posts" ON saved_posts;

CREATE POLICY "Users can view their saved posts" ON saved_posts
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert saved posts" ON saved_posts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete saved posts" ON saved_posts
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
