export function registerAdminJobsRoutes(app, { pool, requireAdmin, processQueuedJobs }) {
  app.post('/api/admin/jobs/dispatch', requireAdmin, async (req, res) => {
    const limit = Math.min(Math.max(Number(req.body?.limit || 50), 1), 200);
    try {
      const result = await processQueuedJobs(limit);
      return res.json({ ok: true, ...result });
    } catch {
      return res.status(500).json({ ok: false, error: 'job_dispatch_failed' });
    }
  });

  app.get('/api/admin/jobs', requireAdmin, async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);
    try {
      const rows = await pool.query('SELECT id,type,status,attempts,last_error,created_at,updated_at FROM app_jobs ORDER BY created_at DESC LIMIT $1', [limit]);
      return res.json({ ok: true, jobs: rows.rows });
    } catch {
      return res.status(500).json({ ok: false, error: 'job_list_failed' });
    }
  });
}
