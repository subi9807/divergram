import type { ExternalDiveLog, ExternalSourceType } from '../models';
import type { ExternalProviderKey } from '../lib/api';

const sourceByProvider: Record<ExternalProviderKey, ExternalSourceType> = {
  garmin: 'garmin_api',
  suunto: 'suunto_api',
  shearwater: 'shearwater_api',
};

function asNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function asString(value: unknown): string {
  return String(value || '').trim();
}

function toDateOnly(value: unknown): string | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function toTime(value: unknown): string | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  const hhmm = raw.match(/(\d{2}):(\d{2})/);
  if (hhmm) return `${hhmm[1]}:${hhmm[2]}`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(11, 16);
}

function firstValue(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function toMinutes(value: unknown): number | undefined {
  const n = asNumber(value);
  if (n === undefined) return undefined;
  if (n > 3000) return Math.round(n / 60); // seconds -> minutes
  return Math.round(n);
}

function normalizeGraph(value: unknown): { t: number; depth: number }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows = value
    .map((item: any, idx) => {
      const t = asNumber(item?.t ?? item?.time ?? idx);
      const depth = asNumber(item?.depth ?? item?.d ?? item?.depthM);
      if (t === undefined || depth === undefined) return null;
      return { t, depth };
    })
    .filter(Boolean) as { t: number; depth: number }[];
  return rows.length ? rows : undefined;
}

export function mapProviderLogs(provider: ExternalProviderKey, rows: any[]): ExternalDiveLog[] {
  const sourceType = sourceByProvider[provider];
  return rows
    .map((row, index) => {
      const externalLogId =
        asString(firstValue(row, ['externalLogId', 'logId', 'id', 'uuid', 'diveId'])) ||
        `${provider}_${Date.now()}_${index}`;

      const diveDate =
        toDateOnly(firstValue(row, ['diveDate', 'date', 'startDate', 'startTime', 'entryTime'])) ||
        new Date().toISOString().slice(0, 10);

      const entryTime = toTime(firstValue(row, ['entryTime', 'startTime', 'inTime']));
      const exitTime = toTime(firstValue(row, ['exitTime', 'endTime', 'outTime']));

      const lat = asNumber(firstValue(row, ['lat', 'latitude', 'gpsLat', 'entryLat']));
      const lng = asNumber(firstValue(row, ['lng', 'longitude', 'gpsLng', 'entryLng']));

      const avgHr = asNumber(firstValue(row, ['avgHeartRate', 'heartRateAvg', 'avg_hr']));
      const maxHr = asNumber(firstValue(row, ['maxHeartRate', 'heartRateMax', 'max_hr']));

      return {
        sourceType,
        externalLogId,
        deviceId: asString(firstValue(row, ['deviceId', 'computerId', 'watchId'])) || undefined,
        deviceName: asString(firstValue(row, ['deviceName', 'computerName', 'watchName'])) || undefined,
        diveDate,
        entryTime,
        exitTime,
        totalDiveTimeMin: toMinutes(firstValue(row, ['totalDiveTimeMin', 'durationMin', 'duration', 'bottomTime', 'diveTime'])),
        maxDepthM: asNumber(firstValue(row, ['maxDepthM', 'maxDepth', 'depthMax'])),
        avgDepthM: asNumber(firstValue(row, ['avgDepthM', 'avgDepth', 'depthAvg'])),
        waterTemperatureC: asNumber(firstValue(row, ['waterTemperatureC', 'waterTempC', 'temperatureC', 'tempC'])),
        gpsLocation: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
        heartRate: avgHr !== undefined || maxHr !== undefined ? { avg: avgHr, max: maxHr } : undefined,
        diveProfileGraph: normalizeGraph(firstValue(row, ['diveProfileGraph', 'profileGraph', 'profile'])),
        equipmentInfo: asString(firstValue(row, ['equipmentInfo', 'equipment', 'gear'])) || undefined,
        memo: asString(firstValue(row, ['memo', 'notes', 'comment'])) || undefined,
        rawPayload: typeof row === 'object' && row ? row : undefined,
      } as ExternalDiveLog;
    })
    .filter((row) => Boolean(row.externalLogId));
}

export function buildMockExternalLogs(provider: ExternalProviderKey): ExternalDiveLog[] {
  const today = new Date().toISOString().slice(0, 10);
  if (provider === 'garmin') {
    return [
      {
        sourceType: 'garmin_api',
        externalLogId: `garmin_${today}`,
        deviceId: 'garmin-descent-mk2',
        deviceName: 'Garmin Descent MK2',
        diveDate: today,
        entryTime: '09:10',
        exitTime: '09:52',
        totalDiveTimeMin: 42,
        maxDepthM: 18.6,
        avgDepthM: 11.2,
        waterTemperatureC: 22,
        gpsLocation: { lat: 33.2196, lng: 126.569 },
        heartRate: { avg: 118, max: 141 },
        equipmentInfo: 'Garmin Auto Import',
        memo: 'Garmin sync sample',
      },
    ];
  }
  if (provider === 'suunto') {
    return [
      {
        sourceType: 'suunto_api',
        externalLogId: `suunto_${today}`,
        deviceId: 'suunto-d5',
        deviceName: 'Suunto D5',
        diveDate: today,
        entryTime: '11:05',
        exitTime: '11:42',
        totalDiveTimeMin: 37,
        maxDepthM: 14.1,
        avgDepthM: 8.3,
        waterTemperatureC: 21,
        gpsLocation: { lat: 33.2201, lng: 126.5611 },
        equipmentInfo: 'Suunto Cloud Import',
        memo: 'Suunto sync sample',
      },
    ];
  }
  return [
    {
      sourceType: 'shearwater_api',
      externalLogId: `shearwater_${today}`,
      deviceId: 'shearwater-teric',
      deviceName: 'Shearwater Teric',
      diveDate: today,
      entryTime: '15:12',
      exitTime: '15:58',
      totalDiveTimeMin: 46,
      maxDepthM: 24.5,
      avgDepthM: 13.7,
      waterTemperatureC: 20,
      gpsLocation: { lat: 33.2144, lng: 126.5772 },
      heartRate: { avg: 122, max: 150 },
      equipmentInfo: 'Shearwater Cloud Import',
      memo: 'Shearwater sync sample',
    },
  ];
}
