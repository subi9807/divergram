import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationDestination, markNotificationsRead } from '../src/lib/notificationNavigation.ts';
const row = { type: 'system', actor: { id: '' } };
test('inbox opens resorts, profiles and logs through the shared destination contract', () => {
  assert.equal(notificationDestination({ ...row, deepLink: 'divergram://resorts/r1' }), '/(tabs)/resort-detail?resortId=r1');
  assert.equal(notificationDestination({ ...row, type: 'follow', actor: { id: 'member 1' } }), '/(tabs)/account?userId=member%201');
  assert.equal(notificationDestination({ ...row, deepLink: 'https://divergram.com/logs/l1' }), '/(tabs)/dive-log-detail?logId=l1');
  assert.equal(notificationDestination({ ...row, deepLink: 'https://untrusted.invalid/posts/p1' }), null);
  assert.doesNotThrow(() => notificationDestination({ ...row, deepLink: 'divergram://posts/%zz' }));
});
test('mark all reports partial failure and bounds concurrent requests', async () => {
  let active = 0, max = 0;
  const result = await markNotificationsRead(Array.from({ length: 13 }, (_, i) => String(i)), async id => {
    active++; max = Math.max(active, max);
    await new Promise(resolve => setTimeout(resolve, 2));
    active--;
    if (id === '4') throw new Error('offline');
  });
  assert.deepEqual(result, { failed: 1, succeeded: 12 });
  assert.ok(max <= 5);
});
