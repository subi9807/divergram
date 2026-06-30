import i18n from './i18n';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const extraGoogleMapsApiKey = String((Constants.expoConfig?.extra as any)?.googleMapsApiKey || '').trim();

const GOOGLE_MAPS_API_KEY = String(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || extraGoogleMapsApiKey || process.env.VITE_GOOGLE_MAPS_API_KEY || ''
).trim();
const GEO_CACHE_PREFIX = 'google_geocode_cache_v1';
const REVERSE_CACHE_PREFIX = 'google_reverse_geocode_cache_v1';
const DIAGNOSTIC_PREFIX = 'google_maps_diag_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  const json = await res.json();
  if (String(json?.status || '').toUpperCase() === 'OVER_QUERY_LIMIT') {
    throw new Error('google_over_query_limit');
  }
  if (String(json?.status || '').toUpperCase() === 'OVER_DAILY_LIMIT') {
    throw new Error('google_over_daily_limit');
  }
  if (String(json?.status || '').toUpperCase() === 'REQUEST_DENIED') {
    throw new Error('google_request_denied');
  }
  return json;
}

function makeCacheKey(prefix: string, input: string, lang = '') {
  return `${prefix}:${lang}:${input.trim().toLowerCase()}`;
}

function makeDiagnosticKey(context: string) {
  return `${DIAGNOSTIC_PREFIX}:${context}`;
}

function toCachePayload<T>(value: T) {
  return JSON.stringify({ ts: Date.now(), value });
}

function readCacheValue<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const ts = Number((parsed as any).ts || 0);
    if (!Number.isFinite(ts) || Date.now() - ts > CACHE_TTL_MS) return null;
    return (parsed as any).value as T;
  } catch {
    return null;
  }
}

async function readCachedJson<T>(key: string): Promise<T | null> {
  try {
    return readCacheValue<T>(await AsyncStorage.getItem(key));
  } catch {
    return null;
  }
}

async function writeCachedJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, toCachePayload(value));
  } catch {
    // cache write failures must not block the UX
  }
}

async function recordGoogleMapsIssue(context: string, code: string, detail?: string) {
  try {
    await AsyncStorage.setItem(
      makeDiagnosticKey(context),
      toCachePayload({
        context,
        code,
        detail: detail || '',
        ts: Date.now(),
      })
    );
  } catch {
    // diagnostics must never block the UX
  }
}

export async function getGoogleMapsIssue(context: string) {
  try {
    const raw = await AsyncStorage.getItem(makeDiagnosticKey(context));
    return readCacheValue<{ context: string; code: string; detail: string; ts: number }>(raw);
  } catch {
    return null;
  }
}

export function describeGoogleMapsIssue(codeOrError: unknown, context = 'google_maps') {
  const code = String(codeOrError || '').toLowerCase();
  if (code.includes('over_query_limit')) return 'Google 지도 사용량 초과';
  if (code.includes('over_daily_limit')) return 'Google 지도 일 사용량 초과';
  if (code.includes('request_denied')) return 'Google 지도 요청이 거부되었습니다';
  if (code.includes('http')) return 'Google 지도 네트워크 오류';
  if (code.includes('timeout')) return 'Google 지도 응답 지연';
  if (context === 'static_map') return '지도 미리보기 로드 실패';
  if (context === 'reverse_geocode') return '좌표 주소 변환 실패';
  if (context === 'geocode') return '장소 검색 실패';
  if (context === 'map_js') return '인터랙티브 지도 로드 실패';
  return 'Google 지도 관련 오류';
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
  const cacheKey = makeCacheKey(GEO_CACHE_PREFIX, keyword, lang);
  const cached = await readCachedJson<GooglePointResult[]>(cacheKey);
  if (cached?.length) return cached;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    keyword
  )}&language=${encodeURIComponent(lang)}&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
  try {
    const json = await fetchGoogleJson(url);
    const rows = Array.isArray(json?.results) ? json.results : [];
    const mapped = rows
      .slice(0, 8)
      .map(
        (
          item: {
            geometry?: { location?: { lat?: number; lng?: number } };
            formatted_address?: string;
            address_components?: { long_name?: string }[];
          },
          index: number
        ) => {
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
        }
      )
      .filter((item: GooglePointResult) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
    if (mapped.length) void writeCachedJson(cacheKey, mapped);
    return mapped;
  } catch (error) {
    void recordGoogleMapsIssue('geocode', String(error || 'unknown'), keyword);
    return cached || [];
  }
}

export async function reverseGooglePoint(lat: number, lng: number): Promise<string> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !hasApiKey()) return '';
  const lang = getLanguage();
  const cacheKey = makeCacheKey(REVERSE_CACHE_PREFIX, `${lat.toFixed(6)},${lng.toFixed(6)}`, lang);
  const cached = await readCachedJson<string>(cacheKey);
  if (cached) return cached;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
    `${lat},${lng}`
  )}&language=${encodeURIComponent(lang)}&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
  try {
    const json = await fetchGoogleJson(url);
    const first = Array.isArray(json?.results) ? json.results[0] : null;
    const address = String(first?.formatted_address || '').trim();
    if (address) void writeCachedJson(cacheKey, address);
    return address;
  } catch (error) {
    void recordGoogleMapsIssue('reverse_geocode', String(error || 'unknown'), `${lat},${lng}`);
    return cached || '';
  }
}
