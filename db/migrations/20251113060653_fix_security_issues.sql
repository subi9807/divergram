/*
  # Fix Security and Performance Issues

  1. RLS Policy Optimization
    - Replace auth.uid() with (select auth.uid()) in all policies
    - Improves performance by evaluating auth function once per query instead of per row

  2. Remove Duplicate Indexes
    - Drop duplicate indexes on comments, highlight_stories, notifications, saved_posts, story_views
    - Keep only one index for each column to reduce storage and maintenance overhead

  3. Remove Duplicate Permissive Policies
    - Remove redundant policies that cause conflicts
    - Keep the most specific and secure policy for each action

  4. Security
    - All policies remain restrictive and secure
    - No changes to actual access control logic
*/

-- =====================================================
-- SECTION 1: Fix RLS Policies - Replace auth.uid() with (select auth.uid())
-- =====================================================

-- Notifications table policies
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Rooms table policies
DROP POLICY IF EXISTS "Users can view rooms they are participants in" ON public.rooms;

CREATE POLICY "Users can view rooms they are participants in"
  ON rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = rooms.id
      AND participants.user_id = (select auth.uid())
    )
  );

-- Participants table policies
DROP POLICY IF EXISTS "Users can add participants to rooms" ON public.participants;
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.participants;

CREATE POLICY "Users can add participants to rooms"
  ON participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = room_id
      AND participants.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can view participants in their rooms"
  ON participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.room_id = participants.room_id
      AND p.user_id = (select auth.uid())
    )
  );

-- Messages table policies
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.messages;

CREATE POLICY "Users can send messages to their rooms"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = messages.room_id
      AND participants.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Users can view messages in their rooms"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = messages.room_id
      AND participants.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- SECTION 2: Remove Duplicate Indexes
-- =====================================================

-- Comments table - keep idx_comments_user_id, drop duplicate
DROP INDEX IF EXISTS public.idx_comments_user_id_fkey;

-- Highlight stories table - keep idx_highlight_stories_story_id, drop duplicate
DROP INDEX IF EXISTS public.idx_highlight_stories_story_id_fkey;

-- Notifications table - keep the first index, drop duplicates
DROP INDEX IF EXISTS public.idx_notifications_actor_id_fkey;
DROP INDEX IF EXISTS public.idx_notifications_comment_id_fkey;
DROP INDEX IF EXISTS public.notifications_created_at_idx;
DROP INDEX IF EXISTS public.idx_notifications_post_id_fkey;
DROP INDEX IF EXISTS public.notifications_user_id_idx;

-- Saved posts table - keep idx_saved_posts_post_id, drop duplicate
DROP INDEX IF EXISTS public.idx_saved_posts_post_id_fkey;

-- Story views table - keep idx_story_views_viewer_id, drop duplicate
DROP INDEX IF EXISTS public.idx_story_views_viewer_id_fkey;

-- =====================================================
-- SECTION 3: Remove Duplicate Permissive Policies
-- =====================================================

-- Notifications - remove duplicate INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Notifications - remove duplicate SELECT policy
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;

-- Notifications - remove duplicate UPDATE policy
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

-- Profiles - remove duplicate SELECT policy
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Stories - remove duplicate SELECT policy
DROP POLICY IF EXISTS "Anyone can view stories" ON public.stories;
