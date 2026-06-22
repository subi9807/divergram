const PRODUCTION_API_BASE = 'https://api.divergram.com';

export function getApiBaseUrl() {
  const envBase = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envBase) return envBase.replace(/\/+$/, '').replace(/\/api$/, '');

  if (typeof window === 'undefined') return PRODUCTION_API_BASE;

  const { origin, protocol, hostname } = window.location;
  const isNativeBundle = protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:';
  if (isNativeBundle) return PRODUCTION_API_BASE;

  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (!isLocalHost) return PRODUCTION_API_BASE;

  return origin || PRODUCTION_API_BASE;
}
