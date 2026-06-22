const DEFAULT_LEGAL_DOCS = {
  'app-info': {
    title: 'Divergram 앱 정보(초안)',
    html: `<h1>Divergram 앱 정보(초안)</h1><p>Divergram은 다이빙 기록/공유 서비스입니다.</p>`,
  },
  terms: {
    title: 'Divergram 이용약관(초안)',
    html: `<h1>Divergram 이용약관(초안)</h1><p>본 약관은 서비스 이용 조건을 규정합니다.</p>`,
  },
  privacy: {
    title: '개인정보 처리방침·수집이용 동의(초안)',
    html: `<h1>개인정보 처리방침·수집이용 동의(초안)</h1><p>개인정보 수집·이용 목적 및 보관기간을 안내합니다.</p>`,
  },
};

export function registerLegalRoutes(app, { pool, requireAdmin }) {
  app.get('/api/legal/:slug', async (req, res) => {
    const slug = String(req.params.slug || '').trim();
    if (!['app-info', 'terms', 'privacy'].includes(slug)) return res.status(404).json({ error: 'not_found' });

    try {
      const q = await pool.query(
        'SELECT data FROM app_records WHERE table_name=$1 AND record_id=$2 LIMIT 1',
        ['legal_docs', slug]
      );
      const row = q.rows[0];
      const fallback = DEFAULT_LEGAL_DOCS[slug];
      const payload = row?.data || fallback;
      return res.json({ ok: true, slug, title: payload.title, html: payload.html, source: row ? 'db' : 'default' });
    } catch {
      const fallback = DEFAULT_LEGAL_DOCS[slug];
      return res.json({ ok: true, slug, title: fallback.title, html: fallback.html, source: 'default' });
    }
  });

  app.put('/api/admin/legal/:slug', requireAdmin, async (req, res) => {
    const slug = String(req.params.slug || '').trim();
    if (!['app-info', 'terms', 'privacy'].includes(slug)) return res.status(404).json({ error: 'not_found' });

    const title = String(req.body?.title || '').trim();
    const html = String(req.body?.html || '').trim();
    if (!title || !html) return res.status(400).json({ error: 'title/html required' });

    try {
      await pool.query(
        `INSERT INTO app_records(table_name,record_id,data,updated_at)
         VALUES ($1,$2,$3::jsonb,now())
         ON CONFLICT (table_name,record_id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()`,
        ['legal_docs', slug, JSON.stringify({ title, html })]
      );
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'save_failed' });
    }
  });
}
