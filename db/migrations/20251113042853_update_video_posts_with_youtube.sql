/*
  # Update Video Posts with YouTube Videos

  1. Changes
    - Replace existing Pexels video URLs with YouTube diving videos
    - Use real scuba diving and freediving videos
    - Ensure videos work properly in Reels

  Note: Using YouTube Shorts and diving videos
*/

DO $$
DECLARE
  post_record record;
  youtube_urls text[] := ARRAY[
    'https://www.youtube.com/watch?v=qC0vDKVPCrw',
    'https://www.youtube.com/watch?v=VJqaRH0nxs8',
    'https://www.youtube.com/watch?v=T8DJGZc1vQA',
    'https://www.youtube.com/watch?v=8n_7T_qTmYE',
    'https://www.youtube.com/watch?v=x3zvsKGV4Wg',
    'https://www.youtube.com/watch?v=mWRsgE11hgg',
    'https://www.youtube.com/watch?v=d6ZNFYJxwHk',
    'https://www.youtube.com/watch?v=DLzxrzFCyOs',
    'https://www.youtube.com/watch?v=hC3VTgIPoGU',
    'https://www.youtube.com/watch?v=UWQqFckQKAw',
    'https://www.youtube.com/watch?v=c3WdXH9GKf0',
    'https://www.youtube.com/watch?v=1sJx7iNqYMg',
    'https://www.youtube.com/watch?v=iD2rhdFJdWE',
    'https://www.youtube.com/watch?v=3HRkKznJoZA',
    'https://www.youtube.com/watch?v=2H6cJZaGU5w'
  ];
  counter int := 1;
BEGIN
  -- Update existing video posts with YouTube URLs
  FOR post_record IN 
    SELECT id 
    FROM posts 
    WHERE video_url IS NOT NULL 
    ORDER BY created_at DESC
    LIMIT 50
  LOOP
    UPDATE posts
    SET video_url = youtube_urls[1 + (counter % array_length(youtube_urls, 1))]
    WHERE id = post_record.id;
    
    counter := counter + 1;
  END LOOP;

END $$;
