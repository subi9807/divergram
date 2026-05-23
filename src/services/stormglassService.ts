import { storage } from '../lib/storage';
import { mockDivePoints, mockMarineWeather } from '../mock/divergramExpansionMock';
import type { MarineRiskLevel, MarineWeather } from '../models';

const STORMGLASS_BASE = process.env.EXPO_PUBLIC_STORMGLASS_API_BASE || 'https://api.stormglass.io/v2';
const STORMGLASS_KEY = process.env.EXPO_PUBLIC_STORMGLASS_API_KEY || process.env.STORMGLASS_API_KEY || '';
const CACHE_TTL_MS = 1000 * 60 * 30;
const STALE_OBS_MS = 1000 * 60 * 60 * 6;

type StormglassWeatherHour = {
  time?: string;
  waveHeight?: { noaa?: number; sg?: number; icon?: number };
  currentSpeed?: { noaa?: number; sg?: number }; // m/s
  currentDirection?: { noaa?: number; sg?: number };
  waterTemperature?: { noaa?: number; sg?: number };
  windSpeed?: { noaa?: number; sg?: number };
  airTemperature?: { noaa?: number; sg?: number };
};

type StormglassWeatherResponse = {
  hours?: StormglassWeatherHour[];
  meta?: { cost?: number; dailyQuota?: number; lat?: number; lng?: number };
};

type StormglassTideResponse = {
  data?: { height?: number; time?: string; type?: 'high' | 'low' }[];
};

function pickNumber(source?: Record<string, number | undefined>): number | undefined {
  if (!source) return undefined;
  const order = ['sg', 'noaa', 'icon'];
  for (const key of order) {
    const value = Number(source[key]);
    if (Number.isFinite(value)) return value;
  }
  for (const value of Object.values(source)) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseTimeMs(value?: string): number {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : NaN;
}

function normalizeHours(hours?: StormglassWeatherHour[]) {
  return [...(hours || [])].sort((a, b) => {
    const ams = parseTimeMs(a.time);
    const bms = parseTimeMs(b.time);
    if (!Number.isFinite(ams) && !Number.isFinite(bms)) return 0;
    if (!Number.isFinite(ams)) return 1;
    if (!Number.isFinite(bms)) return -1;
    return ams - bms;
  });
}

function msToKnots(valueMs?: number): number | undefined {
  if (valueMs == null) return undefined;
  return Math.round(valueMs * 1.94384 * 10) / 10;
}

function cacheKey(lat: number, lng: number) {
  return `stormglass_cache_${lat.toFixed(4)}_${lng.toFixed(4)}`;
}

function readCacheEntry(lat: number, lng: number): { data: MarineWeather; cachedAtMs: number; isFresh: boolean } | null {
  const raw = storage.getString(cacheKey(lat, lng));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { cachedAt: string; data: MarineWeather };
    const cachedAtMs = Date.parse(parsed.cachedAt || '');
    if (!Number.isFinite(cachedAtMs)) return null;
    return {
      data: { ...parsed.data, source: 'cache' },
      cachedAtMs,
      isFresh: Date.now() - cachedAtMs <= CACHE_TTL_MS,
    };
  } catch {
    return null;
  }
}

function readCache(lat: number, lng: number): MarineWeather | null {
  const entry = readCacheEntry(lat, lng);
  if (!entry?.isFresh) return null;
  return entry.data;
}

function fromStaleCache(entry: { data: MarineWeather; cachedAtMs: number }): MarineWeather {
  const staleMinutes = Math.max(1, Math.round((Date.now() - entry.cachedAtMs) / (1000 * 60)));
  const staleTooLong = staleMinutes >= 24 * 60;
  const warnings = [
    `캐시 데이터가 ${staleMinutes}분 경과하여 최신성과 정확도가 낮을 수 있습니다.`,
    ...(entry.data.warnings || []),
  ].filter((item, index, arr) => arr.indexOf(item) === index);
  return {
    ...entry.data,
    source: 'cache',
    riskLevel: staleTooLong ? 'danger' : entry.data.riskLevel,
    recommendationScore: staleTooLong ? Math.min(25, Number(entry.data.recommendationScore || 25)) : entry.data.recommendationScore,
    riskConfidence: 'low',
    diveAllowed: false,
    noDiveReason: '실시간 데이터 확인 불가(만료 캐시 사용)',
    summary: staleTooLong
      ? '만료 캐시가 24시간 이상 경과했습니다. 입수를 중단하고 현장/공식 기상 데이터를 먼저 확인하세요.'
      : '실시간 데이터를 불러오지 못해 만료된 캐시를 표시합니다. 보수적으로 입수 여부를 판단하세요.',
    warnings,
    fetchedAt: new Date().toISOString(),
  };
}

function writeCache(lat: number, lng: number, data: MarineWeather) {
  storage.set(cacheKey(lat, lng), JSON.stringify({ cachedAt: new Date().toISOString(), data }));
}

type MarineRiskAssessment = {
  level: MarineRiskLevel;
  reason: string;
  score: number;
  warnings: string[];
  diveAllowed: boolean;
  noDiveReason?: string;
  beginnerSafe: boolean;
  beginnerWarning?: string;
};

function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function riskLevelFromScore(score: number): MarineRiskLevel {
  if (score >= 82) return 'good';
  if (score >= 62) return 'normal';
  if (score >= 38) return 'caution';
  return 'danger';
}

function tideTransitionPenalty(minutesDiff: number): number {
  if (!Number.isFinite(minutesDiff) || minutesDiff < 0) return 0;
  if (minutesDiff <= 30) return 14;
  if (minutesDiff <= 60) return 8;
  if (minutesDiff <= 90) return 4;
  return 0;
}

function variabilityPenalty(input: { waveSpan: number; currentSpan: number }) {
  const { waveSpan, currentSpan } = input;
  let penalty = 0;
  const warnings: string[] = [];

  if (Number.isFinite(waveSpan) && waveSpan >= 1.0) {
    penalty += waveSpan >= 1.6 ? 14 : 8;
    warnings.push('단시간 파고 변동폭이 커 수면/입출수 구간 안정성이 낮습니다.');
  }
  if (Number.isFinite(currentSpan) && currentSpan >= 0.9) {
    penalty += currentSpan >= 1.4 ? 14 : 8;
    warnings.push('단시간 조류 변동폭이 커 감압/부력 제어 리스크가 증가할 수 있습니다.');
  }
  return { penalty: clamp(0, penalty, 22), warnings };
}

function trendPenalty(hourly: { recommendationScore?: number }[]) {
  if (hourly.length < 6) return { penalty: 0, warnings: [] as string[] };
  const scores = hourly
    .map((item) => Number(item.recommendationScore))
    .filter((value) => Number.isFinite(value));
  if (scores.length < 6) return { penalty: 0, warnings: [] as string[] };
  const head = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const tail = scores.slice(3, 6).reduce((a, b) => a + b, 0) / 3;
  const diff = Math.round(head - tail);
  if (diff < 12) return { penalty: 0, warnings: [] as string[] };
  return {
    penalty: diff >= 20 ? 10 : 6,
    warnings: ['향후 수시간 내 조건이 악화되는 추세가 감지되었습니다. 보수적으로 다이브 플랜을 조정하세요.'],
  };
}

function horizonRiskPenalty(hourly: { riskLevel?: MarineRiskLevel; diveAllowed?: boolean }[]) {
  if (!hourly.length) return { penalty: 0, warnings: [] as string[], forceNoDive: false };
  const riskyHours = hourly.filter((item) => item.riskLevel === 'danger' || item.diveAllowed === false).length;
  const ratio = riskyHours / hourly.length;
  if (ratio < 0.35) return { penalty: 0, warnings: [] as string[], forceNoDive: false };
  if (ratio >= 0.7) {
    return {
      penalty: 18,
      warnings: ['향후 시간대의 위험 구간 비중이 매우 높아 오늘 다이빙은 연기하는 것이 안전합니다.'],
      forceNoDive: true,
    };
  }
  if (ratio >= 0.5) {
    return {
      penalty: 10,
      warnings: ['시간대 예보의 절반 이상이 주의/위험 구간입니다. 입수 계획을 재검토하세요.'],
      forceNoDive: true,
    };
  }
  return {
    penalty: 6,
    warnings: ['시간대 예보 중 위험 구간 비중이 높아 보수적 다이브 플랜이 필요합니다.'],
    forceNoDive: false,
  };
}

function forecastContinuityPenalty(hourly: { timeIso?: string }[]) {
  if (hourly.length < 3) {
    return {
      penalty: 8,
      warnings: ['시간대 예보 구간이 짧아 추세 판단 신뢰도가 낮습니다.'],
      severeGap: true,
    };
  }

  const diffs: number[] = [];
  for (let i = 1; i < hourly.length; i += 1) {
    const prevMs = parseTimeMs(hourly[i - 1]?.timeIso);
    const nextMs = parseTimeMs(hourly[i]?.timeIso);
    if (!Number.isFinite(prevMs) || !Number.isFinite(nextMs)) continue;
    const diffMin = (nextMs - prevMs) / (1000 * 60);
    if (Number.isFinite(diffMin) && diffMin > 0) diffs.push(diffMin);
  }

  if (!diffs.length) {
    return {
      penalty: 10,
      warnings: ['시간대 예보 시각이 비정상적이어서 보수적 판단이 필요합니다.'],
      severeGap: true,
    };
  }

  const largeGapCount = diffs.filter((value) => value >= 120).length;
  const severeGapCount = diffs.filter((value) => value >= 240).length;
  if (severeGapCount > 0) {
    return {
      penalty: 14,
      warnings: ['시간대 예보 간격에 큰 공백(4시간+)이 있어 추천 신뢰도가 낮습니다.'],
      severeGap: true,
    };
  }
  if (largeGapCount >= 2) {
    return {
      penalty: 8,
      warnings: ['시간대 예보 간격이 불규칙해 급변 구간 누락 가능성이 있습니다.'],
      severeGap: false,
    };
  }

  return { penalty: 0, warnings: [] as string[], severeGap: false };
}

function calculateDataCompleteness(input: {
  waveHeightM?: number;
  currentSpeedKnot?: number;
  currentDirectionDeg?: number;
  waterTempC?: number;
  windSpeedMps?: number;
  visibilityM?: number;
  airTempC?: number;
}) {
  const fields = [
    input.waveHeightM,
    input.currentSpeedKnot,
    input.currentDirectionDeg,
    input.waterTempC,
    input.windSpeedMps,
    input.visibilityM,
    input.airTempC,
  ];
  const available = fields.filter((value) => value != null && Number.isFinite(Number(value))).length;
  return Math.round((available / fields.length) * 100);
}

function inferRiskConfidence(completenessScore: number, source: MarineWeather['source']): 'high' | 'medium' | 'low' {
  if (source === 'none') return 'low';
  if (source === 'cache') {
    if (completenessScore >= 80) return 'medium';
    return 'low';
  }
  if (completenessScore >= 86) return 'high';
  if (completenessScore >= 62) return 'medium';
  return 'low';
}

export function calculateMarineRisk(input: {
  waveHeightM?: number;
  currentSpeedKnot?: number;
  visibilityM?: number;
  waterTempC?: number;
  windSpeedMps?: number;
}): MarineRiskAssessment {
  const { waveHeightM, currentSpeedKnot, visibilityM, waterTempC, windSpeedMps } = input;
  const warnings: string[] = [];

  if (waveHeightM == null || currentSpeedKnot == null || visibilityM == null) {
    return {
      level: 'normal',
      reason: '관측 데이터가 일부 부족하여 보수적으로 판단합니다.',
      score: 56,
      warnings: ['실시간 관측 데이터가 일부 누락되었습니다.'],
      diveAllowed: false,
      noDiveReason: '핵심 관측 데이터 누락',
      beginnerSafe: false,
      beginnerWarning: '초보자는 현장 브리핑 후 입수 여부를 결정하세요.',
    };
  }

  let score = 100;
  if (waveHeightM > 2.5) score -= 65;
  else if (waveHeightM > 1.8) score -= 42;
  else if (waveHeightM > 1.2) score -= 26;
  else if (waveHeightM > 0.8) score -= 12;

  if (currentSpeedKnot > 3.0) score -= 55;
  else if (currentSpeedKnot > 2.2) score -= 40;
  else if (currentSpeedKnot > 1.6) score -= 24;
  else if (currentSpeedKnot > 1.0) score -= 10;

  if (visibilityM < 2) score -= 45;
  else if (visibilityM < 4) score -= 30;
  else if (visibilityM < 7) score -= 18;
  else if (visibilityM < 10) score -= 8;

  if (waterTempC != null) {
    if (waterTempC < 15) score -= 24;
    else if (waterTempC < 18) score -= 12;
    else if (waterTempC > 30) score -= 10;
  }

  if (windSpeedMps != null) {
    if (windSpeedMps > 13) score -= 22;
    else if (windSpeedMps > 9) score -= 12;
  }

  score = Math.round(clamp(0, score, 100));

  if (waveHeightM > 1.8) warnings.push('파고가 높아 입출수 구간 충격이 커질 수 있습니다.');
  if (currentSpeedKnot > 1.6) warnings.push('조류가 강해 라인/버디 이탈 위험이 있습니다.');
  if (visibilityM < 5) warnings.push('시야가 낮아 버디 간격과 라이트 사용에 주의하세요.');
  if (waterTempC != null && waterTempC < 17) warnings.push('수온이 낮아 보온 장비 준비가 필요합니다.');
  if (windSpeedMps != null && windSpeedMps > 9) warnings.push('풍속이 높아 수면 대기 및 보트 접근에 주의하세요.');

  const beginnerSafe =
    waveHeightM <= 1.2 &&
    currentSpeedKnot <= 1.2 &&
    visibilityM >= 8 &&
    (waterTempC == null || waterTempC >= 18);

  const beginnerWarning = beginnerSafe
    ? undefined
    : '초보자는 강사/가이드 동행 및 보수적 다이브 플랜을 권장합니다.';

  const hardNoDive =
    waveHeightM > 2.6 ||
    currentSpeedKnot > 2.8 ||
    visibilityM < 2.5 ||
    (windSpeedMps != null && windSpeedMps > 14);

  const level = riskLevelFromScore(score);

  const diveAllowed = !hardNoDive && level !== 'danger';
  const noDiveReason =
    hardNoDive || level === 'danger'
      ? warnings[0] || '파고/조류/시야 조건이 안전 기준을 벗어났습니다.'
      : undefined;

  const reason =
    warnings[0] ||
    (level === 'good'
      ? '파고/조류/시야가 안정적입니다.'
      : level === 'normal'
        ? '일반적인 레저 다이빙 가능한 수준입니다.'
        : level === 'caution'
          ? '조류 또는 파고가 높아 초보자에게 부담될 수 있습니다.'
          : '파고/조류/시야 조건이 위험 구간입니다.');

  return {
    level,
    reason,
    score,
    warnings,
    diveAllowed,
    noDiveReason,
    beginnerSafe,
    beginnerWarning,
  };
}

export function buildMarineRiskDescription(level: MarineRiskLevel, score?: number, beginnerWarning?: string): string {
  const scoreText = Number.isFinite(score) ? `추천도 ${Math.round(Number(score))}점.` : '';
  if (level === 'good') return `${scoreText} 오늘은 파고가 낮고 시야가 좋아 다이빙하기 좋은 조건입니다.`.trim();
  if (level === 'normal') {
    return `${scoreText} 기본적인 다이빙 조건입니다. 표준 안전 수칙을 지켜주세요.`.trim();
  }
  if (level === 'caution') {
    return `${scoreText} 현재 조류/파고 조건으로 초보자는 보수적으로 접근하는 것이 좋습니다.${beginnerWarning ? ` ${beginnerWarning}` : ''}`.trim();
  }
  return `${scoreText} 위험 조건입니다. 입수를 권장하지 않습니다.`.trim();
}

async function fetchStormglassWeather(lat: number, lng: number): Promise<StormglassWeatherResponse> {
  const params = [
    'waveHeight',
    'currentDirection',
    'currentSpeed',
    'waterTemperature',
    'windSpeed',
    'airTemperature',
  ].join(',');

  const url = `${STORMGLASS_BASE}/weather/point?lat=${lat}&lng=${lng}&params=${params}&source=sg,noaa`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: STORMGLASS_KEY,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`stormglass_weather_failed:${response.status}:${body.slice(0, 160)}`);
  }
  return (await response.json()) as StormglassWeatherResponse;
}

async function fetchStormglassTides(lat: number, lng: number): Promise<StormglassTideResponse> {
  const url = `${STORMGLASS_BASE}/tide/extremes/point?lat=${lat}&lng=${lng}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: STORMGLASS_KEY,
    },
  });
  if (!response.ok) {
    return { data: [] };
  }
  return (await response.json()) as StormglassTideResponse;
}

function buildFallbackWeather(pointId: string, lat: number, lng: number): MarineWeather {
  const sample = mockMarineWeather[0];
  const fallback: MarineWeather = {
    ...(sample || {
      pointId,
      lat,
      lng,
      riskLevel: 'normal',
      riskReason: '해양 정보 없음',
      summary: '해양 정보 없음',
      source: 'none',
      observedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
    }),
    pointId,
    lat,
    lng,
    source: 'none',
    summary: '해양 정보 없음',
    riskReason: '실시간 데이터 조회 실패',
    recommendationScore: 42,
    dataCompletenessScore: 12,
    riskConfidence: 'low',
    diveAllowed: false,
    noDiveReason: '실시간 데이터 없음',
    beginnerSafe: false,
    beginnerWarning: '실시간 데이터가 없어 초보자 입수는 권장되지 않습니다.',
    warnings: ['실시간 해양 데이터를 불러오지 못했습니다.'],
    fetchedAt: new Date().toISOString(),
  };
  return fallback;
}

function withDerivedQuality(weather: MarineWeather): MarineWeather {
  const completeness =
    typeof weather.dataCompletenessScore === 'number'
      ? weather.dataCompletenessScore
      : calculateDataCompleteness({
          waveHeightM: weather.waveHeightM,
          currentSpeedKnot: weather.currentSpeedKnot,
          currentDirectionDeg: weather.currentDirectionDeg,
          waterTempC: weather.waterTempC,
          windSpeedMps: weather.windSpeedMps,
          visibilityM: weather.visibilityM,
          airTempC: weather.airTempC,
        });
  return {
    ...weather,
    dataCompletenessScore: completeness,
    riskConfidence: weather.riskConfidence || inferRiskConfidence(completeness, weather.source),
  };
}

export async function getMarineWeatherByLatLng(lat: number, lng: number): Promise<MarineWeather | null> {
  const freshCache = readCache(lat, lng);
  const cacheEntry = readCacheEntry(lat, lng);
  const staleCache = cacheEntry && !cacheEntry.isFresh ? fromStaleCache(cacheEntry) : null;
  if (!STORMGLASS_KEY) {
    return withDerivedQuality(freshCache || staleCache || buildFallbackWeather(`latlng-${lat.toFixed(3)}-${lng.toFixed(3)}`, lat, lng));
  }

  try {
    const [weatherRes, tideRes] = await Promise.all([fetchStormglassWeather(lat, lng), fetchStormglassTides(lat, lng)]);
    const nowMs = Date.now();
    const sortedHours = normalizeHours(weatherRes.hours);
    const nearestIndex = sortedHours.reduce((bestIndex, hour, index) => {
      const ms = parseTimeMs(hour.time);
      if (!Number.isFinite(ms)) return bestIndex;
      if (bestIndex < 0) return index;
      const bestMs = parseTimeMs(sortedHours[bestIndex]?.time);
      if (!Number.isFinite(bestMs)) return index;
      return Math.abs(ms - nowMs) < Math.abs(bestMs - nowMs) ? index : bestIndex;
    }, -1);
    const first =
      nearestIndex >= 0
        ? sortedHours[nearestIndex]
        : sortedHours[0] || {};
    const forecastHours = sortedHours
      .filter((hour) => {
        const ms = parseTimeMs(hour.time);
        return Number.isFinite(ms) ? ms >= nowMs - 1000 * 60 * 60 : true;
      })
      .slice(0, 12);
    const hourlySource = forecastHours.length ? forecastHours : sortedHours.slice(Math.max(0, nearestIndex), Math.max(0, nearestIndex) + 12);

    const waveHeightM = pickNumber(first.waveHeight as Record<string, number | undefined>);
    const currentSpeedKnot = msToKnots(pickNumber(first.currentSpeed as Record<string, number | undefined>));
    const currentDirectionDeg = pickNumber(first.currentDirection as Record<string, number | undefined>);
    const waterTempC = pickNumber(first.waterTemperature as Record<string, number | undefined>);
    const windSpeedMps = pickNumber(first.windSpeed as Record<string, number | undefined>);
    const airTempC = pickNumber(first.airTemperature as Record<string, number | undefined>);

    const visibilityM = freshCache?.visibilityM ?? staleCache?.visibilityM ?? mockMarineWeather[0]?.visibilityM ?? undefined;
    const dataCompletenessScore = calculateDataCompleteness({
      waveHeightM,
      currentSpeedKnot,
      currentDirectionDeg,
      waterTempC,
      windSpeedMps,
      visibilityM,
      airTempC,
    });
    const risk = calculateMarineRisk({
      waveHeightM,
      currentSpeedKnot,
      visibilityM,
      waterTempC,
      windSpeedMps,
    });

    const hourly = hourlySource.map((hour) => {
      const hWave = pickNumber(hour.waveHeight as Record<string, number | undefined>);
      const hCurrent = msToKnots(pickNumber(hour.currentSpeed as Record<string, number | undefined>));
      const hTemp = pickNumber(hour.waterTemperature as Record<string, number | undefined>);
      const hWind = pickNumber(hour.windSpeed as Record<string, number | undefined>);
      const hVisibility = visibilityM;
      const hRisk = calculateMarineRisk({
        waveHeightM: hWave,
        currentSpeedKnot: hCurrent,
        visibilityM: hVisibility,
        waterTempC: hTemp,
        windSpeedMps: hWind,
      });
      return {
        timeIso: String(hour.time || new Date().toISOString()),
        waveHeightM: hWave,
        currentSpeedKnot: hCurrent,
        waterTempC: hTemp,
        visibilityM: hVisibility,
        riskLevel: hRisk.level,
        recommendationScore: hRisk.score,
        diveAllowed: hRisk.diveAllowed,
      };
    });
    const hourlySignalCount = hourly.filter((item) => item.waveHeightM != null && item.currentSpeedKnot != null).length;
    const sparseHourly = hourly.length < 3 || hourlySignalCount < Math.min(3, Math.max(2, hourly.length));
    const sparseHourlyWarning = sparseHourly
      ? '시간대별 해양 데이터가 부족하여 예측 신뢰도가 낮습니다.'
      : undefined;
    const waveValues = hourly.map((item) => Number(item.waveHeightM)).filter((value) => Number.isFinite(value));
    const currentValues = hourly.map((item) => Number(item.currentSpeedKnot)).filter((value) => Number.isFinite(value));
    const waveSpan = waveValues.length ? Math.max(...waveValues) - Math.min(...waveValues) : 0;
    const currentSpan = currentValues.length ? Math.max(...currentValues) - Math.min(...currentValues) : 0;
    const variability = variabilityPenalty({ waveSpan, currentSpan });
    const trend = trendPenalty(hourly);
    const horizon = horizonRiskPenalty(hourly);
    const continuity = forecastContinuityPenalty(hourly);

    const bestHourly = [...hourly]
      .filter((item) => item.riskLevel !== 'danger' && item.diveAllowed)
      .sort((a, b) => {
        const scoreDiff = Number(b.recommendationScore || 0) - Number(a.recommendationScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return parseTimeMs(a.timeIso) - parseTimeMs(b.timeIso);
      })[0];

    const bestHourlyIndex = hourly.findIndex((item) => item.timeIso === bestHourly?.timeIso);
    let bestDiveWindowStartIso: string | undefined;
    let bestDiveWindowEndIso: string | undefined;
    if (bestHourlyIndex >= 0) {
      const startIndex = Math.max(0, bestHourlyIndex - 1);
      const endIndex = Math.min(hourly.length - 1, bestHourlyIndex + 1);
      const candidates = hourly.slice(startIndex, endIndex + 1).filter((item) => item.diveAllowed);
      if (candidates.length) {
        bestDiveWindowStartIso = candidates[0]?.timeIso;
        bestDiveWindowEndIso = candidates[candidates.length - 1]?.timeIso;
      }
    }

    const tideRows = tideRes.data || [];
    const tideTimes = tideRows.slice(0, 6).map((item) => ({
      type: (item.type || 'high') as 'high' | 'low',
      timeIso: String(item.time || new Date().toISOString()),
    }));
    const nearestTide = tideRows.reduce<
      | {
          type: 'high' | 'low';
          minutesDiff: number;
        }
      | undefined
    >((best, row) => {
      const rowMs = parseTimeMs(row.time);
      if (!Number.isFinite(rowMs)) return best;
      const minutesDiff = Math.abs(rowMs - nowMs) / (1000 * 60);
      if (!best || minutesDiff < best.minutesDiff) {
        return { type: (row.type || 'high') as 'high' | 'low', minutesDiff };
      }
      return best;
    }, undefined);
    const tidePenalty = tideTransitionPenalty(nearestTide?.minutesDiff ?? NaN);
    const tideWarning =
      tidePenalty > 0 && nearestTide
        ? `조석 ${nearestTide.type === 'high' ? '만조' : '간조'} 전후 ${Math.round(nearestTide.minutesDiff)}분 구간으로 조류 변화가 클 수 있습니다.`
        : undefined;
    const adjustedScore = clamp(0, risk.score - tidePenalty - variability.penalty - trend.penalty - horizon.penalty - continuity.penalty, 100);
    const adjustedLevel = riskLevelFromScore(adjustedScore);
    const adjustedWarnings = [tideWarning, ...variability.warnings, ...trend.warnings, ...horizon.warnings, ...continuity.warnings, ...risk.warnings]
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index) as string[];
    const adjustedDiveAllowed = risk.diveAllowed && adjustedLevel !== 'danger' && !horizon.forceNoDive && !continuity.severeGap;
    const adjustedNoDiveReason = adjustedDiveAllowed ? undefined : tideWarning || continuity.warnings[0] || horizon.warnings[0] || risk.noDiveReason;
    const adjustedReason = tideWarning ? tideWarning : continuity.warnings[0] || horizon.warnings[0] || risk.reason;
    const sparseAdjustedLevel =
      sparseHourly && adjustedLevel !== 'danger'
        ? 'caution'
        : adjustedLevel;
    const sparseAdjustedScore = sparseHourly ? clamp(0, Math.min(adjustedScore, 58), 100) : adjustedScore;
    const sparseWarnings = sparseHourlyWarning
      ? [sparseHourlyWarning, ...adjustedWarnings].filter((item, index, arr) => arr.indexOf(item) === index)
      : adjustedWarnings;
    const sparseDiveAllowed = sparseHourly ? false : adjustedDiveAllowed;
    const sparseNoDiveReason = sparseHourly ? '시간대별 해양 데이터 부족' : adjustedNoDiveReason;
    const sparseSummary = sparseHourly
      ? '시간대별 해양 데이터가 충분하지 않아 입수 판단을 보류합니다. 최신 데이터로 다시 확인하세요.'
      : buildMarineRiskDescription(adjustedLevel, adjustedScore, risk.beginnerWarning);

    const out: MarineWeather = {
      pointId: `latlng-${lat.toFixed(3)}-${lng.toFixed(3)}`,
      lat,
      lng,
      waveHeightM,
      currentDirectionDeg,
      currentSpeedKnot,
      waterTempC,
      windSpeedMps,
      visibilityM,
      tideTimeIso: tideTimes[0]?.timeIso,
      airTempC,
      weatherState: sparseAdjustedLevel === 'danger' ? 'warning' : 'clear',
      riskLevel: sparseAdjustedLevel,
      riskReason: adjustedReason,
      summary: sparseSummary,
      recommendationScore: sparseAdjustedScore,
      dataCompletenessScore,
      riskConfidence: sparseHourly ? 'low' : continuity.severeGap ? 'low' : inferRiskConfidence(dataCompletenessScore, 'stormglass'),
      diveAllowed: sparseDiveAllowed,
      noDiveReason: sparseNoDiveReason,
      beginnerSafe: risk.beginnerSafe,
      beginnerWarning: risk.beginnerWarning,
      warnings: sparseWarnings,
      bestDiveTimeIso: sparseHourly ? undefined : bestHourly?.timeIso,
      bestDiveScore: sparseHourly ? undefined : bestHourly?.recommendationScore,
      bestDiveWindowStartIso: sparseHourly ? undefined : bestDiveWindowStartIso,
      bestDiveWindowEndIso: sparseHourly ? undefined : bestDiveWindowEndIso,
      source: 'stormglass',
      hourly,
      tideTimes,
      observedAt: String(first.time || new Date().toISOString()),
      fetchedAt: new Date().toISOString(),
    };

    let normalized = withDerivedQuality(out);
    const observedMs = parseTimeMs(normalized.observedAt);
    if (Number.isFinite(observedMs)) {
      const observedAgeMs = nowMs - observedMs;
      if (observedAgeMs > STALE_OBS_MS) {
        const staleWarning = '관측 시각이 오래되어 실시간 판단이 어렵습니다. 최신 데이터 갱신 후 확인하세요.';
        const warnings = [staleWarning, ...(normalized.warnings || [])].filter((item, index, arr) => arr.indexOf(item) === index);
        normalized = {
          ...normalized,
          riskLevel: normalized.riskLevel === 'danger' ? 'danger' : 'caution',
          riskConfidence: 'low',
          diveAllowed: false,
          noDiveReason: '관측 시각이 오래됨',
          summary: '실시간성이 낮은 해양 데이터입니다. 최신 정보 갱신 후 입수 여부를 판단하세요.',
          warnings,
        };
      } else if (observedAgeMs > 2 * 60 * 60 * 1000) {
        const agedWarning = '관측 시각이 2시간 이상 경과했습니다. 입수 전 현장 조건을 추가 확인하세요.';
        const warnings = [agedWarning, ...(normalized.warnings || [])].filter((item, index, arr) => arr.indexOf(item) === index);
        const adjustedScore = clamp(0, Number(normalized.recommendationScore || 0) - 8, 100);
        const adjustedLevel = riskLevelFromScore(adjustedScore);
        normalized = {
          ...normalized,
          recommendationScore: adjustedScore,
          riskLevel: adjustedLevel,
          riskReason: agedWarning,
          summary: buildMarineRiskDescription(adjustedLevel, adjustedScore, normalized.beginnerWarning),
          riskConfidence: normalized.riskConfidence === 'high' ? 'medium' : normalized.riskConfidence,
          warnings,
          diveAllowed: normalized.diveAllowed && adjustedLevel !== 'danger',
          noDiveReason:
            normalized.diveAllowed && adjustedLevel !== 'danger'
              ? normalized.noDiveReason
              : normalized.noDiveReason || '관측 시각 경과로 보수적 판단 필요',
        };
      }
    }
    writeCache(lat, lng, normalized);
    return normalized;
  } catch {
    return withDerivedQuality(freshCache || staleCache || buildFallbackWeather(`latlng-${lat.toFixed(3)}-${lng.toFixed(3)}`, lat, lng));
  }
}

export async function getMarineWeatherByPoint(pointId: string): Promise<MarineWeather | null> {
  const point = mockDivePoints.find((item) => item.id === pointId);
  if (!point) return null;
  const weather = await getMarineWeatherByLatLng(point.lat, point.lng);
  if (!weather) return null;
  return { ...weather, pointId };
}
