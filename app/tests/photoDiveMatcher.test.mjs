import test from 'node:test';
import assert from 'node:assert/strict';
import { matchPhotoToDives } from '../src/services/photoDiveMatcher.ts';

const photo = capturedLocal => ({ id: 'p', type: 'image', createdAt: '', updatedAt: '', photoMetadata: { capturedLocal } });
const dive = (id, diveDate, entryTime, exitTime, totalDiveTime) => ({ id, diveDate, entryTime, exitTime, totalDiveTime });

test('photo inside one dive is only suggested, never confirmed automatically', () => {
  const result = matchPhotoToDives(photo('2026-09-06T10:30:00'), [dive('a', '2026-09-06', '10:00', '11:00')]);
  assert.equal(result.status, 'inside');
  assert.equal(result.suggestedLogId, 'a');
  assert.equal('confirmed' in result, false);
});
test('overnight dive crosses midnight without changing the source date', () => {
  const result = matchPhotoToDives(photo('2026-09-07T00:10:00'), [dive('night', '2026-09-06', '23:50', '00:30')]);
  assert.equal(result.status, 'inside');
});
test('duration can define an interval when exit time is absent', () => {
  assert.equal(matchPhotoToDives(photo('2026-09-06T10:45:00'), [dive('a', '2026-09-06', '10:00', undefined, 45)]).status, 'inside');
});
test('overlapping and equally close dives are ambiguous', () => {
  const overlap = [dive('a', '2026-09-06', '10:00', '11:00'), dive('b', '2026-09-06', '10:20', '10:50')];
  assert.equal(matchPhotoToDives(photo('2026-09-06T10:30:00'), overlap).status, 'ambiguous');
  const tied = [dive('a', '2026-09-06', '09:00', '10:00'), dive('b', '2026-09-06', '11:00', '12:00')];
  assert.equal(matchPhotoToDives(photo('2026-09-06T10:30:00'), tied).status, 'ambiguous');
});
test('missing clocks stay unknown and remote photos stay outside', () => {
  assert.equal(matchPhotoToDives(photo(null), [dive('a', '2026-09-06', '10:00', '11:00')]).status, 'unknown');
  assert.equal(matchPhotoToDives(photo('2026-09-07T10:00:00'), [dive('a', '2026-09-06', '10:00', '11:00')]).status, 'outside');
  assert.equal(matchPhotoToDives(photo('2026-09-06T10:00:00'), [dive('a', '', '', '')]).status, 'outside');
});
test('near threshold is deterministic and configurable for clock drift', () => {
  const log = dive('a', '2026-09-06', '10:00', '11:00');
  assert.equal(matchPhotoToDives(photo('2026-09-06T12:30:00'), [log]).status, 'near');
  assert.equal(matchPhotoToDives(photo('2026-09-06T12:30:00'), [log], 60).status, 'outside');
});
