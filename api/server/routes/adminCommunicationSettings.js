const DEFAULT_CHANNELS = {
  signup: { email: true, push: true, sms: false },
  event: { email: true, push: true, sms: false },
  safety: { email: true, push: true, sms: false },
  moderation: { email: true, push: false, sms: false },
};

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(lowered)) return true;
    if (['0', 'false', 'no', 'off'].includes(lowered)) return false;
  }
  return fallback;
}

function normalizeChannelGroup(raw, fallback) {
  return {
    email: normalizeBoolean(raw?.email ?? raw?.mail, fallback.email),
    push: normalizeBoolean(raw?.push, fallback.push),
    sms: normalizeBoolean(raw?.sms, fallback.sms),
  };
}

function normalizeSetting(input) {
  const row = input || {};
  const channels = row.channels || row.channelSettings || row || {};
  return {
    signup: normalizeChannelGroup(channels.signup, DEFAULT_CHANNELS.signup),
    event: normalizeChannelGroup(channels.event, DEFAULT_CHANNELS.event),
    safety: normalizeChannelGroup(channels.safety, DEFAULT_CHANNELS.safety),
    moderation: normalizeChannelGroup(channels.moderation, DEFAULT_CHANNELS.moderation),
    updatedAt: String(row.updatedAt || row.updated_at || new Date().toISOString()),
  };
}

async function readSetting(pool) {
  const q = await pool.query(
    `SELECT data
     FROM app_records
     WHERE table_name=$1 AND record_id=$2
     LIMIT 1`,
    ['admin_communication_settings', 'global']
  );
  return q.rows[0]?.data || null;
}

async function writeSetting(pool, setting) {
  await pool.query(
    `INSERT INTO app_records(table_name, record_id, data, updated_at)
     VALUES ($1,$2,$3::jsonb,now())
     ON CONFLICT (table_name, record_id)
     DO UPDATE SET data=EXCLUDED.data, updated_at=now()`,
    ['admin_communication_settings', 'global', JSON.stringify(setting)]
  );
}

export function registerAdminCommunicationSettingsRoutes(app, { pool, requireAdmin }) {
  app.get('/api/admin/communication-settings', requireAdmin, async (_req, res) => {
    try {
      const found = await readSetting(pool);
      const setting = normalizeSetting(found);
      if (!found) await writeSetting(pool, setting);
      res.json({ ok: true, data: setting });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_communication_settings_read_failed', detail: String(error?.message || error) });
    }
  });

  app.patch('/api/admin/communication-settings', requireAdmin, async (req, res) => {
    try {
      const prev = normalizeSetting(await readSetting(pool));
      const body = req.body || {};
      const next = {
        signup: normalizeChannelGroup(body.signup || body.signupChannels || prev.signup, prev.signup),
        event: normalizeChannelGroup(body.event || body.eventChannels || prev.event, prev.event),
        safety: normalizeChannelGroup(body.safety || body.safetyChannels || prev.safety, prev.safety),
        moderation: normalizeChannelGroup(body.moderation || body.moderationChannels || prev.moderation, prev.moderation),
        updatedAt: new Date().toISOString(),
      };
      await writeSetting(pool, next);
      res.json({ ok: true, data: next });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_communication_settings_update_failed', detail: String(error?.message || error) });
    }
  });
}
