const RAW_BASE = import.meta.env.VITE_ADMIN_API_BASE || 'https://api.divergram.com';
export const PARTNER_API_BASE = RAW_BASE.replace(/\/+$/, '').replace(/\/api$/, '');
const TOKEN_KEY = 'dg_resort_partner_token_v1';

export const getPartnerToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setPartnerToken = (value) => value ? localStorage.setItem(TOKEN_KEY, value) : localStorage.removeItem(TOKEN_KEY);

export async function partnerApi(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getPartnerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = options.body instanceof FormData;
  if (options.body && !isForm) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${PARTNER_API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body && !isForm ? JSON.stringify(options.body) : options.body,
  });
  const contentType = String(response.headers.get('content-type') || '');
  const payload = contentType.includes('json') ? await response.json() : {};
  if (!response.ok) {
    const error = new Error(payload.error || `HTTP ${response.status}`);
    error.payload = payload;
    throw error;
  }
  return payload;
}
