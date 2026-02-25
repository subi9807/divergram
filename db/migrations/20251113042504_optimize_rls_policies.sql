/*
  # Optimize RLS Policies

  1. Performance Optimization
    - Replace auth.uid() with (select auth.uid()) to prevent re-evaluation
    - Improves query performance at scale
    - Applies to all RLS policies

  2. Tables Updated
    - profiles
    - posts
    - comments
    - likes
    - follows
    - notifications
    - messages
    - stories
    - story_views
    - story_highlights
    - highlight_stories
    - saved_posts
*/

-- Drop and recreate profiles policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- Drop and recreate posts policies
DROP POLICY IF EXISTS "Users can create own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

CREATE POLICY "Users can create own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Drop and recreate comments policies
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Drop and recreate likes policies
DROP POLICY IF EXISTS "Users can create likes" ON likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON likes;

CREATE POLICY "Users can create likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Drop and recreate follows policies
DROP POLICY IF EXISTS "Users can create follows" ON follows;
DROP POLICY IF EXISTS "Users can delete own follows" ON follows;

CREATE POLICY "Users can create follows"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = (select auth.uid()));

CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  TO authenticated
  USING (follower_id = (select auth.uid()));

-- Drop and recreate notifications policies
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;

CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Drop and recreate messages policies
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;

CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = (select auth.uid()) OR receiver_id = (select auth.uid()));

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Users can update their received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (receiver_id = (select auth.uid()))
  WITH CHECK (receiver_id = (select auth.uid()));

-- Drop and recreate stories policies
DROP POLICY IF EXISTS "Users can create own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON stories;

CREATE POLICY "Users can create own stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own stories"
  ON stories FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Drop and recreate story_views policies
DROP POLICY IF EXISTS "Users can create story views" ON story_views;

CREATE POLICY "Users can create story views"
  ON story_views FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = (select auth.uid()));

-- Drop and recreate story_highlights policies
DROP POLICY IF EXISTS "Users can manage own highlights" ON story_highlights;

CREATE POLICY "Users can manage own highlights"
  ON story_highlights FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Drop and recreate highlight_stories policies
DROP POLICY IF EXISTS "Users can manage own highlight stories" ON highlight_stories;

CREATE POLICY "Users can manage own highlight stories"
  ON highlight_stories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM story_highlights
      WHERE story_highlights.id = highlight_stories.highlight_id
      AND story_highlights.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_highlights
      WHERE story_highlights.id = highlight_stories.highlight_id
      AND story_highlights.user_id = (select auth.uid())
    )
  );

-- Drop and recreate saved_posts policies
DROP POLICY IF EXISTS "Users can view their saved posts" ON saved_posts;
DROP POLICY IF EXISTS "Users can manage their saved posts" ON saved_posts;

CREATE POLICY "Users can manage their saved posts"
  ON saved_posts FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
