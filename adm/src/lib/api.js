const RAW_API_BASE = import.meta.env.VITE_ADMIN_API_BASE || 'https://api.divergram.com';
export const API_BASE = RAW_API_BASE.replace(/\/+$/, '').replace(/\/api$/, '');
export const DEFAULT_ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

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
  const headers = { 'Content-Type': 'application/json' };
  if (adminKey) headers['x-admin-key'] = adminKey;

  const r = await fetch(API_BASE + path, {
    method,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await readJsonSafely(r);
  if (!r.ok) throw new Error(j.error || 'request_failed');
  return j;
}
