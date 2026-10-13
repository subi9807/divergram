import { storage } from '../lib/storage';
import i18n from '../lib/i18n';
import { mockDivePoints } from '../mock/divergramExpansionMock';
import { apiClient } from '../lib/api';
import type { MarineRiskLevel, MarineWeather } from '../models';

const CACHE_TTL_MS = 1000 * 60 * 30;
const STALE_OBS_MS = 1000 * 60 * 60 * 6;

function weatherText(key: string, options?: Record<string, unknown>) {
  return String(i18n.t(`marineWeather.service.${key}`, options));
}

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
    if (source[key] == null || String(source[key]).trim() === '') continue;
    const value = Number(source[key]);
    if (Number.isFinite(value)) return value;
  }
  for (const value of Object.values(source)) {
    if (value == null || String(value).trim() === '') continue;
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
  return `stormglass_measured_v2_${lat.toFixed(4)}_${lng.toFixed(4)}`;
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
    weatherText('staleCacheWarning', { minutes: staleMinutes }),
    ...(entry.data.warnings || []),
  ].filter((item, index, arr) => arr.indexOf(item) === index);
  return {
    ...entry.data,
    source: 'cache',
    riskLevel: staleTooLong ? 'danger' : entry.data.riskLevel,
    recommendationScore: staleTooLong ? Math.min(25, Number(entry.data.recommendationScore || 25)) : entry.data.recommendationScore,
    riskConfidence: 'low',
    diveAllowed: false,
    noDiveReason: weatherText('expiredCacheReason'),
    summary: staleTooLong
      ? weatherText('expiredCacheDaySummary')
      : weatherText('expiredCacheSummary'),
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
    warnings.push(weatherText('waveVariability'));
  }
  if (Number.isFinite(currentSpan) && currentSpan >= 0.9) {
    penalty += currentSpan >= 1.4 ? 14 : 8;
    warnings.push(weatherText('currentVariability'));
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
    warnings: [weatherText('worseningTrend')],
  };
}

function thermalShiftPenalty(hourly: { waterTempC?: number }[]) {
  const temps = hourly
    .map((item) => Number(item.waterTempC))
    .filter((value) => Number.isFinite(value))
    .slice(0, 6);
  if (temps.length < 3) return { penalty: 0, warnings: [] as string[] };
  const span = Math.max(...temps) - Math.min(...temps);
  if (span < 2.5) return { penalty: 0, warnings: [] as string[] };
  if (span >= 4) {
    return {
      penalty: 10,
      warnings: [weatherText('severeThermalShift')],
    };
  }
  return {
    penalty: 6,
    warnings: [weatherText('thermalShift')],
  };
}

function riskStreakPenalty(hourly: { riskLevel?: MarineRiskLevel; diveAllowed?: boolean }[]) {
  if (!hourly.length) return { penalty: 0, warnings: [] as string[], forceNoDive: false };
  let current = 0;
  let maxStreak = 0;
  hourly.forEach((item) => {
    const risky = item.riskLevel === 'danger' || item.riskLevel === 'caution' || item.diveAllowed === false;
    if (!risky) {
      current = 0;
      return;
    }
    current += 1;
    if (current > maxStreak) maxStreak = current;
  });

  if (maxStreak >= 4) {
    return {
      penalty: 16,
      warnings: [weatherText('longRiskStreak')],
      forceNoDive: true,
    };
  }
  if (maxStreak >= 3) {
    return {
      penalty: 10,
      warnings: [weatherText('riskStreak')],
      forceNoDive: true,
    };
  }
  if (maxStreak >= 2) {
    return {
      penalty: 6,
      warnings: [weatherText('shortDiveWindow')],
      forceNoDive: false,
    };
  }
  return { penalty: 0, warnings: [] as string[], forceNoDive: false };
}

function horizonRiskPenalty(hourly: { riskLevel?: MarineRiskLevel; diveAllowed?: boolean }[]) {
  if (!hourly.length) return { penalty: 0, warnings: [] as string[], forceNoDive: false };
  const riskyHours = hourly.filter((item) => item.riskLevel === 'danger' || item.diveAllowed === false).length;
  const ratio = riskyHours / hourly.length;
  if (ratio < 0.35) return { penalty: 0, warnings: [] as string[], forceNoDive: false };
  if (ratio >= 0.7) {
    return {
      penalty: 18,
      warnings: [weatherText('highRiskHorizon')],
      forceNoDive: true,
    };
  }
  if (ratio >= 0.5) {
    return {
      penalty: 10,
      warnings: [weatherText('halfRiskHorizon')],
      forceNoDive: true,
    };
  }
  return {
    penalty: 6,
    warnings: [weatherText('elevatedRiskHorizon')],
    forceNoDive: false,
  };
}

function forecastContinuityPenalty(hourly: { timeIso?: string }[]) {
  if (hourly.length < 3) {
    return {
      penalty: 8,
      warnings: [weatherText('shortForecast')],
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
      warnings: [weatherText('invalidForecastTime')],
      severeGap: true,
    };
  }

  const largeGapCount = diffs.filter((value) => value >= 120).length;
  const severeGapCount = diffs.filter((value) => value >= 240).length;
  if (severeGapCount > 0) {
    return {
      penalty: 14,
      warnings: [weatherText('severeForecastGap')],
      severeGap: true,
    };
  }
  if (largeGapCount >= 2) {
    return {
      penalty: 8,
      warnings: [weatherText('irregularForecastGap')],
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
      reason: weatherText('partialObservationReason'),
      score: 56,
      warnings: [weatherText('partialObservationWarning')],
      diveAllowed: false,
      noDiveReason: weatherText('coreObservationMissing'),
      beginnerSafe: false,
      beginnerWarning: weatherText('beginnerBriefing'),
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

  // Apply compound penalties so one favorable measurement cannot mask several unsafe conditions.
  let compoundPenalty = 0;
  if (waveHeightM > 1.8 && currentSpeedKnot > 2.0) {
    compoundPenalty += 14;
    warnings.push(weatherText('waveAndCurrent'));
  }
  if (visibilityM < 4 && currentSpeedKnot > 1.6) {
    compoundPenalty += 12;
    warnings.push(weatherText('lowVisibilityAndCurrent'));
  }
  if (waterTempC != null && waterTempC < 16 && currentSpeedKnot > 1.6) {
    compoundPenalty += 8;
    warnings.push(weatherText('coldAndCurrent'));
  }
  if (windSpeedMps != null && windSpeedMps > 11 && waveHeightM > 1.5) {
    compoundPenalty += 8;
    warnings.push(weatherText('windAndWave'));
  }
  score -= clamp(0, compoundPenalty, 28);

  score = Math.round(clamp(0, score, 100));

  if (waveHeightM > 1.8) warnings.push(weatherText('highWave'));
  if (currentSpeedKnot > 1.6) warnings.push(weatherText('strongCurrent'));
  if (visibilityM < 5) warnings.push(weatherText('lowVisibility'));
  if (waterTempC != null && waterTempC < 17) warnings.push(weatherText('coldWater'));
  if (windSpeedMps != null && windSpeedMps > 9) warnings.push(weatherText('highWind'));

  const beginnerSafe =
    waveHeightM <= 1.2 &&
    currentSpeedKnot <= 1.2 &&
    visibilityM >= 8 &&
    (waterTempC == null || waterTempC >= 18);

  const beginnerWarning = beginnerSafe
    ? undefined
    : weatherText('beginnerGuide');

  const hardNoDive =
    waveHeightM > 2.6 ||
    currentSpeedKnot > 2.8 ||
    visibilityM < 2.5 ||
    (windSpeedMps != null && windSpeedMps > 14) ||
    compoundPenalty >= 24;

  const level = riskLevelFromScore(score);

  const diveAllowed = !hardNoDive && level !== 'danger';
  const noDiveReason =
    hardNoDive || level === 'danger'
      ? warnings[0] || weatherText('unsafeConditions')
      : undefined;

  const reason =
    warnings[0] ||
    (level === 'good'
      ? weatherText('goodConditions')
      : level === 'normal'
        ? weatherText('normalConditions')
        : level === 'caution'
          ? weatherText('cautionConditions')
          : weatherText('dangerConditions'));

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
  const scoreText = Number.isFinite(score) ? weatherText('score', { score: Math.round(Number(score)) }) : '';
  if (level === 'good') return weatherText('goodSummary', { scoreText }).trim();
  if (level === 'normal') {
    return weatherText('normalSummary', { scoreText }).trim();
  }
  if (level === 'caution') {
    return weatherText('cautionSummary', { scoreText, beginnerWarning: beginnerWarning || '' }).trim();
  }
  return weatherText('dangerSummary', { scoreText }).trim();
}

function buildFallbackWeather(pointId: string, lat: number, lng: number): MarineWeather {
  const fallback: MarineWeather = {
    riskLevel: 'caution',
    observedAt: '',
    pointId,
    lat,
    lng,
    source: 'none',
    summary: weatherText('noMarineData'),
    riskReason: weatherText('liveLookupFailed'),
    dataCompletenessScore: 0,
    riskConfidence: 'low',
    diveAllowed: false,
    noDiveReason: weatherText('noLiveData'),
    beginnerSafe: false,
    beginnerWarning: weatherText('beginnerNoLiveData'),
    warnings: [weatherText('liveDataLoadFailed')],
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
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const freshCache = readCache(lat, lng);
  const cacheEntry = readCacheEntry(lat, lng);
  const staleCache = cacheEntry && !cacheEntry.isFresh ? fromStaleCache(cacheEntry) : null;
  if (freshCache) return withDerivedQuality(freshCache);

  try {
    const source = await apiClient.getMarineWeatherSource(lat, lng);
    const weatherRes: StormglassWeatherResponse = source.weather;
    const tideRes: StormglassTideResponse = source.tides;
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

    // This provider response contains no underwater visibility measurement.
    const visibilityM: number | undefined = undefined;
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
      ? weatherText('sparseHourlyWarning')
      : undefined;
    const waveValues = hourly.map((item) => Number(item.waveHeightM)).filter((value) => Number.isFinite(value));
    const currentValues = hourly.map((item) => Number(item.currentSpeedKnot)).filter((value) => Number.isFinite(value));
    const waveSpan = waveValues.length ? Math.max(...waveValues) - Math.min(...waveValues) : 0;
    const currentSpan = currentValues.length ? Math.max(...currentValues) - Math.min(...currentValues) : 0;
    const variability = variabilityPenalty({ waveSpan, currentSpan });
    const trend = trendPenalty(hourly);
    const thermal = thermalShiftPenalty(hourly);
    const horizon = horizonRiskPenalty(hourly);
    const streak = riskStreakPenalty(hourly);
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
        ? weatherText('tideTransition', {
            tide: weatherText(nearestTide.type === 'high' ? 'highTide' : 'lowTide'),
            minutes: Math.round(nearestTide.minutesDiff),
          })
        : undefined;
    const adjustedScore = clamp(
      0,
      risk.score - tidePenalty - variability.penalty - trend.penalty - thermal.penalty - horizon.penalty - streak.penalty - continuity.penalty,
      100
    );
    const adjustedLevel = riskLevelFromScore(adjustedScore);
    const adjustedWarnings = [
      tideWarning,
      ...variability.warnings,
      ...trend.warnings,
      ...thermal.warnings,
      ...horizon.warnings,
      ...streak.warnings,
      ...continuity.warnings,
      ...risk.warnings,
    ]
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index) as string[];
    const adjustedDiveAllowed =
      risk.diveAllowed && adjustedLevel !== 'danger' && !horizon.forceNoDive && !streak.forceNoDive && !continuity.severeGap;
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
    const sparseNoDiveReason = sparseHourly ? weatherText('sparseHourlyReason') : adjustedNoDiveReason;
    const sparseSummary = sparseHourly
      ? weatherText('sparseHourlySummary')
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
        const staleWarning = weatherText('staleObservationWarning');
        const warnings = [staleWarning, ...(normalized.warnings || [])].filter((item, index, arr) => arr.indexOf(item) === index);
        normalized = {
          ...normalized,
          riskLevel: normalized.riskLevel === 'danger' ? 'danger' : 'caution',
          riskConfidence: 'low',
          diveAllowed: false,
          noDiveReason: weatherText('staleObservationReason'),
          summary: weatherText('staleObservationSummary'),
          warnings,
        };
      } else if (observedAgeMs > 2 * 60 * 60 * 1000) {
        const agedWarning = weatherText('agedObservationWarning');
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
              : normalized.noDiveReason || weatherText('agedObservationReason'),
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
