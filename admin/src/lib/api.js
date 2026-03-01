export const API_BASE = import.meta.env.VITE_ADMIN_API_BASE || 'http://127.0.0.1:4000';
export const DEFAULT_ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

export async function api(path, { adminKey, method = 'GET', body } = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'request_failed');
  return j;
}
