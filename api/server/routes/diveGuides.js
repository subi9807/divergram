import crypto from 'node:crypto';
import { DIVE_GUIDE_CATEGORIES, DIVE_GUIDE_LOCALES, localizedDiveGuide, normalizeDiveGuideInput } from '../lib/diveGuide.js';

export async function ensureDiveGuideSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_dive_guides (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'skills',
      translations JSONB NOT NULL DEFAULT '{}'::jsonb,
      cover_image_url TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      featured BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT app_dive_guides_category_check CHECK (category IN ('safety','equipment','skills','environment','travel','marine_life','news')),
      CONSTRAINT app_dive_guides_status_check CHECK (status IN ('draft','published'))
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_dive_guides_public_idx ON app_dive_guides(status, featured DESC, sort_order DESC, published_at DESC, created_at DESC)`);
}

function adminGuide(row) {
  return {
    id: row.id,
    category: row.category,
    translations: row.translations || {},
    coverImageUrl: row.cover_image_url || '',
    videoUrl: row.video_url || '',
    status: row.status,
    featured: row.featured === true,
    sortOrder: Number(row.sort_order || 0),
    createdBy: row.created_by || '',
    publishedAt: row.published_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function handleGuideError(error, res) {
  if (error?.message === 'dive_guide_not_publishable') {
    return res.status(400).json({ error: error.message, issues: error.issues || [] });
  }
  if (String(error?.message || '').startsWith('invalid_dive_guide_')) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(500).json({ error: 'dive_guide_request_failed', detail: String(error?.message || error) });
}

export function registerDiveGuideRoutes(app, { pool, requireAdmin }) {
  app.get('/api/dive-guides', async (req, res) => {
    const locale = DIVE_GUIDE_LOCALES.includes(String(req.query.locale || '')) ? String(req.query.locale) : 'en';
    const category = String(req.query.category || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    if (category && !DIVE_GUIDE_CATEGORIES.includes(category)) return res.status(400).json({ error: 'invalid_dive_guide_category' });
    try {
      const result = await pool.query(
        `SELECT * FROM app_dive_guides
         WHERE status='published'
           AND ($1::text='' OR category=$1)
           AND COALESCE(translations->$2->>'title','')<>''
           AND COALESCE(translations->$2->>'body','')<>''
         ORDER BY featured DESC, sort_order DESC, published_at DESC NULLS LAST, created_at DESC
         LIMIT $3 OFFSET $4`,
        [category, locale, limit + 1, offset]
      );
      const rows = result.rows.slice(0, limit).map((row) => localizedDiveGuide(row, locale)).filter(Boolean);
      res.json({ ok: true, data: rows, nextOffset: result.rows.length > limit ? offset + limit : null });
    } catch (error) {
      handleGuideError(error, res);
    }
  });

  app.get('/api/dive-guides/:id', async (req, res) => {
    const locale = DIVE_GUIDE_LOCALES.includes(String(req.query.locale || '')) ? String(req.query.locale) : 'en';
    try {
      const result = await pool.query(`SELECT * FROM app_dive_guides WHERE id=$1 AND status='published' LIMIT 1`, [String(req.params.id)]);
      const guide = result.rows[0] ? localizedDiveGuide(result.rows[0], locale) : null;
      if (!guide) return res.status(404).json({ error: 'dive_guide_not_found' });
      res.json({ ok: true, data: guide });
    } catch (error) {
      handleGuideError(error, res);
    }
  });

  app.get('/api/admin/dive-guides', requireAdmin, async (_req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM app_dive_guides ORDER BY updated_at DESC`);
      res.json({ ok: true, data: result.rows.map(adminGuide), categories: DIVE_GUIDE_CATEGORIES, locales: DIVE_GUIDE_LOCALES });
    } catch (error) {
      handleGuideError(error, res);
    }
  });

  app.post('/api/admin/dive-guides', requireAdmin, async (req, res) => {
    try {
      const value = normalizeDiveGuideInput(req.body || {});
      const id = crypto.randomUUID();
      const result = await pool.query(
        `INSERT INTO app_dive_guides(id,category,translations,cover_image_url,video_url,status,featured,sort_order,created_by,published_at)
         VALUES($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,CASE WHEN $6='published' THEN now() ELSE NULL END)
         RETURNING *`,
        [id, value.category, JSON.stringify(value.translations), value.coverImageUrl, value.videoUrl, value.status, value.featured, value.sortOrder, req.adminAuth?.userId || req.adminAuth?.email || 'admin']
      );
      res.status(201).json({ ok: true, data: adminGuide(result.rows[0]) });
    } catch (error) {
      handleGuideError(error, res);
    }
  });

  app.patch('/api/admin/dive-guides/:id', requireAdmin, async (req, res) => {
    try {
      const currentResult = await pool.query(`SELECT * FROM app_dive_guides WHERE id=$1 LIMIT 1`, [String(req.params.id)]);
      if (!currentResult.rows.length) return res.status(404).json({ error: 'dive_guide_not_found' });
      const current = currentResult.rows[0];
      const value = normalizeDiveGuideInput(req.body || {}, current);
      const result = await pool.query(
        `UPDATE app_dive_guides SET category=$2,translations=$3::jsonb,cover_image_url=$4,video_url=$5,status=$6,
           featured=$7,sort_order=$8,published_at=CASE WHEN $6='published' THEN COALESCE(published_at,now()) ELSE NULL END,updated_at=now()
         WHERE id=$1 RETURNING *`,
        [current.id, value.category, JSON.stringify(value.translations), value.coverImageUrl, value.videoUrl, value.status, value.featured, value.sortOrder]
      );
      res.json({ ok: true, data: adminGuide(result.rows[0]) });
    } catch (error) {
      handleGuideError(error, res);
    }
  });

  app.delete('/api/admin/dive-guides/:id', requireAdmin, async (req, res) => {
    try {
      const result = await pool.query(`DELETE FROM app_dive_guides WHERE id=$1 RETURNING id`, [String(req.params.id)]);
      if (!result.rows.length) return res.status(404).json({ error: 'dive_guide_not_found' });
      res.json({ ok: true, id: result.rows[0].id });
    } catch (error) {
      handleGuideError(error, res);
    }
  });
}

