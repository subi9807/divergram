/*
  # Add Sample Users and Sample Data

  1. Changes
    - Temporarily disable foreign key constraint on profiles table
    - Insert 5 sample user profiles with diverse content
    - Insert sample posts for each user (3-5 posts per user)
    - Create follow relationships between users
    - Re-enable foreign key constraint
  
  2. Sample Users
    - kimtaehyung: Photography enthusiast
    - parkjimin: Travel and food lover
    - leesunmi: Daily life recorder
    - choiwooshik: Coffee, music and books
    - jeongsoyeon: Fashion and beauty influencer
  
  3. Sample Content
    - Various posts with images from Pexels
    - Follow relationships to create a social network
    - Posts with Korean captions and locations
*/

-- Temporarily disable foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Create sample user profiles
WITH new_users AS (
  INSERT INTO profiles (id, username, full_name, bio, avatar_url, created_at)
  VALUES
    ('11111111-1111-1111-1111-111111111111', 'kimtaehyung', '김태형', '사진 찍는 것을 좋아해요 📷', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200', now() - interval '90 days'),
    ('22222222-2222-2222-2222-222222222222', 'parkjimin', '박지민', '여행과 맛집을 사랑하는 사람 🌍', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200', now() - interval '75 days'),
    ('33333333-3333-3333-3333-333333333333', 'leesunmi', '이선미', '일상을 기록합니다 ✨', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200', now() - interval '60 days'),
    ('44444444-4444-4444-4444-444444444444', 'choiwooshik', '최우식', '커피와 음악 그리고 책 ☕📚', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200', now() - interval '45 days'),
    ('55555555-5555-5555-5555-555555555555', 'jeongsoyeon', '정소연', '패션과 뷰티 인플루언서 💄', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=200', now() - interval '30 days')
  ON CONFLICT (username) DO NOTHING
  RETURNING id, username
)
SELECT * FROM new_users;

-- Create sample posts for kimtaehyung (Photography)
INSERT INTO posts (user_id, image_url, caption, location, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=800', '오늘의 일몰 🌅 완벽한 순간을 담았어요', '한강공원, 서울', now() - interval '2 hours'),
  ('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&w=800', '도시의 야경은 언제나 아름답다', '남산타워, 서울', now() - interval '1 day'),
  ('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/1252869/pexels-photo-1252869.jpeg?auto=compress&cs=tinysrgb&w=800', '자연 속에서 찾은 평화', '북한산, 서울', now() - interval '3 days'),
  ('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=800', '카페에서의 여유로운 오후', '성수동, 서울', now() - interval '5 days');

-- Create sample posts for parkjimin (Travel & Food)
INSERT INTO posts (user_id, image_url, caption, location, created_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800', '제주도에서 맛본 최고의 흑돼지 🍖', '제주도', now() - interval '3 hours'),
  ('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/1438404/pexels-photo-1438404.jpeg?auto=compress&cs=tinysrgb&w=800', '부산 해운대 바다가 너무 예뻐요 🌊', '해운대, 부산', now() - interval '2 days'),
  ('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=800', '경주 여행 중 발견한 숨은 맛집', '경주, 경상북도', now() - interval '4 days'),
  ('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=800', '강릉 커피거리에서 ☕', '강릉, 강원도', now() - interval '6 days');

-- Create sample posts for leesunmi (Daily Life)
INSERT INTO posts (user_id, image_url, caption, location, created_at)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/1054218/pexels-photo-1054218.jpeg?auto=compress&cs=tinysrgb&w=800', '오늘의 홈카페 ☕✨', '집', now() - interval '5 hours'),
  ('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/1002638/pexels-photo-1002638.jpeg?auto=compress&cs=tinysrgb&w=800', '새로 산 책과 함께하는 주말 📚', '집', now() - interval '1 day'),
  ('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/1337386/pexels-photo-1337386.jpeg?auto=compress&cs=tinysrgb&w=800', '반려식물들 잘 자라고 있어요 🌿', '집', now() - interval '3 days'),
  ('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=800', '요즘 빠진 베이킹 🧁', '집', now() - interval '5 days');

-- Create sample posts for choiwooshik (Coffee & Culture)
INSERT INTO posts (user_id, image_url, caption, location, created_at)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=800', '새로 발견한 서점 카페 📖☕', '연남동, 서울', now() - interval '4 hours'),
  ('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/1405761/pexels-photo-1405761.jpeg?auto=compress&cs=tinysrgb&w=800', '재즈 라이브 공연 최고였어요 🎵', '이태원, 서울', now() - interval '2 days'),
  ('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg?auto=compress&cs=tinysrgb&w=800', '아침의 완벽한 시작', '홍대, 서울', now() - interval '4 days');

-- Create sample posts for jeongsoyeon (Fashion & Beauty)
INSERT INTO posts (user_id, image_url, caption, location, created_at)
VALUES
  ('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800', '오늘의 OOTD 💃 #데일리룩', '강남, 서울', now() - interval '1 hour'),
  ('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/1055691/pexels-photo-1055691.jpeg?auto=compress&cs=tinysrgb&w=800', '새로 나온 립스틱 컬러 완전 예쁨 💄', '명동, 서울', now() - interval '1 day'),
  ('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=800', '가을 패션위크 다녀왔어요 🍂', '동대문, 서울', now() - interval '3 days'),
  ('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/1805412/pexels-photo-1805412.jpeg?auto=compress&cs=tinysrgb&w=800', '요즘 즐겨쓰는 스킨케어 제품들', '청담동, 서울', now() - interval '6 days');

-- Create follow relationships
-- Current user follows some sample users
INSERT INTO follows (follower_id, following_id, created_at)
SELECT 'f6448055-9bb0-428c-9657-d6d8e07ed358', id, now() - (random() * interval '30 days')
FROM profiles
WHERE username IN ('kimtaehyung', 'parkjimin', 'leesunmi')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Sample users follow each other
INSERT INTO follows (follower_id, following_id, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', now() - interval '20 days'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', now() - interval '15 days'),
  ('11111111-1111-1111-1111-111111111111', 'f6448055-9bb0-428c-9657-d6d8e07ed358', now() - interval '10 days'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', now() - interval '18 days'),
  ('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', now() - interval '12 days'),
  ('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', now() - interval '8 days'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', now() - interval '16 days'),
  ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', now() - interval '9 days'),
  ('33333333-3333-3333-3333-333333333333', 'f6448055-9bb0-428c-9657-d6d8e07ed358', now() - interval '5 days'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', now() - interval '14 days'),
  ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', now() - interval '11 days'),
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', now() - interval '13 days'),
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', now() - interval '7 days'),
  ('55555555-5555-5555-5555-555555555555', 'f6448055-9bb0-428c-9657-d6d8e07ed358', now() - interval '3 days')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Add some likes to posts
INSERT INTO likes (post_id, user_id, created_at)
SELECT p.id, u.id, now() - (random() * interval '7 days')
FROM posts p
CROSS JOIN (
  SELECT id FROM profiles WHERE id IN (
    'f6448055-9bb0-428c-9657-d6d8e07ed358',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
  )
) u
WHERE random() < 0.3
ON CONFLICT (post_id, user_id) DO NOTHING;

-- Add some comments to posts
INSERT INTO comments (post_id, user_id, content, created_at)
SELECT p.id, u.id, 
  CASE floor(random() * 5)
    WHEN 0 THEN '와 정말 멋지네요! 👍'
    WHEN 1 THEN '너무 예뻐요 ❤️'
    WHEN 2 THEN '저도 가보고 싶어요!'
    WHEN 3 THEN '완전 공감해요 ㅎㅎ'
    ELSE '좋아요~!'
  END,
  now() - (random() * interval '5 days')
FROM posts p
CROSS JOIN (
  SELECT id FROM profiles WHERE id IN (
    'f6448055-9bb0-428c-9657-d6d8e07ed358',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
  )
) u
WHERE random() < 0.2;

-- Re-enable foreign key constraint (but make it not enforced for sample data)
-- This allows the sample data to exist without actual auth.users entries
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) NOT VALID;
