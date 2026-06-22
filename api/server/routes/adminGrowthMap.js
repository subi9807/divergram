export function registerAdminGrowthMapRoutes(app, { pool, requireAdmin }) {
  app.get('/api/admin/map-points', requireAdmin, async (_req, res) => {
    try {
      const r = await pool.query(`SELECT id, location, dive_site, created_at FROM app_posts ORDER BY created_at DESC LIMIT 1000`);
      res.json({ ok: true, points: r.rows || [] });
    } catch {
      res.status(500).json({ ok: false, error: 'admin_map_points_failed' });
    }
  });

  app.get('/api/admin/growth', requireAdmin, async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days || 14), 3), 90);
    try {
      const signups = await pool.query(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
         FROM app_users
         WHERE created_at >= now() - ($1::text || ' days')::interval
         GROUP BY 1 ORDER BY 1`,
        [days]
      );

      const posts = await pool.query(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
         FROM app_posts
         WHERE created_at >= now() - ($1::text || ' days')::interval
         GROUP BY 1 ORDER BY 1`,
        [days]
      );

      const interactions = await pool.query(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
         FROM (
           SELECT created_at FROM app_likes
           UNION ALL
           SELECT created_at FROM app_comments
         ) t
         WHERE created_at >= now() - ($1::text || ' days')::interval
         GROUP BY 1 ORDER BY 1`,
        [days]
      );

      const dauApprox = await pool.query(
        `SELECT to_char(day, 'YYYY-MM-DD') AS day, COUNT(DISTINCT user_id)::int AS count
         FROM (
           SELECT date_trunc('day', created_at) AS day, user_id FROM app_posts
           UNION ALL
           SELECT date_trunc('day', created_at) AS day, user_id FROM app_likes
           UNION ALL
           SELECT date_trunc('day', created_at) AS day, user_id FROM app_comments
         ) x
         WHERE day >= now() - ($1::text || ' days')::interval
         GROUP BY 1 ORDER BY 1`,
        [days]
      );

      const totals = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS c FROM app_users'),
        pool.query('SELECT COUNT(*)::int AS c FROM app_posts'),
        pool.query('SELECT COUNT(*)::int AS c FROM app_likes'),
        pool.query('SELECT COUNT(*)::int AS c FROM app_comments'),
        pool.query('SELECT COUNT(*)::int AS c FROM app_reports'),
      ]);

      res.json({
        ok: true,
        rangeDays: days,
        totals: {
          users: totals[0].rows[0].c,
          posts: totals[1].rows[0].c,
          likes: totals[2].rows[0].c,
          comments: totals[3].rows[0].c,
          reports: totals[4].rows[0].c,
        },
        series: {
          signups: signups.rows,
          posts: posts.rows,
          interactions: interactions.rows,
          dauApprox: dauApprox.rows,
        },
      });
    } catch {
      res.status(500).json({ ok: false, error: 'admin_growth_failed' });
    }
  });
}
