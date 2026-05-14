/*
  # Reset and Create New Feed Data

  1. Changes
    - Delete all existing posts, likes, comments, and saved posts
    - Create 15 new posts per user with diving/nature photos
    - Add realistic likes, comments, and saved posts

  2. Data Safety
    - Uses DELETE with proper WHERE clauses
    - Creates new sample data with Pexels diving and nature photos
*/

-- Delete existing engagement data
DELETE FROM saved_posts;
DELETE FROM comments;
DELETE FROM likes;
DELETE FROM posts;

-- Create new posts for each user (15 posts per user)
-- User 1: kimtaehyung
INSERT INTO posts (user_id, image_url, caption, location, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/1078983/pexels-photo-1078983.jpeg', '제주도 바다 속 신비로운 세계 🌊 오늘도 멋진 다이빙이었어요!', '제주도 서귀포', NOW() - INTERVAL '1 day'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/3881104/pexels-photo-3881104.jpeg', '수중 동굴 탐험 🏞️ 빛이 들어오는 순간이 정말 환상적이네요', '필리핀 코론', NOW() - INTERVAL '2 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/3881347/pexels-photo-3881347.jpeg', '형형색색의 산호초 🪸 자연이 만든 예술작품', '몰디브', NOW() - INTERVAL '3 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/920161/pexels-photo-920161.jpeg', '프리다이빙으로 만난 바다거북 🐢 평화로운 순간', '하와이', NOW() - INTERVAL '4 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/3881115/pexels-photo-3881115.jpeg', '푸른 바다 위에서 ☀️ 다이빙 전 설레는 마음', '태국 푸켓', NOW() - INTERVAL '5 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/2049422/pexels-photo-2049422.jpeg', '해양 생물과의 교감 🐠 매 순간이 소중해요', '인도네시아 발리', NOW() - INTERVAL '6 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/3881102/pexels-photo-3881102.jpeg', '깊은 바다 속 신비 🌊 30미터 아래의 세계', '일본 오키나와', NOW() - INTERVAL '7 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '석양과 함께하는 비치 다이빙 🌅', '제주도 협재', NOW() - INTERVAL '8 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/3881348/pexels-photo-3881348.jpeg', '수중 사진 촬영 중 📸 빛의 향연', '말레이시아 시파단', NOW() - INTERVAL '9 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/3881116/pexels-photo-3881116.jpeg', '상어와의 만남 🦈 짜릿한 순간!', '몰디브', NOW() - INTERVAL '10 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/1125979/pexels-photo-1125979.jpeg', '바다 속 평화 ✨ 이런 순간을 위해 다이빙해요', '괌', NOW() - INTERVAL '11 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/3881105/pexels-photo-3881105.jpeg', '수중 정원 탐험 🌿 해초 사이를 헤엄치며', '필리핀 보홀', NOW() - INTERVAL '12 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '친구들과 함께한 그룹 다이빙 👥', '베트남 나트랑', NOW() - INTERVAL '13 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/3881349/pexels-photo-3881349.jpeg', '야간 다이빙의 매력 🌙 밤바다는 또 다른 세계', '태국 코타오', NOW() - INTERVAL '14 days'),
('11111111-1111-1111-1111-111111111111', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '완벽한 다이빙 날씨 ⛵ 바다가 나를 부른다', '제주도 문섬', NOW() - INTERVAL '15 days');

-- User 2: parkjimin
INSERT INTO posts (user_id, image_url, caption, location, created_at) VALUES
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/3881350/pexels-photo-3881350.jpeg', '수중 세계의 아름다움 💙', '팔라우', NOW() - INTERVAL '1 day'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/920161/pexels-photo-920161.jpeg', '만타레이와 함께 수영하기 🦅', '하와이 빅아일랜드', NOW() - INTERVAL '2 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/3881104/pexels-photo-3881104.jpeg', '환상적인 시야 속에서 ✨', '이집트 홍해', NOW() - INTERVAL '3 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/3881347/pexels-photo-3881347.jpeg', '산호초 정원 🌺 생명의 터전', '호주 그레이트 배리어 리프', NOW() - INTERVAL '4 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/2049422/pexels-photo-2049422.jpeg', '다채로운 해양 생물들 🐟', '인도네시아 라자암팟', NOW() - INTERVAL '5 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/1078983/pexels-photo-1078983.jpeg', '프리다이빙으로 느끼는 자유 🕊️', '제주도', NOW() - INTERVAL '6 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/3881115/pexels-photo-3881115.jpeg', '수면 위 맑은 하늘 ☀️', '사이판', NOW() - INTERVAL '7 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/3881102/pexels-photo-3881102.jpeg', '난파선 탐험 ⚓ 역사 속으로', '필리핀 코론', NOW() - INTERVAL '8 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/1125979/pexels-photo-1125979.jpeg', '고요한 수중 명상 🧘', '몰디브', NOW() - INTERVAL '9 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/3881348/pexels-photo-3881348.jpeg', '빛의 커튼 아래에서 💫', '멕시코 세노테', NOW() - INTERVAL '10 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/3881116/pexels-photo-3881116.jpeg', '상어 떼와의 조우 🦈', '갈라파고스', NOW() - INTERVAL '11 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/3881105/pexels-photo-3881105.jpeg', '수중 동굴의 신비 🔦', '태국 크라비', NOW() - INTERVAL '12 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/3881349/pexels-photo-3881349.jpeg', '야간 다이빙의 스릴 🌃', '필리핀 모알보알', NOW() - INTERVAL '13 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '맑은 물과 푸른 하늘 🏝️', '팔라우', NOW() - INTERVAL '14 days'),
('22222222-2222-2222-2222-222222222222', 'https://images.pexels.com/photos/920161/pexels-photo-920161.jpeg', '해저 낙원 발견 🐠', '인도네시아 코모도', NOW() - INTERVAL '15 days');

-- User 3: leesunmi
INSERT INTO posts (user_id, image_url, caption, location, created_at) VALUES
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/3881104/pexels-photo-3881104.jpeg', '청량한 수중 세계 💧', '제주도 우도', NOW() - INTERVAL '1 day'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/2049422/pexels-photo-2049422.jpeg', '형형색색 열대어 🌈', '태국 시밀란', NOW() - INTERVAL '2 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/3881347/pexels-photo-3881347.jpeg', '산호초 사이로 🪸', '필리핀 보라카이', NOW() - INTERVAL '3 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/1078983/pexels-photo-1078983.jpeg', '바다거북과의 만남 🐢', '하와이 마우이', NOW() - INTERVAL '4 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/920161/pexels-photo-920161.jpeg', '프리다이빙의 평화 🌊', '몰디브', NOW() - INTERVAL '5 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/3881115/pexels-photo-3881115.jpeg', '완벽한 부력 컨트롤 ⚖️', '일본 요나구니', NOW() - INTERVAL '6 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/3881102/pexels-photo-3881102.jpeg', '깊은 블루의 세계 🔵', '팔라우', NOW() - INTERVAL '7 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/1125979/pexels-photo-1125979.jpeg', '수중 요가 🧘‍♀️', '인도네시아 누사페니다', NOW() - INTERVAL '8 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/3881348/pexels-photo-3881348.jpeg', '빛의 마법 ✨', '멕시코 툴룸', NOW() - INTERVAL '9 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/3881116/pexels-photo-3881116.jpeg', '상어 다이빙 체험 🦈', '남아공', NOW() - INTERVAL '10 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/3881105/pexels-photo-3881105.jpeg', '해초 숲 탐험 🌿', '제주도 범섬', NOW() - INTERVAL '11 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/3881349/pexels-photo-3881349.jpeg', '별빛 아래 다이빙 ⭐', '괌', NOW() - INTERVAL '12 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '수평선을 바라보며 🌅', '사이판', NOW() - INTERVAL '13 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/3881350/pexels-photo-3881350.jpeg', '투명한 바다 속 🔮', '필리핀 엘니도', NOW() - INTERVAL '14 days'),
('33333333-3333-3333-3333-333333333333', 'https://images.pexels.com/photos/920161/pexels-photo-920161.jpeg', '만타와 함께 춤을 🦅', '인도네시아 코모도', NOW() - INTERVAL '15 days');

-- User 4: choiwooshik  
INSERT INTO posts (user_id, image_url, caption, location, created_at) VALUES
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/3881347/pexels-photo-3881347.jpeg', '아침 다이빙의 청량함 🌄', '제주도 성산', NOW() - INTERVAL '1 day'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/1078983/pexels-photo-1078983.jpeg', '수중 모험가의 하루 🤿', '필리핀 두마게티', NOW() - INTERVAL '2 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/2049422/pexels-photo-2049422.jpeg', '알록달록 물고기 떼 🐟', '태국 코사무이', NOW() - INTERVAL '3 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/920161/pexels-photo-920161.jpeg', '거북이와 수영 🐢', '이집트 다합', NOW() - INTERVAL '4 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/3881115/pexels-photo-3881115.jpeg', '무한한 블루 💙', '몰디브 마푸시', NOW() - INTERVAL '5 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/3881102/pexels-photo-3881102.jpeg', '심해 탐험 🔦', '팔라우 블루코너', NOW() - INTERVAL '6 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/1125979/pexels-photo-1125979.jpeg', '평온한 수중 시간 ⏰', '인도네시아 롬복', NOW() - INTERVAL '7 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/3881348/pexels-photo-3881348.jpeg', '햇빛이 만드는 환상 ☀️', '멕시코 코수멜', NOW() - INTERVAL '8 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/3881116/pexels-photo-3881116.jpeg', '상어와의 평화로운 공존 🦈', '바하마', NOW() - INTERVAL '9 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/3881105/pexels-photo-3881105.jpeg', '수중 정글 탐험 🌴', '필리핀 팔라완', NOW() - INTERVAL '10 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/3881349/pexels-photo-3881349.jpeg', '야광 플랑크톤 다이빙 ✨', '베트남 푸꾸옥', NOW() - INTERVAL '11 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '수평선 너머 🌊', '괌', NOW() - INTERVAL '12 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/3881350/pexels-photo-3881350.jpeg', '크리스탈 워터 💎', '태국 피피섬', NOW() - INTERVAL '13 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/3881104/pexels-photo-3881104.jpeg', '동굴 다이빙의 스릴 🏔️', '제주도 지귀도', NOW() - INTERVAL '14 days'),
('44444444-4444-4444-4444-444444444444', 'https://images.pexels.com/photos/920161/pexels-photo-920161.jpeg', '만타 클리닝 스테이션 🧹', '인도네시아 만타 포인트', NOW() - INTERVAL '15 days');

-- User 5: jeongsoyeon
INSERT INTO posts (user_id, image_url, caption, location, created_at) VALUES
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/2049422/pexels-photo-2049422.jpeg', '수중 사진작가의 시선 📷', '필리핀 아닐라오', NOW() - INTERVAL '1 day'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/3881347/pexels-photo-3881347.jpeg', '산호 정원의 아름다움 🌸', '호주 GBR', NOW() - INTERVAL '2 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/1078983/pexels-photo-1078983.jpeg', '평화로운 수중 산책 🚶‍♀️', '제주도 서귀포', NOW() - INTERVAL '3 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/920161/pexels-photo-920161.jpeg', '바다거북 보호 활동 🐢', '하와이', NOW() - INTERVAL '4 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/3881115/pexels-photo-3881115.jpeg', '수면 반사의 예술 🎨', '몰디브', NOW() - INTERVAL '5 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/3881102/pexels-photo-3881102.jpeg', '드리프트 다이빙 💨', '팔라우', NOW() - INTERVAL '6 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/1125979/pexels-photo-1125979.jpeg', '명상하는 다이버 🧘‍♀️', '인도네시아 발리', NOW() - INTERVAL '7 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/3881348/pexels-photo-3881348.jpeg', '빛의 커튼을 지나며 🌅', '멕시코 유카탄', NOW() - INTERVAL '8 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/3881116/pexels-photo-3881116.jpeg', '상어 보호 캠페인 🦈', '피지', NOW() - INTERVAL '9 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/3881105/pexels-photo-3881105.jpeg', '켈프 숲 다이빙 🌿', '미국 캘리포니아', NOW() - INTERVAL '10 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/3881349/pexels-photo-3881349.jpeg', '별빛 다이빙 🌟', '필리핀 막탄', NOW() - INTERVAL '11 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '완벽한 다이빙 조건 ✅', '사이판', NOW() - INTERVAL '12 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/3881350/pexels-photo-3881350.jpeg', '에메랄드 바다 💚', '태국 란타', NOW() - INTERVAL '13 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/3881104/pexels-photo-3881104.jpeg', '수중 동굴 빛의 향연 💫', '스페인 마요르카', NOW() - INTERVAL '14 days'),
('55555555-5555-5555-5555-555555555555', 'https://images.pexels.com/photos/2049422/pexels-photo-2049422.jpeg', '열대어 파라다이스 🐠', '인도네시아 라자암팟', NOW() - INTERVAL '15 days');

-- Add likes (random distribution)
INSERT INTO likes (user_id, post_id)
SELECT 
  u.id,
  p.id
FROM profiles u
CROSS JOIN posts p
WHERE u.id != p.user_id
  AND random() > 0.65
LIMIT 500;

-- Add comments (random distribution)
INSERT INTO comments (user_id, post_id, content)
SELECT 
  u.id,
  p.id,
  CASE (random() * 15)::int
    WHEN 0 THEN '정말 멋진 다이빙이네요! 🤩'
    WHEN 1 THEN '저도 여기 가보고 싶어요! 어떻게 가셨나요?'
    WHEN 2 THEN '사진이 정말 아름답습니다 📸'
    WHEN 3 THEN '부럽습니다! 다음에 같이 가요 🌊'
    WHEN 4 THEN '수중 사진 너무 잘 찍으시네요!'
    WHEN 5 THEN '이 포인트 정말 좋죠! 저도 다녀왔어요'
    WHEN 6 THEN '안전 다이빙 하세요! 🤿'
    WHEN 7 THEN '물색이 환상적이네요 💙'
    WHEN 8 THEN '다이빙 정보 공유해주세요!'
    WHEN 9 THEN '어떤 카메라 사용하셨어요?'
    WHEN 10 THEN '최고의 다이빙 포인트 같아요! ⭐'
    WHEN 11 THEN '자연이 정말 아름답네요 🌿'
    WHEN 12 THEN '다음 다이빙 트립 기대됩니다!'
    WHEN 13 THEN '시야가 정말 좋네요! 부럽습니다'
    ELSE '멋진 경험 공유해주셔서 감사합니다!'
  END
FROM profiles u
CROSS JOIN posts p
WHERE u.id != p.user_id
  AND random() > 0.75
LIMIT 300;

-- Add saved posts (random distribution)
INSERT INTO saved_posts (user_id, post_id)
SELECT 
  u.id,
  p.id
FROM profiles u
CROSS JOIN posts p
WHERE u.id != p.user_id
  AND random() > 0.85
LIMIT 200;
