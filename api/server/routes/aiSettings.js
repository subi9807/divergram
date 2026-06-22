const DEFAULT_SETTING = {
  aiSummaryEnabled: true,
  aiPointRecommendEnabled: true,
  aiCaptionEnabled: true,
  aiRiskDescriptionEnabled: true,
};

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(lowered)) return true;
    if (["0", "false", "no", "off"].includes(lowered)) return false;
  }
  return fallback;
}

function buildDefaultSetting(userId) {
  return {
    userId: String(userId),
    ...DEFAULT_SETTING,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeSetting(input, userId) {
  const seed = buildDefaultSetting(userId);
  const row = input || {};
  return {
    userId: String(row.userId || row.user_id || seed.userId),
    aiSummaryEnabled: normalizeBoolean(row.aiSummaryEnabled ?? row.ai_summary_enabled, seed.aiSummaryEnabled),
    aiPointRecommendEnabled: normalizeBoolean(row.aiPointRecommendEnabled ?? row.ai_point_recommend_enabled, seed.aiPointRecommendEnabled),
    aiCaptionEnabled: normalizeBoolean(row.aiCaptionEnabled ?? row.ai_caption_enabled, seed.aiCaptionEnabled),
    aiRiskDescriptionEnabled: normalizeBoolean(row.aiRiskDescriptionEnabled ?? row.ai_risk_description_enabled, seed.aiRiskDescriptionEnabled),
    updatedAt: String(row.updatedAt || row.updated_at || new Date().toISOString()),
  };
}

async function readSetting(pool, userId) {
  const q = await pool.query(
    "SELECT data FROM app_records WHERE table_name=$1 AND record_id=$2 LIMIT 1",
    ["ai_settings", String(userId)]
  );
  return q.rows[0]?.data || null;
}

async function writeSetting(pool, userId, setting) {
  await pool.query(
    `INSERT INTO app_records(table_name, record_id, data, updated_at)
     VALUES ($1,$2,$3::jsonb,now())
     ON CONFLICT (table_name, record_id)
     DO UPDATE SET data=EXCLUDED.data, updated_at=now()`,
    ["ai_settings", String(userId), JSON.stringify(setting)]
  );
}

export function registerAiSettingsRoutes(app, { pool, getAuthUserId, authRateLimit }) {
  const readHandler = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    try {
      const found = await readSetting(pool, userId);
      const setting = normalizeSetting(found, userId);
      if (!found) await writeSetting(pool, userId, setting);
      return res.json({ ok: true, data: setting });
    } catch {
      return res.status(500).json({ error: "ai_setting_read_failed" });
    }
  };

  const updateHandler = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    try {
      const prevRaw = await readSetting(pool, userId);
      const prev = normalizeSetting(prevRaw, userId);
      const patch = req.body || {};
      const merged = {
        ...prev,
        userId: prev.userId,
        aiSummaryEnabled: normalizeBoolean(patch.aiSummaryEnabled ?? patch.ai_summary_enabled, prev.aiSummaryEnabled),
        aiPointRecommendEnabled: normalizeBoolean(patch.aiPointRecommendEnabled ?? patch.ai_point_recommend_enabled, prev.aiPointRecommendEnabled),
        aiCaptionEnabled: normalizeBoolean(patch.aiCaptionEnabled ?? patch.ai_caption_enabled, prev.aiCaptionEnabled),
        aiRiskDescriptionEnabled: normalizeBoolean(patch.aiRiskDescriptionEnabled ?? patch.ai_risk_description_enabled, prev.aiRiskDescriptionEnabled),
        updatedAt: new Date().toISOString(),
      };

      await writeSetting(pool, userId, merged);
      return res.json({ ok: true, data: merged });
    } catch {
      return res.status(500).json({ error: "ai_setting_update_failed" });
    }
  };

  app.get("/api/ai/settings", authRateLimit(60, 60_000), readHandler);
  app.patch("/api/ai/settings", authRateLimit(60, 60_000), updateHandler);
}
