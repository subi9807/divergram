export type DiveFieldSource =
  | 'DIVE_COMPUTER'
  | 'USER'
  | 'PHOTO_EXIF'
  | 'AI_IMAGE_ANALYSIS'
  | 'WEATHER_API'
  | 'MARINE_API'
  | 'IMPORT'
  | 'DERIVED';

const fields = ['diveDate', 'entryTime', 'exitTime', 'totalDiveTime', 'maxDepth', 'avgDepth', 'waterTemperature', 'gpsLocation', 'entryLocation', 'exitLocation', 'divePointName', 'heartRate', 'diveProfileGraph', 'equipmentInfo', 'buddyName', 'memo', 'weather', 'visibility', 'currentStrength', 'tags', 'media', 'aiSummary', 'aiCaption'] as const;

export function initialDiveSources(value: object, source: DiveFieldSource): Record<string, DiveFieldSource> {
  const record = value as Record<string, unknown>;
  return Object.fromEntries(fields.filter(key => {
    const value = record[key];
    return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
  }).map(key => [key, source]));
}

export function correctedDiveSources(current: object, patch: object, existing: Record<string, DiveFieldSource> = {}) {
  const before = current as Record<string, unknown>;
  const changes = patch as Record<string, unknown>;
  const next = { ...existing };
  for (const key of fields) {
    if (!Object.prototype.hasOwnProperty.call(changes, key) || JSON.stringify(before[key]) === JSON.stringify(changes[key])) continue;
    if (key === 'weather') next[key] = 'WEATHER_API';
    else if (key === 'aiSummary' || key === 'aiCaption') next[key] = 'DERIVED';
    else if (key === 'media') {
      const media = Array.isArray(changes[key]) ? changes[key] as Record<string, unknown>[] : [];
      next[key] = media.some((item) => item?.aiAnalysis) ? 'AI_IMAGE_ANALYSIS'
        : media.some((item) => item?.photoMetadata) ? 'PHOTO_EXIF'
          : 'USER';
    } else next[key] = 'USER';
  }
  return next;
}

export function sourceForDiveImport(sourceType: string): DiveFieldSource {
  if (sourceType === 'manual') return 'USER';
  if (sourceType === 'legacy_import') return 'IMPORT';
  return 'DIVE_COMPUTER';
}
