import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIGNUP_CONSENT_POLICIES,
  SIGNUP_CONSENT_VERSION,
  LEGACY_SIGNUP_CONSENT_VERSIONS,
  loadSignupConsentConfig,
  saveSignupConsents,
  validateSignupConsents,
} from '../legal-consents.js';

function validReceipts(overrides = {}) {
  return Object.entries(SIGNUP_CONSENT_POLICIES).map(([key, definition]) => ({
    key,
    policyType: definition.policyType,
    version: SIGNUP_CONSENT_VERSION,
    agreed: definition.required ? true : false,
    ...(overrides[key] || {}),
  }));
}

test('accepts required signup consents while optional consents are declined', () => {
  const result = validateSignupConsents(validReceipts());
  assert.equal(result.ok, true);
  assert.equal(result.receipts.length, Object.keys(SIGNUP_CONSENT_POLICIES).length);
});

test('rejects signup when a required consent is missing', () => {
  const receipts = validReceipts().filter((item) => item.key !== 'privacy_required');
  assert.deepEqual(validateSignupConsents(receipts), { ok: false, error: 'required_consent_missing:privacy_required' });
});

test('rejects signup when a required consent is declined', () => {
  assert.deepEqual(validateSignupConsents(validReceipts({ terms_required: { agreed: false } })), {
    ok: false,
    error: 'required_consent_declined:terms_required',
  });
});

test('rejects stale or forged policy versions', () => {
  assert.deepEqual(validateSignupConsents(validReceipts({ age14_required: { version: 'stale' } })), {
    ok: false,
    error: 'consent_version_invalid:age14_required',
  });
});

test('accepts the supported legacy policy version during the mobile migration window', () => {
  const legacyVersion = LEGACY_SIGNUP_CONSENT_VERSIONS[0];
  const receipts = validReceipts(Object.fromEntries(
    Object.keys(SIGNUP_CONSENT_POLICIES).map((key) => [key, { version: legacyVersion }])
  ));
  const result = validateSignupConsents(receipts);
  assert.equal(result.ok, true);
  assert.equal(result.receipts.every((receipt) => receipt.version === legacyVersion), true);
});

test('persists an immutable receipt row for every signup consent choice', async () => {
  const calls = [];
  const pool = { query: async (sql, params) => calls.push({ sql, params }) };
  const result = validateSignupConsents(validReceipts());
  assert.equal(result.ok, true);
  await saveSignupConsents(pool, '42', result.receipts, { source: 'oauth:apple', locale: 'ko' });
  assert.equal(calls.length, Object.keys(SIGNUP_CONSENT_POLICIES).length);
  assert.equal(calls[0].params[0], '42');
  assert.equal(calls[0].params[5], 'oauth:apple');
  assert.equal(calls.some((call) => call.params[4] === false), true);
});

test('uses the currently published policy version from admin storage', async () => {
  const pool = {
    query: async () => ({
      rows: [{
        record_id: 'terms',
        data: {
          consentKey: 'terms_required',
          version: '2026.08.01',
          requiredForSignup: true,
          enabledForSignup: true,
        },
      }],
    }),
  };
  const config = await loadSignupConsentConfig(pool);
  assert.equal(config.terms_required.version, '2026.08.01');
  const receipts = validReceipts({ terms_required: { version: '2026.08.01' } });
  assert.equal(validateSignupConsents(receipts, config).ok, true);
  assert.equal(validateSignupConsents(validReceipts(), config).ok, false);
});
