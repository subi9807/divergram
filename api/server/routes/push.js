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
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (deviceId) {
          await client.query(
            `UPDATE app_device_tokens
             SET is_active=false
             WHERE user_id=$1 AND platform=$2 AND device_id=$3 AND push_token<>$4 AND is_active=true`,
            [userId, platform, deviceId, pushToken]
          );
        }
        await client.query(
          `INSERT INTO app_device_tokens(id, user_id, platform, device_id, push_token, is_active)
           VALUES ($1,$2,$3,$4,$5,true)
           ON CONFLICT (push_token)
           DO UPDATE SET user_id=EXCLUDED.user_id, platform=EXCLUDED.platform, device_id=COALESCE(EXCLUDED.device_id, app_device_tokens.device_id), is_active=true`,
          [id, userId, platform, deviceId || null, pushToken]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
      return res.json({ ok: true, registered: true, platform, device_id: deviceId || null });
    } catch (error) {
      console.error('Push token upsert failed:', error);
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
