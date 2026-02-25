/*
  # Add Missing Foreign Key Indexes

  1. Performance Optimization
    - Add indexes on foreign key columns for better query performance
    - Covers all unindexed foreign keys identified in security scan

  2. Indexes Added
    - comments(user_id)
    - highlight_stories(story_id)
    - notifications(actor_id, comment_id, post_id)
    - saved_posts(post_id)
    - story_views(viewer_id)
*/

-- Add index for comments.user_id
CREATE INDEX IF NOT EXISTS idx_comments_user_id_fkey ON comments(user_id);

-- Add index for highlight_stories.story_id
CREATE INDEX IF NOT EXISTS idx_highlight_stories_story_id_fkey ON highlight_stories(story_id);

-- Add indexes for notifications foreign keys
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id_fkey ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_comment_id_fkey ON notifications(comment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_post_id_fkey ON notifications(post_id);

-- Add index for saved_posts.post_id
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id_fkey ON saved_posts(post_id);

-- Add index for story_views.viewer_id
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id_fkey ON story_views(viewer_id);
