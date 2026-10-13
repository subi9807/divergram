import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateUniqueOAuthUsername, buildOAuthUsernameBase } from './oauthProfileDefaults.js';

test('OAuth username defaults to the email local part', () => {
  assert.equal(
    buildOAuthUsernameBase({ email: 'Subi.9807+diver@gmail.com', provider: 'google', providerSub: '123' }),
    'subi_9807_diver'
  );
});

test('OAuth username uses provider identity when email is unavailable', () => {
  assert.equal(
    buildOAuthUsernameBase({ email: '', provider: 'instagram', providerSub: '1234567890' }),
    'instagram_1234567890'
  );
});

test('OAuth username gets a random suffix when the base is already in use', async () => {
  const pool = {
    query: async (_sql, [candidate]) => ({ rows: candidate === 'subi9807' ? [{ exists: 1 }] : [] }),
  };
  const crypto = { randomBytes: () => Buffer.from('a1b2c3', 'hex') };
  const username = await allocateUniqueOAuthUsername(pool, crypto, {
    email: 'subi9807@gmail.com',
    provider: 'google',
    providerSub: '123',
  });
  assert.equal(username, 'subi9807_a1b2c3');
});

