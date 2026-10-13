import type { DiveLog } from '../models';

const TRACKED_FIELDS = ['diveDate', 'entryTime', 'exitTime', 'totalDiveTime', 'maxDepth', 'avgDepth', 'waterTemperature', 'gpsLocation', 'entryLocation', 'exitLocation', 'divePointName', 'heartRate', 'diveProfileGraph', 'equipmentInfo', 'buddyName', 'memo', 'visibility', 'currentStrength', 'tags', 'media', 'aiSummary', 'aiCaption'] as const;

export type DisplayDiveSource =
  | 'DIVE_COMPUTER'
  | 'USER'
  | 'IMPORT'
  | 'PHOTO_EXIF'
  | 'AI_IMAGE_ANALYSIS'
  | 'WEATHER_API'
  | 'MARINE_API'
  | 'DERIVED';

export interface DiveSourceDetail {
  id: string;
  field: string;
  source: DisplayDiveSource;
  evidenceRef?: string;
}

function displayFieldSource(source: string): DisplayDiveSource {
  return (['DIVE_COMPUTER', 'USER', 'PHOTO_EXIF', 'AI_IMAGE_ANALYSIS', 'WEATHER_API', 'MARINE_API', 'IMPORT', 'DERIVED'].includes(source) ? source : 'USER') as DisplayDiveSource;
}

export function buildDiveSourceDetails(log: DiveLog): DiveSourceDetail[] {
  const fallbackSource = log.sourceType === 'manual' ? 'USER' : log.sourceType === 'legacy_import' ? 'IMPORT' : 'DIVE_COMPUTER';
  const record = log as unknown as Record<string, unknown>;
  const sourceMap = log.fieldSources ?? Object.fromEntries(TRACKED_FIELDS.filter(field => {
    const value = record[field];
    return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
  }).map(field => [field, fallbackSource]));
  const details = Object.entries(sourceMap).map(([field, source]) => ({
    id: `field:${field}`,
    field,
    source: displayFieldSource(source),
    evidenceRef: log.originalSource && source === 'IMPORT' ? 'originalSource' : undefined,
  }));

  for (const media of log.media) {
    if (media.photoMetadata) details.push({ id: `photo-exif:${media.id}`, field: 'photoMetadata', source: 'PHOTO_EXIF', evidenceRef: `media:${media.id}` });
    if (media.aiAnalysis?.confirmed) details.push({ id: `photo-ai:${media.id}`, field: 'photoAnalysis', source: 'AI_IMAGE_ANALYSIS', evidenceRef: `media:${media.id}` });
    if (media.diveMatch?.confirmed) details.push({ id: `photo-match:${media.id}`, field: 'photoMatch', source: 'DERIVED', evidenceRef: `media:${media.id}` });
  }
  if (log.weather && log.weather.source !== 'none') {
    details.push({ id: 'environment', field: 'weather', source: 'WEATHER_API', evidenceRef: log.weather.observedAt });
  }
  return details;
}
