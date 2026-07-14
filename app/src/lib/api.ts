import { create } from 'axios';
import i18n from './i18n';
import { storage } from './storage';
import { getSecureAuthValue } from './secureAuthStorage';

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
    const token = getSecureAuthValue('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

type CandidateRequest = {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
};

type DirectUploadResult = {
  url: string;
  file: string;
};

const unsupportedRouteCache = new Set<string>();
const isKnownProdApi = /api\.divergram\.com/i.test(API_ROOT);

function routeCacheKey(candidate: CandidateRequest) {
  return `${candidate.method.toUpperCase()} ${candidate.path}`;
}

function createUnsupportedFeatureError(code: string, message?: string) {
  const error: any = new Error(message || code);
  error.code = code;
  error.response = {
    status: 501,
    data: { error: code },
  };
  return error;
}

function isOAuthAccountNotFound(candidate: CandidateRequest, error: any) {
  const status = Number(error?.response?.status || 0);
  if (status !== 404 || !candidate.path.includes('/auth/oauth')) return false;
  const body = error?.response?.data || {};
  const text = String(body?.error || body?.message || error?.message || '').toLowerCase();
  if (text.includes('sso_signup_required') || text.includes('oauth_signup_required')) return true;
  return /user|member|account|registered|가입|회원/.test(text);
}

async function tryCandidateRequests<T>(candidates: CandidateRequest[]): Promise<T> {
  const pending = candidates.filter((candidate) => !unsupportedRouteCache.has(routeCacheKey(candidate)));
  if (!pending.length) {
    throw createUnsupportedFeatureError('candidate_routes_exhausted');
  }

  let lastError: any;
  for (const candidate of pending) {
    try {
      const response = await axiosInstance.request({
        method: candidate.method,
        url: candidate.path,
        data: candidate.data,
        params: candidate.params,
        headers: candidate.headers,
      });
      return response.data as T;
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      if (isOAuthAccountNotFound(candidate, error)) {
        throw error;
      }
      if (status === 404 || status === 405 || status === 501) {
        unsupportedRouteCache.add(routeCacheKey(candidate));
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError || createUnsupportedFeatureError('candidate_request_failed');
}

export type ExternalProviderKey = 'garmin' | 'suunto' | 'shearwater';

export type ExternalProviderAuthResult = {
  provider: ExternalProviderKey;
  connected: boolean;
  accountLabel?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  providerUserId?: string;
  raw?: any;
};

export type CloudinarySignedUploadConfig = {
  cloudName: string;
  apiKey?: string;
  timestamp: number;
  signature: string;
  uploadPreset?: string;
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  publicId?: string;
};

export type CloudinaryDeleteResult = {
  publicId: string;
  result: string;
  resourceType: 'image' | 'video' | 'raw';
};

export type AccountDeletionRequestResult = {
  requested: boolean;
  deletedImmediately: boolean;
  status?: 'requested' | 'scheduled' | 'deleted' | 'failed';
  gracePeriodDays?: number;
  effectiveAt?: string;
  message?: string;
};

function normalizeIsoDate(value: unknown): string | undefined {
  const raw = normalizeString(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function normalizeExternalProviderAuthResult(provider: ExternalProviderKey, payload: any): ExternalProviderAuthResult {
  const data = payload?.data || payload;
  const connected = Boolean(data?.connected ?? data?.success ?? data?.linked ?? data?.ok ?? true);
  const expiresAt =
    normalizeIsoDate(data?.expiresAt) ||
    normalizeIsoDate(data?.accessTokenExpiresAt) ||
    normalizeIsoDate(data?.tokenExpiresAt) ||
    normalizeIsoDate(data?.expires_at);
  return {
    provider,
    connected,
    accountLabel: normalizeString(
      data?.accountLabel || data?.account_name || data?.profileName || data?.displayName || data?.username || data?.email
    ) || undefined,
    accessToken: normalizeString(data?.accessToken || data?.access_token || data?.token || '') || undefined,
    refreshToken: normalizeString(data?.refreshToken || data?.refresh_token || '') || undefined,
    expiresAt,
    providerUserId: normalizeString(data?.providerUserId || data?.provider_user_id || data?.userId || '') || undefined,
    raw: data,
  };
}

function normalizeAccountDeletionResult(payload: any): AccountDeletionRequestResult {
  const data = payload?.data || payload || {};
  const requested = Boolean(data?.requested ?? data?.ok ?? data?.success ?? true);
  const deletedImmediately = Boolean(data?.deletedImmediately ?? data?.immediateDelete ?? data?.deleted ?? false);
  const effectiveAt =
    normalizeIsoDate(data?.effectiveAt) ||
    normalizeIsoDate(data?.scheduledAt) ||
    normalizeIsoDate(data?.deleteAt) ||
    normalizeIsoDate(data?.deletedAt);
  const gracePeriodDays = normalizeNumber(data?.gracePeriodDays ?? data?.grace_period_days ?? data?.grace);
  const statusRaw = normalizeString(data?.status || (deletedImmediately ? 'deleted' : requested ? 'scheduled' : 'failed'));
  const status: AccountDeletionRequestResult['status'] =
    statusRaw === 'requested' || statusRaw === 'scheduled' || statusRaw === 'deleted' || statusRaw === 'failed'
      ? statusRaw
      : deletedImmediately
        ? 'deleted'
        : requested
          ? 'scheduled'
          : 'failed';

  return {
    requested,
    deletedImmediately,
    status,
    gracePeriodDays: gracePeriodDays === undefined ? undefined : Math.max(0, Math.round(gracePeriodDays)),
    effectiveAt,
    message: normalizeString(data?.message || data?.detail || ''),
  };
}

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

function extractHashtags(text: unknown): string[] {
  const raw = normalizeString(text);
  if (!raw) return [];
  const matches = raw.match(/#[\p{L}\p{N}_-]+/gu) || [];
  const tags = matches
    .map((item) => item.replace(/^#/, '').trim())
    .filter(Boolean);
  return [...new Set(tags)];
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

export interface NotificationFeedItem {
  id: string;
  type: string;
  unread: boolean;
  text: string;
  when: string;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    avatar?: string;
  };
  postId?: string;
  commentId?: string;
}

export interface ActiveAdSlot {
  id: string;
  title: string;
  placement: string;
  status: string;
  note: string;
  actionLabel: string;
  targetUrl?: string;
  sortOrder: number;
  isActive: boolean;
  startAt?: string;
  endAt?: string;
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
  const caption = normalizeString(post.caption || post.content || '');
  return {
    id: String(post.id),
    user: {
      id: String(post.user_id),
      name: profile.username || profile.full_name || 'Diver',
      avatar: profile.avatar_url || undefined,
    },
    content: caption,
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
    diveDuration: normalizeNumber(post.dive_duration),
    waterTemperature: normalizeNumber(post.water_temperature),
    visibility: normalizeNumber(post.visibility),
    locationLat: normalizeNumber(post.location_lat),
    locationLng: normalizeNumber(post.location_lng),
    publishToFeed: post.publish_to_feed !== false,
    publishToReels: post.publish_to_reels === true,
    tags: extractHashtags(caption),
  };
}

function normalizeAdSlot(row: any): ActiveAdSlot {
  return {
    id: normalizeString(row?.id || ''),
    title: normalizeString(row?.title || '') || '광고 슬롯',
    placement: normalizeString(row?.placement || ''),
    status: normalizeString(row?.status || 'draft'),
    note: normalizeString(row?.note || ''),
    actionLabel: normalizeString(row?.action_label || row?.actionLabel || '자세히 보기') || '자세히 보기',
    targetUrl: normalizeString(row?.target_url || row?.targetUrl || '') || undefined,
    sortOrder: normalizeNumber(row?.sort_order ?? row?.sortOrder) || 0,
    isActive: Boolean(row?.is_active ?? row?.isActive ?? true),
    startAt: normalizeIsoDate(row?.start_at || row?.startAt),
    endAt: normalizeIsoDate(row?.end_at || row?.endAt),
  };
}

export const apiClient = {
  generateAiText: async (task: string, prompt: string): Promise<string> => {
    const response = await axiosInstance.post('/ai/generate', { task, prompt });
    return normalizeString(response.data?.text || '');
  },
  getUserPreferences: async () => {
    const response = await axiosInstance.get('/preferences/me');
    return {
      data: response.data?.data || {},
      exists: response.data?.exists === true,
      updatedAt: response.data?.updatedAt || null,
    };
  },

  updateUserPreferences: async (preferences: Record<string, unknown>) => {
    const response = await axiosInstance.put('/preferences/me', preferences);
    return response.data?.data || response.data || {};
  },

  getDivingLicenses: async () => {
    const response = await axiosInstance.get('/diving-licenses/me');
    return {
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      exists: response.data?.exists === true,
    };
  },

  saveDivingLicenses: async (items: Record<string, unknown>[]) => {
    const response = await axiosInstance.put('/diving-licenses/me', { items });
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  getDiveLogDraft: async (logId: string) => {
    const response = await axiosInstance.get(`/dive-log-drafts/${encodeURIComponent(logId)}`);
    return { data: response.data?.data || null, exists: response.data?.exists === true };
  },

  saveDiveLogDraft: async (logId: string, data: Record<string, unknown>) => {
    const response = await axiosInstance.put(`/dive-log-drafts/${encodeURIComponent(logId)}`, { data });
    return response.data?.data || null;
  },

  deleteDiveLogDraft: async (logId: string) => {
    await axiosInstance.delete(`/dive-log-drafts/${encodeURIComponent(logId)}`);
  },

  uploadProfileAvatar: async (imageData: string): Promise<{ avatar_url: string }> => {
    const normalized = normalizeString(imageData);
    if (!normalized.startsWith('data:image/')) throw new Error('invalid_avatar_image');
    const response = await axiosInstance.post('/profile/avatar', { imageData: normalized });
    const row = response.data?.data || response.data || {};
    const avatarUrl = normalizeString(row.avatar_url);
    if (!avatarUrl) throw new Error('avatar_upload_url_missing');
    return { avatar_url: avatarUrl };
  },

  startInstagramOAuth: async () => {
    const data = await tryCandidateRequests<{ url: string; returnUrl: string }>([
      { method: 'get', path: '/auth/oauth/instagram/mobile/start' },
    ]);
    return data;
  },

  completeInstagramOAuth: async (ticket: string) => {
    const data = await tryCandidateRequests<{
      accessToken: string;
      userInfo: { id: string; username: string; email?: string };
    }>([
      { method: 'post', path: '/auth/oauth/instagram/mobile/complete', data: { ticket } },
    ]);
    return data;
  },

  authWithOAuth: async (provider: string, accessToken: string, userInfo?: any, sessionDays = 30) => {
    const body = { provider, accessToken, userInfo, sessionDays };
    const data = await tryCandidateRequests<any>([
      { method: 'post', path: '/auth/oauth', data: body },
      { method: 'post', path: '/auth/oauth/mobile', data: body },
    ]);
    return { data };
  },

  authWithOAuthMobile: async (
    provider: string,
    accessToken: string,
    sessionDays = 7,
    userInfo?: any,
    idToken?: string
  ) => {
    const data = await tryCandidateRequests<any>([
      { method: 'post', path: '/auth/oauth/mobile', data: { provider, accessToken, sessionDays, userInfo, idToken } },
      { method: 'post', path: '/auth/oauth', data: { provider, accessToken, sessionDays, userInfo, idToken } },
    ]);
    return { data };
  },

  authWithOAuthSignup: async (provider: string, accessToken: string, userInfo?: any, sessionDays = 30) => {
    const body = {
      provider,
      accessToken,
      userInfo,
      sessionDays,
      autoCreate: true,
      createUser: true,
      signup: true,
      providerUserId: userInfo?.providerUserId || userInfo?.provider_user_id || userInfo?.id || userInfo?.sub,
      email: userInfo?.email,
      name: userInfo?.name || userInfo?.nickname || userInfo?.fullName,
      avatar: userInfo?.avatar || userInfo?.picture || userInfo?.profile_image,
    };
    const data = await tryCandidateRequests<any>([
      { method: 'post', path: '/auth/oauth/mobile/signup', data: body },
      { method: 'post', path: '/auth/oauth/signup', data: body },
      { method: 'post', path: '/auth/oauth/mobile', data: body },
      { method: 'post', path: '/auth/oauth', data: body },
    ]);
    return { data };
  },

  linkOAuthMobile: (linkToken: string) =>
    axiosInstance.post('/auth/oauth/mobile/link', { linkToken }),

  linkOAuthProvider: (
    provider: 'google' | 'apple' | 'instagram',
    accessToken: string,
    userInfo?: Record<string, unknown>,
    idToken?: string
  ) => axiosInstance.post('/auth/oauth/mobile/link/provider', {
    provider,
    accessToken,
    userInfo,
    idToken,
    sessionDays: 30,
  }),

  linkOAuthMobileConfirm: (linkToken: string, action: 'approve' | 'cancel' = 'approve') =>
    axiosInstance.post('/auth/oauth/mobile/link/confirm', { linkToken, action }),

  getOAuthLinks: async (): Promise<{ links: { provider: string; linkedAt?: string }[] }> => {
    const data = await tryCandidateRequests<any>([
      { method: 'get', path: '/auth/oauth/links' },
    ]);
    const links = Array.isArray(data?.links) ? data.links : [];
    return {
      links: links.map((item: any) => ({
        provider: String(item?.provider || '').toLowerCase(),
        linkedAt: item?.linkedAt || item?.linked_at || item?.created_at,
      })),
    };
  },

  unlinkOAuthLink: async (provider: string) => {
    const normalizedProvider = String(provider || '').trim().toLowerCase();
    const data = await tryCandidateRequests<any>([
      { method: 'delete', path: `/auth/oauth/links/${encodeURIComponent(normalizedProvider)}` },
    ]);
    return { data };
  },

  authWithEmail: (email: string, password: string, sessionDays = 30) => axiosInstance.post('/auth/login', { email, password, sessionDays }),

  authWithEmailSignup: (
    email: string,
    password: string,
    username: string,
    accountType: 'personal' | 'resort' = 'personal',
    sessionDays = 30
  ) =>
    axiosInstance.post('/auth/signup', { email, password, username, account_type: accountType, sessionDays }),

  connectExternalProvider: async (
    provider: ExternalProviderKey,
    payload?: { authCode?: string; redirectUri?: string; state?: string; accessToken?: string; refreshToken?: string }
  ): Promise<ExternalProviderAuthResult> => {
    const body = {
      provider,
      authCode: normalizeString(payload?.authCode || ''),
      redirectUri: normalizeString(payload?.redirectUri || ''),
      state: normalizeString(payload?.state || ''),
      accessToken: normalizeString(payload?.accessToken || ''),
      refreshToken: normalizeString(payload?.refreshToken || ''),
    };
    const data = await tryCandidateRequests<any>([
      { method: 'post', path: `/integrations/${provider}/connect`, data: body },
      { method: 'post', path: `/dive-logs/integrations/${provider}/connect`, data: body },
    ]);
    return normalizeExternalProviderAuthResult(provider, data);
  },

  refreshExternalProviderToken: async (
    provider: ExternalProviderKey,
    payload?: { refreshToken?: string; accessToken?: string; providerUserId?: string }
  ): Promise<ExternalProviderAuthResult> => {
    const body = {
      provider,
      refreshToken: normalizeString(payload?.refreshToken || ''),
      accessToken: normalizeString(payload?.accessToken || ''),
      providerUserId: normalizeString(payload?.providerUserId || ''),
    };
    const data = await tryCandidateRequests<any>([
      { method: 'post', path: `/integrations/${provider}/refresh`, data: body },
      { method: 'post', path: `/dive-logs/integrations/${provider}/refresh`, data: body },
    ]);
    return normalizeExternalProviderAuthResult(provider, data);
  },

  disconnectExternalProvider: async (
    provider: ExternalProviderKey,
    payload?: { providerUserId?: string; accessToken?: string; refreshToken?: string }
  ) => {
    const body = {
      provider,
      providerUserId: normalizeString(payload?.providerUserId || ''),
      accessToken: normalizeString(payload?.accessToken || ''),
      refreshToken: normalizeString(payload?.refreshToken || ''),
    };
    await tryCandidateRequests<any>([
      { method: 'post', path: `/integrations/${provider}/disconnect`, data: body },
      { method: 'post', path: `/dive-logs/integrations/${provider}/disconnect`, data: body },
    ]);
    return true;
  },

  getExternalProviderDiveLogs: async (
    provider: ExternalProviderKey,
    params?: { cursor?: string; from?: string; to?: string; limit?: number; accessToken?: string }
  ) => {
    const query = {
      cursor: normalizeString(params?.cursor || ''),
      from: normalizeString(params?.from || ''),
      to: normalizeString(params?.to || ''),
      limit: Number(params?.limit || 50),
    };
    const headers = params?.accessToken
      ? {
          Authorization: `Bearer ${params.accessToken}`,
        }
      : undefined;

    const data = await tryCandidateRequests<any>([
      { method: 'get', path: `/integrations/${provider}/logs`, params: query, headers },
      { method: 'get', path: `/dive-logs/integrations/${provider}`, params: query, headers },
    ]);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.logs)) return data.logs;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },

  requestCloudinarySignedUpload: async (payload: {
    resourceType: 'image' | 'video' | 'raw' | 'auto';
    fileName?: string;
    folder?: string;
    mimeType?: string;
  }): Promise<CloudinarySignedUploadConfig> => {
    const body = {
      resourceType: payload.resourceType,
      fileName: normalizeString(payload.fileName || ''),
      folder: normalizeString(payload.folder || ''),
      mimeType: normalizeString(payload.mimeType || ''),
    };
    const data = await tryCandidateRequests<any>([
      { method: 'post', path: '/media/cloudinary/sign-upload', data: body },
      { method: 'post', path: '/upload/signature', data: body },
    ]);

    const row = data?.data || data || {};
    const timestamp = normalizeNumber(row?.timestamp) || Math.floor(Date.now() / 1000);
    const signature = normalizeString(row?.signature || '');
    if (!signature) throw new Error('cloudinary_signature_missing');
    return {
      cloudName: normalizeString(row?.cloudName || row?.cloud_name || process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME),
      apiKey: normalizeString(row?.apiKey || row?.api_key || ''),
      timestamp: Math.round(timestamp),
      signature,
      uploadPreset: normalizeString(row?.uploadPreset || row?.upload_preset || ''),
      folder: normalizeString(row?.folder || body.folder || ''),
      publicId: normalizeString(row?.publicId || row?.public_id || ''),
      resourceType:
        row?.resourceType === 'image' || row?.resourceType === 'video' || row?.resourceType === 'raw' || row?.resourceType === 'auto'
          ? row.resourceType
          : payload.resourceType,
    };
  },

  uploadBinaryMedia: async (payload: {
    uri: string;
    fileName?: string;
    mimeType?: string;
  }): Promise<DirectUploadResult> => {
    const uri = normalizeString(payload.uri || '');
    if (!uri) throw new Error('upload_uri_required');

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: normalizeString(payload.fileName || '') || `divergram-${Date.now()}`,
      type: normalizeString(payload.mimeType || '') || 'application/octet-stream',
    } as any);

    const response = await axiosInstance.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const row = response.data?.data || response.data || {};
    return {
      url: normalizeString(row?.url || ''),
      file: normalizeString(row?.file || ''),
    };
  },
  deleteCloudinaryMedia: async (payload: {
    url?: string;
    publicId?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    invalidate?: boolean;
  }): Promise<CloudinaryDeleteResult> => {
    const body = {
      url: normalizeString(payload.url || ''),
      publicId: normalizeString(payload.publicId || ''),
      resourceType:
        payload.resourceType === 'image' || payload.resourceType === 'video' || payload.resourceType === 'raw'
          ? payload.resourceType
          : 'image',
      invalidate: payload.invalidate !== false,
    };

    const data = await tryCandidateRequests<any>([
      { method: 'post', path: '/media/cloudinary/delete', data: body },
    ]);
    const row = data?.data || data || {};
    return {
      publicId: normalizeString(row.publicId || row.public_id || ''),
      result: normalizeString(row.result || 'ok') || 'ok',
      resourceType:
        row.resourceType === 'image' || row.resourceType === 'video' || row.resourceType === 'raw'
          ? row.resourceType
          : body.resourceType,
    };
  },

  getNotificationSetting: async () => {
    return tryCandidateRequests<any>([
      { method: 'get', path: '/notifications/settings' },
      { method: 'get', path: '/push/settings' },
    ]);
  },

  updateNotificationSetting: async (setting: any) => {
    return tryCandidateRequests<any>([
      { method: 'patch', path: '/notifications/settings', data: setting },
      { method: 'patch', path: '/push/settings', data: setting },
    ]);
  },

  getAiSetting: async () => {
    return tryCandidateRequests<any>([
      { method: 'get', path: '/ai/settings' },
    ]);
  },

  updateAiSetting: async (setting: any) => {
    return tryCandidateRequests<any>([
      { method: 'patch', path: '/ai/settings', data: setting },
    ]);
  },

  getNotifications: async (userId?: string): Promise<NotificationFeedItem[]> => {
    const uid = normalizeString(userId || '');
    const filters = uid ? [{ column: 'user_id', op: 'eq' as const, value: uid }] : undefined;
    const [notificationsRes, profilesRes] = await Promise.all([
      dataApi.list<any>('notifications', {
        filters,
        order: { column: 'created_at', ascending: false },
        limit: 100,
      }),
      dataApi.list<any>('profiles', { limit: 2000 }),
    ]);

    const profileMap: Record<string, any> = {};
    for (const profile of profilesRes.data) profileMap[String(profile.id)] = profile;

    return notificationsRes.data.map((row) => {
      const actor = profileMap[String(row.actor_id)] || {};
      const createdAt = String(row.created_at || new Date().toISOString());
      const diffMinutes = Math.max(0, Math.round((Date.now() - Date.parse(createdAt)) / 60000));
      const when =
        diffMinutes < 60
          ? `${diffMinutes}m`
          : diffMinutes < 60 * 24
            ? `${Math.max(1, Math.round(diffMinutes / 60))}h`
            : `${Math.max(1, Math.round(diffMinutes / (60 * 24)))}d`;

      return {
        id: String(row.id),
        type: String(row.type || 'system'),
        unread: !Boolean(row.read),
        text: normalizeString(row.message || row.text || row.summary || row.reason || '알림'),
        when,
        createdAt,
        actor: {
          id: String(row.actor_id || ''),
          name: actor.username || actor.full_name || 'Diver',
          avatar: actor.avatar_url || undefined,
        },
        postId: row.post_id ? String(row.post_id) : undefined,
        commentId: row.comment_id ? String(row.comment_id) : undefined,
      } satisfies NotificationFeedItem;
    });
  },

  getMessageRooms: async (userId: string) => {
    const uid = normalizeString(userId);
    if (!uid) return [];
    const ownParticipants = await dataApi.list<any>('participants', {
      filters: [{ column: 'user_id', op: 'eq', value: uid }],
      limit: 500,
    });
    const roomIds = ownParticipants.data.map((row) => String(row.room_id || '')).filter(Boolean);
    if (!roomIds.length) return [];

    const [rooms, participants, messages, profiles] = await Promise.all([
      dataApi.list<any>('rooms', { filters: [{ column: 'id', op: 'in', value: roomIds }], limit: 500 }),
      dataApi.list<any>('participants', { filters: [{ column: 'room_id', op: 'in', value: roomIds }], limit: 2000 }),
      dataApi.list<any>('messages', {
        filters: [{ column: 'room_id', op: 'in', value: roomIds }],
        order: { column: 'created_at', ascending: false },
        limit: 5000,
      }),
      dataApi.list<any>('profiles', { limit: 2000 }),
    ]);
    const profileMap = new Map(profiles.data.map((profile) => [String(profile.id), profile]));

    return rooms.data.map((room) => {
      const roomId = String(room.id);
      const other = participants.data.find((row) => String(row.room_id) === roomId && String(row.user_id) !== uid);
      const otherProfile: any = profileMap.get(String(other?.user_id || '')) || {};
      const roomMessages = messages.data.filter((row) => String(row.room_id) === roomId);
      const last = roomMessages[0];
      return {
        id: roomId,
        name: normalizeString(room.name || otherProfile.full_name || otherProfile.username || i18n.t('tabs.messages')),
        last: normalizeString(last?.content || last?.message || ''),
        updatedAt: normalizeString(last?.created_at || room.updated_at || room.created_at),
        unread: roomMessages.filter((row) => String(row.sender_id) !== uid && !row.read_at).length,
        members: participants.data.filter((row) => String(row.room_id) === roomId).length,
        active: false,
      };
    });
  },

  markNotificationRead: async (notificationId: string, read = true) => {
    const id = normalizeString(notificationId);
    if (!id) throw new Error('invalid_notification_id');
    await dataApi.update<any>('notifications', [{ column: 'id', op: 'eq', value: id }], { read, updated_at: new Date().toISOString() });
    return true;
  },

  sendPushTest: async (payload?: { title?: string; body?: string; data?: Record<string, any> }) => {
    const body = {
      title: normalizeString(payload?.title || 'Divergram Test'),
      body: normalizeString(payload?.body || 'Push test message'),
      data: payload?.data || {},
    };
    return tryCandidateRequests<any>([
      { method: 'post', path: '/push/test', data: body },
    ]);
  },

  requestAccountDeletion: async (payload?: { reason?: string; feedback?: string }) => {
    const body = {
      reason: normalizeString(payload?.reason || 'user_requested'),
      feedback: normalizeString(payload?.feedback || ''),
    };
    if (isKnownProdApi) {
      const me = await apiClient.getMe().catch(() => null);
      const userId = normalizeString(me?.id || '');
      if (!userId) throw createUnsupportedFeatureError('account_deletion_endpoint_unavailable');

      const now = new Date();
      const gracePeriodDays = 7;
      const effectiveAt = new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000).toISOString();
      const reason =
        body.feedback.length > 0
          ? `account_delete_request:${body.reason}:${body.feedback.slice(0, 180)}`
          : `account_delete_request:${body.reason}`;

      await dataApi.insert('reports', [
        {
          user_id: userId,
          reason,
          status: 'requested',
          created_at: now.toISOString(),
        },
      ]);

      return {
        requested: true,
        deletedImmediately: false,
        status: 'requested',
        gracePeriodDays,
        effectiveAt,
        message: 'account_delete_request_created',
      } satisfies AccountDeletionRequestResult;
    }

    const data = await tryCandidateRequests<any>([
      { method: 'post', path: '/auth/account/delete-request', data: body },
      { method: 'delete', path: '/auth/account' },
    ]);
    return normalizeAccountDeletionResult(data);
  },

  deleteAccount: async () => {
    try {
      const result = await apiClient.requestAccountDeletion({ reason: 'user_requested' });
      return Boolean(result.requested || result.deletedImmediately);
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      if (status === 404 || status === 405 || status === 501) return false;
      throw error;
    }
  },

  refreshToken: async (refreshToken: string) => {
    if (isKnownProdApi) throw createUnsupportedFeatureError('auth_refresh_endpoint_unavailable');
    const token = normalizeString(refreshToken);
    if (!token) throw new Error('refresh_token_missing');
    const data = await tryCandidateRequests<any>([
      { method: 'post', path: '/auth/refresh', data: { refreshToken: token } },
    ]);
    return data?.data || data;
  },

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

    try {
      const response = await axiosInstance.patch('/profile/me', cleanPatch);
      const savedProfile = response.data?.data || response.data;
      writeProfileExtrasToStorage(uid, cleanPatch);
      return savedProfile || apiClient.getProfileById(uid);
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
        const response = await axiosInstance.patch('/profile/me', fallbackPatch);
        const savedProfile = response.data?.data || response.data;
        writeProfileExtrasToStorage(uid, fallbackPatch);
        return savedProfile || apiClient.getProfileById(uid);
      } else {
        throw error;
      }
    }
  },

  uploadLicenseImageWithOcr: async (imageData: string) => {
    const dataUrl = normalizeString(imageData);
    if (!dataUrl) throw new Error('invalid_image_data');
    const response = await axiosInstance.post('/license-image/ocr', { imageData: dataUrl });
    return response.data || {};
  },

  listCertifications: async (userId?: string) => {
    const uid = normalizeString(userId || '');
    const filters = uid ? [{ column: 'user_id', op: 'eq' as const, value: uid }] : undefined;
    const result = await dataApi.list<any>('certifications', {
      filters,
      order: { column: 'created_at', ascending: false },
      limit: 200,
    });
    return result.data || [];
  },

  createCertification: async (payload: {
    id: string;
    user_id: string;
    agency: string;
    certification_number?: string;
    level?: string;
    issued_at?: string;
    expires_at?: string;
    image_url?: string;
    status: string;
    created_at: string;
    updated_at: string;
  }) => {
    const [created] = await dataApi.insert<any>('certifications', [payload]);
    return created || payload;
  },

  updateCertification: async (
    certificationId: string,
    patch: Partial<{
      agency: string;
      certification_number: string;
      level: string;
      issued_at: string;
      expires_at: string;
      image_url: string;
      status: string;
      updated_at: string;
    }>
  ) => {
    const certId = normalizeString(certificationId);
    if (!certId) throw new Error('invalid_certification_id');
    const updated = await dataApi.update<any>(
      'certifications',
      [{ column: 'id', op: 'eq', value: certId }],
      {
        ...patch,
        updated_at: normalizeString(patch.updated_at || new Date().toISOString()),
      }
    );
    if (Array.isArray(updated) && updated.length > 0) return updated[0];
    return null;
  },

  updateCertificationStatus: async (certificationId: string, status: string) => {
    const certId = normalizeString(certificationId);
    if (!certId) throw new Error('invalid_certification_id');
    const updated = await dataApi.update<any>(
      'certifications',
      [{ column: 'id', op: 'eq', value: certId }],
      { status: normalizeString(status), updated_at: new Date().toISOString() }
    );
    if (Array.isArray(updated) && updated.length > 0) return updated[0];
    return null;
  },

  deleteCertification: async (certificationId: string) => {
    const certId = normalizeString(certificationId);
    if (!certId) throw new Error('invalid_certification_id');
    const removed = await dataApi.remove('certifications', [{ column: 'id', op: 'eq', value: certId }]);
    return removed || null;
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

  updatePost: async (
    postId: string,
    patch: {
      caption?: string;
      title?: string;
      notes?: string;
      location?: string;
      pointName?: string;
      diveSite?: string;
      resortName?: string;
      diveType?: 'scuba' | 'freediving';
      gasType?: 'air' | 'nitrox' | 'heliox';
      gasPercent?: number | string;
      depth?: number | string;
      duration?: number | string;
      temperature?: number | string;
      visibility?: number | string;
      buddy?: string;
      buddyName?: string;
      latitude?: number | null;
      longitude?: number | null;
      publishToFeed?: boolean;
      publishToReels?: boolean;
      imageUri?: string | null;
      videoUri?: string | null;
      mediaAssets?: { uri?: string | null; url?: string | null; type?: 'image' | 'video'; order?: number }[];
    }
  ) => {
    const pid = normalizeString(postId);
    if (!pid) throw new Error('invalid_post_id');

    const existingRes = await dataApi.list<any>('posts', {
      filters: [{ column: 'id', op: 'eq', value: pid }],
      limit: 1,
    });
    const existing = existingRes.data[0] || {};
    const updatedAt = new Date().toISOString();
    const nextTitle = normalizeString(patch.title || '');
    const nextNotes = normalizeString(patch.notes || '');
    const nextCaption = normalizeString(patch.caption || [nextTitle, nextNotes].filter(Boolean).join('\n') || existing.caption || '');
    const nextDiveType = patch.diveType || existing.dive_type || undefined;
    const nextGasType = nextDiveType === 'scuba' ? (patch.gasType || existing.gas_type || 'air') : null;
    const hasGasPercent = patch.gasPercent !== undefined || existing.gas_percent !== undefined;
    const nextGasPercent = nextDiveType === 'scuba' && nextGasType !== 'air' && hasGasPercent ? normalizeNumber(patch.gasPercent ?? existing.gas_percent) : undefined;
    const nextLocation = normalizeString(patch.location ?? existing.location ?? '');
    const nextPointName = normalizeString(patch.pointName ?? patch.diveSite ?? existing.dive_site ?? '');
    const nextDiveSite = normalizeString(patch.diveSite ?? patch.pointName ?? existing.dive_site ?? '');
    const nextResortName = normalizeString(patch.resortName ?? existing.buddy ?? '');
    const nextBuddyName = normalizeString(patch.buddyName ?? existing.buddy_name ?? '');

    const postPatch: Record<string, any> = { updated_at: updatedAt };
    if (patch.caption !== undefined || nextCaption) postPatch.caption = nextCaption;
    if (patch.location !== undefined || nextLocation) postPatch.location = nextLocation || null;
    if (patch.pointName !== undefined || patch.diveSite !== undefined || nextPointName) postPatch.dive_site = nextDiveSite || null;
    if (patch.diveType !== undefined || nextDiveType) postPatch.dive_type = nextDiveType || null;
    if (patch.gasType !== undefined || nextGasType !== undefined) postPatch.gas_type = nextGasType;
    if (patch.gasPercent !== undefined || nextGasPercent !== undefined) postPatch.gas_percent = nextGasPercent ?? null;
    if (patch.depth !== undefined) postPatch.max_depth = patch.depth === null ? null : normalizeNumber(patch.depth);
    if (patch.duration !== undefined) postPatch.dive_duration = patch.duration === null ? null : normalizeNumber(patch.duration);
    if (patch.temperature !== undefined) postPatch.water_temperature = patch.temperature === null ? null : normalizeNumber(patch.temperature);
    if (patch.visibility !== undefined) postPatch.visibility = patch.visibility === null ? null : normalizeNumber(patch.visibility);
    if (patch.buddy !== undefined || nextResortName) postPatch.buddy = nextResortName || null;
    if (patch.buddyName !== undefined || nextBuddyName) postPatch.buddy_name = nextBuddyName || null;
    if (patch.latitude !== undefined) postPatch.location_lat = patch.latitude === null ? null : normalizeNumber(patch.latitude);
    if (patch.longitude !== undefined) postPatch.location_lng = patch.longitude === null ? null : normalizeNumber(patch.longitude);
    if (patch.publishToFeed !== undefined) postPatch.publish_to_feed = Boolean(patch.publishToFeed);
    if (patch.publishToReels !== undefined) postPatch.publish_to_reels = Boolean(patch.publishToReels);

    const mediaAssets = Array.isArray(patch.mediaAssets) ? patch.mediaAssets : undefined;
    if (mediaAssets) {
      const normalizedMedia = mediaAssets
        .map((item, index) => ({
          uri: normalizeImageUrl(item?.uri || item?.url),
          type: item?.type === 'video' ? ('video' as const) : ('image' as const),
          order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
        }))
        .filter((item) => Boolean(item.uri));

      const firstImage = normalizedMedia.find((item) => item.type === 'image')?.uri || '';
      const firstVideo = normalizedMedia.find((item) => item.type === 'video')?.uri || '';
      postPatch.image_url = firstImage || null;
      postPatch.video_url = firstVideo || null;

      await Promise.allSettled([
        dataApi.remove('post_media', [{ column: 'post_id', op: 'eq', value: pid }]),
        normalizedMedia.length
          ? dataApi.insert(
              'post_media',
              normalizedMedia.map((item, index) => ({
                id: `${pid}_media_${index + 1}`,
                post_id: pid,
                media_url: item.uri,
                media_type: item.type,
                order_index: item.order,
                created_at: updatedAt,
              }))
            )
          : Promise.resolve([]),
      ]);
    } else {
      if (patch.imageUri !== undefined) postPatch.image_url = normalizeImageUrl(patch.imageUri) || null;
      if (patch.videoUri !== undefined) postPatch.video_url = normalizeImageUrl(patch.videoUri) || null;
    }

    await dataApi.update<any>('posts', [{ column: 'id', op: 'eq', value: pid }], postPatch);
    return true;
  },

  deletePost: async (postId: string) => {
    const pid = normalizeString(postId);
    if (!pid) throw new Error('invalid_post_id');
    await Promise.allSettled([
      dataApi.remove('likes', [{ column: 'post_id', op: 'eq', value: pid }]),
      dataApi.remove('comments', [{ column: 'post_id', op: 'eq', value: pid }]),
      dataApi.remove('saved_posts', [{ column: 'post_id', op: 'eq', value: pid }]),
      dataApi.remove('post_media', [{ column: 'post_id', op: 'eq', value: pid }]),
    ]);

    await dataApi.remove('posts', [{ column: 'id', op: 'eq', value: pid }]);
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

  submitModerationReport: async (payload: {
    targetType: 'user' | 'post' | 'comment' | 'dive_log' | 'media';
    targetId: string;
    reason: string;
    detail?: string;
    userId?: string;
  }) => {
    const targetType = normalizeString(payload.targetType || '');
    const targetId = normalizeString(payload.targetId || '');
    const reason = normalizeString(payload.reason || '');
    const detail = normalizeString(payload.detail || '');
    const userId = normalizeString(payload.userId || '');
    if (!targetType || !targetId || !reason) throw new Error('invalid_report_payload');
    const allowedTargetTypes = new Set(['user', 'post', 'comment', 'dive_log', 'media']);
    if (!allowedTargetTypes.has(targetType)) throw new Error('invalid_report_target_type');
    const allowedReasons = new Set([
      'sexual_content',
      'violence',
      'hate',
      'misinformation',
      'dangerous_behavior',
      'copyright',
      'impersonation',
      'spam',
    ]);
    if (!allowedReasons.has(reason)) throw new Error('invalid_report_reason');
    const packedReason = [
      `target_type=${targetType}`,
      `target_id=${targetId}`,
      `reason=${reason}`,
      detail ? `detail=${detail.slice(0, 400)}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
    const [created] = await dataApi.insert<any>('reports', [
      {
        post_id: targetType === 'post' ? targetId : null,
        user_id: userId || null,
        reason: packedReason,
        status: 'open',
        created_at: new Date().toISOString(),
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
    if (process.env.EXPO_PUBLIC_ENABLE_SAMPLE_DATA !== 'true') {
      return { created: 0 };
    }

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

  updatePushToken: async (platform: string, token: string, extras?: { deviceId?: string }) => {
    const payload = {
      platform: normalizeString(platform || ''),
      push_token: normalizeString(token || ''),
      token: normalizeString(token || ''),
      device_id: normalizeString(extras?.deviceId || ''),
    };
    return tryCandidateRequests<any>([
      { method: 'post', path: '/push/tokens', data: payload },
      { method: 'post', path: '/notifications/token', data: payload },
    ]);
  },

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

    const data = postsRes.data
      .filter((post) => post.publish_to_feed !== false)
      .map((post) =>
        normalizeFeedItem(
          { ...post, post_media: mediaMap[String(post.id)] || [] },
          profileMap,
          likesCount,
          commentsCount
        )
      );
    const nextCursor = postsRes.data.length === pageSize ? String(offset + pageSize) : null;

    return {
      data,
      nextCursor,
      hasMore: nextCursor !== null,
    };
  },

  getActiveAdSlots: async (placement?: string): Promise<ActiveAdSlot[]> => {
    try {
      const response = await axiosInstance.get('/ads', {
        params: {
          placement: normalizeString(placement || ''),
          limit: 20,
        },
      });
      const ads = Array.isArray(response.data?.ads) ? response.data.ads : [];
      return ads.map(normalizeAdSlot);
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      if (status === 404 || status === 405 || status === 501) return [];
      throw error;
    }
  },

  getPostById: async (postId: string) => {
    const pid = normalizeString(postId);
    if (!pid) return null;

    const [postsRes, profilesRes, likesRes, commentsRes, mediaRes] = await Promise.all([
      dataApi.list<any>('posts', {
        filters: [{ column: 'id', op: 'eq', value: pid }],
        limit: 1,
      }),
      dataApi.list<any>('profiles', { limit: 1000 }),
      dataApi.list<any>('likes', {
        filters: [{ column: 'post_id', op: 'eq', value: pid }],
        limit: 5000,
      }),
      dataApi.list<any>('comments', {
        filters: [{ column: 'post_id', op: 'eq', value: pid }],
        limit: 5000,
      }),
      dataApi.list<any>('post_media', {
        filters: [{ column: 'post_id', op: 'eq', value: pid }],
        limit: 100,
      }),
    ]);

    const post = postsRes.data[0];
    if (!post) return null;
    const profileMap: Record<string, any> = {};
    for (const p of profilesRes.data) profileMap[String(p.id)] = p;
    return normalizeFeedItem(
      { ...post, post_media: mediaRes.data },
      profileMap,
      { [pid]: likesRes.data.length },
      { [pid]: commentsRes.data.length }
    );
  },

  getReels: async () => {
    const [postsRes, profilesRes, likesRes, commentsRes, mediaRes] = await Promise.all([
      dataApi.list<any>('posts', {
        filters: [{ column: 'publish_to_reels', op: 'eq', value: true }],
        order: { column: 'created_at', ascending: false },
        limit: 50,
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

    return postsRes.data.map((post) =>
      normalizeFeedItem(
        { ...post, post_media: mediaMap[String(post.id)] || [] },
        profileMap,
        likesCount,
        commentsCount
      )
    );
  },

  getExplore: async () => {
    const [postsRes, profilesRes, likesRes, commentsRes, mediaRes] = await Promise.all([
      dataApi.list<any>('posts', {
        order: { column: 'created_at', ascending: false },
        limit: 120,
      }),
      dataApi.list<any>('profiles', { limit: 1000 }),
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

    const mediaMap: Record<string, any[]> = {};
    for (const media of mediaRes.data) {
      const postId = String(media.post_id || '');
      if (!postId) continue;
      if (!mediaMap[postId]) mediaMap[postId] = [];
      mediaMap[postId].push(media);
    }

    return postsRes.data
      .filter((post) => post.publish_to_feed !== false)
      .map((post) => {
        const normalized = normalizeFeedItem({ ...post, post_media: mediaMap[String(post.id)] || [] }, profileMap, likesCount, commentsCount);
        const mediaItems = Array.isArray(normalized.media) ? normalized.media : [];
        const firstMedia = mediaItems[0] || null;
        const firstImageMedia = mediaItems.find((item) => item?.type === 'image') || null;
        const location = String(normalized.location || normalized.diveSite || '').trim();
        const tags = Array.isArray(normalized.tags) ? normalized.tags : [];
        const metaParts = [
          i18n.t('api.explore.postsMeta', { count: Number(normalized.likes || 0) + Number(normalized.comments || 0) + 1 }),
          location ? location : '',
          tags.length ? `#${tags.slice(0, 3).join(' #')}` : '',
        ].filter(Boolean);

        return {
          id: String(normalized.id),
          postId: String(normalized.id),
          title: String(normalized.diveSite || normalized.location || normalized.content || i18n.t('api.explore.defaultTitle')).trim(),
          location: location || i18n.t('api.explore.noLocation', { defaultValue: '위치 정보 없음' }),
          meta: metaParts.join(' · '),
          imageUrl: normalizeImageUrl(firstImageMedia?.url || normalized.image || firstMedia?.url) || '',
          tags,
          content: normalized.content,
          createdAt: normalized.createdAt,
          mediaType: firstMedia?.type || (normalized.image ? 'image' : ''),
        };
      })
      .filter((item) => Boolean(item.imageUrl))
      .slice(0, 120);
  },

  getResorts: async () => {
    const res = await dataApi.list<any>('profiles', {
      filters: [{ column: 'account_type', op: 'eq', value: 'resort' }],
      limit: 100,
    });
    return res.data.map((item) => ({
      id: String(item.id),
      name: item.full_name || item.username || i18n.t('api.resorts.defaultName'),
      country: item.resort_country || item.country || '',
      region: item.resort_region || '',
      address: item.resort_address || '',
      area: [item.resort_country, item.resort_region, item.resort_address].filter(Boolean).join(' · ') || item.bio || i18n.t('api.resorts.noArea'),
      lat: normalizeNumber(item.resort_lat ?? item.lat ?? item.location_lat),
      lng: normalizeNumber(item.resort_lng ?? item.lng ?? item.location_lng),
      rating: Number(item.resort_rating_avg || 0),
      reviewCount: Number(item.resort_review_count || 0),
      tags: item.website || item.account_type || 'resort',
      updatedAt: item.updated_at || item.created_at || new Date().toISOString(),
    }));
  },

  getDivePoints: async (userId?: string) => {
    const uid = normalizeString(userId || '');
    const filters = uid ? [{ column: 'user_id', op: 'eq' as const, value: uid }] : undefined;
    const res = await dataApi.list<any>('posts', {
      filters,
      order: { column: 'created_at', ascending: false },
      limit: 1000,
    });

    const grouped = new Map<string, any>();
    for (const post of res.data) {
      const lat = normalizeNumber(post.location_lat);
      const lng = normalizeNumber(post.location_lng);
      if (lat == null || lng == null) continue;
      const pointName = normalizeString(post.dive_site || post.location || post.caption || '');
      const key = `${Math.round(lat * 1000)}:${Math.round(lng * 1000)}:${pointName.toLowerCase()}`;
      const existing = grouped.get(key) || {
        id: `dive-point-${grouped.size + 1}`,
        name: pointName || i18n.t('api.divePoints.defaultName', { defaultValue: '다이빙 포인트' }),
        country: '',
        region: '',
        lat,
        lng,
        address: normalizeString(post.location || ''),
        depthRange: undefined,
        visibilityAvg: undefined,
        waterTempAvg: undefined,
        diveTypes: [],
        marineLifeTags: [],
        isFavorite: false,
        createdAt: post.created_at || new Date().toISOString(),
        updatedAt: post.updated_at || post.created_at || new Date().toISOString(),
        visitCount: 0,
        lastVisitedAt: post.created_at || new Date().toISOString(),
      };

      existing.visitCount += 1;
      existing.lastVisitedAt = post.created_at || existing.lastVisitedAt;
      existing.name = existing.name || pointName;
      if (!existing.address) existing.address = normalizeString(post.location || '');
      const diveType = normalizeString(post.dive_type || '');
      if (diveType && !existing.diveTypes.includes(diveType)) existing.diveTypes.push(diveType);
      if (Number.isFinite(Number(post.max_depth))) {
        const depth = Number(post.max_depth);
        existing.depthRange = existing.depthRange
          ? { min: Math.min(existing.depthRange.min, depth), max: Math.max(existing.depthRange.max, depth) }
          : { min: depth, max: depth };
      }
      if (Number.isFinite(Number(post.visibility))) {
        const visibility = Number(post.visibility);
        existing.visibilityAvg = existing.visibilityAvg ? Math.round((existing.visibilityAvg * (existing.visitCount - 1) + visibility) / existing.visitCount) : visibility;
      }
      if (Number.isFinite(Number(post.water_temperature))) {
        const temp = Number(post.water_temperature);
        existing.waterTempAvg = existing.waterTempAvg ? Math.round((existing.waterTempAvg * (existing.visitCount - 1) + temp) / existing.visitCount) : temp;
      }
      const tags = extractHashtags(post.caption || '');
      for (const tag of tags) {
        if (!existing.marineLifeTags.includes(tag)) existing.marineLifeTags.push(tag);
      }
      grouped.set(key, existing);
    }

    return [...grouped.values()].map((item) => ({
      ...item,
      diveTypes: item.diveTypes.length ? item.diveTypes : undefined,
      marineLifeTags: item.marineLifeTags.length ? item.marineLifeTags : undefined,
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
      publish_to_feed: data.publishToFeed !== false,
      publish_to_reels: data.publishToReels === true,
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
