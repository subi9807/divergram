import axios from 'axios';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const API_BASE = process.env.DIVERGRAM_API_BASE || process.env.EXPO_PUBLIC_API_BASE_URL || 'https://divergram.com';

const axiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
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
};

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
    image: post.image_url || undefined,
    likes: likesCount[String(post.id)] || 0,
    comments: commentsCount[String(post.id)] || 0,
    createdAt: post.created_at || new Date().toISOString(),
  };
}

export const apiClient = {
  authWithOAuth: (provider: string, accessToken: string, userInfo?: any) =>
    axiosInstance.post('/auth/oauth', { provider, accessToken, userInfo }),

  authWithEmail: (email: string, password: string) => axiosInstance.post('/auth/login', { email, password }),

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

  getLogs: () => Promise.resolve([]),
  createLog: (_data: any) => Promise.reject(new Error('not_implemented')),
  uploadTrack: (_logId: string, _trackData: any) => Promise.reject(new Error('not_implemented')),
};

export default axiosInstance;
