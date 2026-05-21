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
  update: async <T>(table: string, filters: DataFilter[], patch: Partial<T>): Promise<T[] | null> => {
    const res = await axiosInstance.patch(`/data/${table}`, { filters, patch });
    return res.data?.data || null;
  },
  remove: async (table: string, filters: DataFilter[]): Promise<any[] | null> => {
    const res = await axiosInstance.delete(`/data/${table}`, { data: { filters } });
    return res.data?.data || null;
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

function normalizeString(value: unknown): string {
  return String(value ?? '').trim();
}

function profileExtraStorageKey(userId: string, field: string) {
  return `profile_extra_${field}_${userId}`;
}

function readProfileExtrasFromStorage(userId: string) {
  const read = (field: string) => normalizeString(storage.getString(profileExtraStorageKey(userId, field)) || '');
  return {
    diving_level: read('diving_level'),
    scuba_level: read('scuba_level'),
    freediving_level: read('freediving_level'),
    license_image_url: read('license_image_url'),
    license_agency: read('license_agency'),
    license_number: read('license_number'),
    license_issued_at: read('license_issued_at'),
  };
}

function writeProfileExtrasToStorage(userId: string, patch: Record<string, unknown>) {
  const fields = [
    'diving_level',
    'scuba_level',
    'freediving_level',
    'license_image_url',
    'license_agency',
    'license_number',
    'license_issued_at',
  ] as const;

  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) continue;
    const key = profileExtraStorageKey(userId, field);
    const value = normalizeString(patch[field]);
    if (value) storage.set(key, value);
    else storage.delete(key);
  }
}

export interface FeedCommentItem {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface FeedMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  order: number;
}

function normalizeFeedMedia(post: any): FeedMediaItem[] {
  const rows = Array.isArray(post?.post_media) ? post.post_media : [];
  const fromRows = rows
    .map((item: any, index: number) => {
      const url = normalizeImageUrl(item?.media_url);
      if (!url) return null;
      const mediaType = item?.media_type === 'video' ? 'video' : 'image';
      const order = Number.isFinite(Number(item?.order_index)) ? Number(item.order_index) : index;
      return {
        id: String(item?.id || `${post?.id || 'post'}-media-${index}`),
        url,
        type: mediaType as 'image' | 'video',
        order,
      };
    })
    .filter(Boolean) as FeedMediaItem[];

  if (fromRows.length) {
    return [...fromRows].sort((a, b) => a.order - b.order);
  }

  const fallback: FeedMediaItem[] = [];
  const image = normalizeImageUrl(post?.image_url);
  const video = normalizeImageUrl(post?.video_url);
  if (image) {
    fallback.push({ id: `${post?.id || 'post'}-image`, url: image, type: 'image', order: 0 });
  }
  if (video) {
    fallback.push({ id: `${post?.id || 'post'}-video`, url: video, type: 'video', order: fallback.length });
  }
  return fallback;
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
    media: normalizeFeedMedia(post),
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

  getProfileById: async (userId: string) => {
    const id = normalizeString(userId);
    if (!id) return null;
    const res = await dataApi.list<any>('profiles', {
      filters: [{ column: 'id', op: 'eq', value: id }],
      limit: 1,
    });
    const profile = res.data[0] || null;
    if (!profile) return null;
    const extras = readProfileExtrasFromStorage(id);
    return {
      ...profile,
      diving_level: normalizeString(profile.diving_level || extras.diving_level || ''),
      scuba_level: normalizeString(profile.scuba_level || extras.scuba_level || ''),
      freediving_level: normalizeString(profile.freediving_level || extras.freediving_level || ''),
      license_image_url: normalizeString(profile.license_image_url || extras.license_image_url || ''),
      license_agency: normalizeString(profile.license_agency || extras.license_agency || ''),
      license_number: normalizeString(profile.license_number || extras.license_number || ''),
      license_issued_at: normalizeString(profile.license_issued_at || extras.license_issued_at || ''),
    };
  },

  getProfileSummary: async (userId: string) => {
    const id = normalizeString(userId);
    if (!id) return null;

    const [profileRes, postsRes] = await Promise.all([
      dataApi.list<any>('profiles', {
        filters: [{ column: 'id', op: 'eq', value: id }],
        limit: 1,
      }),
      dataApi.list<any>('posts', {
        filters: [{ column: 'user_id', op: 'eq', value: id }],
        limit: 5000,
      }),
    ]);

    const profile = profileRes.data[0] || null;
    if (!profile) return null;
    const extras = readProfileExtrasFromStorage(id);

    const posts = postsRes.data || [];
    let maxDepth = 0;
    let totalDiveMinutes = 0;

    for (const post of posts) {
      const depth = normalizeNumber(post?.max_depth) || 0;
      const duration = normalizeNumber(post?.dive_duration) || 0;
      if (depth > maxDepth) maxDepth = depth;
      totalDiveMinutes += duration;
    }

    const totalTime = Math.round((totalDiveMinutes / 60) * 10) / 10;

    return {
      ...profile,
      totalDives: posts.length,
      maxDepth,
      totalTime,
      diving_level: normalizeString(profile.diving_level || extras.diving_level || ''),
      scuba_level: normalizeString(profile.scuba_level || extras.scuba_level || ''),
      freediving_level: normalizeString(profile.freediving_level || extras.freediving_level || ''),
      license_image_url: normalizeString(profile.license_image_url || extras.license_image_url || ''),
      license_agency: normalizeString(profile.license_agency || extras.license_agency || ''),
      license_number: normalizeString(profile.license_number || extras.license_number || ''),
      license_issued_at: normalizeString(profile.license_issued_at || extras.license_issued_at || ''),
    };
  },

  updateProfile: async (
    userId: string,
    patch: {
      full_name?: string;
      bio?: string;
      avatar_url?: string;
      diving_level?: string;
      scuba_level?: string;
      freediving_level?: string;
      license_image_url?: string;
      license_agency?: string;
      license_number?: string;
      license_issued_at?: string;
    }
  ) => {
    const uid = normalizeString(userId);
    if (!uid) throw new Error('invalid_user_id');

    const cleanPatch: Record<string, any> = {};
    if (patch.full_name !== undefined) cleanPatch.full_name = normalizeString(patch.full_name);
    if (patch.bio !== undefined) cleanPatch.bio = normalizeString(patch.bio);
    if (patch.avatar_url !== undefined) cleanPatch.avatar_url = normalizeString(patch.avatar_url);
    if (patch.diving_level !== undefined) cleanPatch.diving_level = normalizeString(patch.diving_level);
    if (patch.scuba_level !== undefined) cleanPatch.scuba_level = normalizeString(patch.scuba_level);
    if (patch.freediving_level !== undefined) cleanPatch.freediving_level = normalizeString(patch.freediving_level);
    if (patch.license_image_url !== undefined) cleanPatch.license_image_url = normalizeString(patch.license_image_url);
    if (patch.license_agency !== undefined) cleanPatch.license_agency = normalizeString(patch.license_agency);
    if (patch.license_number !== undefined) cleanPatch.license_number = normalizeString(patch.license_number);
    if (patch.license_issued_at !== undefined) cleanPatch.license_issued_at = normalizeString(patch.license_issued_at);

    const filters = [{ column: 'id', op: 'eq' as const, value: uid }];
    writeProfileExtrasToStorage(uid, cleanPatch);

    try {
      await dataApi.update<any>('profiles', filters, cleanPatch);
    } catch (error: any) {
      const message = String(error?.response?.data?.error || error?.message || '').toLowerCase();
      const hasOptionalFieldsPatch =
        Object.prototype.hasOwnProperty.call(cleanPatch, 'diving_level') ||
        Object.prototype.hasOwnProperty.call(cleanPatch, 'scuba_level') ||
        Object.prototype.hasOwnProperty.call(cleanPatch, 'freediving_level') ||
        Object.prototype.hasOwnProperty.call(cleanPatch, 'license_image_url') ||
        Object.prototype.hasOwnProperty.call(cleanPatch, 'license_agency') ||
        Object.prototype.hasOwnProperty.call(cleanPatch, 'license_number') ||
        Object.prototype.hasOwnProperty.call(cleanPatch, 'license_issued_at');

      if (hasOptionalFieldsPatch && (message.includes('column') || message.includes('schema') || message.includes('does not exist'))) {
        const fallbackPatch: Record<string, any> = {};
        if (cleanPatch.full_name !== undefined) fallbackPatch.full_name = cleanPatch.full_name;
        if (cleanPatch.bio !== undefined) fallbackPatch.bio = cleanPatch.bio;
        if (cleanPatch.avatar_url !== undefined) fallbackPatch.avatar_url = cleanPatch.avatar_url;
        await dataApi.update<any>('profiles', filters, fallbackPatch);
      } else {
        throw error;
      }
    }

    return apiClient.getProfileById(uid);
  },

  uploadLicenseImageWithOcr: async (imageData: string) => {
    const dataUrl = normalizeString(imageData);
    if (!dataUrl) throw new Error('invalid_image_data');
    const response = await axiosInstance.post('/license-image/ocr', { imageData: dataUrl });
    return response.data || {};
  },

  isPostLikedByUser: async (postId: string, userId: string) => {
    const pid = normalizeString(postId);
    const uid = normalizeString(userId);
    if (!pid || !uid) return false;
    const res = await dataApi.list<any>('likes', {
      filters: [
        { column: 'post_id', op: 'eq', value: pid },
        { column: 'user_id', op: 'eq', value: uid },
      ],
      limit: 1,
    });
    return res.data.length > 0;
  },

  togglePostLike: async (postId: string, userId: string) => {
    const pid = normalizeString(postId);
    const uid = normalizeString(userId);
    if (!pid || !uid) throw new Error('invalid_like_target');

    const existing = await dataApi.list<any>('likes', {
      filters: [
        { column: 'post_id', op: 'eq', value: pid },
        { column: 'user_id', op: 'eq', value: uid },
      ],
      limit: 1,
    });

    let liked = false;
    if (existing.data.length) {
      const target = existing.data[0];
      await dataApi.remove('likes', [{ column: 'id', op: 'eq', value: target.id }]);
      liked = false;
    } else {
      await dataApi.insert('likes', [{ post_id: pid, user_id: uid }]);
      liked = true;
    }

    const countRes = await dataApi.list<any>('likes', {
      filters: [{ column: 'post_id', op: 'eq', value: pid }],
      limit: 5000,
    });

    return { liked, count: countRes.data.length };
  },

  isPostSavedByUser: async (postId: string, userId: string) => {
    const pid = normalizeString(postId);
    const uid = normalizeString(userId);
    if (!pid || !uid) return false;
    const res = await dataApi.list<any>('saved_posts', {
      filters: [
        { column: 'post_id', op: 'eq', value: pid },
        { column: 'user_id', op: 'eq', value: uid },
      ],
      limit: 1,
    });
    return res.data.length > 0;
  },

  isFollowingUser: async (followerId: string, followingId: string) => {
    const fid = normalizeString(followerId);
    const targetId = normalizeString(followingId);
    if (!fid || !targetId || fid === targetId) return false;
    const res = await dataApi.list<any>('follows', {
      filters: [
        { column: 'follower_id', op: 'eq', value: fid },
        { column: 'following_id', op: 'eq', value: targetId },
      ],
      limit: 1,
    });
    return res.data.length > 0;
  },

  toggleFollowUser: async (followerId: string, followingId: string) => {
    const fid = normalizeString(followerId);
    const targetId = normalizeString(followingId);
    if (!fid || !targetId || fid === targetId) throw new Error('invalid_follow_target');

    const existing = await dataApi.list<any>('follows', {
      filters: [
        { column: 'follower_id', op: 'eq', value: fid },
        { column: 'following_id', op: 'eq', value: targetId },
      ],
      limit: 1,
    });

    let following = false;
    if (existing.data.length) {
      const target = existing.data[0];
      await dataApi.remove('follows', [{ column: 'id', op: 'eq', value: target.id }]);
      following = false;
    } else {
      await dataApi.insert('follows', [{ follower_id: fid, following_id: targetId }]);
      following = true;
    }
    return { following };
  },

  toggleSavedPost: async (postId: string, userId: string) => {
    const pid = normalizeString(postId);
    const uid = normalizeString(userId);
    if (!pid || !uid) throw new Error('invalid_saved_target');

    const existing = await dataApi.list<any>('saved_posts', {
      filters: [
        { column: 'post_id', op: 'eq', value: pid },
        { column: 'user_id', op: 'eq', value: uid },
      ],
      limit: 1,
    });

    let saved = false;
    if (existing.data.length) {
      const target = existing.data[0];
      await dataApi.remove('saved_posts', [{ column: 'id', op: 'eq', value: target.id }]);
      saved = false;
    } else {
      await dataApi.insert('saved_posts', [{ post_id: pid, user_id: uid }]);
      saved = true;
    }
    return { saved };
  },

  getPostComments: async (postId: string): Promise<FeedCommentItem[]> => {
    const pid = normalizeString(postId);
    if (!pid) return [];

    const [commentsRes, profilesRes] = await Promise.all([
      dataApi.list<any>('comments', {
        filters: [{ column: 'post_id', op: 'eq', value: pid }],
        order: { column: 'created_at', ascending: true },
        limit: 500,
      }),
      dataApi.list<any>('profiles', { limit: 2000 }),
    ]);

    const profileMap: Record<string, any> = {};
    for (const p of profilesRes.data) profileMap[String(p.id)] = p;

    return commentsRes.data.map((comment) => {
      const profile = profileMap[String(comment.user_id)] || {};
      return {
        id: String(comment.id),
        postId: String(comment.post_id),
        userId: String(comment.user_id),
        content: String(comment.content || ''),
        createdAt: comment.created_at || new Date().toISOString(),
        user: {
          id: String(comment.user_id),
          name: profile.username || profile.full_name || 'Diver',
          avatar: profile.avatar_url || undefined,
        },
      };
    });
  },

  addPostComment: async (postId: string, userId: string, content: string): Promise<FeedCommentItem> => {
    const pid = normalizeString(postId);
    const uid = normalizeString(userId);
    const message = normalizeString(content);
    if (!pid || !uid || !message) throw new Error('invalid_comment_payload');

    const [inserted] = await dataApi.insert<any>('comments', [
      {
        post_id: pid,
        user_id: uid,
        content: message,
        created_at: new Date().toISOString(),
      },
    ]);

    const profile = await apiClient.getProfileById(uid);
    return {
      id: String(inserted?.id || `comment_${Date.now()}`),
      postId: pid,
      userId: uid,
      content: message,
      createdAt: inserted?.created_at || new Date().toISOString(),
      user: {
        id: uid,
        name: profile?.username || profile?.full_name || 'Diver',
        avatar: profile?.avatar_url || undefined,
      },
    };
  },

  updatePost: async (postId: string, patch: { caption?: string; location?: string }) => {
    const pid = normalizeString(postId);
    if (!pid) throw new Error('invalid_post_id');
    await dataApi.update<any>('posts', [{ column: 'id', op: 'eq', value: pid }], patch);
    return true;
  },

  deletePost: async (postId: string) => {
    const pid = normalizeString(postId);
    if (!pid) throw new Error('invalid_post_id');
    await Promise.all([
      dataApi.remove('likes', [{ column: 'post_id', op: 'eq', value: pid }]),
      dataApi.remove('comments', [{ column: 'post_id', op: 'eq', value: pid }]),
      dataApi.remove('saved_posts', [{ column: 'post_id', op: 'eq', value: pid }]),
      dataApi.remove('posts', [{ column: 'id', op: 'eq', value: pid }]),
    ]);
    return true;
  },

  submitPostReport: async (payload: { postId?: string; reason: string; userId?: string }) => {
    const postId = normalizeString(payload.postId || '');
    const reason = normalizeString(payload.reason);
    const userId = normalizeString(payload.userId || '');
    if (!reason) throw new Error('invalid_report_payload');
    const [created] = await dataApi.insert<any>('reports', [
      {
        post_id: postId || null,
        user_id: userId || null,
        reason,
        status: 'open',
      },
    ]);
    return created;
  },

  getSavedFeed: async (userId: string) => {
    const uid = normalizeString(userId);
    if (!uid) return [];

    const savedRes = await dataApi.list<any>('saved_posts', {
      filters: [{ column: 'user_id', op: 'eq', value: uid }],
      order: { column: 'created_at', ascending: false },
      limit: 500,
    });

    const postIds = savedRes.data.map((row) => String(row.post_id)).filter(Boolean);
    if (!postIds.length) return [];

    const [postsRes, profilesRes, likesRes, commentsRes, mediaRes] = await Promise.all([
      dataApi.list<any>('posts', {
        filters: [{ column: 'id', op: 'in', value: postIds }],
        limit: 1000,
      }),
      dataApi.list<any>('profiles', { limit: 2000 }),
      dataApi.list<any>('likes', { limit: 10000 }),
      dataApi.list<any>('comments', { limit: 10000 }),
      dataApi.list<any>('post_media', { limit: 20000 }),
    ]);

    const profileMap: Record<string, any> = {};
    for (const p of profilesRes.data) profileMap[String(p.id)] = p;

    const likesCount: Record<string, number> = {};
    for (const like of likesRes.data) {
      const pid = String(like.post_id || '');
      if (!pid) continue;
      likesCount[pid] = (likesCount[pid] || 0) + 1;
    }

    const commentsCount: Record<string, number> = {};
    for (const comment of commentsRes.data) {
      const pid = String(comment.post_id || '');
      if (!pid) continue;
      commentsCount[pid] = (commentsCount[pid] || 0) + 1;
    }

    const postMap = new Map<string, any>();
    const mediaMap: Record<string, any[]> = {};
    for (const media of mediaRes.data) {
      const postId = String(media.post_id || '');
      if (!postId) continue;
      if (!mediaMap[postId]) mediaMap[postId] = [];
      mediaMap[postId].push(media);
    }

    for (const post of postsRes.data) {
      postMap.set(
        String(post.id),
        normalizeFeedItem({ ...post, post_media: mediaMap[String(post.id)] || [] }, profileMap, likesCount, commentsCount)
      );
    }

    return postIds
      .map((postId) => postMap.get(postId))
      .filter(Boolean);
  },

  ensureMediaSamplePosts: async (userId: string) => {
    const uid = normalizeString(userId);
    if (!uid) return { created: 0 };

    const marker = '[DG_SAMPLE_MEDIA_PACK]';
    const existing = await dataApi.list<any>('posts', {
      filters: [
        { column: 'user_id', op: 'eq', value: uid },
        { column: 'caption', op: 'ilike', value: `%${marker}%` },
      ],
      limit: 1,
    });
    if (existing.data.length) return { created: 0 };

    const now = Date.now();
    const samples = [
      {
        caption: `${marker} Jeju drift dive carousel`,
        location: 'Jeju Munseom',
        dive_site: 'Munseom Point A',
        image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400',
        created_at: new Date(now - 1000 * 60 * 8).toISOString(),
      },
      {
        caption: `${marker} Bali reef photo+video`,
        location: 'Bali Amed',
        dive_site: 'Amed Reef',
        image_url: 'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=1400',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        created_at: new Date(now - 1000 * 60 * 16).toISOString(),
      },
      {
        caption: `${marker} Cebu macro clip`,
        location: 'Cebu Moalboal',
        dive_site: 'Pescador Wall',
        image_url: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=1400',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        created_at: new Date(now - 1000 * 60 * 24).toISOString(),
      },
    ];

    const createdPosts = await dataApi.insert<any>(
      'posts',
      samples.map((row) => ({
        user_id: uid,
        ...row,
        dive_type: 'scuba',
        publish_to_feed: true,
      }))
    );

    const [p1, p2, p3] = createdPosts;
    const mediaRows: any[] = [];
    if (p1?.id) {
      mediaRows.push(
        { post_id: p1.id, media_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400', media_type: 'image', order_index: 0 },
        { post_id: p1.id, media_url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1400', media_type: 'image', order_index: 1 },
        { post_id: p1.id, media_url: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1400', media_type: 'image', order_index: 2 }
      );
    }
    if (p2?.id) {
      mediaRows.push(
        { post_id: p2.id, media_url: 'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=1400', media_type: 'image', order_index: 0 },
        { post_id: p2.id, media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', media_type: 'video', order_index: 1 }
      );
    }
    if (p3?.id) {
      mediaRows.push(
        { post_id: p3.id, media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', media_type: 'video', order_index: 0 }
      );
    }

    if (mediaRows.length) {
      await dataApi.insert('post_media', mediaRows);
    }

    return { created: createdPosts.length };
  },

  updatePushToken: (platform: string, token: string) =>
    axiosInstance.post('/push/tokens', { platform, push_token: token }),

  getFeed: async (cursor: string | null = null) => {
    const pageSize = 10;
    const offset = Number(cursor || '0') || 0;

    const [postsRes, profilesRes, likesRes, commentsRes, mediaRes] = await Promise.all([
      dataApi.list<any>('posts', {
        order: { column: 'created_at', ascending: false },
        range: [offset, offset + pageSize - 1],
      }),
      dataApi.list<any>('profiles', { limit: 1000 }),
      dataApi.list<any>('likes', { limit: 5000 }),
      dataApi.list<any>('comments', { limit: 5000 }),
      dataApi.list<any>('post_media', { limit: 15000 }),
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

    const mediaMap: Record<string, any[]> = {};
    for (const media of mediaRes.data) {
      const postId = String(media.post_id || '');
      if (!postId) continue;
      if (!mediaMap[postId]) mediaMap[postId] = [];
      mediaMap[postId].push(media);
    }

    const data = postsRes.data.map((post) =>
      normalizeFeedItem(
        { ...post, post_media: mediaMap[String(post.id)] || [] },
        profileMap,
        likesCount,
        commentsCount
      )
    );
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
    const rawMediaAssets = Array.isArray(data.mediaAssets) ? data.mediaAssets : [];
    const mediaAssets = rawMediaAssets
      .map((item: any, index: number) => {
        const uri = normalizeImageUrl(item?.uri || item?.url);
        if (!uri) return null;
        return {
          uri,
          type: item?.type === 'video' ? 'video' : 'image',
          order: index,
        };
      })
      .filter(Boolean) as { uri: string; type: 'image' | 'video'; order: number }[];

    const firstImage = mediaAssets.find((item) => item.type === 'image')?.uri;
    const firstVideo = mediaAssets.find((item) => item.type === 'video')?.uri;
    const imageUrl = firstImage || normalizeImageUrl(data.imageUri);
    const videoUrl = firstVideo || normalizeImageUrl(data.videoUri);
    const row = {
      id,
      user_id: String(user?.id || 'native-user'),
      image_url: imageUrl || null,
      video_url: videoUrl || null,
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
    if (mediaAssets.length) {
      await dataApi.insert(
        'post_media',
        mediaAssets.map((item, index) => ({
          id: `${id}_media_${index + 1}`,
          post_id: id,
          media_url: item.uri,
          media_type: item.type,
          order_index: item.order,
          created_at: row.created_at,
        }))
      );
    }
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
