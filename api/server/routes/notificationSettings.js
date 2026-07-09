import { isExpoPushToken, sendPushToToken } from '../lib/pushDelivery.js';

const DEFAULT_ITEMS = {
  like: true,
  comment: true,
  follow: true,
  marine_weather_alert: true,
  dive_schedule: true,
  sync_complete: true,
  sync_failed: true,
  bluetooth_error: false,
  certification_status: false,
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
    pushEnabled: true,
    items: { ...DEFAULT_ITEMS },
    updatedAt: new Date().toISOString(),
  };
}

function normalizeSetting(input, userId) {
  const seed = buildDefaultSetting(userId);
  const row = input || {};
  const out = {
    userId: String(row.userId || row.user_id || seed.userId),
    pushEnabled: normalizeBoolean(row.pushEnabled ?? row.push_enabled, seed.pushEnabled),
    items: { ...seed.items },
    updatedAt: String(row.updatedAt || row.updated_at || new Date().toISOString()),
  };

  const rawItems = row.items || row.notificationItems || {};
  for (const key of Object.keys(DEFAULT_ITEMS)) {
    out.items[key] = normalizeBoolean(rawItems[key], DEFAULT_ITEMS[key]);
  }

  return out;
}

async function readSetting(pool, userId) {
  const q = await pool.query(
    "SELECT data FROM app_records WHERE table_name=$1 AND record_id=$2 LIMIT 1",
    ["notification_settings", String(userId)]
  );
  return q.rows[0]?.data || null;
}

async function writeSetting(pool, userId, setting) {
  await pool.query(
    `INSERT INTO app_records(table_name, record_id, data, updated_at)
     VALUES ($1,$2,$3::jsonb,now())
     ON CONFLICT (table_name, record_id)
     DO UPDATE SET data=EXCLUDED.data, updated_at=now()`,
    ["notification_settings", String(userId), JSON.stringify(setting)]
  );
}

export function registerNotificationSettingsRoutes(app, { pool, getAuthUserId, authRateLimit }) {
  const readHandler = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    try {
      const found = await readSetting(pool, userId);
      const setting = normalizeSetting(found, userId);
      if (!found) await writeSetting(pool, userId, setting);
      return res.json({ ok: true, data: setting });
    } catch {
      return res.status(500).json({ error: "notification_setting_read_failed" });
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
        pushEnabled: normalizeBoolean(patch.pushEnabled ?? patch.push_enabled, prev.pushEnabled),
        items: { ...prev.items },
        updatedAt: new Date().toISOString(),
      };

      const patchItems = patch.items || patch.notificationItems || {};
      for (const key of Object.keys(DEFAULT_ITEMS)) {
        if (Object.prototype.hasOwnProperty.call(patchItems, key)) {
          merged.items[key] = normalizeBoolean(patchItems[key], merged.items[key]);
        }
      }

      await writeSetting(pool, userId, merged);
      return res.json({ ok: true, data: merged });
    } catch {
      return res.status(500).json({ error: "notification_setting_update_failed" });
    }
  };

  const pushTestHandler = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const title = String(req.body?.title || "Divergram Test").trim();
    const body = String(req.body?.body || "Push test message").trim();
    const data = req.body?.data && typeof req.body.data === "object" ? req.body.data : {};

    try {
      const tokenRows = await pool.query(
        `SELECT push_token, platform FROM app_device_tokens WHERE user_id=$1 AND is_active=true ORDER BY created_at DESC LIMIT 100`,
        [String(userId)]
      );

      const allTokens = tokenRows.rows.map((row) => ({
        token: String(row.push_token || "").trim(),
        platform: String(row.platform || "").trim().toLowerCase(),
      })).filter((row) => row.token);

      if (!allTokens.length) {
        return res.json({
          ok: true,
          queued: false,
          message: "no_active_push_token",
          userId: String(userId),
          preview: { title, body, data },
          sentAt: new Date().toISOString(),
        });
      }

      const expoTokens = allTokens.filter((row) => isExpoPushToken(row.token));
      const fcmTokens = allTokens.filter((row) => !isExpoPushToken(row.token));
      const deliveryResults = await Promise.allSettled(
        allTokens.map((row) => sendPushToToken(row.token, title, body, data))
      );
      const successCount = deliveryResults.filter((item) => item.status === "fulfilled" && item.value?.ok).length;
      const failureCount = deliveryResults.length - successCount;

      return res.json({
        ok: true,
        queued: successCount > 0,
        message: successCount > 0 ? "push_queued" : "push_not_queued",
        userId: String(userId),
        sentAt: new Date().toISOString(),
        preview: { title, body, data },
        tokenCount: allTokens.length,
        expoTokenCount: expoTokens.length,
        fcmTokenCount: fcmTokens.length,
        unsupportedCount: 0,
        successCount,
        failureCount,
        deliveryPreview: deliveryResults.slice(0, 5).map((item) =>
          item.status === "fulfilled" ? item.value : { ok: false, reason: String(item.reason || "rejected") }
        ),
      });
    } catch (error) {
      return res.status(500).json({
        error: "push_test_failed",
        message: String(error?.message || error),
      });
    }
  };

  app.get("/api/notifications/settings", authRateLimit(60, 60_000), readHandler);
  app.patch("/api/notifications/settings", authRateLimit(60, 60_000), updateHandler);
  app.get("/api/push/settings", authRateLimit(60, 60_000), readHandler);
  app.patch("/api/push/settings", authRateLimit(60, 60_000), updateHandler);
  app.post("/api/push/test", authRateLimit(30, 60_000), pushTestHandler);
}
