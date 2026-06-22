/*
  # Add Foreign Key Indexes

  1. Performance Optimization
    - Add indexes on foreign key columns for better query performance
    - Covers all unindexed foreign keys identified in security audit

  2. Indexes Added
    - comments.user_id
    - notifications.actor_id, comment_id, post_id
    - saved_posts.post_id
    - story_views.viewer_id
    - highlight_stories.story_id
*/

-- Add index for comments.user_id
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Add indexes for notifications foreign keys
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_comment_id ON notifications(comment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON notifications(post_id);

-- Add index for saved_posts.post_id
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON saved_posts(post_id);

-- Add index for story_views.viewer_id
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);

-- Add index for highlight_stories.story_id
CREATE INDEX IF NOT EXISTS idx_highlight_stories_story_id ON highlight_stories(story_id);
