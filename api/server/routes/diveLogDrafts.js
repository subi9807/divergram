function normalizeLogId(value) {
  return String(value || '').trim().slice(0, 160).replace(/[^a-zA-Z0-9._:-]/g, '');
}

function normalizeDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  try {
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized, 'utf8') > 500_000) return null;
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}

export function registerDiveLogDraftRoutes(app, { pool, getAuthUserId, authRateLimit }) {
  app.get('/api/dive-log-drafts/:logId', authRateLimit(120, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    const logId = normalizeLogId(req.params.logId);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!logId) return res.status(400).json({ error: 'invalid_log_id' });
    try {
      const recordId = `${userId}:${logId}`;
      const result = await pool.query(
        "SELECT data, updated_at FROM app_records WHERE table_name='dive_log_drafts' AND record_id=$1 LIMIT 1",
        [recordId]
      );
      const row = result.rows[0];
      return res.json({ ok: true, data: row?.data || null, exists: Boolean(row), updatedAt: row?.updated_at || null });
    } catch {
      return res.status(500).json({ error: 'dive_log_draft_read_failed' });
    }
  });

  app.put('/api/dive-log-drafts/:logId', authRateLimit(120, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    const logId = normalizeLogId(req.params.logId);
    const draft = normalizeDraft(req.body?.data);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!logId || !draft) return res.status(400).json({ error: 'invalid_draft' });
    try {
      const recordId = `${userId}:${logId}`;
      const result = await pool.query(
        `INSERT INTO app_records(table_name,record_id,data,updated_at)
         VALUES ('dive_log_drafts',$1,$2::jsonb,now())
         ON CONFLICT (table_name,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()
         RETURNING updated_at`,
        [recordId, JSON.stringify(draft)]
      );
      return res.json({ ok: true, data: draft, exists: true, updatedAt: result.rows[0]?.updated_at || null });
    } catch {
      return res.status(500).json({ error: 'dive_log_draft_update_failed' });
    }
  });

  app.delete('/api/dive-log-drafts/:logId', authRateLimit(120, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    const logId = normalizeLogId(req.params.logId);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!logId) return res.status(400).json({ error: 'invalid_log_id' });
    try {
      await pool.query("DELETE FROM app_records WHERE table_name='dive_log_drafts' AND record_id=$1", [`${userId}:${logId}`]);
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'dive_log_draft_delete_failed' });
    }
  });
}
