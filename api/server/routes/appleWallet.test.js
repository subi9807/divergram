import assert from 'node:assert/strict';
import test from 'node:test';
import { getAppleWalletReadiness } from './appleWallet.js';

const walletEnvKeys = [
  'APPLE_WALLET_PASS_TYPE_ID',
  'APPLE_WALLET_TEAM_ID',
  'APPLE_WALLET_WWDR_CERT_PATH',
  'APPLE_WALLET_SIGNER_CERT_PATH',
  'APPLE_WALLET_SIGNER_KEY_PATH',
];

test('Apple Wallet readiness reports missing signing configuration', () => {
  const previous = Object.fromEntries(walletEnvKeys.map((key) => [key, process.env[key]]));
  try {
    for (const key of walletEnvKeys) delete process.env[key];
    const result = getAppleWalletReadiness();
    assert.equal(result.ready, false);
    assert.deepEqual(result.missing, walletEnvKeys);
  } finally {
    for (const key of walletEnvKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('Apple Wallet readiness accepts complete signing configuration', () => {
  const previous = Object.fromEntries(walletEnvKeys.map((key) => [key, process.env[key]]));
  try {
    for (const key of walletEnvKeys) process.env[key] = `/configured/${key}`;
    const result = getAppleWalletReadiness();
    assert.equal(result.ready, true);
    assert.deepEqual(result.missing, []);
  } finally {
    for (const key of walletEnvKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
