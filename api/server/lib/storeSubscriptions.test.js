import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStoreSubscriptionConfig,
  publicStoreSubscriptionConfig,
  storeAccountHash,
  storeAccountToken,
  verifyAppleAnnualSubscription,
  verifyGoogleAnnualSubscription,
} from './storeSubscriptions.js';

function compactJws(payload) {
  return `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
}

test('store identity values are deterministic and do not expose the user id', () => {
  const token = storeAccountToken(309, 'a-secure-test-secret');
  const hash = storeAccountHash(309, 'a-secure-test-secret');
  assert.match(token, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(hash.length, 64);
  assert.ok(!token.includes('309'));
  assert.equal(token, storeAccountToken(309, 'a-secure-test-secret'));
});

test('public subscription config contains no server credentials', () => {
  const config = getStoreSubscriptionConfig({
    APPLE_IAP_ISSUER_ID: 'issuer', APPLE_IAP_KEY_ID: 'key', APPLE_IAP_PRIVATE_KEY: 'secret-key',
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'server@example.com', private_key: 'secret' }),
  });
  const result = publicStoreSubscriptionConfig(config, 1, 'secret');
  assert.equal(result.priceHintUsd, '29.99');
  assert.equal(result.ios.enabled, true);
  assert.equal(result.android.enabled, true);
  assert.equal(JSON.stringify(result).includes('secret-key'), false);
  assert.equal(JSON.stringify(result).includes('server@example.com'), false);
});

test('Apple verification accepts only the configured product and account', async () => {
  const accountToken = storeAccountToken(1, 'secret');
  const config = {
    enabled: true, productId: 'com.divergram.app.annual_ai.yearly', bundleId: 'com.divergram.app.ios',
    issuerId: 'issuer', keyId: 'key', privateKey: 'test-key', privateKeyPath: '', appAppleId: 1,
  };
  const result = await verifyAppleAnnualSubscription(config, { transactionId: '2001', environment: 'sandbox' }, accountToken, {
    appleClientFactory: () => ({ getTransactionInfo: async () => ({ signedTransactionInfo: compactJws({
      transactionId: '2001', originalTransactionId: '1001', productId: config.productId,
      bundleId: config.bundleId, appAccountToken: accountToken, environment: 'Sandbox',
      purchaseDate: Date.now() - 1000, expiresDate: Date.now() + 86_400_000,
    }) }) }),
  });
  assert.equal(result.platform, 'ios');
  assert.equal(result.originalTransactionId, '1001');
});

test('Google verification rejects subscriptions linked to another account', async () => {
  const config = { enabled: true, productId: 'annual_ai_yearly', packageName: 'com.divergram.app', serviceAccount: {}, serviceAccountPath: '' };
  const googleAuth = { getClient: async () => ({ request: async () => ({ data: {
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', startTime: new Date().toISOString(), latestOrderId: 'GPA.test',
    externalAccountIdentifiers: { obfuscatedExternalAccountId: 'wrong-account' },
    lineItems: [{ productId: config.productId, expiryTime: new Date(Date.now() + 86_400_000).toISOString(), autoRenewingPlan: { autoRenewEnabled: true } }],
  } }) }) };
  await assert.rejects(
    verifyGoogleAnnualSubscription(config, { purchaseToken: 'token' }, 'expected-account', { googleAuth }),
    /google_play_iap_account_mismatch/
  );
});

test('Google cancelled subscriptions retain the verified remaining paid period, but not after expiry', async () => {
  const config = { enabled: true, productId: 'annual_ai_yearly', packageName: 'com.divergram.app', serviceAccount: {} };
  const payload = {
    subscriptionState: 'SUBSCRIPTION_STATE_CANCELED', startTime: new Date(Date.now() - 1000).toISOString(), latestOrderId: 'GPA.test',
    externalAccountIdentifiers: { obfuscatedExternalAccountId: 'expected-account' },
    lineItems: [{ productId: config.productId, expiryTime: new Date(Date.now() + 86_400_000).toISOString(), autoRenewingPlan: { autoRenewEnabled: false } }],
  };
  const googleAuth = { getClient: async () => ({ request: async () => ({ data: payload }) }) };
  const verify = () => verifyGoogleAnnualSubscription(config, { purchaseToken: 'fixture-token' }, 'expected-account', { googleAuth });
  const result = await verify();
  assert.equal(result.autoRenews, false);
  assert.equal(result.platform, 'android');
  payload.lineItems[0].expiryTime = new Date(Date.now() - 1000).toISOString();
  await assert.rejects(verify(), /google_play_iap_expired/);
});

test('Google pending, paused, held and expired states never grant paid access', async () => {
  const config = { enabled: true, productId: 'annual_ai_yearly', packageName: 'com.divergram.app', serviceAccount: {} };
  for (const state of ['PENDING', 'PAUSED', 'ON_HOLD', 'EXPIRED']) {
    const googleAuth = { getClient: async () => ({ request: async () => ({ data: {
      subscriptionState: `SUBSCRIPTION_STATE_${state}`,
      externalAccountIdentifiers: { obfuscatedExternalAccountId: 'expected-account' },
      lineItems: [{ productId: config.productId, expiryTime: new Date(Date.now() + 86_400_000).toISOString() }],
    } }) }) };
    await assert.rejects(verifyGoogleAnnualSubscription(config, { purchaseToken: 'fixture-token' }, 'expected-account', { googleAuth }), /google_play_iap_not_active/);
  }
});
