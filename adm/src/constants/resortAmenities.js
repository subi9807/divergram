export const RESORT_AMENITY_CATEGORIES = [
  { key: 'connectivity', label: '연결/주차', color: '#2563eb' },
  { key: 'dive_support', label: '다이빙 지원', color: '#0ea5e9' },
  { key: 'food', label: '식음료', color: '#f97316' },
  { key: 'wellness', label: '웰니스', color: '#10b981' },
  { key: 'water', label: '해변/수영', color: '#06b6d4' },
  { key: 'transport', label: '교통/이동', color: '#8b5cf6' },
  { key: 'rooms', label: '회의/객실', color: '#6366f1' },
  { key: 'safety', label: '안전/관리', color: '#ef4444' },
  { key: 'family', label: '가족/접근성', color: '#ec4899' },
  { key: 'other', label: '기타', color: '#64748b' },
];

export const RESORT_AMENITIES = [
  { key: 'wifi', label: '와이파이', category: 'connectivity' },
  { key: 'parking', label: '주차', category: 'connectivity' },
  { key: 'valet_parking', label: '발렛파킹', category: 'connectivity' },
  { key: 'luggage_storage', label: '짐 보관', category: 'connectivity' },

  { key: 'shower', label: '샤워실', category: 'dive_support' },
  { key: 'locker', label: '락커', category: 'dive_support' },
  { key: 'towel', label: '타월', category: 'dive_support' },
  { key: 'changing_room', label: '탈의실', category: 'dive_support' },
  { key: 'private_shower', label: '개인 샤워실', category: 'dive_support' },
  { key: 'equipment_rental', label: '장비 대여', category: 'dive_support' },
  { key: 'gear_storage', label: '장비 보관', category: 'dive_support' },
  { key: 'gear_shop', label: '장비 샵', category: 'dive_support' },
  { key: 'dive_center', label: '다이브 센터', category: 'dive_support' },
  { key: 'air_fill', label: '에어 충전', category: 'dive_support' },
  { key: 'nitrox_fill', label: '나이트록스 충전', category: 'dive_support' },
  { key: 'camera_rinse_tank', label: '카메라 린스 탱크', category: 'dive_support' },
  { key: 'freshwater_rinse', label: '담수 린스', category: 'dive_support' },
  { key: 'camera_wash', label: '카메라 세척', category: 'dive_support' },
  { key: 'camera_gear_rental', label: '카메라 장비 대여', category: 'dive_support' },
  { key: 'oxygen', label: '산소 시설', category: 'dive_support' },
  { key: 'nitrox', label: '나이트록스', category: 'dive_support' },
  { key: 'emergency_kit', label: '응급 키트', category: 'dive_support' },
  { key: 'medical_support', label: '의료 지원', category: 'safety' },

  { key: 'restaurant', label: '레스토랑', category: 'food' },
  { key: 'cafe', label: '카페', category: 'food' },
  { key: 'bar', label: '바 / 라운지', category: 'food' },
  { key: 'beach_bar', label: '비치 바', category: 'food' },
  { key: 'room_service', label: '룸서비스', category: 'food' },
  { key: 'breakfast', label: '조식 제공', category: 'food' },
  { key: 'vegan_menu', label: '비건 메뉴', category: 'food' },
  { key: 'kids_menu', label: '키즈 메뉴', category: 'food' },
  { key: 'bbq_area', label: '바비큐존', category: 'food' },

  { key: 'pool', label: '수영장', category: 'water' },
  { key: 'infinity_pool', label: '인피니티 풀', category: 'water' },
  { key: 'kids_pool', label: '키즈풀', category: 'water' },
  { key: 'spa', label: '스파', category: 'wellness' },
  { key: 'sauna', label: '사우나', category: 'wellness' },
  { key: 'massage', label: '마사지', category: 'wellness' },
  { key: 'fitness_room', label: '피트니스룸', category: 'wellness' },
  { key: 'yoga_deck', label: '요가 데크', category: 'wellness' },
  { key: 'sunset_deck', label: '선셋 데크', category: 'wellness' },

  { key: 'beach_access', label: '비치 접근', category: 'water' },
  { key: 'private_beach', label: '프라이빗 비치', category: 'water' },
  { key: 'boat_dock', label: '보트 도킹', category: 'water' },
  { key: 'private_boat', label: '전용 보트', category: 'water' },
  { key: 'house_reef', label: '하우스 리프', category: 'water' },
  { key: 'boat_charter', label: '보트 전세', category: 'water' },

  { key: 'pick_up', label: '픽업', category: 'transport' },
  { key: 'airport_transfer', label: '공항 픽업/샌딩', category: 'transport' },
  { key: 'shuttle_bus', label: '셔틀버스', category: 'transport' },
  { key: 'guided_tour', label: '가이드 투어', category: 'transport' },

  { key: 'training_room', label: '강의실', category: 'rooms' },
  { key: 'meeting_room', label: '미팅룸', category: 'rooms' },
  { key: 'conference_room', label: '컨퍼런스룸', category: 'rooms' },
  { key: 'drying_room', label: '건조실', category: 'rooms' },

  { key: 'daily_cleaning', label: '매일 청소', category: 'safety' },
  { key: 'housekeeping', label: '하우스키핑', category: 'safety' },
  { key: '24h_front_desk', label: '24시간 프런트', category: 'safety' },
  { key: 'security', label: '보안', category: 'safety' },
  { key: 'generator', label: '비상 발전기', category: 'safety' },

  { key: 'family_friendly', label: '가족 친화', category: 'family' },
  { key: 'kids_club', label: '키즈클럽', category: 'family' },
  { key: 'playground', label: '놀이터', category: 'family' },
  { key: 'wheelchair_accessible', label: '휠체어 접근', category: 'family' },

  { key: 'smoking_area', label: '흡연 구역', category: 'other' },
  { key: 'non_smoking', label: '금연', category: 'other' },
];

export function getAmenityCategoryMeta(categoryKey) {
  return RESORT_AMENITY_CATEGORIES.find((item) => item.key === categoryKey) || RESORT_AMENITY_CATEGORIES[RESORT_AMENITY_CATEGORIES.length - 1];
}

export function getAmenityMeta(amenityKey) {
  return RESORT_AMENITIES.find((item) => item.key === amenityKey) || null;
}

export function groupAmenitiesByCategory(items = RESORT_AMENITIES) {
  const map = new Map(RESORT_AMENITY_CATEGORIES.map((category) => [category.key, { ...category, items: [] }]));
  for (const item of items || []) {
    const categoryKey = item.category || 'other';
    const bucket = map.get(categoryKey) || map.get('other');
    bucket.items.push(item);
  }
  return RESORT_AMENITY_CATEGORIES.map((category) => map.get(category.key)).filter((group) => group.items.length > 0);
}
