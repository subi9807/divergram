export type DiveEnvironmentLookupStatus = 'ready' | 'missing_location' | 'historical_unsupported';

export function decideDiveEnvironmentLookup(log: { diveDate?: string; entryTime?: string; entryLocation?: unknown; gpsLocation?: unknown }, now = new Date()): DiveEnvironmentLookupStatus {
  if (!log.entryLocation && !log.gpsLocation) return 'missing_location';
  const dateText = log.diveDate && log.entryTime ? `${log.diveDate}T${log.entryTime}:00` : '';
  const diveTime = dateText ? Date.parse(dateText) : NaN;
  if (!Number.isFinite(diveTime) || Math.abs(now.getTime() - diveTime) > 6 * 60 * 60 * 1000) return 'historical_unsupported';
  return 'ready';
}
