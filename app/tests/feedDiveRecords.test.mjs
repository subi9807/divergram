import test from 'node:test';
import assert from 'node:assert/strict';
import { optionalDiveMetric, feedDiveRecordRows } from '../src/utils/feedDiveRecords.ts';

test('missing measurements never become fabricated zeros', () => {
  for (const value of [null, undefined, '', ' ', false, 'unknown', Infinity]) assert.equal(optionalDiveMetric(value), undefined);
  assert.equal(optionalDiveMetric(0), 0);
  assert.equal(optionalDiveMetric('18.5'), 18.5);
  assert.equal(optionalDiveMetric(-1), -1);
});
test('dive table includes duration and valid zero temperature', () => {
  const rows = feedDiveRecordRows({ diveType: 'scuba', maxDepth: 18, diveDuration: 42, waterTemperature: 0, visibility: 12 });
  assert.deepEqual(rows.map(r => r.key), ['maxDepth', 'diveDuration', 'waterTemperature', 'visibility']);
  assert.equal(rows[1].unit, 'min');
  assert.equal(rows[2].value, 0);
});
test('daily posts and records without measurements have no measurement table', () => {
  assert.deepEqual(feedDiveRecordRows({ diveType: 'daily', maxDepth: 18 }), []);
  assert.deepEqual(feedDiveRecordRows({ diveType: 'freediving' }), []);
  assert.deepEqual(feedDiveRecordRows({ maxDepth: 0, diveDuration: 0, waterTemperature: 0, visibility: 0 }), []);
});
