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

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_CHUNK_SIZE = 50;

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

function isExpoPushToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return false;
  return /^ExponentPushToken\[[^\]]+\]$/.test(raw) || /^ExpoPushToken\[[^\]]+\]$/.test(raw);
}

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function sendExpoPushMessages(messages) {
  const tickets = [];
  const errors = [];
  if (!messages.length) return { tickets, errors };

  for (const batch of chunkArray(messages, EXPO_PUSH_CHUNK_SIZE)) {
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        errors.push({ type: "http_error", status: response.status, payload });
        continue;
      }
      if (!payload || !Array.isArray(payload.data)) {
        errors.push({ type: "invalid_response", payload });
        continue;
      }

      tickets.push(...payload.data);
    } catch (error) {
      errors.push({ type: "network_error", message: String(error?.message || error) });
    }
  }

  return { tickets, errors };
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
      const unsupported = allTokens.filter((row) => !isExpoPushToken(row.token));

      if (!expoTokens.length) {
        return res.json({
          ok: true,
          queued: false,
          message: "unsupported_push_token_format",
          userId: String(userId),
          preview: { title, body, data },
          tokenCount: allTokens.length,
          unsupportedCount: unsupported.length,
          sentAt: new Date().toISOString(),
        });
      }

      const messages = expoTokens.map((row) => ({
        to: row.token,
        title,
        body,
        sound: "default",
        priority: "high",
        data,
      }));

      const result = await sendExpoPushMessages(messages);
      const successTickets = result.tickets.filter((ticket) => ticket?.status === "ok");
      const failedTickets = result.tickets.filter((ticket) => ticket?.status !== "ok");

      return res.json({
        ok: true,
        queued: successTickets.length > 0,
        message: successTickets.length > 0 ? "push_queued" : "push_not_queued",
        userId: String(userId),
        sentAt: new Date().toISOString(),
        preview: { title, body, data },
        tokenCount: allTokens.length,
        expoTokenCount: expoTokens.length,
        unsupportedCount: unsupported.length,
        successCount: successTickets.length,
        failureCount: failedTickets.length + result.errors.length,
        ticketPreview: result.tickets.slice(0, 5),
        errorPreview: result.errors.slice(0, 3),
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
