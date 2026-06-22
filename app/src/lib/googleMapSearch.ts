import i18n from './i18n';
import Constants from 'expo-constants';

const extraGoogleMapsApiKey = String((Constants.expoConfig?.extra as any)?.googleMapsApiKey || '').trim();

const GOOGLE_MAPS_API_KEY = String(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || extraGoogleMapsApiKey || process.env.VITE_GOOGLE_MAPS_API_KEY || ''
).trim();

export type GooglePointResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

function getLanguage() {
  const lang = String(i18n.language || 'en').toLowerCase();
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('zh')) return 'zh-CN';
  return 'en';
}

function hasApiKey() {
  return GOOGLE_MAPS_API_KEY.length > 0;
}

async function fetchGoogleJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`google_http_${res.status}`);
  }
  return res.json();
}

export function isGoogleMapsApiConfigured() {
  return hasApiKey();
}

export function getGoogleMapsApiKey() {
  return GOOGLE_MAPS_API_KEY;
}

export function buildGoogleStaticMapUrl(lat?: number, lng?: number) {
  if (!hasApiKey()) return null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const marker = `${lat},${lng}`;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(
    marker
  )}&zoom=13&size=1200x600&scale=2&maptype=roadmap&markers=color:0x1198f5|${encodeURIComponent(
    marker
  )}&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
}

export async function searchGooglePoint(query: string): Promise<GooglePointResult[]> {
  const keyword = query.trim();
  if (!keyword || keyword.length < 2 || !hasApiKey()) return [];
  const lang = getLanguage();
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    keyword
  )}&language=${encodeURIComponent(lang)}&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
  const json = await fetchGoogleJson(url);
  const rows = Array.isArray(json?.results) ? json.results : [];
  return rows
    .slice(0, 8)
    .map((item: { geometry?: { location?: { lat?: number; lng?: number } }; formatted_address?: string; address_components?: { long_name?: string }[] }, index: number) => {
    const lat = Number(item?.geometry?.location?.lat);
    const lng = Number(item?.geometry?.location?.lng);
    const address = String(item?.formatted_address || '').trim();
    const name = String(item?.address_components?.[0]?.long_name || address || keyword).trim();
    return {
      id: `${address || name || keyword}-${index}`,
      name: name || address || keyword,
      address: address || name || keyword,
      lat: Number.isFinite(lat) ? lat : 0,
      lng: Number.isFinite(lng) ? lng : 0,
    };
  })
    .filter((item: GooglePointResult) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

export async function reverseGooglePoint(lat: number, lng: number): Promise<string> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !hasApiKey()) return '';
  const lang = getLanguage();
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
    `${lat},${lng}`
  )}&language=${encodeURIComponent(lang)}&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
  const json = await fetchGoogleJson(url);
  const first = Array.isArray(json?.results) ? json.results[0] : null;
  return String(first?.formatted_address || '').trim();
}
