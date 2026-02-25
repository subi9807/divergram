/*
  # Add Sample Posts and Engagement Data

  1. Create 10-15 posts per sample user
  2. Add follow relationships
  3. Add likes and comments

  Note: This creates extensive sample data for testing
*/

DO $$
DECLARE
  user_record record;
  post_counter int;
  days_ago int;
  dive_sites text[] := ARRAY['제주 문섬', '제주 범섬', '울릉도 독도', '속초 해변', '부산 오륙도', '동해 추암', '팔라우 블루코너', '필리핀 아포섬', '태국 시밀란', '몰디브 마야티리', '이집트 홍해', '호주 그레이트배리어리프', '멕시코 세노테', '발리 누사페니다', '사이판 그로토'];
  locations text[] := ARRAY['제주도', '울릉도', '속초', '부산', '동해', '팔라우', '세부', '푸켓', '몰디브', '이집트', '케언즈', '칸쿤', '발리', '사이판'];
  captions text[] := ARRAY[
    '오늘 다이빙은 정말 완벽했어요! 🌊',
    '수중 세계는 언제나 경이롭습니다',
    '맑은 바다에서의 다이빙, 최고예요!',
    '새로운 바다 친구들을 만났어요 🐠',
    '이 순간을 영원히 기억하고 싶어요',
    '바다는 나의 치유처 💙',
    '완벽한 가시거리와 수온!',
    '오늘의 다이빙 로그 기록',
    '바다 속 평화로운 시간',
    '다이빙은 제 인생입니다',
    '수중 사진 촬영 성공! 📸',
    '바다거북을 만났어요 🐢',
    '환상적인 산호초 군락',
    '깊은 곳의 신비로움',
    '버디와 함께한 멋진 다이빙'
  ];
  dive_type_choice text;
  random_depth decimal;
  random_temp decimal;
  random_visibility decimal;
  img_urls text[] := ARRAY[
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2404370/pexels-photo-2404370.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3693095/pexels-photo-3693095.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3389536/pexels-photo-3389536.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/5464465/pexels-photo-5464465.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1618606/pexels-photo-1618606.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3601422/pexels-photo-3601422.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3396664/pexels-photo-3396664.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2736296/pexels-photo-2736296.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2131828/pexels-photo-2131828.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1660995/pexels-photo-1660995.jpeg?auto=compress&cs=tinysrgb&w=800'
  ];
BEGIN
  -- Create posts for each sample user (those with specific naming pattern)
  FOR user_record IN 
    SELECT id, username 
    FROM profiles 
    WHERE username IN (
      'minjun_diver', 'seojun_ocean', 'yuna_sea', 'jiwoo_dive', 'minseo_blue',
      'hyunwoo_deep', 'sohee_coral', 'jihoon_waves', 'chaeyoung_reef', 'taehyun_shark',
      'eunji_marine', 'dongmin_wreck', 'nari_blue', 'sunho_abyss', 'yejin_turtle',
      'kyungmin_cave', 'jieun_reef', 'sangwoo_current', 'minji_manta', 'woojin_night',
      'soyeon_macro', 'junsu_tech', 'hayoung_whale', 'seungmin_ice', 'dahyun_rainbow',
      'jinwoo_rescue', 'yewon_dolphin', 'jaehyun_apex', 'subin_jellyfish', 'hyojin_treasure'
    )
  LOOP
    FOR post_counter IN 1..(10 + floor(random() * 6)::int) LOOP
      days_ago := floor(random() * 90)::int;
      dive_type_choice := CASE WHEN random() < 0.6 THEN 'scuba' ELSE 'freediving' END;
      random_depth := (random() * 35 + 5)::decimal(5,1);
      random_temp := (random() * 15 + 15)::decimal(4,1);
      random_visibility := (random() * 25 + 5)::decimal(4,1);

      INSERT INTO posts (
        user_id,
        image_url,
        caption,
        dive_type,
        dive_date,
        max_depth,
        water_temperature,
        dive_duration,
        dive_site,
        visibility,
        buddy_name,
        location,
        created_at
      ) VALUES (
        user_record.id,
        img_urls[1 + floor(random() * array_length(img_urls, 1))::int],
        captions[1 + floor(random() * array_length(captions, 1))::int],
        dive_type_choice,
        CURRENT_DATE - (days_ago || ' days')::interval,
        random_depth,
        random_temp,
        CASE WHEN dive_type_choice = 'scuba' THEN (random() * 50 + 20)::int ELSE NULL END,
        dive_sites[1 + floor(random() * array_length(dive_sites, 1))::int],
        random_visibility,
        CASE 
          WHEN random() < 0.7 THEN 
            (SELECT username FROM profiles WHERE username != user_record.username ORDER BY random() LIMIT 1)
          ELSE NULL 
        END,
        locations[1 + floor(random() * array_length(locations, 1))::int],
        NOW() - (days_ago || ' days')::interval - (floor(random() * 24)::int || ' hours')::interval
      );
    END LOOP;
  END LOOP;

  -- Create follow relationships between sample users
  INSERT INTO follows (follower_id, following_id)
  SELECT DISTINCT
    u1.id,
    u2.id
  FROM 
    (SELECT id FROM profiles WHERE username IN (
      'minjun_diver', 'seojun_ocean', 'yuna_sea', 'jiwoo_dive', 'minseo_blue',
      'hyunwoo_deep', 'sohee_coral', 'jihoon_waves', 'chaeyoung_reef', 'taehyun_shark',
      'eunji_marine', 'dongmin_wreck', 'nari_blue', 'sunho_abyss', 'yejin_turtle',
      'kyungmin_cave', 'jieun_reef', 'sangwoo_current', 'minji_manta', 'woojin_night',
      'soyeon_macro', 'junsu_tech', 'hayoung_whale', 'seungmin_ice', 'dahyun_rainbow',
      'jinwoo_rescue', 'yewon_dolphin', 'jaehyun_apex', 'subin_jellyfish', 'hyojin_treasure'
    )) u1
  CROSS JOIN 
    (SELECT id FROM profiles WHERE username IN (
      'minjun_diver', 'seojun_ocean', 'yuna_sea', 'jiwoo_dive', 'minseo_blue',
      'hyunwoo_deep', 'sohee_coral', 'jihoon_waves', 'chaeyoung_reef', 'taehyun_shark',
      'eunji_marine', 'dongmin_wreck', 'nari_blue', 'sunho_abyss', 'yejin_turtle',
      'kyungmin_cave', 'jieun_reef', 'sangwoo_current', 'minji_manta', 'woojin_night',
      'soyeon_macro', 'junsu_tech', 'hayoung_whale', 'seungmin_ice', 'dahyun_rainbow',
      'jinwoo_rescue', 'yewon_dolphin', 'jaehyun_apex', 'subin_jellyfish', 'hyojin_treasure'
    )) u2
  WHERE u1.id != u2.id
  AND random() < 0.4
  ON CONFLICT DO NOTHING;

  -- Create likes on posts
  INSERT INTO likes (user_id, post_id)
  SELECT DISTINCT
    (SELECT id FROM profiles WHERE username IN (
      'minjun_diver', 'seojun_ocean', 'yuna_sea', 'jiwoo_dive', 'minseo_blue',
      'hyunwoo_deep', 'sohee_coral', 'jihoon_waves', 'chaeyoung_reef', 'taehyun_shark',
      'eunji_marine', 'dongmin_wreck', 'nari_blue', 'sunho_abyss', 'yejin_turtle',
      'kyungmin_cave', 'jieun_reef', 'sangwoo_current', 'minji_manta', 'woojin_night',
      'soyeon_macro', 'junsu_tech', 'hayoung_whale', 'seungmin_ice', 'dahyun_rainbow',
      'jinwoo_rescue', 'yewon_dolphin', 'jaehyun_apex', 'subin_jellyfish', 'hyojin_treasure'
    ) ORDER BY random() LIMIT 1),
    p.id
  FROM posts p
  CROSS JOIN generate_series(1, 10)
  WHERE random() < 0.3
  ON CONFLICT DO NOTHING;

  -- Create comments on posts
  INSERT INTO comments (user_id, post_id, content)
  SELECT DISTINCT
    (SELECT id FROM profiles WHERE username IN (
      'minjun_diver', 'seojun_ocean', 'yuna_sea', 'jiwoo_dive', 'minseo_blue',
      'hyunwoo_deep', 'sohee_coral', 'jihoon_waves', 'chaeyoung_reef', 'taehyun_shark',
      'eunji_marine', 'dongmin_wreck', 'nari_blue', 'sunho_abyss', 'yejin_turtle',
      'kyungmin_cave', 'jieun_reef', 'sangwoo_current', 'minji_manta', 'woojin_night',
      'soyeon_macro', 'junsu_tech', 'hayoung_whale', 'seungmin_ice', 'dahyun_rainbow',
      'jinwoo_rescue', 'yewon_dolphin', 'jaehyun_apex', 'subin_jellyfish', 'hyojin_treasure'
    ) ORDER BY random() LIMIT 1),
    p.id,
    CASE (floor(random() * 10) + 1)::int
      WHEN 1 THEN '멋진 다이빙이네요! 👍'
      WHEN 2 THEN '정말 아름다워요!'
      WHEN 3 THEN '어디서 다이빙하셨어요?'
      WHEN 4 THEN '저도 가보고 싶어요 🌊'
      WHEN 5 THEN '수중 사진 정말 잘 찍으셨네요!'
      WHEN 6 THEN '다음에 같이 다이빙해요!'
      WHEN 7 THEN '부럽습니다 ㅎㅎ'
      WHEN 8 THEN '최고의 다이빙 스팟이죠!'
      WHEN 9 THEN '물 상태가 정말 좋았나봐요'
      ELSE '안전 다이빙 하세요!'
    END
  FROM posts p
  CROSS JOIN generate_series(1, 3)
  WHERE random() < 0.2;

END $$;
