/*
  # Add Sample Reels and Saved Posts

  1. Changes
    - Add sample video posts (reels) with diving content
    - Add sample saved posts for existing users
    - Include diving information for reels

  2. Sample Data
    - Video posts from various users with diving locations
    - Saved posts relationships for users
    - Likes and comments for engagement
*/

-- Add sample video posts (reels)
INSERT INTO posts (user_id, video_url, caption, location, dive_site, max_depth, water_temperature, dive_duration, visibility, buddy_name)
VALUES 
  (
    '970548a3-c271-4237-a195-7edb525b96f1',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '제주도 섭지코지에서의 환상적인 다이빙! 🌊 투명한 물속에서 만난 열대어들이 정말 아름다웠어요.',
    '제주도 섭지코지',
    '섭지코지 포인트',
    18,
    22,
    45,
    20,
    '@seojun_ocean'
  ),
  (
    '94885b4e-68a1-4c50-be5e-979167eea5a7',
    'https://www.youtube.com/embed/jNQXAC9IVRw',
    '필리핀 아포 아일랜드에서 거북이와 함께한 다이빙 🐢 정말 감동적인 순간이었어요!',
    '필리핀 아포 아일랜드',
    'Apo Island Sanctuary',
    15,
    28,
    50,
    25,
    NULL
  ),
  (
    '6b0cbe5e-3513-4cc2-adf6-5217ff927c16',
    'https://www.youtube.com/embed/3JZ_D3ELwOQ',
    '동해 속초에서의 첫 겨울 다이빙 ❄️ 수온은 낮았지만 시야가 정말 좋았어요!',
    '강원도 속초',
    '속초 외옹치',
    12,
    8,
    35,
    15,
    '@jiwoo_dive'
  ),
  (
    '6eb23762-ba09-4b90-ba90-f5b3b6517b56',
    'https://www.youtube.com/embed/Me-NU_u1Mi4',
    '말레이시아 시파단에서의 햄머헤드 상어 만남 🦈 정말 압도적이었습니다!',
    '말레이시아 시파단',
    'Sipadan Drop Off',
    30,
    27,
    55,
    30,
    NULL
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'https://www.youtube.com/embed/YQHsXMglC9A',
    '태국 코타오에서의 나이트 다이빙 🌙 야행성 생물들을 관찰하는 특별한 경험!',
    '태국 코타오',
    'Koh Tao Night Dive',
    10,
    29,
    40,
    12,
    NULL
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'https://www.youtube.com/embed/6n3pFFPSlW4',
    '인도네시아 라자암팟의 만타레이 포인트 🦅 수십 마리의 만타가 함께 춤추는 모습!',
    '인도네시아 라자암팟',
    'Manta Sandy',
    14,
    28,
    60,
    25,
    '@minjun_diver'
  );

-- Add likes to video posts
INSERT INTO likes (user_id, post_id)
SELECT 
  p.id,
  po.id
FROM profiles p
CROSS JOIN posts po
WHERE po.video_url IS NOT NULL
  AND p.username IN ('minjun_diver', 'seojun_ocean', 'yuna_sea', 'jiwoo_dive', 'kimtaehyung', 'parkjimin')
  AND random() > 0.3;

-- Add comments to video posts
INSERT INTO comments (user_id, post_id, content)
SELECT 
  p.id,
  po.id,
  CASE (random() * 5)::int
    WHEN 0 THEN '와 정말 멋지네요! 저도 가보고 싶어요 🤩'
    WHEN 1 THEN '영상 퀄리티 대박이에요! 어떤 카메라 사용하셨나요?'
    WHEN 2 THEN '다음에 같이 다이빙 가요! 🌊'
    WHEN 3 THEN '시야가 정말 좋네요! 부럽습니다'
    ELSE '멋진 영상 감사합니다! 다음 영상도 기대할게요'
  END
FROM profiles p
CROSS JOIN posts po
WHERE po.video_url IS NOT NULL
  AND p.username IN ('leesunmi', 'choiwooshik', 'jeongsoyeon', 'minjun_diver')
  AND random() > 0.5;

-- Add saved posts for users
INSERT INTO saved_posts (user_id, post_id)
SELECT 
  '970548a3-c271-4237-a195-7edb525b96f1',
  po.id
FROM posts po
WHERE po.user_id != '970548a3-c271-4237-a195-7edb525b96f1'
  AND random() > 0.7
LIMIT 8;

INSERT INTO saved_posts (user_id, post_id)
SELECT 
  '94885b4e-68a1-4c50-be5e-979167eea5a7',
  po.id
FROM posts po
WHERE po.user_id != '94885b4e-68a1-4c50-be5e-979167eea5a7'
  AND random() > 0.6
LIMIT 10;

INSERT INTO saved_posts (user_id, post_id)
SELECT 
  '6b0cbe5e-3513-4cc2-adf6-5217ff927c16',
  po.id
FROM posts po
WHERE po.user_id != '6b0cbe5e-3513-4cc2-adf6-5217ff927c16'
  AND random() > 0.65
LIMIT 12;

INSERT INTO saved_posts (user_id, post_id)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  po.id
FROM posts po
WHERE po.user_id != '11111111-1111-1111-1111-111111111111'
  AND random() > 0.7
LIMIT 9;

INSERT INTO saved_posts (user_id, post_id)
SELECT 
  '22222222-2222-2222-2222-222222222222',
  po.id
FROM posts po
WHERE po.user_id != '22222222-2222-2222-2222-222222222222'
  AND random() > 0.75
LIMIT 7;
