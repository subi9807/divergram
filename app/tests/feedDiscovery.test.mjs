import test from 'node:test';
import assert from 'node:assert/strict';
import { mixDiscoveryItems } from '../src/features/feed/mixDiscoveryItems.ts';
import { feedCardStyle } from '../src/features/feed/feedCardStyle.ts';
const group = type => [1, 2, 3].map(n => ({ id: `${type}-${n}`, type }));
test('mixed feed preserves posts and ads, with all discovery categories and unique keys', () => {
  const base = Array.from({ length: 10 }, (_, n) => ({ id: `post-${n}`, type: 'post' }));
  base.splice(3, 0, { id: 'ad-1', type: 'ad' });
  const result = mixDiscoveryItems(base, [group('marine'), group('guide'), group('resort')]);
  assert.deepEqual(result.filter(x => ['post', 'ad'].includes(x.type)), base);
  assert.equal(new Set(result.map(x => x.id)).size, result.length);
  for (const type of ['marine', 'guide', 'resort']) assert(result.some(x => x.type === type));
});
test('short and empty feeds show discovery without duplicates; failed sources may be empty', () => {
  for (const base of [[], [{ id: 'p', type: 'post' }]]) {
    const result = mixDiscoveryItems(base, [[], group('guide'), group('resort')]);
    assert.equal(result.filter(x => x.type === 'guide').length, 1);
    assert.equal(result.filter(x => x.type === 'resort').length, 1);
  }
  assert.deepEqual(mixDiscoveryItems([], []), []);
  assert.deepEqual(mixDiscoveryItems(group('post'), []), group('post'));
});
test('all feed card geometry uses a single rounded clipped frame', () => {
  assert.equal(feedCardStyle.borderRadius, 18);
  assert.equal(feedCardStyle.marginHorizontal, 16);
  assert.equal(feedCardStyle.overflow, 'hidden');
});
