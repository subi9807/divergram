import { create } from 'axios';
import i18n from './i18n';
import { storage } from './storage';

const RAW_API_BASE =
  process.env.EXPO_PUBLIC_DIVERGRAM_API_BASE ||
  process.env.DIVERGRAM_API_BASE ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://api.divergram.com';

const API_BASE = RAW_API_BASE.replace(/\/+$/, '');
const API_ROOT = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

const axiosInstance = create({
  baseURL: API_ROOT,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = storage.getString('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

type DataFilter = {
  column: string;
  op: 'eq' | 'neq' | 'in' | 'is' | 'not' | 'ilike' | 'or';
  value?: unknown;
  operator?: string;
};

const dataApi = {
  list: async <T>(
    table: string,
    options?: {
      filters?: DataFilter[];
      order?: { column: string; ascending?: boolean };
      range?: [number, number];
      limit?: number;
    }
  ): Promise<{ data: T[]; count: number }> => {
    const params: Record<string, string | number> = {};
    if (options?.filters?.length) params.filters = JSON.stringify(options.filters);
    if (options?.order) params.order = JSON.stringify(options.order);
    if (options?.range) params.range = JSON.stringify(options.range);
    if (options?.limit !== undefined) params.limit = options.limit;

    const res = await axiosInstance.get(`/data/${table}`, { params });
    return { data: res.data?.data || [], count: res.data?.count || 0 };
  },
  insert: async <T>(table: string, rows: T[]): Promise<T[]> => {
    const res = await axiosInstance.post(`/data/${table}`, { rows });
    return res.data?.data || rows;
  },
};

function normalizeImageUrl(url: unknown): string | undefined {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!/^(https?:\/\/|file:\/\/|content:\/\/)/i.test(raw)) return undefined;
  return raw;
}

function normalizeNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeFeedItem(post: any, profileMap: Record<string, any>, likesCount: Record<string, number>, commentsCount: Record<string, number>) {
  const profile = profileMap[post.user_id] || {};
  return {
    id: String(post.id),
    user: {
      id: String(post.user_id),
      name: profile.username || profile.full_name || 'Diver',
      avatar: profile.avatar_url || undefined,
    },
    content: post.caption || '',
    image: normalizeImageUrl(post.image_url),
    likes: likesCount[String(post.id)] || 0,
    comments: commentsCount[String(post.id)] || 0,
    createdAt: post.created_at || new Date().toISOString(),
    location: post.location || post.dive_site || undefined,
    diveSite: post.dive_site || undefined,
    diveType: post.dive_type || undefined,
    gasType: post.gas_type || undefined,
    gasPercent: normalizeNumber(post.gas_percent),
    resort: post.buddy || undefined,
    maxDepth: normalizeNumber(post.max_depth),
    waterTemperature: normalizeNumber(post.water_temperature),
    visibility: normalizeNumber(post.visibility),
    locationLat: normalizeNumber(post.location_lat),
    locationLng: normalizeNumber(post.location_lng),
  };
}

export const apiClient = {
  authWithOAuth: (provider: string, accessToken: string, userInfo?: any) =>
    axiosInstance.post('/auth/oauth', { provider, accessToken, userInfo }),

  authWithOAuthMobile: (provider: string, accessToken: string, sessionDays = 7) =>
    axiosInstance.post('/auth/oauth/mobile', { provider, accessToken, sessionDays }),

  linkOAuthMobile: (linkToken: string) =>
    axiosInstance.post('/auth/oauth/mobile/link', { linkToken }),

  linkOAuthMobileConfirm: (linkToken: string, action: 'approve' | 'cancel' = 'approve') =>
    axiosInstance.post('/auth/oauth/mobile/link/confirm', { linkToken, action }),

  authWithEmail: (email: string, password: string) => axiosInstance.post('/auth/login', { email, password }),

  authWithEmailSignup: (email: string, password: string, username: string, accountType: 'personal' | 'resort' = 'personal') =>
    axiosInstance.post('/auth/signup', { email, password, username, account_type: accountType }),

  refreshToken: (_refreshToken: string) => Promise.reject(new Error('refresh_token_not_supported')),

  getSession: () => axiosInstance.get('/auth/session').then((res) => res.data?.session || null),

  getMe: async () => {
    const session = await apiClient.getSession();
    return session?.user || null;
  },

  updatePushToken: (platform: string, token: string) =>
    axiosInstance.post('/push/tokens', { platform, push_token: token }),

  getFeed: async (cursor: string | null = null) => {
    const pageSize = 10;
    const offset = Number(cursor || '0') || 0;

    const [postsRes, profilesRes, likesRes, commentsRes] = await Promise.all([
      dataApi.list<any>('posts', {
        order: { column: 'created_at', ascending: false },
        range: [offset, offset + pageSize - 1],
      }),
      dataApi.list<any>('profiles', { limit: 1000 }),
      dataApi.list<any>('likes', { limit: 5000 }),
      dataApi.list<any>('comments', { limit: 5000 }),
    ]);

    const profileMap: Record<string, any> = {};
    for (const p of profilesRes.data) profileMap[String(p.id)] = p;

    const likesCount: Record<string, number> = {};
    for (const like of likesRes.data) {
      const postId = String(like.post_id || '');
      if (!postId) continue;
      likesCount[postId] = (likesCount[postId] || 0) + 1;
    }

    const commentsCount: Record<string, number> = {};
    for (const comment of commentsRes.data) {
      const postId = String(comment.post_id || '');
      if (!postId) continue;
      commentsCount[postId] = (commentsCount[postId] || 0) + 1;
    }

    const data = postsRes.data.map((post) => normalizeFeedItem(post, profileMap, likesCount, commentsCount));
    const nextCursor = data.length === pageSize ? String(offset + pageSize) : null;

    return {
      data,
      nextCursor,
      hasMore: nextCursor !== null,
    };
  },

  getExplore: async () => {
    const posts = await dataApi.list<any>('posts', {
      order: { column: 'created_at', ascending: false },
      limit: 80,
    });
    const grouped = new Map<string, { title: string; location: string; count: number; visibility: number[] }>();
    for (const post of posts.data) {
      const location = String(post.location || post.dive_site || '').trim();
      if (!location) continue;
      const prev = grouped.get(location) || { title: i18n.t('api.explore.defaultTitle'), location, count: 0, visibility: [] };
      prev.count += 1;
      if (post.visibility) prev.visibility.push(Number(post.visibility));
      grouped.set(location, prev);
    }
    return Array.from(grouped.values()).slice(0, 10).map((item) => ({
      ...item,
      meta: `${i18n.t('api.explore.postsMeta', { count: item.count })}${item.visibility.length ? ` · ${i18n.t('api.explore.avgVisibility', { value: Math.round(item.visibility.reduce((a, b) => a + b, 0) / item.visibility.length) })}` : ''}`,
    }));
  },

  getResorts: async () => {
    const res = await dataApi.list<any>('profiles', {
      filters: [{ column: 'account_type', op: 'eq', value: 'resort' }],
      limit: 50,
    });
    return res.data.map((item) => ({
      id: String(item.id),
      name: item.full_name || item.username || i18n.t('api.resorts.defaultName'),
      area: item.resort_region || item.resort_address || item.bio || i18n.t('api.resorts.noArea'),
      rating: Number(item.resort_rating_avg || 0),
      reviewCount: Number(item.resort_review_count || 0),
      tags: item.website || item.account_type || 'resort',
    }));
  },

  getLogs: async () => {
    const res = await dataApi.list<any>('posts', {
      order: { column: 'created_at', ascending: false },
      limit: 30,
    });
    return res.data.map((post) => ({
      id: String(post.id),
      title: post.caption || post.dive_site || i18n.t('api.logs.defaultTitle'),
      location: post.location || post.dive_site || '',
      depth: Number(post.max_depth || 0),
      duration: Number(post.dive_duration || 0),
      notes: post.caption || '',
      createdAt: post.created_at || new Date().toISOString(),
      updatedAt: post.created_at || new Date().toISOString(),
    }));
  },
  createLog: async (data: any) => {
    const user = await apiClient.getMe();
    const id = `native_${Date.now()}`;
    const locationLabel = String(data.location || data.pointName || '').trim();
    const pointName = String(data.pointName || data.location || '').trim();
    const title = String(data.title || '').trim();
    const notes = String(data.notes || '').trim();
    const caption = [title, notes].filter(Boolean).join('\n').trim() || i18n.t('api.logs.defaultCaption');
    const diveType = String(data.diveType || 'freediving') === 'scuba' ? 'scuba' : 'freediving';
    const gasType = diveType === 'scuba' ? String(data.gasType || 'air') : null;
    const gasPercent = diveType === 'scuba' && gasType !== 'air' ? normalizeNumber(data.gasPercent) : undefined;
    const latitude = normalizeNumber(data.latitude);
    const longitude = normalizeNumber(data.longitude);
    const imageUrl = normalizeImageUrl(data.imageUri);
    const row = {
      id,
      user_id: String(user?.id || 'native-user'),
      image_url: imageUrl || null,
      caption,
      location: locationLabel || null,
      dive_site: pointName || null,
      dive_type: diveType,
      max_depth: normalizeNumber(data.depth),
      dive_duration: normalizeNumber(data.duration),
      water_temperature: normalizeNumber(data.temperature),
      visibility: normalizeNumber(data.visibility),
      gas_type: gasType,
      gas_percent: gasPercent,
      buddy: String(data.resortName || '').trim() || null,
      buddy_name: String(data.buddy || '').trim() || null,
      location_lat: latitude,
      location_lng: longitude,
      publish_to_feed: true,
      publish_to_reels: false,
      created_at: new Date().toISOString(),
    };
    const [created] = await dataApi.insert('posts', [row]);
    return created;
  },
  uploadTrack: (_logId: string, _trackData: any) => Promise.reject(new Error('not_implemented')),
};

export const apiConfig = {
  rawBase: RAW_API_BASE,
  base: API_BASE,
  root: API_ROOT,
};

export default axiosInstance;
