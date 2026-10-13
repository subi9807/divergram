function clean(value, max = 120) {
  return String(value || '').trim().slice(0, max);
}

export function registerPresenceRoutes(app, { pool, getAuthUserId, requireAdmin }) {
  app.post('/api/presence/heartbeat', async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const platform = clean(req.body?.platform, 20) || 'unknown';
    const deviceId = clean(req.body?.deviceId, 180) || 'default';
    try {
      await pool.query(
        `INSERT INTO app_user_presence(user_id,device_id,platform,app_version,build_number,current_route,last_seen_at,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,now(),now(),now())
         ON CONFLICT(user_id,device_id) DO UPDATE SET
           platform=EXCLUDED.platform,app_version=EXCLUDED.app_version,build_number=EXCLUDED.build_number,
           current_route=EXCLUDED.current_route,last_seen_at=now(),updated_at=now()`,
        [userId, deviceId, platform, clean(req.body?.appVersion, 40), clean(req.body?.buildNumber, 40), clean(req.body?.currentRoute, 200)]
      );
      return res.json({ ok: true, serverTime: new Date().toISOString() });
    } catch (error) {
      return res.status(500).json({ error: 'presence_heartbeat_failed', detail: String(error?.message || error) });
    }
  });

  app.get('/api/admin/statistics', requireAdmin, async (_req, res) => {
    try {
      const [summary, activeUsers, daily, platforms] = await Promise.all([
        pool.query(`SELECT
          (SELECT COUNT(*)::int FROM app_users) AS total_users,
          (SELECT COUNT(*)::int FROM app_users WHERE created_at >= now()-interval '7 days') AS new_users_7d,
          (SELECT COUNT(*)::int FROM app_posts) AS posts,
          (SELECT COUNT(*)::int FROM app_comments) AS comments,
          (SELECT COUNT(*)::int FROM app_likes) AS likes,
          (SELECT COUNT(*)::int FROM app_education_applications) AS education_applications,
          (SELECT COUNT(DISTINCT user_id)::int FROM app_user_presence WHERE last_seen_at >= now()-interval '2 minutes') AS active_now`),
        pool.query(`SELECT DISTINCT ON (p.user_id)
          p.user_id,p.platform,p.app_version,p.build_number,p.current_route,p.last_seen_at,
          u.email,u.username,pr.full_name,pr.avatar_url
          FROM app_user_presence p
          JOIN app_users u ON u.id::text=p.user_id
          LEFT JOIN app_profiles pr ON pr.id::text=p.user_id
          WHERE p.last_seen_at >= now()-interval '2 minutes'
          ORDER BY p.user_id,p.last_seen_at DESC LIMIT 200`),
        pool.query(`SELECT d::date AS day,
          COALESCE(u.count,0)::int AS signups,COALESCE(p.count,0)::int AS posts
          FROM generate_series(current_date-interval '13 days',current_date,interval '1 day') d
          LEFT JOIN (SELECT created_at::date AS activity_day,COUNT(*) AS count FROM app_users GROUP BY 1) u ON u.activity_day=d::date
          LEFT JOIN (SELECT created_at::date AS activity_day,COUNT(*) AS count FROM app_posts GROUP BY 1) p ON p.activity_day=d::date
          ORDER BY d`),
        pool.query(`SELECT platform,COUNT(DISTINCT user_id)::int AS count
          FROM app_user_presence WHERE last_seen_at >= now()-interval '2 minutes' GROUP BY platform ORDER BY count DESC`),
      ]);
      return res.json({ ok: true, summary: summary.rows[0] || {}, activeUsers: activeUsers.rows, daily: daily.rows, platforms: platforms.rows, generatedAt: new Date().toISOString() });
    } catch (error) {
      return res.status(500).json({ error: 'admin_statistics_failed', detail: String(error?.message || error) });
    }
  });
}
