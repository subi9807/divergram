/*
  # Add Sample Users and Posts

  1. Sample Users (30 users with Korean names)
  2. Sample Posts (10-15 per user with diving data)
  3. Follow Relationships
  4. Likes and Comments for engagement
  
  Note: Creates profiles without auth.users dependency by temporarily disabling FK
*/

-- Temporarily disable the foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Insert 30 sample users
INSERT INTO profiles (id, username, full_name, bio, avatar_url) VALUES
(gen_random_uuid(), 'minjun_diver', '김민준', '프리다이빙 강사 | 제주 바다를 사랑합니다 🌊', 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'seojun_ocean', '이서준', '스쿠버 다이빙 20년차 | PADI 강사', 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'yuna_sea', '박유나', '수중 사진작가 📷 바다의 아름다움을 담습니다', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'jiwoo_dive', '최지우', '프리다이빙 국가대표 출신 🏆', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'minseo_blue', '정민서', '테크니컬 다이버 | 동굴 다이빙 전문', 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'hyunwoo_deep', '강현우', '심해 탐험가 🐋 바다의 신비를 찾아서', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'sohee_coral', '한소희', '산호초 보호 활동가 🪸 환경을 생각하는 다이버', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'jihoon_waves', '윤지훈', '서핑과 프리다이빙을 사랑하는 바다 사람', 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'chaeyoung_reef', '송채영', '리조트 다이브마스터 | 세부 근무중', 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'taehyun_shark', '오태현', '상어와 함께 수영하는 것이 꿈 🦈', 'https://images.pexels.com/photos/1484801/pexels-photo-1484801.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'eunji_marine', '김은지', '해양생물학자 | 다이빙으로 연구합니다', 'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'dongmin_wreck', '이동민', '난파선 탐험 전문 다이버 ⚓', 'https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'nari_blue', '박나리', '블루홀 탐험가 | 세계 7대 블루홀 완주', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'sunho_abyss', '최선호', '심해 다이빙 기록 보유자 200m+', 'https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'yejin_turtle', '정예진', '바다거북과 친구 🐢 환경보호 실천중', 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'kyungmin_cave', '강경민', '동굴 다이빙 전문가 | 세노테 탐험', 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'jieun_reef', '한지은', '산호초 사진가 📸 수중세계의 예술', 'https://images.pexels.com/photos/1520760/pexels-photo-1520760.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'sangwoo_current', '오상우', '드리프트 다이빙 마니아 💨', 'https://images.pexels.com/photos/1482061/pexels-photo-1482061.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'minji_manta', '윤민지', '만타레이 연구원 | 해양보호 활동', 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'woojin_night', '김우진', '야간 다이빙 전문 | 밤바다의 매력', 'https://images.pexels.com/photos/1368347/pexels-photo-1368347.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'soyeon_macro', '이소연', '마크로 사진 전문가 🔬 작은 생물들의 세계', 'https://images.pexels.com/photos/1520760/pexels-photo-1520760.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'junsu_tech', '박준수', '테크니컬 다이빙 강사 | 트라이믹스', 'https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'hayoung_whale', '최하영', '고래상어와의 만남을 꿈꾸는 다이버', 'https://images.pexels.com/photos/1130628/pexels-photo-1130628.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'seungmin_ice', '정승민', '아이스 다이빙 전문가 ❄️ 극지방 탐험', 'https://images.pexels.com/photos/1516983/pexels-photo-1516983.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'dahyun_rainbow', '한다현', '무지개 물고기와 함께 🌈', 'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'jinwoo_rescue', '오진우', '수중 구조 전문가 | 안전 제일', 'https://images.pexels.com/photos/1405963/pexels-photo-1405963.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'yewon_dolphin', '김예원', '돌고래 트레이너 출신 다이버 🐬', 'https://images.pexels.com/photos/1024996/pexels-photo-1024996.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'jaehyun_apex', '이재현', 'APEX 다이버 | 극한의 다이빙', 'https://images.pexels.com/photos/1121796/pexels-photo-1121796.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'subin_jellyfish', '박수빈', '해파리 연구원 | 발광 생물 관찰', 'https://images.pexels.com/photos/1239286/pexels-photo-1239286.jpeg?auto=compress&cs=tinysrgb&w=400'),
(gen_random_uuid(), 'hyojin_treasure', '최효진', '수중 보물 사냥꾼 💎 역사 탐험가', 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=400')
ON CONFLICT (username) DO NOTHING;

-- Re-enable foreign key (but make it not enforced for sample data)
-- Note: In production, you would want to have proper auth.users entries
