import { storage } from './storage';

const ADMIN_KEY_STORAGE_KEY = 'divergram_admin_key_v1';

const RAW_API_BASE =
  process.env.EXPO_PUBLIC_DIVERGRAM_API_BASE ||
  process.env.DIVERGRAM_API_BASE ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://api.divergram.com';

const API_BASE = RAW_API_BASE.replace(/\/+$/, '');
const API_ROOT = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

type AdminMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type QueryValue = string | number | boolean | undefined | null;

type AdminRequestInit = {
  method?: AdminMethod;
  query?: Record<string, QueryValue>;
  body?: unknown;
  adminKey?: string;
};

export type AdminHealth = {
  ok: boolean;
  service?: string;
};

export type AdminStats = {
  users: number;
  blockedUsers: number;
  personalUsers: number;
  resortUsers: number;
  feedCount: number;
  reelsCount: number;
  uptimeSec: number;
  system?: {
    cpuUsagePct?: number;
    memoryUsedGb?: number;
    memoryTotalGb?: number;
    memoryUsagePct?: number;
    disk?: { usedGb?: number; totalGb?: number; usedPct?: number };
    network?: { inMb?: number; outMb?: number };
  };
  latestUsers?: AdminUser[];
};

export type AdminGrowth = {
  ok: boolean;
  rangeDays?: number;
  totals?: {
    users?: number;
    posts?: number;
    likes?: number;
    comments?: number;
    reports?: number;
  };
  series?: {
    signups?: { day: string; count: number }[];
    posts?: { day: string; count: number }[];
    interactions?: { day: string; count: number }[];
    dauApprox?: { day: string; count: number }[];
  };
};

export type AdminUser = {
  id: string;
  email?: string;
  username?: string;
  role?: string;
  is_blocked?: boolean;
  email_verified?: boolean;
  created_at?: string;
};

export type AdminCertification = {
  id: string;
  user_id?: string;
  agency?: string;
  certification_number?: string;
  level?: string;
  issued_at?: string;
  expires_at?: string;
  image_url?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type AdminReport = {
  id: string;
  user_id?: string;
  reason?: string;
  status?: string;
  created_at?: string;
};

export type AdminJob = {
  id: string;
  type?: string;
  status?: string;
  attempts?: number;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AdminMapPoint = {
  id: string;
  location?: string;
  dive_site?: string;
  created_at?: string;
};

export type AdminTableSummary = {
  table: string;
  count: number;
};

export type AdminTableRowsResponse<T = Record<string, any>> = {
  ok: boolean;
  table: string;
  rows: T[];
};

function normalizeString(value: unknown) {
  return String(value ?? '').trim();
}

function getAdminKeyStorage() {
  return storage.getString(ADMIN_KEY_STORAGE_KEY) || '';
}

export function getStoredAdminKey() {
  return getAdminKeyStorage();
}

export function setStoredAdminKey(adminKey: string) {
  const key = normalizeString(adminKey);
  if (key) storage.set(ADMIN_KEY_STORAGE_KEY, key);
  else storage.delete(ADMIN_KEY_STORAGE_KEY);
  return key;
}

function buildAdminUrl(path: string, query?: Record<string, QueryValue>) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_ROOT}${cleanPath}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

async function requestAdmin<T>(path: string, options: AdminRequestInit = {}): Promise<T> {
  const adminKey = normalizeString(options.adminKey || getAdminKeyStorage());
  if (!adminKey) throw new Error('admin_key_required');

  const response = await fetch(buildAdminUrl(path, options.query), {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await parseJsonResponse<any>(response);
  if (!response.ok) {
    const error = new Error(String(payload?.error || payload?.message || `admin_request_failed:${response.status}`));
    (error as any).response = { status: response.status, data: payload };
    throw error;
  }

  return payload as T;
}

export async function fetchAdminHealth(adminKey?: string) {
  return requestAdmin<AdminHealth>('/admin/health', { adminKey });
}

export async function fetchAdminStats(adminKey?: string) {
  const payload = await requestAdmin<{ ok: boolean; stats: AdminStats }>('/admin/stats', { adminKey });
  return payload.stats;
}

export async function fetchAdminGrowth(adminKey?: string, days = 14) {
  return requestAdmin<AdminGrowth>('/admin/growth', {
    adminKey,
    query: { days },
  });
}

export async function fetchAdminUsers(adminKey?: string, params?: { limit?: number; search?: string }) {
  const payload = await requestAdmin<{ ok: boolean; users: AdminUser[] }>('/admin/users', {
    adminKey,
    query: { limit: params?.limit ?? 20, search: params?.search || '' },
  });
  return payload.users || [];
}

export async function setAdminUserBlocked(adminKey: string | undefined, userId: string, blocked: boolean) {
  const payload = await requestAdmin<{ ok: boolean; user: AdminUser }>(`/admin/users/${encodeURIComponent(userId)}/block`, {
    adminKey,
    method: 'PATCH',
    body: { blocked },
  });
  return payload.user;
}

export async function fetchAdminCertifications(adminKey?: string, params?: { limit?: number; status?: string }) {
  const payload = await requestAdmin<{ ok: boolean; certifications: AdminCertification[] }>('/admin/certifications', {
    adminKey,
    query: { limit: params?.limit ?? 50, status: params?.status || '' },
  });
  return payload.certifications || [];
}

export async function updateAdminCertificationStatus(adminKey: string | undefined, certificationId: string, status: string) {
  const payload = await requestAdmin<{ ok: boolean; certification: AdminCertification }>(
    `/admin/certifications/${encodeURIComponent(certificationId)}/status`,
    {
      adminKey,
      method: 'PATCH',
      body: { status },
    }
  );
  return payload.certification;
}

export async function fetchAdminReports(adminKey?: string, params?: { limit?: number; status?: string }) {
  const payload = await requestAdmin<{ ok: boolean; reports: AdminReport[] }>('/admin/reports', {
    adminKey,
    query: { limit: params?.limit ?? 50, status: params?.status || '' },
  });
  return payload.reports || [];
}

export async function updateAdminReportStatus(adminKey: string | undefined, reportId: string, status: string) {
  const payload = await requestAdmin<{ ok: boolean; report: AdminReport }>(`/admin/reports/${encodeURIComponent(reportId)}/status`, {
    adminKey,
    method: 'PATCH',
    body: { status },
  });
  return payload.report;
}

export async function fetchAdminJobs(adminKey?: string, limit = 25) {
  const payload = await requestAdmin<{ ok: boolean; jobs: AdminJob[] }>('/admin/jobs', {
    adminKey,
    query: { limit },
  });
  return payload.jobs || [];
}

export async function dispatchAdminJobs(adminKey: string | undefined, limit = 50) {
  return requestAdmin<{ ok: boolean; processed?: number; completed?: number; failed?: number }>(`/admin/jobs/dispatch`, {
    adminKey,
    method: 'POST',
    body: { limit },
  });
}

export async function fetchAdminMapPoints(adminKey?: string) {
  const payload = await requestAdmin<{ ok: boolean; points: AdminMapPoint[] }>('/admin/map-points', {
    adminKey,
  });
  return payload.points || [];
}

export async function fetchAdminTables(adminKey?: string) {
  const payload = await requestAdmin<{ ok: boolean; tables: AdminTableSummary[] }>('/admin/tables', {
    adminKey,
  });
  return payload.tables || [];
}

export async function fetchAdminTableRows<T = Record<string, any>>(adminKey: string | undefined, table: string, limit = 50) {
  const payload = await requestAdmin<AdminTableRowsResponse<T>>(`/admin/table/${encodeURIComponent(table)}`, {
    adminKey,
    query: { limit },
  });
  return payload.rows || [];
}
