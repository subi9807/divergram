const PRODUCTION_API_BASE = 'https://api.divergram.com';

export function getApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) return envBase;

  if (typeof window === 'undefined') return PRODUCTION_API_BASE;

  return window.location.origin || PRODUCTION_API_BASE;
}
