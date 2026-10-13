export const SIGNUP_CONSENT_VERSION = '2026.09.11';
export const LEGACY_SIGNUP_CONSENT_VERSIONS = Object.freeze(['2026.07.22']);

export const SIGNUP_CONSENT_POLICIES = Object.freeze({
  terms_required: { policyType: 'terms', required: true },
  privacy_required: { policyType: 'privacy', required: true },
  age14_required: { policyType: 'age14_notice', required: true },
  marketing_optional: { policyType: 'marketing_consent', required: false },
  push_optional: { policyType: 'push_consent', required: false },
});

export async function loadSignupConsentConfig(pool) {
  try {
    const q = await pool.query(
      `SELECT record_id, data FROM app_records
       WHERE table_name='legal_policies' AND COALESCE((data->>'published')::boolean, false)=true`
    );
    const config = Object.fromEntries(Object.entries(SIGNUP_CONSENT_POLICIES).map(([key, definition]) => [
      key,
      { ...definition, version: SIGNUP_CONSENT_VERSION },
    ]));
    for (const row of q.rows) {
      const data = row.data || {};
      const key = String(data.consentKey || '');
      if (!key || !config[key] || data.enabledForSignup === false) continue;
      config[key] = {
        policyType: String(row.record_id || data.type || config[key].policyType),
        required: Boolean(data.requiredForSignup),
        version: String(data.version || SIGNUP_CONSENT_VERSION),
      };
    }
    return config;
  } catch {
    return Object.fromEntries(Object.entries(SIGNUP_CONSENT_POLICIES).map(([key, definition]) => [
      key,
      { ...definition, version: SIGNUP_CONSENT_VERSION },
    ]));
  }
}

export function validateSignupConsents(input, policyConfig = SIGNUP_CONSENT_POLICIES) {
  const receipts = Array.isArray(input) ? input : [];
  const normalized = [];

  for (const [key, definition] of Object.entries(policyConfig)) {
    const receipt = receipts.find((item) => String(item?.key || '') === key);
    if (!receipt) {
      if (definition.required) return { ok: false, error: `required_consent_missing:${key}` };
      normalized.push({ key, ...definition, version: definition.version || SIGNUP_CONSENT_VERSION, agreed: false });
      continue;
    }

    const version = String(receipt.version || '').trim();
    const policyType = String(receipt.policyType || receipt.policy_type || '').trim();
    const agreed = receipt.agreed === true;
    const currentVersion = definition.version || SIGNUP_CONSENT_VERSION;
    const acceptedVersions = new Set([
      currentVersion,
      ...(Array.isArray(definition.acceptedVersions) ? definition.acceptedVersions : []),
      ...LEGACY_SIGNUP_CONSENT_VERSIONS,
    ]);
    if (!acceptedVersions.has(version) || policyType !== definition.policyType) {
      return { ok: false, error: `consent_version_invalid:${key}` };
    }
    if (definition.required && !agreed) return { ok: false, error: `required_consent_declined:${key}` };
    normalized.push({ key, ...definition, version, agreed });
  }

  return { ok: true, receipts: normalized };
}

export async function saveSignupConsents(pool, userId, receipts, metadata = {}) {
  const source = String(metadata.source || 'unknown').slice(0, 32);
  const locale = String(metadata.locale || 'ko').slice(0, 12);
  for (const receipt of receipts) {
    await pool.query(
      `INSERT INTO app_user_consents
        (user_id, consent_key, policy_type, policy_version, agreed, agreed_at, source, locale)
       VALUES ($1,$2,$3,$4,$5,CASE WHEN $5 THEN now() ELSE NULL END,$6,$7)`,
      [String(userId), receipt.key, receipt.policyType, receipt.version, receipt.agreed, source, locale]
    );
  }
}
