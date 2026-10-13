import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDiveSources, correctedDiveSources } from '../src/utils/diveProvenance.ts';
import { mapProviderLogs } from '../src/services/externalDiveLogMapper.ts';

test('sources preserve zero, ignore identity and missing facts', () => {
  assert.deepEqual(initialDiveSources({ id: '1', maxDepth: 0, diveDate: '', memo: undefined, media: [], tags: [] }, 'IMPORT'), { maxDepth: 'IMPORT' });
});
test('unchanged save preserves import attribution; real edits do not mutate originals', () => {
  const current = { memo: 'original', maxDepth: 20, aiSummary: '' };
  const sources = initialDiveSources(current, 'IMPORT');
  const next = correctedDiveSources(current, { memo: 'edited', maxDepth: 20, aiSummary: 'reviewed' }, sources);
  assert.equal(next.maxDepth, 'IMPORT');
  assert.equal(next.memo, 'USER');
  assert.equal(next.aiSummary, 'DERIVED');
  assert.equal(current.memo, 'original');
  assert.equal(sources.memo, 'IMPORT');
});
test('provider duration uses explicit units, not magnitude', () => {
  const rows = mapProviderLogs('garmin', [
    { id: '1', durationSec: 2700 }, { id: '2', duration: 2700 },
    { id: '3', duration: 2700, durationUnit: 'seconds' }, { id: '4', durationMin: 45.5 },
  ]);
  assert.deepEqual(rows.map(row => row.totalDiveTimeMin), [45, undefined, 45, 45.5]);
});

test('generic legacy imports never claim a manufacturer source', () => {
  const [row] = mapProviderLogs('legacy', [{ id: 'legacy-1', date: '2026-09-06' }]);
  assert.equal(row.sourceType, 'legacy_import');
});
test('legacy rows without IDs receive deterministic retry-safe IDs', () => {
  const source = [{ date: '2026-09-06', maxDepth: 20 }];
  assert.equal(mapProviderLogs('legacy', source)[0].externalLogId, mapProviderLogs('legacy', source)[0].externalLogId);
  assert.notEqual(mapProviderLogs('legacy', source)[0].externalLogId, mapProviderLogs('legacy', [{ ...source[0], maxDepth: 21 }])[0].externalLogId);
});
test('provider date/time retain local calendar and absent values stay unknown', () => {
  const rows = mapProviderLogs('suunto', [{ id: '1', startTime: '2026-09-06T00:15:00+09:00' }, { id: '2', maxDepth: null }, { id: '3', date: '2026-02-30', entryTime: '25:70' }]);
  assert.equal(rows[0].diveDate, '2026-09-06');
  assert.equal(rows[0].entryTime, '00:15');
  assert.equal(rows[1].diveDate, '');
  assert.equal(rows[1].maxDepthM, undefined);
  assert.equal(rows[2].diveDate, '');
  assert.equal(rows[2].entryTime, undefined);
});
test('provider GPS validates bounds and raw snapshot is detached', () => {
  const original = { id: '1', gpsLocation: { lat: 0, lng: 0 } };
  const [row, invalid] = mapProviderLogs('shearwater', [original, { id: '2', lat: 91, lng: 0 }]);
  original.gpsLocation.lat = 10;
  assert.deepEqual(row.gpsLocation, { lat: 0, lng: 0 });
  assert.equal(row.rawPayload.gpsLocation.lat, 0);
  assert.equal(invalid.gpsLocation, undefined);
});
