import type { DiveLog, MarineWeather } from '../models';
import { getMarineWeatherByLatLng } from './stormglassService';
import { decideDiveEnvironmentLookup } from './diveEnvironmentPolicy';

export type DiveEnvironmentResult = { status: 'available'; data: MarineWeather; temporalScope: 'current'; source: 'stormglass' | 'cache' } | { status: 'missing_location' | 'historical_unsupported' | 'provider_unavailable'; data: null };

type MarineWeatherFetcher = typeof getMarineWeatherByLatLng;

export async function loadEnvironmentForDive(log: DiveLog, now = new Date(), fetchWeather: MarineWeatherFetcher = getMarineWeatherByLatLng): Promise<DiveEnvironmentResult> {
  const point = log.entryLocation ?? log.gpsLocation;
  const decision = decideDiveEnvironmentLookup(log, now);
  if (decision !== 'ready') return { status: decision, data: null };
  if (!point) return { status: 'missing_location', data: null };
  try {
    const data = await fetchWeather(point.lat, point.lng);
    return data && data.source !== 'none' ? { status: 'available', data, temporalScope: 'current', source: data.source } : { status: 'provider_unavailable', data: null };
  } catch { return { status: 'provider_unavailable', data: null }; }
}
