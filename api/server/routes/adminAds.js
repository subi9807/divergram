function normalizeLimit(value, fallback = 20, max = 100) {
  const next = Number(value || fallback);
  if (!Number.isFinite(next) || next <= 0) return fallback;
  return Math.min(max, Math.max(1, Math.round(next)));
}

function normalizeStatus(value, allowed, fallback) {
  const status = String(value || '').trim().toLowerCase();
  return allowed.includes(status) ? status : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function buildId(prefix, crypto) {
  const suffix = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID().replace(/-/g, '').slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${suffix}`;
}

export function registerAdminAdsRoutes(app, { pool, requireAdmin, crypto }) {
  app.get('/api/admin/ads', requireAdmin, async (req, res) => {
    const limit = normalizeLimit(req.query.limit, 20, 100);
    try {
      const q = await pool.query(
        `SELECT id, title, placement, status, note, action_label, target_url, sort_order, is_active, start_at, end_at, created_at, updated_at
         FROM app_ad_slots
         ORDER BY sort_order ASC, updated_at DESC, created_at DESC
         LIMIT $1`,
        [limit]
      );
      res.json({ ok: true, ads: q.rows || [] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_ads_failed', detail: String(error?.message || error) });
    }
  });

  app.post('/api/admin/ads', requireAdmin, async (req, res) => {
    const title = String(req.body?.title || '').trim();
    const placement = String(req.body?.placement || '').trim();
    if (!title || !placement) return res.status(400).json({ ok: false, error: 'title_and_placement_required' });
    const id = String(req.body?.id || '').trim() || buildId('adslot', crypto);
    const status = normalizeStatus(req.body?.status, ['draft', 'ready', 'active', 'paused', 'archived'], 'draft');
    try {
      const q = await pool.query(
        `INSERT INTO app_ad_slots(id, title, placement, status, note, action_label, target_url, sort_order, is_active, start_at, end_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
           title=EXCLUDED.title,
           placement=EXCLUDED.placement,
           status=EXCLUDED.status,
           note=EXCLUDED.note,
           action_label=EXCLUDED.action_label,
           target_url=EXCLUDED.target_url,
           sort_order=EXCLUDED.sort_order,
           is_active=EXCLUDED.is_active,
           start_at=EXCLUDED.start_at,
           end_at=EXCLUDED.end_at,
           updated_at=now()
         RETURNING id, title, placement, status, note, action_label, target_url, sort_order, is_active, start_at, end_at, created_at, updated_at`,
        [
          id,
          title,
          placement,
          status,
          String(req.body?.note || '').trim(),
          String(req.body?.actionLabel || req.body?.action_label || '승인 규칙').trim() || '승인 규칙',
          String(req.body?.targetUrl || req.body?.target_url || '').trim() || null,
          Number(req.body?.sortOrder ?? req.body?.sort_order ?? 0) || 0,
          toBoolean(req.body?.isActive ?? req.body?.is_active, true),
          req.body?.startAt ?? req.body?.start_at ?? null,
          req.body?.endAt ?? req.body?.end_at ?? null,
        ]
      );
      res.json({ ok: true, ad: q.rows[0] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_ad_create_failed', detail: String(error?.message || error) });
    }
  });

  app.patch('/api/admin/ads/:slotId', requireAdmin, async (req, res) => {
    const slotId = String(req.params.slotId || '').trim();
    if (!slotId) return res.status(400).json({ ok: false, error: 'slot_id_required' });

    const fields = [];
    const values = [];
    const push = (column, value) => {
      values.push(value);
      fields.push(`${column}=$${values.length}`);
    };

    if (req.body?.title !== undefined) push('title', String(req.body.title || '').trim());
    if (req.body?.placement !== undefined) push('placement', String(req.body.placement || '').trim());
    if (req.body?.status !== undefined) push('status', normalizeStatus(req.body.status, ['draft', 'ready', 'active', 'paused', 'archived'], 'draft'));
    if (req.body?.note !== undefined) push('note', String(req.body.note || '').trim());
    if (req.body?.actionLabel !== undefined || req.body?.action_label !== undefined) push('action_label', String(req.body.actionLabel || req.body.action_label || '').trim());
    if (req.body?.targetUrl !== undefined || req.body?.target_url !== undefined) push('target_url', String(req.body.targetUrl || req.body.target_url || '').trim() || null);
    if (req.body?.sortOrder !== undefined || req.body?.sort_order !== undefined) push('sort_order', Number(req.body.sortOrder ?? req.body.sort_order ?? 0) || 0);
    if (req.body?.isActive !== undefined || req.body?.is_active !== undefined) push('is_active', toBoolean(req.body.isActive ?? req.body.is_active));
    if (req.body?.startAt !== undefined || req.body?.start_at !== undefined) push('start_at', req.body.startAt ?? req.body.start_at ?? null);
    if (req.body?.endAt !== undefined || req.body?.end_at !== undefined) push('end_at', req.body.endAt ?? req.body.end_at ?? null);
    if (!fields.length) return res.status(400).json({ ok: false, error: 'no_fields_to_update' });

    try {
      values.push(slotId);
      const q = await pool.query(
        `UPDATE app_ad_slots
         SET ${fields.join(', ')}, updated_at=now()
         WHERE id=$${values.length}
         RETURNING id, title, placement, status, note, action_label, target_url, sort_order, is_active, start_at, end_at, created_at, updated_at`,
        values
      );
      if (!q.rows.length) return res.status(404).json({ ok: false, error: 'ad_slot_not_found' });
      res.json({ ok: true, ad: q.rows[0] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_ad_update_failed', detail: String(error?.message || error) });
    }
  });

  app.delete('/api/admin/ads/:slotId', requireAdmin, async (req, res) => {
    const slotId = String(req.params.slotId || '').trim();
    if (!slotId) return res.status(400).json({ ok: false, error: 'slot_id_required' });
    try {
      const q = await pool.query('DELETE FROM app_ad_slots WHERE id=$1 RETURNING id', [slotId]);
      if (!q.rows.length) return res.status(404).json({ ok: false, error: 'ad_slot_not_found' });
      res.json({ ok: true, removed: q.rows[0] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_ad_delete_failed', detail: String(error?.message || error) });
    }
  });
}
