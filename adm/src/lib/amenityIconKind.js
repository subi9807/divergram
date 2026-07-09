const WIFI = new Set(['wifi']);
const PARKING = new Set(['parking', 'valet_parking']);
const WATER = new Set(['shower', 'private_shower', 'pool', 'infinity_pool', 'kids_pool', 'beach_access', 'private_beach', 'house_reef']);
const STORAGE = new Set(['locker', 'changing_room', 'luggage_storage', 'gear_storage']);
const TOWEL = new Set(['towel', 'drying_room']);
const GEAR = new Set(['equipment_rental', 'gear_shop', 'camera_gear_rental']);
const DIVE = new Set(['dive_center', 'air_fill', 'nitrox_fill', 'oxygen', 'nitrox', 'emergency_kit', 'medical_support']);
const FOOD = new Set(['restaurant', 'cafe', 'bar', 'beach_bar', 'room_service', 'breakfast', 'vegan_menu', 'kids_menu', 'bbq_area']);
const WELLNESS = new Set(['spa', 'sauna', 'massage', 'fitness_room', 'yoga_deck', 'sunset_deck']);
const BOAT = new Set(['boat_dock', 'private_boat', 'boat_charter']);
const TRANSPORT = new Set(['pick_up', 'airport_transfer', 'shuttle_bus']);
const ROOM = new Set(['training_room', 'meeting_room', 'conference_room']);
const CAMERA = new Set(['camera_wash', 'camera_rinse_tank', 'freshwater_rinse']);
const FAMILY = new Set(['family_friendly', 'kids_club', 'playground', 'wheelchair_accessible']);
const SAFETY = new Set(['24h_front_desk', 'concierge', 'daily_cleaning', 'housekeeping', 'security', 'generator']);
const TOUR = new Set(['guided_tour']);
const SMOKE = new Set(['non_smoking', 'smoking_area']);

export function getAmenityIconKind(key) {
  if (WIFI.has(key)) return 'wifi';
  if (PARKING.has(key)) return 'parking';
  if (WATER.has(key)) return 'shower';
  if (STORAGE.has(key)) return 'locker';
  if (TOWEL.has(key)) return 'towel';
  if (GEAR.has(key)) return 'gear';
  if (DIVE.has(key)) return 'dive';
  if (FOOD.has(key)) return 'food';
  if (WELLNESS.has(key)) return 'wellness';
  if (BOAT.has(key)) return 'boat';
  if (TRANSPORT.has(key)) return 'shuttle';
  if (ROOM.has(key)) return 'room';
  if (CAMERA.has(key)) return 'camera';
  if (FAMILY.has(key)) return 'family';
  if (SAFETY.has(key)) return 'safety';
  if (TOUR.has(key)) return 'tour';
  if (SMOKE.has(key)) return 'smoke';
  return 'default';
}
