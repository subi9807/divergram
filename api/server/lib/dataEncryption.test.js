import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptSensitiveJson, encryptSensitiveJson, redactIntegrationTokens } from './dataEncryption.js';

test('AES-GCM sensitive JSON round trip', () => {
  process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  const input = { phone: '+82-10-1234-5678', policyNumber: 'P-123' };
  const encrypted = encryptSensitiveJson(input);
  assert.match(encrypted, /^enc:v1:/);
  assert.deepEqual(decryptSensitiveJson(encrypted), input);
  assert.ok(!encrypted.includes(input.phone));
});

test('integration tokens are omitted from API payloads', () => {
  assert.deepEqual(redactIntegrationTokens({ connected: true, accessToken: 'a', refreshToken: 'r' }), { connected: true });
});
