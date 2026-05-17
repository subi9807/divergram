const PRODUCTION_API_BASE = 'https://api.divergram.com';

export function getApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) return envBase;

  if (typeof window === 'undefined') return PRODUCTION_API_BASE;

  const { origin, protocol } = window.location;
  const isNativeBundle = protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:';
  if (isNativeBundle) return PRODUCTION_API_BASE;

  return origin || PRODUCTION_API_BASE;
}
