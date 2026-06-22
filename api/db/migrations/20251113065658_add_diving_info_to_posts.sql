/*
  # Add Diving Information to Posts

  1. Changes
    - Update all posts with realistic diving information
    - Add dive_type, dive_site, max_depth, water_temperature, dive_duration, visibility, buddy_name

  2. Data
    - Realistic diving data based on actual dive sites
    - Varied depths, temperatures, and conditions
*/

-- Update posts with diving information
-- User 1: kimtaehyung posts
UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = '제주도 서귀포 문섬',
  max_depth = 18,
  water_temperature = 20,
  dive_duration = 45,
  visibility = 15,
  buddy_name = '@parkjimin'
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%제주도%신비로운%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Coron Bay Wreck',
  max_depth = 25,
  water_temperature = 28,
  dive_duration = 50,
  visibility = 20,
  buddy_name = '@leesunmi'
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%수중 동굴%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Maldives Coral Garden',
  max_depth = 12,
  water_temperature = 29,
  dive_duration = 55,
  visibility = 30
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%산호초%';

UPDATE posts SET 
  dive_type = 'freediving',
  dive_site = 'Turtle Bay Hawaii',
  max_depth = 8,
  water_temperature = 26,
  dive_duration = 25,
  visibility = 25,
  buddy_name = '@choiwooshik'
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%프리다이빙%거북%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Phuket Shark Point',
  max_depth = 22,
  water_temperature = 28,
  dive_duration = 48,
  visibility = 18
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%푸른 바다 위%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Bali USAT Liberty',
  max_depth = 28,
  water_temperature = 27,
  dive_duration = 52,
  visibility = 22,
  buddy_name = '@jeongsoyeon'
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%해양 생물%교감%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Okinawa Blue Cave',
  max_depth = 30,
  water_temperature = 24,
  dive_duration = 40,
  visibility = 28
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%깊은 바다 속%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = '협재 해수욕장',
  max_depth = 10,
  water_temperature = 22,
  dive_duration = 35,
  visibility = 12,
  buddy_name = '@parkjimin'
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%석양%비치%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Sipadan Barracuda Point',
  max_depth = 32,
  water_temperature = 28,
  dive_duration = 45,
  visibility = 35
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%수중 사진 촬영%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Maldives Shark Dive',
  max_depth = 26,
  water_temperature = 29,
  dive_duration = 48,
  visibility = 30,
  buddy_name = '@leesunmi'
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%상어와의 만남%';

UPDATE posts SET 
  dive_type = 'freediving',
  dive_site = 'Guam Apra Harbor',
  max_depth = 15,
  water_temperature = 27,
  dive_duration = 30,
  visibility = 20
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%바다 속 평화%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Bohol Balicasag Island',
  max_depth = 20,
  water_temperature = 28,
  dive_duration = 50,
  visibility = 25,
  buddy_name = '@choiwooshik'
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%수중 정원%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Nha Trang Rainbow Reef',
  max_depth = 18,
  water_temperature = 27,
  dive_duration = 45,
  visibility = 18
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%친구들과%그룹%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Koh Tao Night Dive',
  max_depth = 12,
  water_temperature = 28,
  dive_duration = 40,
  visibility = 10,
  buddy_name = '@jeongsoyeon'
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%야간 다이빙%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = '제주 문섬 포인트',
  max_depth = 16,
  water_temperature = 21,
  dive_duration = 42,
  visibility = 14
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
  AND caption LIKE '%완벽한 다이빙 날씨%';

-- User 2: parkjimin posts
UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Palau Blue Corner',
  max_depth = 35,
  water_temperature = 28,
  dive_duration = 50,
  visibility = 40,
  buddy_name = '@kimtaehyung'
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%수중 세계%아름다움%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Big Island Manta Night',
  max_depth = 10,
  water_temperature = 25,
  dive_duration = 45,
  visibility = 15
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%만타레이%수영%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Red Sea Ras Mohammed',
  max_depth = 30,
  water_temperature = 26,
  dive_duration = 48,
  visibility = 35,
  buddy_name = '@leesunmi'
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%환상적인 시야%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Great Barrier Reef',
  max_depth = 15,
  water_temperature = 24,
  dive_duration = 55,
  visibility = 30
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%산호초 정원%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Raja Ampat Manta Ridge',
  max_depth = 20,
  water_temperature = 28,
  dive_duration = 60,
  visibility = 35,
  buddy_name = '@choiwooshik'
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%다채로운 해양%';

UPDATE posts SET 
  dive_type = 'freediving',
  dive_site = '제주 우도 포인트',
  max_depth = 12,
  water_temperature = 20,
  dive_duration = 28,
  visibility = 18
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%프리다이빙%자유%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Saipan Grotto',
  max_depth = 18,
  water_temperature = 27,
  dive_duration = 42,
  visibility = 25,
  buddy_name = '@jeongsoyeon'
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%수면 위 맑은%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Coron Wreck Diving',
  max_depth = 28,
  water_temperature = 28,
  dive_duration = 52,
  visibility = 22
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%난파선 탐험%';

UPDATE posts SET 
  dive_type = 'freediving',
  dive_site = 'Maldives House Reef',
  max_depth = 10,
  water_temperature = 29,
  dive_duration = 30,
  visibility = 32,
  buddy_name = '@kimtaehyung'
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%고요한 수중 명상%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Cenote Dos Ojos',
  max_depth = 12,
  water_temperature = 25,
  dive_duration = 45,
  visibility = 50
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%빛의 커튼%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Galapagos Darwin Arch',
  max_depth = 28,
  water_temperature = 22,
  dive_duration = 50,
  visibility = 25,
  buddy_name = '@leesunmi'
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%상어 떼%조우%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Krabi Shark Point',
  max_depth = 22,
  water_temperature = 28,
  dive_duration = 48,
  visibility = 20
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%수중 동굴%신비%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Moalboal Sardine Run',
  max_depth = 8,
  water_temperature = 27,
  dive_duration = 40,
  visibility = 15,
  buddy_name = '@choiwooshik'
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%야간 다이빙%스릴%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Palau Jellyfish Lake',
  max_depth = 15,
  water_temperature = 28,
  dive_duration = 35,
  visibility = 28
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%맑은 물%푸른 하늘%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Komodo Castle Rock',
  max_depth = 30,
  water_temperature = 26,
  dive_duration = 50,
  visibility = 30,
  buddy_name = '@jeongsoyeon'
WHERE user_id = '22222222-2222-2222-2222-222222222222' 
  AND caption LIKE '%해저 낙원%';

-- User 3: leesunmi posts
UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = '제주 우도 하고수동',
  max_depth = 15,
  water_temperature = 19,
  dive_duration = 40,
  visibility = 12,
  buddy_name = '@kimtaehyung'
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%청량한 수중%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Similan Islands',
  max_depth = 25,
  water_temperature = 28,
  dive_duration = 50,
  visibility = 35
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%형형색색 열대어%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Boracay Crocodile Island',
  max_depth = 18,
  water_temperature = 28,
  dive_duration = 45,
  visibility = 22,
  buddy_name = '@parkjimin'
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%산호초 사이로%';

UPDATE posts SET 
  dive_type = 'freediving',
  dive_site = 'Maui Molokini Crater',
  max_depth = 10,
  water_temperature = 25,
  dive_duration = 25,
  visibility = 28
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%바다거북%만남%';

UPDATE posts SET 
  dive_type = 'freediving',
  dive_site = 'Maldives Banana Reef',
  max_depth = 12,
  water_temperature = 29,
  dive_duration = 30,
  visibility = 35,
  buddy_name = '@choiwooshik'
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%프리다이빙%평화%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Yonaguni Monument',
  max_depth = 28,
  water_temperature = 24,
  dive_duration = 48,
  visibility = 25
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%완벽한 부력%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Palau German Channel',
  max_depth = 32,
  water_temperature = 28,
  dive_duration = 52,
  visibility = 38,
  buddy_name = '@jeongsoyeon'
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%깊은 블루%';

UPDATE posts SET 
  dive_type = 'freediving',
  dive_site = 'Nusa Penida Manta Bay',
  max_depth = 8,
  water_temperature = 27,
  dive_duration = 20,
  visibility = 20
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%수중 요가%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Tulum Casa Cenote',
  max_depth = 10,
  water_temperature = 25,
  dive_duration = 42,
  visibility = 45,
  buddy_name = '@kimtaehyung'
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%빛의 마법%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'South Africa Aliwal Shoal',
  max_depth = 26,
  water_temperature = 22,
  dive_duration = 48,
  visibility = 18
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%상어 다이빙 체험%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = '제주 범섬 포인트',
  max_depth = 20,
  water_temperature = 20,
  dive_duration = 45,
  visibility = 15,
  buddy_name = '@parkjimin'
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%해초 숲%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Guam Blue Hole',
  max_depth = 35,
  water_temperature = 27,
  dive_duration = 40,
  visibility = 12
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%별빛 아래%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Saipan Banzai Cliff',
  max_depth = 15,
  water_temperature = 27,
  dive_duration = 38,
  visibility = 22,
  buddy_name = '@choiwooshik'
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%수평선%바라보며%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'El Nido Cathedral Cave',
  max_depth = 18,
  water_temperature = 28,
  dive_duration = 50,
  visibility = 25
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%투명한 바다 속%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Komodo Manta Alley',
  max_depth = 15,
  water_temperature = 27,
  dive_duration = 55,
  visibility = 32,
  buddy_name = '@jeongsoyeon'
WHERE user_id = '33333333-3333-3333-3333-333333333333' 
  AND caption LIKE '%만타%함께 춤%';

-- User 4: choiwooshik posts
UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = '제주 성산 섭지코지',
  max_depth = 18,
  water_temperature = 19,
  dive_duration = 42,
  visibility = 14,
  buddy_name = '@leesunmi'
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%아침 다이빙%청량함%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Dumaguete Apo Island',
  max_depth = 22,
  water_temperature = 28,
  dive_duration = 50,
  visibility = 25
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%수중 모험가%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Koh Samui Sail Rock',
  max_depth = 28,
  water_temperature = 28,
  dive_duration = 48,
  visibility = 22,
  buddy_name = '@parkjimin'
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%알록달록 물고기%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Dahab Blue Hole',
  max_depth = 30,
  water_temperature = 25,
  dive_duration = 45,
  visibility = 30
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%거북이%수영%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Maldives Mafushi',
  max_depth = 25,
  water_temperature = 29,
  dive_duration = 55,
  visibility = 35,
  buddy_name = '@kimtaehyung'
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%무한한 블루%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Palau Blue Corner',
  max_depth = 38,
  water_temperature = 28,
  dive_duration = 50,
  visibility = 40
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%심해 탐험%';

UPDATE posts SET 
  dive_type = 'freediving',
  dive_site = 'Lombok Gili Islands',
  max_depth = 12,
  water_temperature = 27,
  dive_duration = 28,
  visibility = 25,
  buddy_name = '@jeongsoyeon'
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%평온한 수중%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Cozumel Palancar Reef',
  max_depth = 32,
  water_temperature = 26,
  dive_duration = 52,
  visibility = 45
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%햇빛%환상%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Bahamas Tiger Beach',
  max_depth = 15,
  water_temperature = 25,
  dive_duration = 40,
  visibility = 30,
  buddy_name = '@leesunmi'
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%상어%평화%공존%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Palawan Puerto Princesa',
  max_depth = 20,
  water_temperature = 28,
  dive_duration = 48,
  visibility = 22
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%수중 정글%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Phu Quoc An Thoi',
  max_depth = 12,
  water_temperature = 27,
  dive_duration = 40,
  visibility = 10,
  buddy_name = '@parkjimin'
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%야광 플랑크톤%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Guam Apra Harbor',
  max_depth = 18,
  water_temperature = 27,
  dive_duration = 42,
  visibility = 20
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%수평선 너머%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Phi Phi Islands Maya Bay',
  max_depth = 15,
  water_temperature = 28,
  dive_duration = 45,
  visibility = 25,
  buddy_name = '@kimtaehyung'
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%크리스탈 워터%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = '제주 지귀도 포인트',
  max_depth = 22,
  water_temperature = 20,
  dive_duration = 48,
  visibility = 16
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%동굴 다이빙%스릴%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Nusa Penida Manta Point',
  max_depth = 18,
  water_temperature = 27,
  dive_duration = 50,
  visibility = 28,
  buddy_name = '@jeongsoyeon'
WHERE user_id = '44444444-4444-4444-4444-444444444444' 
  AND caption LIKE '%만타 클리닝%';

-- User 5: jeongsoyeon posts
UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Anilao Beatrice Rock',
  max_depth = 25,
  water_temperature = 27,
  dive_duration = 52,
  visibility = 20,
  buddy_name = '@choiwooshik'
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%수중 사진작가%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Great Barrier Reef',
  max_depth = 18,
  water_temperature = 24,
  dive_duration = 55,
  visibility = 32
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%산호 정원%아름다움%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = '제주 서귀포 법환',
  max_depth = 16,
  water_temperature = 21,
  dive_duration = 40,
  visibility = 14,
  buddy_name = '@kimtaehyung'
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%평화로운 수중 산책%';

UPDATE posts SET 
  dive_type = 'freediving',
  dive_site = 'Hawaii Turtle Cleaning Station',
  max_depth = 8,
  water_temperature = 26,
  dive_duration = 25,
  visibility = 28
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%바다거북 보호%';

UPDATE posts SET 
  dive_type = 'freediving',
  dive_site = 'Maldives Veligandu',
  max_depth = 10,
  water_temperature = 29,
  dive_duration = 30,
  visibility = 35,
  buddy_name = '@parkjimin'
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%수면 반사%예술%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Palau Peleliu Corner',
  max_depth = 35,
  water_temperature = 28,
  dive_duration = 50,
  visibility = 38
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%드리프트 다이빙%';

UPDATE posts SET 
  dive_type = 'freediving',
  dive_site = 'Bali Amed',
  max_depth = 12,
  water_temperature = 27,
  dive_duration = 28,
  visibility = 22,
  buddy_name = '@leesunmi'
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%명상하는 다이버%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Cenote Angelita',
  max_depth = 35,
  water_temperature = 25,
  dive_duration = 45,
  visibility = 50
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%빛의 커튼%지나며%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Fiji Shark Reef',
  max_depth = 28,
  water_temperature = 26,
  dive_duration = 48,
  visibility = 25,
  buddy_name = '@choiwooshik'
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%상어 보호%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'California Kelp Forest',
  max_depth = 18,
  water_temperature = 15,
  dive_duration = 42,
  visibility = 12
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%켈프 숲%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Mactan Island Sanctuary',
  max_depth = 10,
  water_temperature = 28,
  dive_duration = 40,
  visibility = 15,
  buddy_name = '@kimtaehyung'
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%별빛 다이빙%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Saipan Lau Lau Bay',
  max_depth = 20,
  water_temperature = 27,
  dive_duration = 45,
  visibility = 25
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%완벽한 다이빙 조건%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Koh Lanta Hin Daeng',
  max_depth = 32,
  water_temperature = 28,
  dive_duration = 52,
  visibility = 30,
  buddy_name = '@parkjimin'
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%에메랄드 바다%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Mallorca Dragon Cave',
  max_depth = 15,
  water_temperature = 22,
  dive_duration = 40,
  visibility = 35
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%수중 동굴 빛%';

UPDATE posts SET 
  dive_type = 'scuba',
  dive_site = 'Raja Ampat Misool',
  max_depth = 25,
  water_temperature = 28,
  dive_duration = 58,
  visibility = 38,
  buddy_name = '@leesunmi'
WHERE user_id = '55555555-5555-5555-5555-555555555555' 
  AND caption LIKE '%열대어 파라다이스%';
