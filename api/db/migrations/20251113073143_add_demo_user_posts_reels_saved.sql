/*
  # Add Demo User Posts, Reels and Saved Posts

  1. New Data
    - 18 posts for demo_user with diving information
    - 18 reels (video posts) for demo_user
    - Saved posts for demo_user
    - Engagement data (likes, comments) for authenticity

  2. Content Details
    - Posts include various diving locations worldwide
    - Mix of scuba and freediving content
    - Realistic diving data (depth, temperature, visibility)
    - Diverse marine life encounters
*/

-- Insert 18 posts for demo_user
INSERT INTO posts (user_id, caption, image_url, location, dive_type, dive_site, max_depth, water_temperature, dive_duration, visibility, buddy_name, dive_date, created_at) VALUES
('f6448055-9bb0-428c-9657-d6d8e07ed358', '제주 범섬 야간다이빙! 🌙 밤바다는 완전히 다른 세상이에요. 형광빛을 내는 생물들과 야행성 물고기들의 향연 #야간다이빙 #제주다이빙', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '제주도 범섬', 'scuba', '범섬 포인트 A', 18, 22, 45, 12, '김다이버', '2024-10-15', NOW() - INTERVAL '5 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '필리핀 코론의 난파선 다이빙 🚢 2차 세계대전 당시 침몰한 일본 군함을 탐험했어요. 역사와 자연이 만나는 순간 #렉다이빙 #코론', 'https://images.pexels.com/photos/5471984/pexels-photo-5471984.jpeg', '필리핀 코론', 'scuba', '어스카마루 난파선', 28, 29, 52, 20, '마크', '2024-09-28', NOW() - INTERVAL '12 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '몰디브 만타레이와의 만남 🦈 꿈에 그리던 만타와 함께 수영했어요! 날개폭이 4미터는 되어 보였어요 #만타레이 #몰디브', 'https://images.pexels.com/photos/3731089/pexels-photo-3731089.jpeg', '몰디브', 'scuba', '만타 포인트', 22, 28, 48, 30, '소피아', '2024-09-15', NOW() - INTERVAL '18 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '태국 시밀란 제도에서 만난 고래상어 🐋 생애 첫 고래상어! 10미터가 넘는 거대한 몸집이지만 온순하고 우아했어요 #고래상어 #시밀란', 'https://images.pexels.com/photos/847393/pexels-photo-847393.jpeg', '태국 시밀란', 'scuba', '리첼리유록', 24, 28, 55, 25, '준호', '2024-08-20', NOW() - INTERVAL '25 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '인도네시아 코모도의 강한 조류 속 드리프트 다이빙 🌊 아드레날린이 솟구치는 경험! #코모도 #드리프트다이빙', 'https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg', '인도네시아 코모도', 'scuba', '크리스탈 록', 30, 27, 42, 28, '제니', '2024-08-05', NOW() - INTERVAL '30 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '제주 우도 앞바다에서 프리다이빙 🏊‍♂️ 수심 25미터까지! 자유낙하의 짜릿함 #프리다이빙 #우도', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '제주도 우도', 'freediving', '우도 동쪽 포인트', 25, 23, NULL, 18, '민지', '2024-07-20', NOW() - INTERVAL '35 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '하와이 빅아일랜드 만타 나이트 다이빙 🦈 헤드램프에 모여든 플랑크톤을 먹는 만타들의 쇼! #하와이 #나이트다이빙', 'https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg', '하와이 빅아일랜드', 'scuba', '코나 만타 포인트', 15, 25, 50, 15, '데이빗', '2024-07-01', NOW() - INTERVAL '42 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '이집트 홍해의 형형색색 산호초 🐠 바다의 정원이라고 불릴만해요. 이렇게 건강한 산호는 처음 봐요 #홍해 #산호초', 'https://images.pexels.com/photos/847393/pexels-photo-847393.jpeg', '이집트 홍해', 'scuba', '라스모하메드', 28, 26, 48, 35, '아흐메드', '2024-06-15', NOW() - INTERVAL '50 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '필리핀 모알보알 정어리 떼 🐟 수백만 마리의 정어리가 만드는 장관! 물고기 토네이도 속으로 #정어리떼 #모알보알', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '필리핀 모알보알', 'freediving', '페스카도르 섬', 20, 28, NULL, 25, '카를로스', '2024-06-01', NOW() - INTERVAL '55 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '팔라우 블루코너의 상어 떼 🦈 그레이리프샤크, 화이트팁샤크가 한꺼번에! #팔라우 #상어다이빙', 'https://images.pexels.com/photos/3731089/pexels-photo-3731089.jpeg', '팔라우', 'scuba', '블루코너', 32, 29, 55, 30, '켄', '2024-05-15', NOW() - INTERVAL '62 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '멕시코 세노테 다이빙 💎 담수와 해수가 만나는 할로클라인 현상. 마치 다른 차원으로 들어가는 느낌 #세노테 #동굴다이빙', 'https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg', '멕시코 세노테', 'scuba', '그란 세노테', 18, 25, 40, 40, '후안', '2024-05-01', NOW() - INTERVAL '68 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '일본 요나구니 해저유적 🗿 자연지형인지 인공구조물인지 여전히 미스터리! #요나구니 #해저유적', 'https://images.pexels.com/photos/847393/pexels-photo-847393.jpeg', '일본 요나구니', 'scuba', '해저유적 포인트', 25, 24, 50, 20, '유키', '2024-04-20', NOW() - INTERVAL '75 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '호주 그레이트 배리어 리프 🪸 세계 최대의 산호초 지대! 바다거북이와 함께 수영했어요 #그레이트배리어리프 #바다거북', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '호주 그레이트 배리어 리프', 'scuba', '코드홀', 22, 26, 52, 30, '잭', '2024-04-05', NOW() - INTERVAL '82 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '제주 문섬 소프트코랄 정원 🌺 제주에도 이런 아름다운 곳이! 연산호가 물결치는 모습이 환상적 #문섬 #연산호', 'https://images.pexels.com/photos/3731089/pexels-photo-3731089.jpeg', '제주도 문섬', 'scuba', '문섬 남쪽', 20, 21, 45, 15, '수현', '2024-03-20', NOW() - INTERVAL '90 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '베트남 나트랑에서 만난 누디브랜치 🐌 손톱만한 갯민숭달팽이의 화려한 색상에 놀라워요 #나트랑 #매크로다이빙', 'https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg', '베트남 나트랑', 'scuba', '마돈나 록', 18, 28, 48, 18, '린', '2024-03-05', NOW() - INTERVAL '95 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '말레이시아 시파단 배럭쿠다 토네이도 🌪️ 수천 마리의 배럭쿠다가 만드는 소용돌이! 다이빙 버킷리스트 달성 #시파단 #배럭쿠다', 'https://images.pexels.com/photos/847393/pexels-photo-847393.jpeg', '말레이시아 시파단', 'scuba', '배럭쿠다 포인트', 28, 29, 50, 35, '이만', '2024-02-18', NOW() - INTERVAL '102 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '필리핀 두마게티 먹다이빙 🐸 개구리고기, 유령파이프피쉬 등 희귀생물 가득! 매크로의 천국 #두마게티 #먹다이빙', 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', '필리핀 두마게티', 'scuba', '다우인', 15, 28, 55, 12, '마리아', '2024-02-01', NOW() - INTERVAL '110 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '제주 지귀도에서 만난 돌고래 떼 🐬 프리다이빙 중 야생 돌고래들과 조우! 평생 잊지 못할 순간 #지귀도 #돌고래', 'https://images.pexels.com/photos/3731089/pexels-photo-3731089.jpeg', '제주도 지귀도', 'freediving', '지귀도 북쪽', 15, 20, NULL, 20, '현우', '2024-01-15', NOW() - INTERVAL '120 days');

-- Insert 18 reels (video posts) for demo_user
INSERT INTO posts (user_id, caption, video_url, location, dive_type, dive_site, max_depth, water_temperature, visibility, created_at) VALUES
('f6448055-9bb0-428c-9657-d6d8e07ed358', '제주 협재 해변 프리다이빙 🏊‍♂️ 청량한 제주 바다 속으로! #프리다이빙 #제주', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '제주도 협재', 'freediving', '협재 포인트', 22, 21, 18, NOW() - INTERVAL '3 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '만타레이와 함께 수영하기 🦈 몰디브의 신비로운 만남! #만타 #몰디브릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '몰디브', 'scuba', '만타 포인트', 20, 28, 30, NOW() - INTERVAL '7 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '정어리 토네이도 속으로 🐟 모알보알의 장관! #정어리떼 #필리핀릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '필리핀 모알보알', 'freediving', '페스카도르', 18, 28, 25, NOW() - INTERVAL '10 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '고래상어와의 짜릿한 만남 🐋 시밀란의 거인! #고래상어 #태국릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '태국 시밀란', 'scuba', '리첼리유록', 25, 28, 25, NOW() - INTERVAL '14 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '난파선 탐험 🚢 코론의 침몰선 속으로! #렉다이빙 #코론릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '필리핀 코론', 'scuba', '어스카마루', 28, 29, 20, NOW() - INTERVAL '18 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '바다거북이와 함께 🐢 그레이트 배리어 리프의 친구! #바다거북 #호주릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '호주 그레이트 배리어 리프', 'scuba', '코드홀', 22, 26, 30, NOW() - INTERVAL '22 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '상어 떼와의 조우 🦈 팔라우 블루코너! #상어 #팔라우릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '팔라우', 'scuba', '블루코너', 32, 29, 30, NOW() - INTERVAL '26 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '세노테 동굴 다이빙 💎 신비로운 지하세계! #세노테 #멕시코릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '멕시코 세노테', 'scuba', '그란 세노테', 18, 25, 40, NOW() - INTERVAL '30 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '야간 다이빙의 매력 🌙 범섬의 밤! #야간다이빙 #제주릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '제주도 범섬', 'scuba', '범섬 포인트', 18, 22, 12, NOW() - INTERVAL '34 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '홍해의 화려한 산호초 🐠 이집트의 보물! #산호초 #홍해릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '이집트 홍해', 'scuba', '라스모하메드', 28, 26, 35, NOW() - INTERVAL '38 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '드리프트 다이빙 스릴 🌊 코모도의 강한 조류! #드리프트 #코모도릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '인도네시아 코모도', 'scuba', '크리스탈 록', 30, 27, 28, NOW() - INTERVAL '42 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '프리다이빙 수심 도전 🏊 25미터 자유낙하! #프리다이빙 #우도릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '제주도 우도', 'freediving', '우도 동쪽', 25, 23, 18, NOW() - INTERVAL '46 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '만타 나이트 다이빙 🦈 하와이의 환상적인 경험! #만타 #하와이릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '하와이 빅아일랜드', 'scuba', '코나 만타', 15, 25, 15, NOW() - INTERVAL '50 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '해저유적 탐험 🗿 요나구니의 미스터리! #해저유적 #일본릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '일본 요나구니', 'scuba', '해저유적', 25, 24, 20, NOW() - INTERVAL '54 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '배럭쿠다 토네이도 🌪️ 시파단의 압권! #배럭쿠다 #시파단릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '말레이시아 시파단', 'scuba', '배럭쿠다 포인트', 28, 29, 35, NOW() - INTERVAL '58 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '매크로 다이빙의 세계 🐌 나트랑의 작은 생물들! #매크로 #나트랑릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '베트남 나트랑', 'scuba', '마돈나 록', 18, 28, 18, NOW() - INTERVAL '62 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '먹다이빙의 즐거움 🐸 두마게티 희귀생물! #먹다이빙 #두마게티릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '필리핀 두마게티', 'scuba', '다우인', 15, 28, 12, NOW() - INTERVAL '66 days'),
('f6448055-9bb0-428c-9657-d6d8e07ed358', '야생 돌고래와의 만남 🐬 지귀도의 기적! #돌고래 #제주릴스', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '제주도 지귀도', 'freediving', '지귀도 북쪽', 15, 20, 20, NOW() - INTERVAL '70 days');

-- Add likes to demo_user's posts from various users
DO $$
DECLARE
    post_record RECORD;
    user_record RECORD;
BEGIN
    FOR post_record IN 
        SELECT id FROM posts WHERE user_id = 'f6448055-9bb0-428c-9657-d6d8e07ed358'
    LOOP
        FOR user_record IN 
            SELECT id FROM profiles 
            WHERE id != 'f6448055-9bb0-428c-9657-d6d8e07ed358' 
            ORDER BY RANDOM() 
            LIMIT (3 + FLOOR(RANDOM() * 5))::INT
        LOOP
            INSERT INTO likes (post_id, user_id)
            VALUES (post_record.id, user_record.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Add comments to demo_user's posts
DO $$
DECLARE
    post_record RECORD;
    comment_texts TEXT[] := ARRAY[
        '와 정말 멋지네요! 😍',
        '부럽습니다 ㅠㅠ 저도 가고 싶어요!',
        '사진 퀄리티 미쳤다 👍',
        '여기 정말 좋았는데! 추억이 새록새록',
        '다음 다이빙 여행 여기로 정했어요!',
        '어떤 카메라 쓰시나요?',
        '바다 컨디션 진짜 좋네요 🌊',
        '언제 가셨어요? 저도 계획중인데',
        '사진만 봐도 힐링되네요 💙',
        '최고예요! 👏👏👏',
        '다이빙 실력 장난아니시네요!',
        '물빛이 진짜 예술이다',
        '부디 계속해서 좋은 사진 공유해주세요!'
    ];
    random_user_id UUID;
BEGIN
    FOR post_record IN 
        SELECT id FROM posts WHERE user_id = 'f6448055-9bb0-428c-9657-d6d8e07ed358'
    LOOP
        IF RANDOM() < 0.6 THEN
            SELECT id INTO random_user_id 
            FROM profiles 
            WHERE id != 'f6448055-9bb0-428c-9657-d6d8e07ed358' 
            ORDER BY RANDOM() 
            LIMIT 1;
            
            INSERT INTO comments (post_id, user_id, content)
            VALUES (
                post_record.id, 
                random_user_id, 
                comment_texts[1 + FLOOR(RANDOM() * array_length(comment_texts, 1))::INT]
            );
        END IF;
    END LOOP;
END $$;

-- Create saved posts for demo_user (saving posts from other users)
INSERT INTO saved_posts (user_id, post_id)
SELECT 
    'f6448055-9bb0-428c-9657-d6d8e07ed358',
    id
FROM posts
WHERE user_id != 'f6448055-9bb0-428c-9657-d6d8e07ed358'
AND image_url IS NOT NULL
ORDER BY RANDOM()
LIMIT 20
ON CONFLICT DO NOTHING;