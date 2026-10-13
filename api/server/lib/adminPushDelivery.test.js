import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizePushData,
  requiresPushAudienceConfirmation,
  summarizePushAudience,
  summarizeTokenDelivery,
  isRetryablePushFailure,
} from './adminPushDelivery.js';

test('normalizePushData converts FCM data values to strings', () => {
  assert.deepEqual(
    normalizePushData({
      userId: 18,
      isBlocked: false,
      metadata: { source: 'admin' },
      empty: null,
    }),
    {
      userId: '18',
      isBlocked: 'false',
      metadata: '{"source":"admin"}',
      empty: 'null',
    }
  );
});

test('push audience preview counts users, platforms and token types without exposing tokens', () => {
  const summary = summarizePushAudience([
    { user_id: '18', platform: 'android', push_token: 'token-a', tokenType: 'fcm' },
    { user_id: '18', platform: 'ios', push_token: 'token-b', tokenType: 'fcm' },
    { user_id: '21', platform: 'ios', push_token: 'token-c', tokenType: 'expo' },
  ], { targetRole: 'general', targetUserIds: ['18', '21'] });
  assert.equal(summary.userCount, 2);
  assert.equal(summary.tokenCount, 3);
  assert.deepEqual(summary.platforms, { android: 1, ios: 2 });
  assert.deepEqual(summary.tokenTypes, { fcm: 2, expo: 1 });
  assert.equal(summary.requiresConfirmation, false);
  assert.equal(summary.fingerprint.length, 64);
  assert.equal(JSON.stringify(summary).includes('token-a'), false);
});

test('all-user and high-volume push audiences require explicit confirmation', () => {
  assert.equal(requiresPushAudienceConfirmation({ targetRole: 'all' }, 1), true);
  assert.equal(requiresPushAudienceConfirmation({ targetRole: 'general' }, 99), false);
  assert.equal(requiresPushAudienceConfirmation({ targetRole: 'general' }, 100), true);
  assert.equal(requiresPushAudienceConfirmation({ targetRole: 'all', targetUserIds: ['18'] }, 1), false);
});

test('token delivery summary keeps per-user status and detects only invalid tokens', () => {
  const summary = summarizeTokenDelivery([
    { token_id: 'a', user_id: '18', push_token: 'token-a' },
    { token_id: 'b', user_id: '18', push_token: 'token-b' },
    { token_id: 'c', user_id: '21', push_token: 'token-c' },
  ], [
    { status: 'fulfilled', value: { ok: false, reason: 'invalid_argument' } },
    { status: 'fulfilled', value: { ok: true } },
    { status: 'fulfilled', value: { ok: false, reason: 'UNREGISTERED' } },
  ]);

  assert.equal(summary.successCount, 1);
  assert.equal(summary.failureCount, 2);
  assert.deepEqual(summary.invalidTokens, ['token-c']);
  assert.deepEqual(summary.retryTokenIds, []);
  assert.deepEqual(summary.permanentFailureTokenIds, ['a']);
  assert.deepEqual(summary.userStatuses, [
    { userId: '18', status: 'sent' },
    { userId: '21', status: 'failed' },
  ]);
});

test('only transient push failures are queued for retry', () => {
  const timeout = { status: 'fulfilled', value: { ok: false, reason: 'network timeout' } };
  const rejected = { status: 'rejected', reason: new Error('socket closed') };
  const invalid = { status: 'fulfilled', value: { ok: false, reason: 'UNREGISTERED' } };
  assert.equal(isRetryablePushFailure(timeout), true);
  assert.equal(isRetryablePushFailure(rejected), true);
  assert.equal(isRetryablePushFailure(invalid), false);

  const summary = summarizeTokenDelivery([
    { token_id: 'a', user_id: '18', push_token: 'token-a' },
    { token_id: 'b', user_id: '21', push_token: 'token-b' },
  ], [timeout, rejected]);
  assert.deepEqual(summary.retryTokenIds, ['a', 'b']);
  assert.deepEqual(summary.permanentFailureTokenIds, []);
});
