/*
  # Add Sample Video Posts for Reels

  1. Add video_url to some existing posts
  2. Create new posts with video URLs
  
  Note: Using free sample video URLs from Pexels
*/

DO $$
DECLARE
  user_record record;
  video_urls text[] := ARRAY[
    'https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4',
    'https://videos.pexels.com/video-files/3015509/3015509-hd_1920_1080_24fps.mp4',
    'https://videos.pexels.com/video-files/2491284/2491284-hd_1920_1080_30fps.mp4',
    'https://videos.pexels.com/video-files/3571985/3571985-uhd_2560_1440_30fps.mp4',
    'https://videos.pexels.com/video-files/3015494/3015494-hd_1920_1080_24fps.mp4',
    'https://videos.pexels.com/video-files/2491285/2491285-hd_1920_1080_30fps.mp4',
    'https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4',
    'https://videos.pexels.com/video-files/3015520/3015520-hd_1920_1080_25fps.mp4',
    'https://videos.pexels.com/video-files/2491283/2491283-hd_1920_1080_30fps.mp4',
    'https://videos.pexels.com/video-files/3571985/3571985-uhd_2560_1440_30fps.mp4'
  ];
  dive_sites text[] := ARRAY['제주 문섬', '제주 범섬', '울릉도 독도', '속초 해변', '부산 오륙도', '동해 추암', '팔라우 블루코너', '필리핀 아포섬', '태국 시밀란', '몰디브 마야티리'];
  locations text[] := ARRAY['제주도', '울릉도', '속초', '부산', '동해', '팔라우', '세부', '푸켓', '몰디브', '이집트'];
  captions text[] := ARRAY[
    '오늘의 다이빙 영상! 🌊',
    '수중 세계를 함께 경험해보세요',
    '바다 속 평화로운 순간들',
    '다이빙 버디와 함께한 멋진 시간',
    '깊은 바다의 신비로움',
    '산호초와 물고기들 🐠',
    '최고의 다이빙 스팟!',
    '이 순간을 영상으로 담았어요',
    '바다거북을 만났어요 🐢',
    '완벽한 수중 촬영!'
  ];
  days_ago int;
  dive_type_choice text;
BEGIN
  -- Add video URLs to existing posts from sample users (update 2 posts per user)
  FOR user_record IN 
    SELECT id, username 
    FROM profiles 
    WHERE username IN (
      'minjun_diver', 'seojun_ocean', 'yuna_sea', 'jiwoo_dive', 'minseo_blue',
      'hyunwoo_deep', 'sohee_coral', 'jihoon_waves', 'chaeyoung_reef', 'taehyun_shark'
    )
    LIMIT 10
  LOOP
    UPDATE posts
    SET video_url = video_urls[1 + floor(random() * array_length(video_urls, 1))::int]
    WHERE id IN (
      SELECT id 
      FROM posts 
      WHERE user_id = user_record.id 
      ORDER BY created_at DESC 
      LIMIT 2
    );
  END LOOP;

  -- Create additional video-only posts
  FOR user_record IN 
    SELECT id, username 
    FROM profiles 
    WHERE username IN (
      'eunji_marine', 'dongmin_wreck', 'nari_blue', 'sunho_abyss', 'yejin_turtle',
      'kyungmin_cave', 'jieun_reef', 'sangwoo_current', 'minji_manta', 'woojin_night'
    )
    LIMIT 10
  LOOP
    FOR days_ago IN 0..2 LOOP
      dive_type_choice := CASE WHEN random() < 0.6 THEN 'scuba' ELSE 'freediving' END;
      
      INSERT INTO posts (
        user_id,
        video_url,
        caption,
        dive_type,
        dive_date,
        max_depth,
        water_temperature,
        dive_duration,
        dive_site,
        visibility,
        location,
        created_at
      ) VALUES (
        user_record.id,
        video_urls[1 + floor(random() * array_length(video_urls, 1))::int],
        captions[1 + floor(random() * array_length(captions, 1))::int],
        dive_type_choice,
        CURRENT_DATE - (days_ago || ' days')::interval,
        (random() * 35 + 5)::decimal(5,1),
        (random() * 15 + 15)::decimal(4,1),
        CASE WHEN dive_type_choice = 'scuba' THEN (random() * 50 + 20)::int ELSE NULL END,
        dive_sites[1 + floor(random() * array_length(dive_sites, 1))::int],
        (random() * 25 + 5)::decimal(4,1),
        locations[1 + floor(random() * array_length(locations, 1))::int],
        NOW() - (days_ago || ' days')::interval - (floor(random() * 24)::int || ' hours')::interval
      );
    END LOOP;
  END LOOP;

END $$;
