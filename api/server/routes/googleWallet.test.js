import assert from 'node:assert/strict';
import test from 'node:test';
import { getGoogleWalletReadiness } from './googleWallet.js';

test('Google Wallet readiness reports missing issuer configuration', () => {
  const keys = ['GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON', 'GOOGLE_WALLET_SERVICE_ACCOUNT_PATH'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    const result = getGoogleWalletReadiness();
    assert.equal(result.ready, false);
    assert.deepEqual(result.missing, ['GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_SERVICE_ACCOUNT']);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('Google Wallet readiness accepts valid inline signing credentials', () => {
  const previousIssuer = process.env.GOOGLE_WALLET_ISSUER_ID;
  const previousJson = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON;
  try {
    process.env.GOOGLE_WALLET_ISSUER_ID = '123456789';
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'wallet@example.iam.gserviceaccount.com', private_key: 'key' });
    assert.deepEqual(getGoogleWalletReadiness(), { ready: true, missing: [] });
  } finally {
    if (previousIssuer === undefined) delete process.env.GOOGLE_WALLET_ISSUER_ID;
    else process.env.GOOGLE_WALLET_ISSUER_ID = previousIssuer;
    if (previousJson === undefined) delete process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON;
    else process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON = previousJson;
  }
});
