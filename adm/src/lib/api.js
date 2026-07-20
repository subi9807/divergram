const RAW_API_BASE = import.meta.env.VITE_ADMIN_API_BASE || 'https://api.divergram.com';
export const API_BASE = RAW_API_BASE.replace(/\/+$/, '').replace(/\/api$/, '');
export const DEFAULT_ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';
const ADMIN_AUTH_TOKEN_KEY = 'dg_admin_auth_token';

export function getAdminAuthToken() {
  try {
    return localStorage.getItem(ADMIN_AUTH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminAuthToken(token) {
  try {
    if (token) localStorage.setItem(ADMIN_AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

async function readJsonSafely(response) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const raw = await response.text();
  if (!raw) return {};
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`invalid_json_response: ${String(error?.message || error)}`);
    }
  }
  if (raw.trim().startsWith('<')) {
    throw new Error(`unexpected_html_response: ${raw.slice(0, 120).replace(/\s+/g, ' ')}`);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`unexpected_response: ${String(error?.message || error)}`);
  }
}

export async function api(path, { adminKey, method = 'GET', body } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (adminKey) headers['x-admin-key'] = adminKey;
  const authToken = getAdminAuthToken();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const r = await fetch(API_BASE + path, {
    method,
    credentials: 'include',
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const j = await readJsonSafely(r);
  if (!r.ok) throw new Error(j.error || 'request_failed');
  return j;
}
