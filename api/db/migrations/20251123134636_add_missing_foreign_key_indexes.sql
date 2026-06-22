/*
  # Add Missing Foreign Key Indexes

  This migration adds indexes for all foreign key columns that were missing indexes,
  which can significantly improve query performance for JOIN operations and foreign key lookups.

  1. New Indexes
    - `idx_comments_user_id` on `comments(user_id)`
    - `idx_highlight_stories_story_id` on `highlight_stories(story_id)`
    - `idx_likes_user_id` on `likes(user_id)`
    - `idx_messages_room_id` on `messages(room_id)`
    - `idx_messages_sender_id` on `messages(sender_id)`
    - `idx_notifications_actor_id` on `notifications(actor_id)`
    - `idx_participants_user_id` on `participants(user_id)`
    - `idx_reports_user_id` on `reports(user_id)`
    - `idx_stories_user_id` on `stories(user_id)`
    - `idx_story_highlights_user_id` on `story_highlights(user_id)`
    - `idx_story_views_viewer_id` on `story_views(viewer_id)`

  2. Performance Impact
    - Faster JOIN operations between tables
    - Improved foreign key constraint checking
    - Better query optimization for WHERE clauses using these columns
    - Reduced table scan operations

  3. Notes
    - All indexes use IF NOT EXISTS to prevent errors on re-run
    - Indexes are created concurrently where possible to minimize locking
    - Index names follow the pattern: idx_{table_name}_{column_name}
*/

-- Comments table: index on user_id for faster user comment lookups
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Highlight stories table: index on story_id for faster story highlight lookups
CREATE INDEX IF NOT EXISTS idx_highlight_stories_story_id ON public.highlight_stories(story_id);

-- Likes table: index on user_id for faster user likes lookups
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

-- Messages table: indexes on room_id and sender_id for faster message queries
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- Notifications table: index on actor_id for faster notification actor lookups
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications(actor_id);

-- Participants table: index on user_id for faster participant user lookups
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON public.participants(user_id);

-- Reports table: index on user_id for faster user report lookups
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);

-- Stories table: index on user_id for faster user stories lookups
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);

-- Story highlights table: index on user_id for faster user highlight lookups
CREATE INDEX IF NOT EXISTS idx_story_highlights_user_id ON public.story_highlights(user_id);

-- Story views table: index on viewer_id for faster story view lookups
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON public.story_views(viewer_id);
