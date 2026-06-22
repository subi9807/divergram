export function registerPushRoutes(app, { pool, authRateLimit, getAuthUserId, crypto }) {
  app.post('/api/push/tokens', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const pushToken = String(req.body?.push_token || '').trim();
    const platform = String(req.body?.platform || '').trim().toLowerCase();
    const deviceId = String(req.body?.device_id || req.body?.deviceId || '').trim();
    if (!pushToken) return res.status(400).json({ error: 'push_token_required' });
    if (!['ios', 'android', 'web'].includes(platform)) return res.status(400).json({ error: 'invalid_platform' });

    try {
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO app_device_tokens(id, user_id, platform, device_id, push_token, is_active)
         VALUES ($1,$2,$3,$4,$5,true)
         ON CONFLICT (push_token)
         DO UPDATE SET user_id=EXCLUDED.user_id, platform=EXCLUDED.platform, device_id=COALESCE(EXCLUDED.device_id, app_device_tokens.device_id), is_active=true`,
        [id, userId, platform, deviceId || null, pushToken]
      );
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'push_token_upsert_failed' });
    }
  });

  app.delete('/api/push/tokens/:token', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'token_required' });

    try {
      await pool.query('UPDATE app_device_tokens SET is_active=false WHERE user_id=$1 AND push_token=$2', [userId, token]);
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'push_token_delete_failed' });
    }
  });
}
