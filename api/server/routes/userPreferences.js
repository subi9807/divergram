const DEFAULT_PREFERENCES = {
  language: 'ko',
  theme: 'system',
  profilePublic: true,
  postVisibility: 'public',
  diveLogVisibility: 'public',
  locationSharing: true,
  locationTracking: true,
  analyticsEnabled: true,
  preferredDiveType: 'scuba',
  depthUnit: 'm',
  temperatureUnit: 'c',
  gasPressureUnit: 'bar',
  units: 'metric',
  defaultDiveMode: 'recreational',
  emergencyShareEnabled: false,
  bottomTabItems: ['index', 'explore', 'location', 'logs', 'profile'],
  blockedUsers: [],
  emergencyContact: { name: '', phone: '', relation: '' },
  insuranceInfo: { provider: '', policyNumber: '', emergencyPhone: '', validUntil: '' },
  integrationState: { integrations: [], syncFailures: [], autoSyncEnabled: true, registeredDiveDevices: [] },
  legalState: { consentHistory: [], legalAgreements: [], reports: [], moderationActions: [] },
};

const ENUMS = {
  language: new Set(['ko', 'en', 'ja', 'zh']),
  theme: new Set(['light', 'dark', 'system']),
  postVisibility: new Set(['public', 'followers', 'private']),
  diveLogVisibility: new Set(['public', 'followers', 'private']),
  preferredDiveType: new Set(['scuba', 'freediving', 'snorkeling']),
  depthUnit: new Set(['m', 'ft']),
  temperatureUnit: new Set(['c', 'f']),
  gasPressureUnit: new Set(['bar', 'psi']),
  units: new Set(['metric', 'imperial']),
  defaultDiveMode: new Set(['recreational', 'technical']),
};

const BOOLEAN_KEYS = [
  'profilePublic',
  'locationSharing',
  'locationTracking',
  'analyticsEnabled',
  'emergencyShareEnabled',
];

const TAB_ITEMS = new Set(['index', 'explore', 'location', 'logs', 'profile', 'messages', 'notifications', 'resorts']);

function text(value, maxLength = 120) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeBlockedUsers(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 500).map((item) => ({
    id: text(item?.id, 120),
    name: text(item?.name, 120),
    reason: text(item?.reason, 300) || undefined,
    blockedAt: text(item?.blockedAt, 40),
  })).filter((item) => item.id && item.name);
}

function boundedArray(value, limit, maxBytes = 200_000) {
  if (!Array.isArray(value)) return [];
  const rows = value.slice(0, limit).filter((item) => item && typeof item === 'object' && !Array.isArray(item));
  try {
    return Buffer.byteLength(JSON.stringify(rows), 'utf8') <= maxBytes ? rows : [];
  } catch {
    return [];
  }
}

function normalizePreferences(input, fallback = DEFAULT_PREFERENCES) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const next = { ...fallback };

  for (const [key, allowed] of Object.entries(ENUMS)) {
    if (allowed.has(source[key])) next[key] = source[key];
  }
  for (const key of BOOLEAN_KEYS) {
    if (typeof source[key] === 'boolean') next[key] = source[key];
  }

  if (Array.isArray(source.bottomTabItems)) {
    const tabs = [...new Set(source.bottomTabItems.filter((item) => TAB_ITEMS.has(item)))].slice(0, 5);
    if (tabs.length >= 3) next.bottomTabItems = tabs;
  }

  if (Object.prototype.hasOwnProperty.call(source, 'blockedUsers')) {
    next.blockedUsers = normalizeBlockedUsers(source.blockedUsers);
  }
  if (source.emergencyContact && typeof source.emergencyContact === 'object') {
    next.emergencyContact = {
      name: text(source.emergencyContact.name),
      phone: text(source.emergencyContact.phone, 60),
      relation: text(source.emergencyContact.relation),
    };
  }
  if (source.insuranceInfo && typeof source.insuranceInfo === 'object') {
    next.insuranceInfo = {
      provider: text(source.insuranceInfo.provider),
      policyNumber: text(source.insuranceInfo.policyNumber, 120),
      emergencyPhone: text(source.insuranceInfo.emergencyPhone, 60),
      validUntil: text(source.insuranceInfo.validUntil, 40),
    };
  }
  if (source.integrationState && typeof source.integrationState === 'object') {
    next.integrationState = {
      integrations: boundedArray(source.integrationState.integrations, 50),
      syncFailures: boundedArray(source.integrationState.syncFailures, 120),
      autoSyncEnabled: source.integrationState.autoSyncEnabled !== false,
      registeredDiveDevices: boundedArray(source.integrationState.registeredDiveDevices, 100),
    };
  }
  if (source.legalState && typeof source.legalState === 'object') {
    next.legalState = {
      consentHistory: boundedArray(source.legalState.consentHistory, 100),
      legalAgreements: boundedArray(source.legalState.legalAgreements, 300),
      reports: boundedArray(source.legalState.reports, 500, 500_000),
      moderationActions: boundedArray(source.legalState.moderationActions, 500, 500_000),
    };
  }

  return next;
}

async function readPreferences(pool, userId) {
  const result = await pool.query(
    "SELECT data, updated_at FROM app_records WHERE table_name='user_preferences' AND record_id=$1 LIMIT 1",
    [String(userId)]
  );
  const row = result.rows[0] || null;
  if (!row?.data) return row;
  const data = { ...row.data };
  if (data.sensitiveData) {
    const sensitive = decryptSensitiveJson(data.sensitiveData, {});
    data.emergencyContact = sensitive?.emergencyContact || DEFAULT_PREFERENCES.emergencyContact;
    data.insuranceInfo = sensitive?.insuranceInfo || DEFAULT_PREFERENCES.insuranceInfo;
    delete data.sensitiveData;
  }
  return { ...row, data };
}

function encryptPreferences(preferences) {
  const stored = { ...preferences };
  stored.sensitiveData = encryptSensitiveJson({
    emergencyContact: stored.emergencyContact,
    insuranceInfo: stored.insuranceInfo,
  });
  delete stored.emergencyContact;
  delete stored.insuranceInfo;
  return stored;
}

export function registerUserPreferencesRoutes(app, { pool, getAuthUserId, authRateLimit }) {
  app.get('/api/preferences/me', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const found = await readPreferences(pool, userId);
      return res.json({
        ok: true,
        data: normalizePreferences(found?.data),
        exists: Boolean(found),
        updatedAt: found?.updated_at || null,
      });
    } catch {
      return res.status(500).json({ error: 'preferences_read_failed' });
    }
  });

  app.put('/api/preferences/me', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const current = await readPreferences(pool, userId);
      const preferences = normalizePreferences(req.body, normalizePreferences(current?.data));
      const result = await pool.query(
        `INSERT INTO app_records(table_name, record_id, data, updated_at)
         VALUES ('user_preferences',$1,$2::jsonb,now())
         ON CONFLICT (table_name, record_id)
         DO UPDATE SET data=EXCLUDED.data, updated_at=now()
         RETURNING updated_at`,
        [String(userId), JSON.stringify(encryptPreferences(preferences))]
      );
      return res.json({ ok: true, data: preferences, exists: true, updatedAt: result.rows[0]?.updated_at || null });
    } catch {
      return res.status(500).json({ error: 'preferences_update_failed' });
    }
  });
}
import { decryptSensitiveJson, encryptSensitiveJson } from '../lib/dataEncryption.js';
