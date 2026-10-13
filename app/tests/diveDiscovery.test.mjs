import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiveInsights, buildMarineLifeCollection, calculateDiveStatistics, parseDiveSearchQuery, searchDiveLogs } from '../src/services/diveDiscovery.ts';

const media = names => [{ aiAnalysis: { confirmed: true, marineLifeCandidates: names } }];
const logs = [
  { id: 'a', diveDate: '2025-06-01', divePointName: 'Blue Reef', memo: 'turtle day', tags: ['reef'], media: media(['Sea Turtle']), maxDepth: 24, totalDiveTime: 50, sourceType: 'manual' },
  { id: 'b', diveDate: '2025-07-01', divePointName: 'Blue Wall', memo: '', tags: [], media: media(['Sea Turtle', 'Clownfish']), maxDepth: 31, totalDiveTime: 40, sourceType: 'garmin' },
  { id: 'c', diveDate: '', divePointName: 'Unknown', memo: '', tags: [], media: [{ aiAnalysis: { confirmed: false, marineLifeCandidates: ['Shark'] } }], sourceType: 'manual' },
];

test('collection only counts user-confirmed AI marine candidates', () => {
  assert.deepEqual(buildMarineLifeCollection(logs).map(item => [item.name, item.sightings]), [['Sea Turtle', 2], ['Clownfish', 1]]);
});

test('statistics preserve unknown measurement sample sizes', () => {
  const stats = calculateDiveStatistics(logs);
  assert.equal(stats.diveCount, 3);
  assert.equal(stats.measuredDepthCount, 2);
  assert.equal(stats.deepestM, 31);
  assert.equal(stats.averageDurationMin, 45);
});

test('multilingual search parsing is deterministic and never executes generated code', () => {
  assert.deepEqual(parseDiveSearchQuery('2025 30m 이상 연동'), { year: 2025, minDepth: 30, sourceType: 'external' });
  const filters = parseDiveSearchQuery('Blue 25m以下');
  assert.equal(filters.maxDepth, 25);
  assert.deepEqual(searchDiveLogs(logs, filters).map(log => log.id), ['a']);
});

test('insights include evidence sample sizes and omit unsupported claims', () => {
  const insights = buildDiveInsights(logs);
  assert.ok(insights.length > 0);
  assert.ok(insights.every(item => item.sampleSize > 0));
  assert.equal(insights.some(item => String(item.value).includes('safe')), false);
});
