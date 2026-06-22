export function registerHealthRoutes(app, pool) {
  app.get('/api/health', async (_req, res) => {
    try {
      const r = await pool.query('select now() as now');
      res.json({ ok: true, now: r.rows[0].now });
    } catch {
      res.status(500).json({ ok: false, error: 'db_unavailable' });
    }
  });
}
