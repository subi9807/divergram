import { Profile } from './internal-db';

export type ProfileBadge = {
  id: string;
  label: string;
  description: string;
  icon: string;
  className: string;
};

type BadgeInput = {
  profile: Profile;
  postsCount: number;
  reelsCount: number;
  followersCount: number;
  followingCount: number;
};

const diveLevels = [
  { threshold: 1, label: '첫 다이빙', icon: '🤿' },
  { threshold: 10, label: '10회 다이빙', icon: '🌊' },
  { threshold: 50, label: '50회 다이빙', icon: '🐢' },
  { threshold: 100, label: '100회 다이빙', icon: '🏆' },
  { threshold: 200, label: '200회 다이빙', icon: '🦈' },
  { threshold: 500, label: '500회 다이빙', icon: '🐋' },
  { threshold: 1000, label: '1000회 다이빙', icon: '👑' },
];

const resortUseLevels = [
  { threshold: 1, label: '리조트 1회 이용', icon: '🏝️' },
  { threshold: 5, label: '리조트 5회 이용', icon: '🛟' },
  { threshold: 10, label: '리조트 10회 이용', icon: '⭐' },
  { threshold: 30, label: '리조트 30회 이용', icon: '💎' },
  { threshold: 100, label: '리조트 100회 이용', icon: '👑' },
];

function numericProfileField(profile: Profile, keys: string[]) {
  const source = profile as Profile & Record<string, unknown>;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function earnedLevelBadge(
  idPrefix: string,
  count: number,
  levels: Array<{ threshold: number; label: string; icon: string }>,
  descriptionPrefix: string,
  className: string,
): ProfileBadge | null {
  const earned = [...levels].reverse().find((level) => count >= level.threshold);
  if (!earned) return null;
  return {
    id: `${idPrefix}-${earned.threshold}`,
    label: earned.label,
    description: `${descriptionPrefix} ${count}회 달성`,
    icon: earned.icon,
    className,
  };
}

export function getProfileBadges({ profile, postsCount, reelsCount, followersCount, followingCount }: BadgeInput): ProfileBadge[] {
  const badges: ProfileBadge[] = [];
  const divingCount = numericProfileField(profile, ['dive_count', 'diving_count', 'dives_count', 'logged_dives']) || postsCount + reelsCount;
  const resortUseCount = numericProfileField(profile, ['resort_use_count', 'resort_visit_count', 'resort_visits', 'reservation_count', 'booking_count']);

  const diveBadge = earnedLevelBadge(
    'dive',
    divingCount,
    diveLevels,
    '다이빙 기록',
    'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200',
  );
  if (diveBadge) badges.push(diveBadge);

  const resortBadge = earnedLevelBadge(
    'resort-use',
    resortUseCount,
    resortUseLevels,
    '리조트 이용',
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  );
  if (resortBadge) badges.push(resortBadge);

  if (profile.account_type === 'resort') {
    badges.push({
      id: 'verified-resort',
      label: '다이빙 리조트',
      description: '리조트 계정으로 등록된 프로필',
      icon: '🏝️',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    });
  }

  if (postsCount + reelsCount >= 30) {
    badges.push({
      id: 'active-creator-30',
      label: '활동왕',
      description: '게시물/릴스 30개 이상 작성',
      icon: '🔥',
      className: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200',
    });
  } else if (postsCount + reelsCount >= 3) {
    badges.push({
      id: 'active-creator-3',
      label: '기록 시작',
      description: '게시물/릴스 3개 이상 작성',
      icon: '✍️',
      className: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200',
    });
  }

  if (reelsCount >= 10) {
    badges.push({
      id: 'reels-10',
      label: '릴스 마스터',
      description: '릴스 10개 이상 작성',
      icon: '🎬',
      className: 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200',
    });
  } else if (reelsCount >= 1) {
    badges.push({
      id: 'reels-1',
      label: '첫 릴스',
      description: '릴스 첫 업로드',
      icon: '🎥',
      className: 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200',
    });
  }

  if (followersCount >= 1000) {
    badges.push({
      id: 'followers-1000',
      label: '인기 다이버',
      description: '팔로워 1,000명 이상',
      icon: '💫',
      className: 'border-pink-200 bg-pink-50 text-pink-800 dark:border-pink-800 dark:bg-pink-950/40 dark:text-pink-200',
    });
  } else if (followersCount >= 50) {
    badges.push({
      id: 'followers-50',
      label: '커뮤니티 스타',
      description: '팔로워 50명 이상',
      icon: '🌟',
      className: 'border-pink-200 bg-pink-50 text-pink-800 dark:border-pink-800 dark:bg-pink-950/40 dark:text-pink-200',
    });
  } else if (followersCount >= 1) {
    badges.push({
      id: 'followers-1',
      label: '첫 팔로워',
      description: '첫 팔로워 달성',
      icon: '🤝',
      className: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
    });
  }

  if (followingCount >= 20) {
    badges.push({
      id: 'networker-20',
      label: '버디 네트워커',
      description: '20명 이상 팔로우',
      icon: '🧭',
      className: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200',
    });
  }

  return badges.slice(0, 8);
}
