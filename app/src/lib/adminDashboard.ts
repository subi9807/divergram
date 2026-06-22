import {
  fetchAdminCertifications,
  fetchAdminGrowth,
  fetchAdminHealth,
  fetchAdminJobs,
  fetchAdminMapPoints,
  fetchAdminReports,
  fetchAdminStats,
  fetchAdminTableRows,
  fetchAdminTables,
  fetchAdminUsers,
  type AdminCertification,
  type AdminGrowth,
  type AdminHealth,
  type AdminJob,
  type AdminMapPoint,
  type AdminReport,
  type AdminStats,
  type AdminTableSummary,
  type AdminUser,
} from './adminApi';

type AnyRecord = Record<string, any>;

export type AdminModuleState = {
  key: string;
  label: string;
  status: '연결됨' | '대기' | '점검필요';
  note: string;
  count?: number;
};

export type AdminAdSlot = {
  id: string;
  title: string;
  placement: string;
  status: '준비됨' | '초안' | '잠김';
  note: string;
  actionLabel: string;
};

export type AdminDashboardItem = {
  id: string;
  title: string;
  subtitle: string;
  kind: 'member' | 'resort' | 'feed' | 'reel';
  createdAt: string;
  mediaCount?: number;
  likes?: number;
  comments?: number;
  tags: string[];
  cover?: string;
  badge?: string;
  meta?: string;
};

export type AdminVisitorSnapshot = {
  labels: string[];
  values: number[];
  average: number;
  peak: number;
  trend: number;
  note: string;
};

export type AdminRoleBreakdown = {
  total: number;
  general: number;
  resort: number;
  admin: number;
  unknown: number;
};

export type AdminReportBreakdown = {
  total: number;
  received: number;
  reviewing: number;
  resolved: number;
  rejected: number;
};

export type AdminDashboardSnapshot = {
  health: AdminHealth | null;
  stats: AdminStats | null;
  growth: AdminGrowth | null;
  users: AdminUser[];
  certifications: AdminCertification[];
  reports: AdminReport[];
  jobs: AdminJob[];
  mapPoints: AdminMapPoint[];
  tables: AdminTableSummary[];
  tableRows: {
    profiles: AnyRecord[];
    posts: AnyRecord[];
    postMedia: AnyRecord[];
    likes: AnyRecord[];
    comments: AnyRecord[];
    auditLogs: AnyRecord[];
  };
  modules: AdminModuleState[];
  adSlots: AdminAdSlot[];
  visitor: AdminVisitorSnapshot;
  roleBreakdown: AdminRoleBreakdown;
  reportBreakdown: AdminReportBreakdown;
  overviewCards: { label: string; value: number | string; note: string }[];
  feedItems: AdminDashboardItem[];
  reelItems: AdminDashboardItem[];
  resortItems: AdminDashboardItem[];
  memberItems: AdminDashboardItem[];
  lastLoadedAt: string;
};

const TABLE_LIMITS: Record<string, number> = {
  app_profiles: 120,
  app_posts: 140,
  app_post_media: 600,
  app_likes: 2000,
  app_comments: 2000,
  admin_audit_logs: 50,
};

function asText(value: unknown) {
  return String(value ?? '').trim();
}

function asNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function parseDate(value: unknown) {
  const raw = asText(value);
  if (!raw) return '';
  const time = Date.parse(raw);
  if (!Number.isFinite(time)) return raw;
  return new Date(time).toISOString();
}

function extractTags(text: unknown) {
  const raw = asText(text);
  if (!raw) return [];
  const matches = raw.match(/#[\p{L}\p{N}_-]+/gu) || [];
  return [...new Set(matches.map((item) => item.replace(/^#/, '').trim()).filter(Boolean))];
}

function getMediaMap(rows: AnyRecord[]) {
  const map: Record<string, AnyRecord[]> = {};
  for (const row of rows) {
    const postId = asText(row.post_id || row.postId);
    if (!postId) continue;
    if (!map[postId]) map[postId] = [];
    map[postId].push(row);
  }
  return map;
}

function getCountMap(rows: AnyRecord[], keyName: string) {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const key = asText(row[keyName]);
    if (!key) continue;
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

function sortNewest(rows: AnyRecord[]) {
  return [...rows].sort((a, b) => {
    const left = Date.parse(asText(a.created_at || a.updated_at || a.createdAt || '')) || 0;
    const right = Date.parse(asText(b.created_at || b.updated_at || b.createdAt || '')) || 0;
    return right - left;
  });
}

function pickCover(post: AnyRecord, mediaRows: AnyRecord[]) {
  const media = mediaRows.find((item) => asText(item.media_url || item.url || ''));
  return asText(media?.media_url || media?.url || post.image_url || post.video_url || post.cover_url || post.thumbnail_url || '');
}

function buildContentItem(kind: AdminDashboardItem['kind'], row: AnyRecord, mediaMap: Record<string, AnyRecord[]>, likesMap: Record<string, number>, commentsMap: Record<string, number>): AdminDashboardItem {
  const id = asText(row.id || row.user_id || row.record_id || `${kind}-${Math.random().toString(36).slice(2, 8)}`);
  const postMedia = mediaMap[id] || [];
  const title =
    kind === 'member'
      ? asText(row.username || row.full_name || row.email || row.id)
      : kind === 'resort'
        ? asText(row.full_name || row.username || row.resort_name || row.name || row.bio || row.id)
        : asText(row.dive_site || row.caption || row.location || row.title || row.username || row.id);
  const subtitle =
    kind === 'member'
      ? [row.email, row.account_type === 'resort' ? '리조트 회원' : '일반 회원'].filter(Boolean).join(' · ')
      : kind === 'resort'
        ? [row.resort_country, row.resort_region, row.resort_address].filter(Boolean).join(' · ') || '리조트 정보 없음'
        : [row.location, row.dive_type, row.dive_date].filter(Boolean).join(' · ') || '피드 콘텐츠';
  const tags = [
    ...(Array.isArray(row.tags) ? row.tags.map((item) => asText(item)).filter(Boolean) : []),
    ...extractTags(row.caption || row.content || row.memo || ''),
  ];
  const mediaCount = postMedia.length || asNumber(row.media_count, 0);
  const cover = pickCover(row, postMedia);
  const likes = likesMap[id] || asNumber(row.likes_count, 0);
  const comments = commentsMap[id] || asNumber(row.comments_count, 0);
  const badge =
    kind === 'feed'
      ? row.publish_to_feed === false
        ? '피드 제외'
        : '피드'
      : kind === 'reel'
        ? row.publish_to_reels === true || row.video_url
          ? '릴스'
          : '일반 게시물'
        : row.account_type === 'resort'
          ? '리조트'
          : '회원';

  return {
    id,
    title: title || id,
    subtitle,
    kind,
    createdAt: parseDate(row.created_at || row.updated_at || row.createdAt || new Date().toISOString()),
    mediaCount,
    likes,
    comments,
    tags: tags.slice(0, 4),
    cover,
    badge,
    meta:
      kind === 'member'
        ? (row.role || row.email_verified)
          ? `${row.role || 'user'} · ${row.email_verified ? '이메일 인증' : '미인증'}`
          : '회원 정보'
        : kind === 'resort'
          ? `평점 ${asNumber(row.resort_rating_avg || row.rating, 0).toFixed(1)} · 리뷰 ${asNumber(row.resort_review_count || row.reviewCount, 0)}`
          : `좋아요 ${likes} · 댓글 ${comments}`,
  };
}

export async function loadAdminDashboardSnapshot(adminKey?: string): Promise<AdminDashboardSnapshot> {
  const [
    health,
    stats,
    growth,
    users,
    certifications,
    reports,
    jobs,
    mapPoints,
    tables,
    profiles,
    posts,
    postMedia,
    likes,
    comments,
    auditLogs,
  ] = await Promise.all([
    fetchAdminHealth(adminKey).catch(() => null),
    fetchAdminStats(adminKey).catch(() => null),
    fetchAdminGrowth(adminKey, 14).catch(() => null),
    fetchAdminUsers(adminKey, { limit: 30 }).catch(() => []),
    fetchAdminCertifications(adminKey, { limit: 20 }).catch(() => []),
    fetchAdminReports(adminKey, { limit: 30 }).catch(() => []),
    fetchAdminJobs(adminKey, 20).catch(() => []),
    fetchAdminMapPoints(adminKey).catch(() => []),
    fetchAdminTables(adminKey).catch(() => []),
    fetchAdminTableRows(adminKey, 'app_profiles', TABLE_LIMITS.app_profiles).catch(() => []),
    fetchAdminTableRows(adminKey, 'app_posts', TABLE_LIMITS.app_posts).catch(() => []),
    fetchAdminTableRows(adminKey, 'app_post_media', TABLE_LIMITS.app_post_media).catch(() => []),
    fetchAdminTableRows(adminKey, 'app_likes', TABLE_LIMITS.app_likes).catch(() => []),
    fetchAdminTableRows(adminKey, 'app_comments', TABLE_LIMITS.app_comments).catch(() => []),
    fetchAdminTableRows(adminKey, 'admin_audit_logs', TABLE_LIMITS.admin_audit_logs).catch(() => []),
  ]);

  const profileRows = Array.isArray(profiles) ? profiles : [];
  const postRows = Array.isArray(posts) ? posts : [];
  const mediaRows = Array.isArray(postMedia) ? postMedia : [];
  const likeRows = Array.isArray(likes) ? likes : [];
  const commentRows = Array.isArray(comments) ? comments : [];
  const auditRows = Array.isArray(auditLogs) ? auditLogs : [];
  const mediaMap = getMediaMap(mediaRows);
  const likesMap = getCountMap(likeRows, 'post_id');
  const commentsMap = getCountMap(commentRows, 'post_id');

  const feedRows = sortNewest(postRows)
    .filter((row) => row.publish_to_feed !== false)
    .slice(0, 12)
    .map((row) => buildContentItem('feed', row, mediaMap, likesMap, commentsMap));
  const reelRows = sortNewest(postRows)
    .filter((row) => row.publish_to_reels === true || Boolean(row.video_url))
    .slice(0, 12)
    .map((row) => buildContentItem('reel', row, mediaMap, likesMap, commentsMap));
  const resortRows = sortNewest(profileRows)
    .filter((row) => row.account_type === 'resort')
    .slice(0, 12)
    .map((row) => buildContentItem('resort', row, mediaMap, likesMap, commentsMap));
  const memberRows = sortNewest(profileRows)
    .filter((row) => row.account_type !== 'resort')
    .slice(0, 12)
    .map((row) => buildContentItem('member', row, mediaMap, likesMap, commentsMap));

  const dauApprox = growth?.series?.dauApprox || [];
  const visitorValues = dauApprox.map((item) => asNumber(item.count, 0));
  const visitorLabels = dauApprox.map((item) => asText(item.day).slice(5));
  const average = visitorValues.length ? visitorValues.reduce((sum, item) => sum + item, 0) / visitorValues.length : 0;
  const peak = visitorValues.length ? Math.max(...visitorValues) : 0;
  const trend = visitorValues.length > 1 ? visitorValues[visitorValues.length - 1] - visitorValues[0] : 0;

  const tableCountMap = Object.fromEntries((tables || []).map((row) => [row.table, row.count]));
  const totalUsers = stats?.users ?? tableCountMap.app_users ?? users.length;
  const resortUsers = stats?.resortUsers ?? profileRows.filter((row) => row.account_type === 'resort').length;
  const resortUserIds = new Set(profileRows.filter((row) => row.account_type === 'resort').map((row) => asText(row.user_id || row.id || row.userId)));
  const roleBreakdown = users.reduce<AdminRoleBreakdown>(
    (acc, user) => {
      const role = asText(user.role).toLowerCase();
      const isResort = role === 'resort' || resortUserIds.has(asText(user.id));
      if (role === 'admin') acc.admin += 1;
      else if (isResort) acc.resort += 1;
      else if (!role || role === 'member' || role === 'user' || role === 'general') acc.general += 1;
      else acc.unknown += 1;
      acc.total += 1;
      return acc;
    },
    { total: 0, general: 0, resort: 0, admin: 0, unknown: 0 }
  );
  const reportBreakdown = reports.reduce<AdminReportBreakdown>(
    (acc, report) => {
      const status = asText(report.status).toLowerCase();
      if (status === 'reviewing') acc.reviewing += 1;
      else if (status === 'resolved') acc.resolved += 1;
      else if (status === 'rejected') acc.rejected += 1;
      else acc.received += 1;
      acc.total += 1;
      return acc;
    },
    { total: 0, received: 0, reviewing: 0, resolved: 0, rejected: 0 }
  );
  const modules: AdminModuleState[] = [
    { key: 'members', label: '회원 관리', status: users.length ? '연결됨' : '점검필요', note: '리조트/일반 회원을 분리해 관리합니다.', count: totalUsers },
    { key: 'resorts', label: '리조트 관리', status: resortRows.length ? '연결됨' : '점검필요', note: '리조트 회원과 운영 정보로 바로 연결합니다.', count: resortUsers },
    { key: 'feed', label: '피드 관리', status: feedRows.length ? '연결됨' : '점검필요', note: '피드 노출/삭제/수정 흐름을 운영합니다.', count: feedRows.length },
    { key: 'reels', label: '릴스 관리', status: reelRows.length ? '연결됨' : '점검필요', note: '릴스 검수와 노출 우선순위를 관리합니다.', count: reelRows.length },
    { key: 'visitors', label: '방문자 통계', status: visitorValues.length ? '연결됨' : '점검필요', note: 'DAU 추정과 성장 추이를 확인합니다.', count: visitorValues.length },
    { key: 'ads', label: '광고 운영', status: '대기', note: '광고 슬롯 API를 별도 연결하면 즉시 운영 가능해집니다.', count: 3 },
    { key: 'map', label: '포인트 지도', status: mapPoints.length ? '연결됨' : '점검필요', note: '다이빙 포인트/리조트 마커를 함께 관리합니다.', count: mapPoints.length },
    { key: 'system', label: '시스템/보안', status: health?.ok ? '연결됨' : '점검필요', note: '서버 상태, 작업 큐, 신고 검토를 포함합니다.', count: jobs.length },
  ];

  const adSlots: AdminAdSlot[] = [
    { id: 'feed-inline-1', title: '피드 중간 광고', placement: '홈 피드 3번째 카드 이후', status: '초안', note: '피드 흐름을 깨지 않게 네이티브 카드로 삽입합니다.', actionLabel: '카피 작성' },
    { id: 'reels-mid-1', title: '릴스 중간 광고', placement: '릴스 4개 단위 사이', status: '초안', note: '세로 영상 중간 광고를 운영 규칙에 맞게 노출합니다.', actionLabel: '소재 연결' },
    { id: 'map-banner-1', title: '지도 상단 배너', placement: '포인트 지도 헤더', status: '잠김', note: '외부 광고 계약 후 활성화합니다.', actionLabel: '연동 대기' },
  ];

  const overviewCards = [
    { label: '전체 회원', value: totalUsers, note: '리조트 포함 계정 수' },
    { label: '리조트 회원', value: resortUsers, note: '운영/제휴 계정 수' },
    { label: '피드 / 릴스', value: `${feedRows.length} / ${reelRows.length}`, note: '관리 대상 콘텐츠' },
    { label: '방문자 추정', value: average ? Math.round(average) : 0, note: '최근 DAU 추정치' },
    { label: '작업 큐', value: jobs.length, note: '배포/동기화 작업 수' },
    { label: '지도 포인트', value: mapPoints.length, note: '관리 마커 수' },
  ];

  return {
    health,
    stats,
    growth,
    users,
    certifications,
    reports,
    jobs,
    mapPoints,
    tables,
    tableRows: {
      profiles: profileRows,
      posts: postRows,
      postMedia: mediaRows,
      likes: likeRows,
      comments: commentRows,
      auditLogs: auditRows,
    },
    modules,
    adSlots,
    visitor: {
      labels: visitorLabels,
      values: visitorValues,
      average: Number(average.toFixed(1)),
      peak,
      trend,
      note:
        visitorValues.length > 1
          ? trend >= 0
            ? `최근 방문자 추정치가 ${trend}명 증가했습니다.`
            : `최근 방문자 추정치가 ${Math.abs(trend)}명 감소했습니다.`
          : '방문자 추정 데이터가 충분하지 않습니다.',
    },
    roleBreakdown,
    reportBreakdown,
    overviewCards,
    feedItems: feedRows,
    reelItems: reelRows,
    resortItems: resortRows,
    memberItems: memberRows,
    lastLoadedAt: new Date().toISOString(),
  };
}
