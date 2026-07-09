function normalizeTextList(value) {
  return Array.from(new Set((Array.isArray(value) ? value : String(value || '').split('\n')).map((item) => String(item || '').trim()).filter(Boolean)));
}

function toNumber(value, fallback = 0) {
  if (value === '' || value === undefined || value === null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function normalizePricePayload(body = {}) {
  const title = String(body.title || '').trim();
  return {
    resort_id: String(body.resort_id || '').trim(),
    price_type: String(body.price_type || 'dive_package').trim() || 'dive_package',
    title,
    image_url: String(body.image_url || '').trim(),
    description: String(body.description || '').trim(),
    duration_text: String(body.duration_text || '').trim(),
    unit_label: String(body.unit_label || '').trim(),
    currency: String(body.currency || 'KRW').trim().toUpperCase() || 'KRW',
    amount: toNumber(body.amount, 0),
    included_items: normalizeTextList(body.included_items),
    sort_order: Math.trunc(toNumber(body.sort_order, 0)),
    is_active: toBool(body.is_active, true),
  };
}

function buildPriceId(payload, seed = Date.now()) {
  const slug = String(payload.title || payload.price_type || 'price')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  return `price_${slug || 'item'}_${seed}`;
}

export function registerAdminPricingRoutes(app, { pool, requireAdmin }) {
  app.get('/api/admin/resort-prices', requireAdmin, async (req, res) => {
    const resortId = String(req.query.resortId || req.query.resort_id || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 500);
    const params = [];
    let where = 'WHERE 1=1';
    if (resortId) {
      params.push(resortId);
      where += ` AND p.resort_id = $${params.length}`;
    }
    try {
      params.push(limit);
      const q = await pool.query(
        `SELECT
           p.id, p.resort_id, p.price_type, p.title, p.description, p.duration_text, p.unit_label,
           p.image_url, p.currency, p.amount, p.included_items, p.sort_order, p.is_active, p.created_at, p.updated_at,
           COALESCE(r.full_name, r.username, '') AS resort_name,
           COALESCE(r.resort_region, '') AS resort_region,
           COALESCE(r.resort_cover_url, '') AS resort_cover_url
         FROM app_resort_prices p
         LEFT JOIN app_profiles r ON r.id = p.resort_id
         ${where}
         ORDER BY p.sort_order ASC, p.amount ASC, p.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      res.json({ ok: true, prices: q.rows || [] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_resort_prices_failed', detail: String(error?.message || error) });
    }
  });

  app.post('/api/admin/resort-prices', requireAdmin, async (req, res) => {
    const payload = normalizePricePayload(req.body || {});
    if (!payload.resort_id) return res.status(400).json({ ok: false, error: 'resort_id_required' });
    if (!payload.title) return res.status(400).json({ ok: false, error: 'title_required' });
    const id = String(req.body?.id || buildPriceId(payload)).trim();
    try {
      const q = await pool.query(
        `INSERT INTO app_resort_prices(
           id, resort_id, price_type, title, image_url, description, duration_text, unit_label,
           currency, amount, included_items, sort_order, is_active, created_at, updated_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12, now(), now())
         ON CONFLICT (id) DO UPDATE SET
           resort_id=EXCLUDED.resort_id,
           price_type=EXCLUDED.price_type,
           title=EXCLUDED.title,
           image_url=EXCLUDED.image_url,
           description=EXCLUDED.description,
           duration_text=EXCLUDED.duration_text,
           unit_label=EXCLUDED.unit_label,
           currency=EXCLUDED.currency,
           amount=EXCLUDED.amount,
           included_items=EXCLUDED.included_items,
           sort_order=EXCLUDED.sort_order,
           is_active=EXCLUDED.is_active,
           updated_at=now()
         RETURNING *`,
        [
          id,
          payload.resort_id,
          payload.price_type,
          payload.title,
          payload.image_url,
          payload.description,
          payload.duration_text,
          payload.unit_label,
          payload.currency,
          payload.amount,
          JSON.stringify(payload.included_items),
          payload.sort_order,
          payload.is_active,
        ]
      );
      res.json({ ok: true, price: q.rows[0] || null });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_resort_price_create_failed', detail: String(error?.message || error) });
    }
  });

  app.patch('/api/admin/resort-prices/:id', requireAdmin, async (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ ok: false, error: 'price_id_required' });
    const payload = normalizePricePayload(req.body || {});
    try {
      const q = await pool.query(
        `UPDATE app_resort_prices
         SET resort_id=$2,
             price_type=$3,
             title=$4,
             image_url=$5,
             description=$6,
             duration_text=$7,
             unit_label=$8,
             currency=$9,
             amount=$10,
             included_items=$11::jsonb,
             sort_order=$12,
             is_active=$13,
             updated_at=now()
         WHERE id=$1
         RETURNING *`,
        [
          id,
          payload.resort_id,
          payload.price_type,
          payload.title,
          payload.image_url,
          payload.description,
          payload.duration_text,
          payload.unit_label,
          payload.currency,
          payload.amount,
          JSON.stringify(payload.included_items),
          payload.sort_order,
          payload.is_active,
        ]
      );
      if (!q.rows.length) return res.status(404).json({ ok: false, error: 'price_not_found' });
      res.json({ ok: true, price: q.rows[0] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_resort_price_update_failed', detail: String(error?.message || error) });
    }
  });

  app.delete('/api/admin/resort-prices/:id', requireAdmin, async (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ ok: false, error: 'price_id_required' });
    try {
      const q = await pool.query('DELETE FROM app_resort_prices WHERE id=$1 RETURNING id', [id]);
      if (!q.rows.length) return res.status(404).json({ ok: false, error: 'price_not_found' });
      res.json({ ok: true, removed: q.rows[0] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_resort_price_delete_failed', detail: String(error?.message || error) });
    }
  });
}
