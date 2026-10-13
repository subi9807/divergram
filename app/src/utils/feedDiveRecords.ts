export function optionalDiveMetric(value: unknown): number | undefined {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export type FeedDiveRecords = {
  diveType?: string;
  maxDepth?: number;
  diveDuration?: number;
  waterTemperature?: number;
  visibility?: number;
  buddyName?: string;
};

export function feedDiveRecordRows(post: FeedDiveRecords) {
  if (post.diveType === 'daily') return [];
  const fields = [
    ['maxDepth', post.maxDepth, 'm'],
    ['diveDuration', post.diveDuration, 'min'],
    ['waterTemperature', post.waterTemperature, '°C'],
    ['visibility', post.visibility, 'm'],
  ] as const;
  // Legacy forms saved all four blank measurements as zero; this is not a completed dive.
  if (fields.every(([, value]) => optionalDiveMetric(value) === 0)) return [];
  return fields.flatMap(([key, raw, unit]) => {
    const value = optionalDiveMetric(raw);
    return value === undefined ? [] : [{ key, value, unit }];
  });
}
