import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { AppStoreServerAPIClient, Environment } from '@apple/app-store-server-library';
import { GoogleAuth } from 'google-auth-library';

export const ANNUAL_PLAN_CODE = 'annual_ai';
export const ANNUAL_PRICE_HINT_USD = '29.99';
export const DEFAULT_IOS_PRODUCT_ID = 'com.divergram.app.annual_ai.yearly';
export const DEFAULT_ANDROID_PRODUCT_ID = 'annual_ai_yearly';

const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);

function parseJson(value) {
  try { return JSON.parse(String(value || '')); } catch { return null; }
}

function decodeJwsPayload(value) {
  const part = clean(value, 100_000).split('.')[1];
  if (!part) throw Object.assign(new Error('invalid_apple_signed_transaction'), { status: 400 });
  const parsed = parseJson(Buffer.from(part, 'base64url').toString('utf8'));
  if (!parsed) throw Object.assign(new Error('invalid_apple_signed_transaction'), { status: 400 });
  return parsed;
}

function normalizedPrivateKey(value) {
  return clean(value, 20_000).replace(/\\n/g, '\n');
}

export function getStoreSubscriptionConfig(env = process.env) {
  const iosProductId = clean(env.APPLE_IAP_ANNUAL_PRODUCT_ID || DEFAULT_IOS_PRODUCT_ID, 240);
  const androidProductId = clean(env.GOOGLE_PLAY_ANNUAL_PRODUCT_ID || DEFAULT_ANDROID_PRODUCT_ID, 240);
  const apple = {
    productId: iosProductId,
    bundleId: clean(env.APPLE_IAP_BUNDLE_ID || 'com.divergram.app.ios', 240),
    appAppleId: Number(env.APPLE_IAP_APP_ID || 6769253236),
    issuerId: clean(env.APPLE_IAP_ISSUER_ID, 240),
    keyId: clean(env.APPLE_IAP_KEY_ID, 240),
    privateKey: normalizedPrivateKey(env.APPLE_IAP_PRIVATE_KEY),
    privateKeyPath: clean(env.APPLE_IAP_PRIVATE_KEY_PATH, 1000),
  };
  const google = {
    productId: androidProductId,
    packageName: clean(env.GOOGLE_PLAY_PACKAGE_NAME || 'com.divergram.app', 240),
    serviceAccount: parseJson(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON),
    serviceAccountPath: clean(env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH, 1000),
  };
  return {
    apple: { ...apple, enabled: Boolean(apple.issuerId && apple.keyId && (apple.privateKey || apple.privateKeyPath)) },
    google: { ...google, enabled: Boolean(google.serviceAccount || google.serviceAccountPath) },
  };
}

export function publicStoreSubscriptionConfig(config, userId, secret) {
  return {
    planCode: ANNUAL_PLAN_CODE,
    monthlyCredits: 30,
    priceHintUsd: ANNUAL_PRICE_HINT_USD,
    appAccountToken: storeAccountToken(userId, secret),
    obfuscatedAccountId: storeAccountHash(userId, secret),
    ios: { enabled: config.apple.enabled, productId: config.apple.productId },
    android: { enabled: config.google.enabled, productId: config.google.productId },
  };
}

export function storeAccountHash(userId, secret) {
  return crypto.createHmac('sha256', clean(secret, 4000)).update(`store-account:${userId}`).digest('hex');
}

export function storeAccountToken(userId, secret) {
  const bytes = Buffer.from(storeAccountHash(userId, secret).slice(0, 32), 'hex');
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function applePrivateKey(config) {
  if (config.privateKey) return config.privateKey;
  if (config.privateKeyPath) return fs.readFile(config.privateKeyPath, 'utf8');
  throw Object.assign(new Error('apple_iap_not_configured'), { status: 503 });
}

function validateApplePayload(payload, config, expectedAccountToken) {
  const expiresAt = new Date(Number(payload.expiresDate || 0));
  const transactionId = clean(payload.transactionId, 240);
  const originalTransactionId = clean(payload.originalTransactionId || transactionId, 240);
  if (payload.bundleId !== config.bundleId || payload.productId !== config.productId) throw Object.assign(new Error('apple_iap_product_mismatch'), { status: 409 });
  if (clean(payload.appAccountToken, 80).toLowerCase() !== expectedAccountToken.toLowerCase()) throw Object.assign(new Error('apple_iap_account_mismatch'), { status: 409 });
  if (!transactionId || !originalTransactionId || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) throw Object.assign(new Error('apple_iap_not_active'), { status: 409 });
  if (payload.revocationDate) throw Object.assign(new Error('apple_iap_revoked'), { status: 409 });
  return {
    platform: 'ios', productId: payload.productId, transactionId, originalTransactionId,
    startedAt: new Date(Number(payload.purchaseDate || Date.now())), expiresAt,
    autoRenews: true, environment: clean(payload.environment, 40),
    metadata: { originalTransactionId, transactionReason: clean(payload.transactionReason, 80), ownershipType: clean(payload.inAppOwnershipType, 80) },
  };
}

export async function verifyAppleAnnualSubscription(config, input, expectedAccountToken, dependencies = {}) {
  if (!config.enabled) throw Object.assign(new Error('apple_iap_not_configured'), { status: 503 });
  const transactionId = clean(input?.transactionId, 240);
  if (!transactionId) throw Object.assign(new Error('apple_iap_transaction_required'), { status: 400 });
  const signingKey = await applePrivateKey(config);
  const environments = clean(input?.environment, 40).toLowerCase() === 'sandbox'
    ? [Environment.SANDBOX, Environment.PRODUCTION]
    : [Environment.PRODUCTION, Environment.SANDBOX];
  let lastError;
  for (const environment of environments) {
    try {
      const client = dependencies.appleClientFactory
        ? dependencies.appleClientFactory(environment)
        : new AppStoreServerAPIClient(signingKey, config.keyId, config.issuerId, config.bundleId, environment);
      const response = await client.getTransactionInfo(transactionId);
      return validateApplePayload(decodeJwsPayload(response.signedTransactionInfo), config, expectedAccountToken);
    } catch (error) { lastError = error; }
  }
  throw Object.assign(new Error('apple_iap_verification_failed'), { status: Number(lastError?.status) || 502, cause: lastError });
}

async function googleCredentials(config) {
  if (config.serviceAccount) return config.serviceAccount;
  if (config.serviceAccountPath) return parseJson(await fs.readFile(config.serviceAccountPath, 'utf8'));
  return null;
}

export async function verifyGoogleAnnualSubscription(config, input, expectedAccountHash, dependencies = {}) {
  if (!config.enabled) throw Object.assign(new Error('google_play_iap_not_configured'), { status: 503 });
  const purchaseToken = clean(input?.purchaseToken, 4000);
  if (!purchaseToken) throw Object.assign(new Error('google_play_purchase_token_required'), { status: 400 });
  const credentials = await googleCredentials(config);
  if (!credentials) throw Object.assign(new Error('google_play_iap_not_configured'), { status: 503 });
  const auth = dependencies.googleAuth || new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
  const client = await auth.getClient();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(config.packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await client.request({ url, method: 'GET' });
  const payload = response.data || {};
  const state = clean(payload.subscriptionState, 80);
  const lineItem = (Array.isArray(payload.lineItems) ? payload.lineItems : []).find(item => item?.productId === config.productId);
  const expiresAt = new Date(lineItem?.expiryTime || 0);
  const accountId = clean(payload.externalAccountIdentifiers?.obfuscatedExternalAccountId, 100);
  // Cancellation stops renewal, not the already-paid period. Expiry is checked below.
  // https://developer.android.com/google/play/billing/lifecycle/subscriptions#cancellations
  if (!lineItem || !['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED'].includes(state)) throw Object.assign(new Error('google_play_iap_not_active'), { status: 409 });
  if (accountId !== expectedAccountHash) throw Object.assign(new Error('google_play_iap_account_mismatch'), { status: 409 });
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) throw Object.assign(new Error('google_play_iap_expired'), { status: 409 });
  return {
    platform: 'android', productId: config.productId,
    transactionId: clean(payload.latestOrderId || crypto.createHash('sha256').update(purchaseToken).digest('hex'), 240),
    originalTransactionId: crypto.createHash('sha256').update(purchaseToken).digest('hex'),
    startedAt: new Date(payload.startTime || Date.now()), expiresAt,
    autoRenews: lineItem.autoRenewingPlan?.autoRenewEnabled === true,
    environment: payload.testPurchase ? 'test' : 'production',
    metadata: { subscriptionState: state, latestOrderId: clean(payload.latestOrderId, 240), regionCode: clean(payload.regionCode, 8) },
  };
}

export async function saveVerifiedMembership(pool, userId, purchase) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id,user_id FROM app_memberships WHERE platform=$1 AND store_transaction_id=$2 FOR UPDATE', [purchase.platform, purchase.originalTransactionId]);
    if (existing.rows.length && String(existing.rows[0].user_id) !== String(userId)) throw Object.assign(new Error('store_purchase_already_claimed'), { status: 409 });
    const membershipId = existing.rows[0]?.id || crypto.randomUUID();
    const result = await client.query(`INSERT INTO app_memberships(id,user_id,plan_code,status,platform,store_product_id,store_transaction_id,started_at,expires_at,auto_renews,metadata,updated_at)
      VALUES($1,$2,$3,'active',$4,$5,$6,$7,$8,$9,$10::jsonb,now())
      ON CONFLICT(platform,store_transaction_id) WHERE store_transaction_id IS NOT NULL DO UPDATE SET
        status='active',store_product_id=EXCLUDED.store_product_id,started_at=LEAST(app_memberships.started_at,EXCLUDED.started_at),expires_at=GREATEST(app_memberships.expires_at,EXCLUDED.expires_at),auto_renews=EXCLUDED.auto_renews,metadata=EXCLUDED.metadata,updated_at=now()
      RETURNING *`, [membershipId, userId, ANNUAL_PLAN_CODE, purchase.platform, purchase.productId, purchase.originalTransactionId, purchase.startedAt, purchase.expiresAt, purchase.autoRenews, JSON.stringify(purchase.metadata)]);
    await client.query(`INSERT INTO app_store_subscription_events(id,user_id,membership_id,platform,event_type,store_product_id,store_transaction_id,environment,status,expires_at,payload)
      VALUES($1,$2,$3,$4,'purchase_verified',$5,$6,$7,'verified',$8,$9::jsonb)
      ON CONFLICT(platform,event_type,store_transaction_id,status) DO NOTHING`, [crypto.randomUUID(), userId, result.rows[0].id, purchase.platform, purchase.productId, purchase.transactionId, purchase.environment, purchase.expiresAt, JSON.stringify(purchase.metadata)]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally { client.release(); }
}
