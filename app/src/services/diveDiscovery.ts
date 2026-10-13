import type { DiveLog } from '../models';

export type DiveSearchFilters = {
  text?: string;
  year?: number;
  minDepth?: number;
  maxDepth?: number;
  sourceType?: 'manual' | 'external';
};

export type MarineLifeCollectionItem = {
  name: string;
  sightings: number;
  diveCount: number;
  firstSeen?: string;
  lastSeen?: string;
};

function normalizedText(log: DiveLog) {
  return [log.divePointName, log.memo, log.aiSummary, log.aiCaption, ...log.tags].filter(Boolean).join(' ').toLocaleLowerCase();
}

function confirmedMarineLife(log: DiveLog) {
  return log.media.flatMap(media => media.aiAnalysis?.confirmed ? media.aiAnalysis.marineLifeCandidates : []);
}

export function buildMarineLifeCollection(logs: DiveLog[]): MarineLifeCollectionItem[] {
  const collection = new Map<string, { name: string; sightings: number; dives: Set<string>; dates: string[] }>();
  for (const log of logs) {
    for (const rawName of confirmedMarineLife(log)) {
      const name = rawName.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      const item = collection.get(key) ?? { name, sightings: 0, dives: new Set<string>(), dates: [] };
      item.sightings += 1;
      item.dives.add(log.id);
      if (/^\d{4}-\d{2}-\d{2}$/.test(log.diveDate)) item.dates.push(log.diveDate);
      collection.set(key, item);
    }
  }
  return [...collection.values()].map(item => ({
    name: item.name,
    sightings: item.sightings,
    diveCount: item.dives.size,
    firstSeen: [...item.dates].sort()[0],
    lastSeen: [...item.dates].sort().at(-1),
  })).sort((a, b) => b.sightings - a.sightings || a.name.localeCompare(b.name));
}

export function calculateDiveStatistics(logs: DiveLog[]) {
  const depths = logs.map(log => log.maxDepth).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const durations = logs.map(log => log.totalDiveTime).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);
  return {
    diveCount: logs.length,
    measuredDepthCount: depths.length,
    measuredDurationCount: durations.length,
    deepestM: depths.length ? Math.max(...depths) : null,
    averageDepthM: depths.length ? depths.reduce((sum, value) => sum + value, 0) / depths.length : null,
    totalDurationMin: totalDuration,
    averageDurationMin: durations.length ? totalDuration / durations.length : null,
    siteCount: new Set(logs.map(log => log.divePointName?.trim()).filter(Boolean)).size,
    marineSpeciesCount: buildMarineLifeCollection(logs).length,
  };
}

export function parseDiveSearchQuery(query: string): DiveSearchFilters {
  const normalized = query.trim();
  const filters: DiveSearchFilters = {};
  const year = normalized.match(/(?:19|20)\d{2}/)?.[0];
  const depth = normalized.match(/(\d+(?:\.\d+)?)\s*(?:m|미터|メートル|米)/i)?.[1];
  if (year) filters.year = Number(year);
  if (depth) {
    const value = Number(depth);
    if (/(?:over|deeper|이상|넘|보다 깊|以上|より深|超过|以上)/i.test(normalized)) filters.minDepth = value;
    else if (/(?:under|shallower|이하|보다 얕|以下|より浅|少于|以下)/i.test(normalized)) filters.maxDepth = value;
  }
  if (/(?:manual|수동|手動|手动)/i.test(normalized)) filters.sourceType = 'manual';
  if (/(?:import|device|연동|가져온|インポート|设备|导入)/i.test(normalized)) filters.sourceType = 'external';
  const residue = normalized
    .replace(/(?:19|20)\d{2}/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*(?:m|미터|メートル|米)/gi, ' ')
    .replace(/(?:over|deeper|under|shallower|이상|이하|넘는|보다\s*[깊얕]은|manual|수동|연동|가져온|インポート|手動|以上|以下|より深い|より浅い|设备|导入|手动|超过|少于)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (residue) filters.text = residue;
  return filters;
}

export function searchDiveLogs(logs: DiveLog[], filters: DiveSearchFilters) {
  return logs.filter(log => {
    if (filters.year && !log.diveDate.startsWith(String(filters.year))) return false;
    if (filters.minDepth != null && (log.maxDepth == null || log.maxDepth < filters.minDepth)) return false;
    if (filters.maxDepth != null && (log.maxDepth == null || log.maxDepth > filters.maxDepth)) return false;
    if (filters.sourceType === 'manual' && log.sourceType !== 'manual') return false;
    if (filters.sourceType === 'external' && log.sourceType === 'manual') return false;
    if (filters.text && !normalizedText(log).includes(filters.text.toLocaleLowerCase())) return false;
    return true;
  });
}

export function buildDiveInsights(logs: DiveLog[]) {
  const stats = calculateDiveStatistics(logs);
  const dated = logs.filter(log => /^\d{4}-\d{2}-\d{2}$/.test(log.diveDate)).sort((a, b) => a.diveDate.localeCompare(b.diveDate));
  const topLife = buildMarineLifeCollection(logs)[0];
  const insights: { key: 'depth' | 'duration' | 'marine' | 'activity'; value: number | string; sampleSize: number }[] = [];
  if (stats.deepestM != null) insights.push({ key: 'depth', value: Number(stats.deepestM.toFixed(1)), sampleSize: stats.measuredDepthCount });
  if (stats.averageDurationMin != null) insights.push({ key: 'duration', value: Math.round(stats.averageDurationMin), sampleSize: stats.measuredDurationCount });
  if (topLife) insights.push({ key: 'marine', value: topLife.name, sampleSize: topLife.diveCount });
  if (dated.length >= 2) {
    const first = Date.parse(`${dated[0].diveDate}T00:00:00Z`);
    const last = Date.parse(`${dated.at(-1)!.diveDate}T00:00:00Z`);
    const months = Math.max(1, Math.ceil((last - first) / (30.4375 * 24 * 60 * 60 * 1000)));
    insights.push({ key: 'activity', value: Number((dated.length / months).toFixed(1)), sampleSize: dated.length });
  }
  return insights;
}
