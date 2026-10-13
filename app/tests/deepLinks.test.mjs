import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAppDeepLink, resolveAppDeepLink, rewriteIncomingAppPath } from '../src/lib/deepLinks.ts';

test('canonical HTTPS deep links resolve to app destinations', () => {
  assert.equal(resolveAppDeepLink('https://divergram.com/posts/post-1'), '/(tabs)/post?post=post-1');
  assert.equal(resolveAppDeepLink('https://www.divergram.com/profiles/user%2042'), '/(tabs)/account?userId=user%2042');
  assert.equal(resolveAppDeepLink('https://divergram.com/dive-logs/log-7'), '/(tabs)/dive-log-detail?logId=log-7');
  assert.equal(resolveAppDeepLink('https://divergram.com/reel/reel-2'), '/(tabs)/reels?reelId=reel-2');
  assert.equal(resolveAppDeepLink('https://divergram.com/resort/resort-3'), '/(tabs)/resort-detail?resortId=resort-3');
  assert.equal(resolveAppDeepLink('https://divergram.com/guide/guide-4'), '/(tabs)/dive-guide-detail?id=guide-4');
  assert.equal(resolveAppDeepLink('https://divergram.com/marine-life/fish-5'), '/(tabs)/marine-life-detail?sightingId=fish-5');
  assert.equal(resolveAppDeepLink('https://divergram.com/reels'), '/(tabs)/reels');
  assert.equal(resolveAppDeepLink('https://divergram.com/licenses'), '/(tabs)/license-management');
  assert.equal(resolveAppDeepLink('https://divergram.com/notifications'), '/(tabs)/notifications');
});

test('custom scheme aliases resolve without exposing unknown routes', () => {
  assert.equal(resolveAppDeepLink('divergram://post/post-2'), '/(tabs)/post?post=post-2');
  assert.equal(resolveAppDeepLink('divergram://profile/user-9'), '/(tabs)/account?userId=user-9');
  assert.equal(resolveAppDeepLink('divergram://logs/log-8'), '/(tabs)/dive-log-detail?logId=log-8');
  assert.equal(resolveAppDeepLink('divergram://licenses/card-1'), '/(tabs)/license-management');
  assert.equal(resolveAppDeepLink('https://attacker.invalid/posts/post-3'), '/(tabs)/notifications');
  assert.equal(resolveAppDeepLink(''), '/(tabs)/notifications');
  assert.equal(parseAppDeepLink('https://attacker.invalid/posts/post-3'), null);
  assert.equal(parseAppDeepLink('exp://127.0.0.1:8081'), null);
});

test('native intent paths are rewritten before Expo Router resolves them', () => {
  assert.equal(rewriteIncomingAppPath('https://divergram.com/guide/guide-4'), '/(tabs)/dive-guide-detail?id=guide-4');
  assert.equal(rewriteIncomingAppPath('guide/guide-4'), '/(tabs)/dive-guide-detail?id=guide-4');
  assert.equal(rewriteIncomingAppPath('divergram://notifications'), '/(tabs)/notifications');
  assert.equal(rewriteIncomingAppPath('https://attacker.invalid/posts/post-3'), 'https://attacker.invalid/posts/post-3');
});
