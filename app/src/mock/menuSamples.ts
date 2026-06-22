export type ExploreSampleCard = {
  title: string;
  location: string;
  meta: string;
};

export type ResortSampleCard = {
  id: string;
  name: string;
  area: string;
  rating: number;
  reviewCount: number;
  tags: string;
};

export type MessageRoomSample = {
  id: string;
  name: string;
  last: string;
  unread: number;
  members: number;
  updatedAt: string;
  active: boolean;
};

export type NotificationSample = {
  id: string;
  type: 'like' | 'follow' | 'system';
  text: string;
  unread: boolean;
  when: string;
};

export type ActivitySample = {
  id: string;
  type: 'like' | 'comment' | 'follow';
  text: string;
  when: string;
};

export const exploreSampleCards: ExploreSampleCard[] = [
  { title: 'Blue Corner Drift', location: 'Bali', meta: '32 posts · avg vis 14m' },
  { title: 'Jeju Seogwipo Wall', location: 'Jeju', meta: '28 posts · avg vis 11m' },
  { title: 'Anilao Macro Bay', location: 'Anilao', meta: '19 posts · avg vis 9m' },
  { title: 'Cebu Night Route', location: 'Cebu', meta: '23 posts · avg vis 10m' },
  { title: 'Okinawa Coral Loop', location: 'Okinawa', meta: '17 posts · avg vis 12m' },
];

export const resortSampleCards: ResortSampleCard[] = [
  { id: 'sample-resort-1', name: 'Aqua Vista Dive Resort', area: 'Bali', rating: 4.8, reviewCount: 124, tags: 'resort' },
  { id: 'sample-resort-2', name: 'Blue Reef Center', area: 'Jeju', rating: 4.7, reviewCount: 97, tags: 'resort' },
  { id: 'sample-resort-3', name: 'Night Tide Divers', area: 'Cebu', rating: 4.6, reviewCount: 83, tags: 'resort' },
  { id: 'sample-resort-4', name: 'Coral Nest Lodge', area: 'Bohol', rating: 4.5, reviewCount: 71, tags: 'resort' },
  { id: 'sample-resort-5', name: 'Deep Current Base', area: 'Okinawa', rating: 4.4, reviewCount: 52, tags: 'resort' },
];

export const messageRoomSamples: MessageRoomSample[] = [
  { id: '1', name: 'Blue Coral Team', last: '내일 오전 8시 출항해요.', unread: 2, members: 12, updatedAt: '09:32', active: true },
  { id: '2', name: 'Jeju Buddy', last: '문섬 시야 12m 확인!', unread: 0, members: 2, updatedAt: '08:11', active: false },
  { id: '3', name: 'Divergram Crew', last: '장비 점검 체크리스트 공유합니다.', unread: 1, members: 18, updatedAt: '어제', active: true },
];

export const notificationSamples: NotificationSample[] = [
  { id: '1', type: 'like', text: '@diver_jeju liked your post', unread: true, when: '2m' },
  { id: '2', type: 'follow', text: '@nightblue started following you', unread: true, when: '18m' },
  { id: '3', type: 'system', text: 'Resort update: Cebu promo published', unread: false, when: '1h' },
];

export const activitySamples: ActivitySample[] = [
  { id: '1', type: 'like', text: 'Your Jeju post received 12 likes.', when: '2h ago' },
  { id: '2', type: 'comment', text: '3 new comments on your reel.', when: '3h ago' },
  { id: '3', type: 'follow', text: '2 divers started following you.', when: '5h ago' },
];
