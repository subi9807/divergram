import { applyDivePatch, createDiveDocument, diveResponse, validDiveLogId } from '../lib/privateDiveLog.js';
import { isDeepStrictEqual } from 'node:util';

export function registerPrivateDiveLogRoutes(app, { pool, getAuthUserId, authRateLimit }) {
  const limit = authRateLimit(120, 60_000);
  async function owner(req, res) {
    const id = getAuthUserId(req);
    if (!id) { res.status(401).json({ error: 'unauthorized' }); return null; }
    const user = await pool.query('SELECT id FROM app_users WHERE id::text=$1 AND is_blocked=false', [String(id)]);
    if (!user.rows.length) { res.status(403).json({ error: 'forbidden' }); return null; }
    return String(id);
  }
  const wrap = fn => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { const userId = await owner(req, res); if (userId) await fn(req, res, userId); }
    catch (error) { res.status(error?.code === '42P01' ? 503 : 500).json({ error: error?.code === '42P01' ? 'dive_logs_migration_required' : 'dive_log_request_failed' }); }
  };
  app.get('/api/dive-logs', limit, wrap(async (req, res, userId) => {
    const after = String(req.query?.after || '');
    const size = Math.min(100, Math.max(1, Number.parseInt(req.query?.limit, 10) || 30));
    if (after && !validDiveLogId(after)) return res.status(400).json({ error: 'invalid_cursor' });
    const result = await pool.query('SELECT * FROM app_dive_logs WHERE user_id=$1 AND id>$2 ORDER BY id LIMIT $3', [userId, after, size + 1]);
    res.json({ data: result.rows.slice(0, size).map(diveResponse), nextCursor: result.rows.length > size ? result.rows[size - 1].id : null });
  }));
  app.get('/api/dive-logs/:id', limit, wrap(async (req, res, userId) => {
    if (!validDiveLogId(req.params.id)) return res.status(400).json({ error: 'invalid_log_id' });
    const result = await pool.query('SELECT * FROM app_dive_logs WHERE user_id=$1 AND id=$2', [userId, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'dive_log_not_found' });
    res.json({ data: diveResponse(result.rows[0]) });
  }));
  app.get('/api/dive-logs/:id/source', limit, wrap(async (req, res, userId) => {
    if (!validDiveLogId(req.params.id)) return res.status(400).json({ error: 'invalid_log_id' });
    const result = await pool.query('SELECT original_data,source_kind,created_at FROM app_dive_log_sources WHERE user_id=$1 AND log_id=$2', [userId, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'dive_log_not_found' });
    res.json({ data: result.rows[0] });
  }));
  app.post('/api/dive-logs', limit, wrap(async (req, res, userId) => {
    let data;
    try { data = createDiveDocument(req.body?.data, userId); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query('INSERT INTO app_dive_logs(user_id,id,data) VALUES($1,$2,$3::jsonb) ON CONFLICT(user_id,id) DO NOTHING RETURNING *', [userId, data.id, JSON.stringify(data)]);
      if (inserted.rows.length) {
        await client.query('INSERT INTO app_dive_log_sources(user_id,log_id,original_data,source_kind) VALUES($1,$2,$3::jsonb,$4)', [userId, data.id, JSON.stringify(req.body.data), data.sourceType === 'manual' ? 'USER' : 'UNVERIFIED_IMPORT']);
        await client.query('INSERT INTO app_dive_log_revisions(user_id,log_id,revision,data) VALUES($1,$2,1,$3::jsonb)', [userId, data.id, JSON.stringify(data)]);
      } else {
        const original = await client.query('SELECT data FROM app_dive_log_revisions WHERE user_id=$1 AND log_id=$2 AND revision=1', [userId, data.id]);
        if (!isDeepStrictEqual(original.rows[0]?.data, data)) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'dive_revision_conflict' });
        }
      }
      const row = inserted.rows[0] || (await client.query('SELECT * FROM app_dive_logs WHERE user_id=$1 AND id=$2', [userId, data.id])).rows[0];
      await client.query('COMMIT');
      res.status(inserted.rows.length ? 201 : 200).json({ data: diveResponse(row), duplicate: !inserted.rows.length });
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }));
  app.patch('/api/dive-logs/:id', limit, wrap(async (req, res, userId) => {
    if (!validDiveLogId(req.params.id) || !Number.isInteger(req.body?.baseRevision) || req.body.baseRevision < 1) return res.status(400).json({ error: 'invalid_dive_revision' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query('SELECT * FROM app_dive_logs WHERE user_id=$1 AND id=$2 FOR UPDATE', [userId, req.params.id]);
      const row = found.rows[0];
      if (!row || row.revision !== req.body.baseRevision) {
        await client.query('ROLLBACK');
        return res.status(row ? 409 : 404).json({ error: row ? 'dive_revision_conflict' : 'dive_log_not_found' });
      }
      let data;
      try { data = applyDivePatch(row.data, req.body.patch); }
      catch (error) { await client.query('ROLLBACK'); return res.status(400).json({ error: error.message }); }
      const updated = await client.query('UPDATE app_dive_logs SET data=$3::jsonb,revision=revision+1,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING *', [userId, row.id, JSON.stringify(data)]);
      await client.query('INSERT INTO app_dive_log_revisions(user_id,log_id,revision,data) VALUES($1,$2,$3,$4::jsonb)', [userId, row.id, updated.rows[0].revision, JSON.stringify(data)]);
      await client.query('COMMIT');
      res.json({ data: diveResponse(updated.rows[0]) });
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }));
}
