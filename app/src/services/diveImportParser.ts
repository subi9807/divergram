import type { DiveLog, ExternalDiveLog } from '../models';
import { mapProviderLogs } from './externalDiveLogMapper';
import { parseDiveCsv } from './diveImportParsing';
import { XMLParser } from 'fast-xml-parser';
export type ImportPreviewRow = { index: number; status: 'ready' | 'possible_duplicate' | 'duplicate' | 'error'; error?: string; source: Record<string, unknown>; normalized?: ExternalDiveLog };
export type DiveImportFormat = 'json' | 'csv' | 'uddf';

function csvRows(input: string) {
  const rows = parseDiveCsv(input);
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).map(cells => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

function scalar(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value) && '#text' in value) return (value as Record<string, unknown>)['#text'];
  return value;
}

function firstDeep(value: unknown, names: Set<string>, depth = 0): unknown {
  if (!value || typeof value !== 'object' || depth > 10) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstDeep(item, names, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (names.has(key.toLowerCase())) return scalar(item);
  }
  for (const item of Object.values(value as Record<string, unknown>)) {
    const found = firstDeep(item, names, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function collectNamed(value: unknown, name: string, result: unknown[] = [], depth = 0): unknown[] {
  if (!value || typeof value !== 'object' || depth > 30 || result.length >= 10_000) return result;
  if (Array.isArray(value)) {
    value.forEach((item) => collectNamed(item, name, result, depth + 1));
    return result;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (key.toLowerCase() === name) result.push(...(Array.isArray(item) ? item : [item]));
    else collectNamed(item, name, result, depth + 1);
  }
  return result;
}

function uddfRows(input: string): Record<string, unknown>[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(input)) throw new Error('unsafe_xml');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    parseTagValue: false,
    parseAttributeValue: false,
    processEntities: false,
    trimValues: true,
  });
  const document = parser.parse(input) as Record<string, unknown>;
  if (!document || !Object.keys(document).some((key) => key.toLowerCase() === 'uddf')) throw new Error('invalid_uddf');
  return collectNamed(document, 'dive').flatMap((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const dive = value as Record<string, unknown>;
    const dateTime = firstDeep(dive, new Set(['datetime', 'starttime', 'entrytime']));
    const date = firstDeep(dive, new Set(['date']));
    const time = firstDeep(dive, new Set(['time']));
    const waypoints = collectNamed(dive, 'waypoint').flatMap((point) => {
      if (!point || typeof point !== 'object' || Array.isArray(point)) return [];
      const depth = Number(firstDeep(point, new Set(['depth'])));
      const t = Number(firstDeep(point, new Set(['divetime', 'time'])));
      return Number.isFinite(depth) && depth >= 0 && Number.isFinite(t) && t >= 0 ? [{ t, depth }] : [];
    }).slice(0, 20_000);
    return [{
      id: scalar(dive['@id']) || scalar(dive.id) || `uddf-${index}`,
      startTime: dateTime || [date, time].filter(Boolean).join('T'),
      maxDepth: firstDeep(dive, new Set(['greatestdepth', 'maximumdepth', 'maxdepth'])),
      avgDepth: firstDeep(dive, new Set(['averagedepth', 'avgdepth'])),
      durationSec: firstDeep(dive, new Set(['divetime', 'diveduration', 'duration'])),
      waterTemperatureC: firstDeep(dive, new Set(['lowesttemperature', 'watertemperature', 'temperature'])),
      memo: firstDeep(dive, new Set(['notes', 'comment', 'remarks'])),
      diveProfileGraph: waypoints.length ? waypoints : undefined,
      uddfOriginal: JSON.parse(JSON.stringify(dive)),
    }];
  });
}

export function previewDiveImport(input: string, format: DiveImportFormat): ImportPreviewRow[] {
  let rows: unknown[];
  try {
    const parsed = format === 'json' ? JSON.parse(input) : format === 'csv' ? csvRows(input) : uddfRows(input);
    rows = Array.isArray(parsed) ? parsed : [parsed];
  }
  catch { return [{ index: 0, status: 'error', error: 'invalid_file', source: {} }]; }
  return rows.slice(0, 10_000).map((raw, index) => { const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}; if (!Object.keys(source).length) return { index, status: 'error', error: 'invalid_row', source }; const normalized = mapProviderLogs('legacy', [{ ...source, id: source.id || `preview-${index}` }])[0]; return normalized ? { index, status: 'ready', source: JSON.parse(JSON.stringify(source)), normalized } : { index, status: 'error', error: 'unrecognized_row', source }; });
}

function closeNumber(left: number | undefined, right: number | undefined, tolerance: number) {
  return left !== undefined && right !== undefined && Math.abs(left - right) <= tolerance;
}

export function assessDiveImportDuplicates(rows: ImportPreviewRow[], existing: DiveLog[]): ImportPreviewRow[] {
  const seen = new Set(existing.map((log) => `${log.sourceType}:${log.externalLogId || ''}`));
  const candidates = existing.filter((log) => Boolean(log.diveDate));
  return rows.map((row) => {
    const dive = row.normalized;
    if (row.status === 'error' || !dive) return row;
    const identity = `${dive.sourceType}:${dive.externalLogId}`;
    if (seen.has(identity)) return { ...row, status: 'duplicate' };
    seen.add(identity);
    const possible = candidates.some((log) => log.diveDate === dive.diveDate && (
      closeNumber(log.maxDepth, dive.maxDepthM, 0.5) ||
      closeNumber(log.totalDiveTime, dive.totalDiveTimeMin, 2)
    ));
    candidates.push({ diveDate: dive.diveDate, maxDepth: dive.maxDepthM, totalDiveTime: dive.totalDiveTimeMin } as DiveLog);
    return possible ? { ...row, status: 'possible_duplicate' } : row;
  });
}
