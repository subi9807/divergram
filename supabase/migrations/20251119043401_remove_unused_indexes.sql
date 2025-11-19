/*
  # Remove Unused Indexes

  1. Changes
    - Remove unused indexes that are not being utilized by queries
    - Reduces database maintenance overhead
    - Improves write performance by reducing index updates

  2. Notes
    - Indexes can be recreated if usage patterns change
    - Primary key and foreign key constraints remain intact
*/

-- Drop unused indexes on likes table
DROP INDEX IF EXISTS idx_likes_user_id;

-- Drop unused indexes on notifications table
DROP INDEX IF EXISTS notifications_read_idx;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_actor_id;

-- Drop unused indexes on stories table
DROP INDEX IF EXISTS idx_stories_user_id;
DROP INDEX IF EXISTS idx_stories_expires_at;

-- Drop unused indexes on story_views table
DROP INDEX IF EXISTS idx_story_views_story_id;
DROP INDEX IF EXISTS idx_story_views_viewer_id;

-- Drop unused indexes on story_highlights table
DROP INDEX IF EXISTS idx_story_highlights_user_id;

-- Drop unused indexes on messages table
DROP INDEX IF EXISTS idx_messages_room_id;
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS idx_messages_created_at;

-- Drop unused indexes on participants table
DROP INDEX IF EXISTS idx_participants_room_id;
DROP INDEX IF EXISTS idx_participants_user_id;

-- Drop unused indexes on post_media table
DROP INDEX IF EXISTS idx_post_media_post_id;

-- Drop unused indexes on comments table
DROP INDEX IF EXISTS idx_comments_user_id;

-- Drop unused indexes on highlight_stories table
DROP INDEX IF EXISTS idx_highlight_stories_story_id;

-- Drop unused indexes on reports table
DROP INDEX IF EXISTS idx_reports_user_id;
DROP INDEX IF EXISTS idx_reports_created_at;
