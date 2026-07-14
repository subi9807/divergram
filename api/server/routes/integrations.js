function normalizeProvider(input) {
  const provider = String(input || "").trim().toLowerCase();
  if (!["garmin", "suunto", "shearwater"].includes(provider)) return null;
  return provider;
}

function getProviderLabel(provider) {
  if (provider === "garmin") return "Garmin";
  if (provider === "suunto") return "Suunto";
  return "Shearwater";
}

function buildIntegrationRecord({ provider, userId, payload = {}, previous = {} }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
  const accountLabel = String(payload.accountLabel || previous.accountLabel || `${getProviderLabel(provider)} Diver`).trim();
  const accessToken = String(payload.accessToken || previous.accessToken || '');
  const refreshToken = String(payload.refreshToken || previous.refreshToken || '');
  const providerUserId = String(payload.providerUserId || previous.providerUserId || `${provider}_${userId}`);

  return {
    provider,
    userId,
    connected: true,
    accountLabel,
    accessToken,
    refreshToken,
    providerUserId,
    authCode: String(payload.authCode || "").trim() || undefined,
    redirectUri: String(payload.redirectUri || "").trim() || undefined,
    state: String(payload.state || "").trim() || undefined,
    expiresAt,
    lastSyncedAt: previous.lastSyncedAt || null,
    updatedAt: now.toISOString(),
  };
}

function buildMockLogs(provider, userId, limit = 30) {
  const base = new Date();
  const rows = [];
  const count = Math.max(1, Math.min(100, Number(limit) || 30));
  for (let i = 0; i < count; i += 1) {
    const day = new Date(base.getTime() - i * 24 * 60 * 60 * 1000);
    const date = day.toISOString().slice(0, 10);
    const entryHour = 9 + (i % 6);
    const entryMinute = i % 2 === 0 ? "10" : "35";
    const exitHour = entryHour + 1;
    const exitMinute = i % 2 === 0 ? "02" : "18";

    rows.push({
      externalLogId: `${provider}_${userId}_${date}_${i + 1}`,
      source: provider,
      deviceId: `${provider}-device-${(i % 3) + 1}`,
      deviceName: `${getProviderLabel(provider)} Dive Computer ${(i % 3) + 1}`,
      diveDate: date,
      entryTime: `${String(entryHour).padStart(2, "0")}:${entryMinute}`,
      exitTime: `${String(exitHour).padStart(2, "0")}:${exitMinute}`,
      totalDiveTimeMin: 35 + (i % 18),
      maxDepthM: Number((12 + (i % 16) * 0.8).toFixed(1)),
      avgDepthM: Number((7 + (i % 10) * 0.6).toFixed(1)),
      waterTemperatureC: 18 + (i % 7),
      gpsLocation: {
        lat: Number((33.2 + (i % 20) * 0.0012).toFixed(6)),
        lng: Number((126.5 + (i % 20) * 0.0014).toFixed(6)),
      },
      heartRate: {
        avg: 108 + (i % 25),
        max: 132 + (i % 28),
      },
      equipmentInfo: `${getProviderLabel(provider)} Auto Sync`,
      memo: `${getProviderLabel(provider)} 동기화 샘플 로그 ${i + 1}`,
      profile: [
        { t: 0, depth: 0 },
        { t: 5, depth: Number((4 + (i % 3)).toFixed(1)) },
        { t: 12, depth: Number((8 + (i % 5)).toFixed(1)) },
        { t: 20, depth: Number((6 + (i % 4)).toFixed(1)) },
        { t: 30, depth: 0 },
      ],
      syncedAt: new Date().toISOString(),
    });
  }
  return rows;
}

async function readIntegrationRecord(pool, userId, provider) {
  const recordId = `${userId}:${provider}`;
  const q = await pool.query(
    "SELECT data FROM app_records WHERE table_name=$1 AND record_id=$2 LIMIT 1",
    ["external_integrations", recordId]
  );
  return q.rows[0]?.data || null;
}

async function writeIntegrationRecord(pool, userId, provider, data) {
  const recordId = `${userId}:${provider}`;
  await pool.query(
    `INSERT INTO app_records(table_name, record_id, data, updated_at)
     VALUES ($1,$2,$3::jsonb,now())
     ON CONFLICT (table_name, record_id)
     DO UPDATE SET data=EXCLUDED.data, updated_at=now()`,
    ["external_integrations", recordId, JSON.stringify(data)]
  );
}

export function registerIntegrationRoutes(app, { pool, getAuthUserId, authRateLimit }) {
  app.post("/api/integrations/:provider/connect", authRateLimit(30, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const provider = normalizeProvider(req.params.provider);
    if (!provider) return res.status(400).json({ error: "invalid_provider" });

    try {
      const previous = await readIntegrationRecord(pool, userId, provider);
      const data = buildIntegrationRecord({ provider, userId, payload: req.body || {}, previous: previous || {} });
      if (!data.accessToken) return res.status(501).json({ error: 'integration_provider_not_configured' });
      await writeIntegrationRecord(pool, userId, provider, data);
      return res.json({ ok: true, data });
    } catch {
      return res.status(500).json({ error: "integration_connect_failed" });
    }
  });

  app.post("/api/integrations/:provider/refresh", authRateLimit(40, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const provider = normalizeProvider(req.params.provider);
    if (!provider) return res.status(400).json({ error: "invalid_provider" });

    try {
      const previous = (await readIntegrationRecord(pool, userId, provider)) || {};
      const data = buildIntegrationRecord({ provider, userId, payload: req.body || {}, previous });
      if (!data.accessToken) return res.status(501).json({ error: 'integration_provider_not_configured' });
      await writeIntegrationRecord(pool, userId, provider, data);
      return res.json({ ok: true, data });
    } catch {
      return res.status(500).json({ error: "integration_refresh_failed" });
    }
  });

  app.post("/api/integrations/:provider/disconnect", authRateLimit(30, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const provider = normalizeProvider(req.params.provider);
    if (!provider) return res.status(400).json({ error: "invalid_provider" });

    try {
      const previous = (await readIntegrationRecord(pool, userId, provider)) || {};
      const data = {
        ...previous,
        provider,
        userId,
        connected: false,
        accessToken: "",
        refreshToken: "",
        updatedAt: new Date().toISOString(),
      };
      await writeIntegrationRecord(pool, userId, provider, data);
      return res.json({ ok: true, data });
    } catch {
      return res.status(500).json({ error: "integration_disconnect_failed" });
    }
  });

  app.get("/api/integrations/:provider/logs", authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const provider = normalizeProvider(req.params.provider);
    if (!provider) return res.status(400).json({ error: "invalid_provider" });

    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 30)));
    try {
      const integration = await readIntegrationRecord(pool, userId, provider);
      if (!integration?.connected) {
        return res.json({ ok: true, connected: false, logs: [] });
      }

      if (!integration.accessToken || String(integration.accessToken).startsWith('mock_')) {
        return res.status(501).json({ error: 'integration_provider_not_configured' });
      }

      if (process.env.ENABLE_MOCK_INTEGRATIONS !== 'true' || process.env.NODE_ENV === 'production') {
        return res.status(501).json({ error: 'integration_sync_not_implemented' });
      }
      const logs = buildMockLogs(provider, String(userId), limit);
      const nextRecord = {
        ...integration,
        lastSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await writeIntegrationRecord(pool, userId, provider, nextRecord);

      return res.json({
        ok: true,
        connected: true,
        provider,
        logs,
        data: logs,
        cursor: null,
      });
    } catch {
      return res.status(500).json({ error: "integration_logs_failed" });
    }
  });
}
