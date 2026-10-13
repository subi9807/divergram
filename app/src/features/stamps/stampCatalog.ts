export type StampMetric =
  | 'dives'
  | 'verifiedResortVisits'
  | 'uniquePoints'
  | 'maxDepth'
  | 'diveHours'
  | 'posts'
  | 'reels'
  | 'following'
  | 'followers'
  | 'likesReceived'
  | 'commentsReceived'
  | 'marineSightings'
  | 'marineSpecies';

export type StampCategory = 'diving' | 'resort' | 'explore' | 'depth' | 'time' | 'buddy' | 'community' | 'marineLife';
export type StampTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type StampDefinition = {
  id: string;
  category: StampCategory;
  metric: StampMetric;
  target: number;
  tier: StampTier;
  icon: string;
};

export type StampMetrics = Record<StampMetric, number>;

const defineSeries = (
  category: StampCategory,
  metric: StampMetric,
  rows: [id: string, target: number, tier: StampTier, icon: string][]
): StampDefinition[] =>
  rows.map(([id, target, tier, icon]) => ({
    id,
    category,
    metric,
    target,
    tier,
    icon,
  }));

export const stampCatalog: StampDefinition[] = [
  ...defineSeries('diving', 'dives', [
    ['dive-1', 1, 'bronze', 'waves'],
    ['dive-10', 10, 'bronze', 'footprints'],
    ['dive-25', 25, 'silver', 'calendar'],
    ['dive-50', 50, 'silver', 'gauge'],
    ['dive-100', 100, 'gold', 'award'],
    ['dive-250', 250, 'gold', 'shield'],
    ['dive-500', 500, 'platinum', 'crown'],
    ['dive-1000', 1000, 'platinum', 'infinity'],
  ]),
  ...defineSeries('resort', 'verifiedResortVisits', [
    ['resort-1', 1, 'bronze', 'building'],
    ['resort-5', 5, 'bronze', 'signpost'],
    ['resort-10', 10, 'silver', 'ticket'],
    ['resort-25', 25, 'silver', 'plane'],
    ['resort-50', 50, 'gold', 'badge'],
    ['resort-100', 100, 'platinum', 'globe'],
  ]),
  ...defineSeries('explore', 'uniquePoints', [
    ['point-1', 1, 'bronze', 'flag'],
    ['point-5', 5, 'bronze', 'compass'],
    ['point-10', 10, 'silver', 'map'],
    ['point-25', 25, 'gold', 'route'],
    ['point-50', 50, 'platinum', 'earth'],
  ]),
  ...defineSeries('depth', 'maxDepth', [
    ['depth-10', 10, 'bronze', 'ruler'],
    ['depth-20', 20, 'silver', 'arrow-down'],
    ['depth-30', 30, 'gold', 'anchor'],
    ['depth-40', 40, 'platinum', 'ship-wheel'],
  ]),
  ...defineSeries('time', 'diveHours', [
    ['time-10', 10, 'bronze', 'clock'],
    ['time-50', 50, 'silver', 'timer'],
    ['time-100', 100, 'gold', 'hourglass'],
    ['time-500', 500, 'platinum', 'history'],
  ]),
  ...defineSeries('community', 'posts', [
    ['post-1', 1, 'bronze', 'image-plus'],
    ['post-10', 10, 'silver', 'images'],
  ]),
  ...defineSeries('community', 'reels', [
    ['reel-1', 1, 'gold', 'video'],
  ]),
  ...defineSeries('buddy', 'following', [
    ['buddy-1', 1, 'bronze', 'user-plus'],
    ['buddy-5', 5, 'bronze', 'users'],
    ['buddy-10', 10, 'silver', 'handshake'],
    ['buddy-25', 25, 'gold', 'user-check'],
    ['buddy-50', 50, 'platinum', 'network'],
  ]),
  ...defineSeries('buddy', 'followers', [
    ['follower-1', 1, 'bronze', 'sparkles'],
    ['follower-10', 10, 'silver', 'heart-handshake'],
    ['follower-50', 50, 'gold', 'megaphone'],
  ]),
  ...defineSeries('community', 'posts', [
    ['post-25', 25, 'silver', 'notebook'],
    ['post-50', 50, 'gold', 'gallery'],
    ['post-100', 100, 'platinum', 'library'],
  ]),
  ...defineSeries('community', 'reels', [
    ['reel-5', 5, 'bronze', 'clapperboard'],
    ['reel-10', 10, 'silver', 'play-square'],
    ['reel-25', 25, 'gold', 'film'],
  ]),
  ...defineSeries('community', 'likesReceived', [
    ['like-1', 1, 'bronze', 'heart'],
    ['like-10', 10, 'silver', 'heart-pulse'],
    ['like-100', 100, 'gold', 'trophy'],
  ]),
  ...defineSeries('community', 'commentsReceived', [
    ['comment-1', 1, 'bronze', 'message'],
    ['comment-10', 10, 'silver', 'messages'],
    ['comment-50', 50, 'gold', 'message-more'],
  ]),
  ...defineSeries('marineLife', 'marineSightings', [
    ['marine-sighting-1', 1, 'bronze', 'fish'],
    ['marine-sighting-10', 10, 'silver', 'binoculars'],
    ['marine-sighting-50', 50, 'gold', 'waves'],
  ]),
  ...defineSeries('marineLife', 'marineSpecies', [
    ['marine-species-3', 3, 'bronze', 'shell'],
    ['marine-species-10', 10, 'silver', 'fish-symbol'],
    ['marine-species-25', 25, 'gold', 'turtle'],
    ['marine-species-50', 50, 'platinum', 'sparkles'],
  ]),
];

export function stampProgress(stamp: StampDefinition, metrics: StampMetrics) {
  const current = Math.max(0, Number(metrics[stamp.metric] || 0));
  return {
    current,
    achieved: current >= stamp.target,
    ratio: Math.min(1, current / Math.max(1, stamp.target)),
  };
}
