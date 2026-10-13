import { LEGACY_SIGNUP_CONSENT_VERSIONS, loadSignupConsentConfig, SIGNUP_CONSENT_VERSION } from '../legal-consents.js';
import { MANAGED_POLICY_DEFAULTS } from '../legal-policy-defaults.js';

const DEFAULT_LEGAL_DOCS = {
  'app-info': {
    title: 'Divergram 앱 정보',
    html: `<h1>Divergram 앱 정보</h1><p>Divergram은 다이빙 기록, 콘텐츠 공유 및 다이빙 포인트 탐색 서비스를 제공합니다.</p>`,
  },
  terms: {
    title: 'Divergram 이용약관',
    html: `<h1>Divergram 이용약관</h1><p>이 약관은 Divergram이 제공하는 다이빙 SNS 및 기록 서비스의 이용 조건과 회원 및 회사의 권리·의무를 규정합니다.</p><h2>계정</h2><p>회원은 정확한 정보를 제공하고 계정 보안을 유지해야 합니다.</p><h2>금지행위</h2><p>불법 콘텐츠, 저작권 침해, 위험행위 조장, 사칭 및 스팸 행위를 금지합니다.</p><h2>준거법</h2><p>본 약관은 대한민국 법령을 준거법으로 합니다.</p>`,
  },
  privacy: {
    title: '개인정보 수집·이용 동의',
    html: `<h1>개인정보 수집·이용 동의</h1><h2>필수 수집 항목</h2><p>이메일 주소 또는 SNS 제공자 식별값, 닉네임, 가입 경로 및 약관 동의 이력</p><h2>이용 목적</h2><p>회원 식별·인증, 계정 관리, 부정 이용 방지, 서비스 제공 및 고객 지원</p><h2>보유 기간</h2><p>회원 탈퇴 및 유예기간 종료 시 파기합니다. 법령상 보존 의무가 있는 기록은 해당 기간 동안 분리 보관합니다.</p><h2>동의 거부</h2><p>필수 개인정보 수집에 동의하지 않을 수 있으나, 이 경우 회원가입이 제한됩니다.</p>`,
  },
};

export function registerLegalRoutes(app, { pool, requireAdmin }) {
  const listPolicies = async () => {
    const q = await pool.query(`SELECT record_id, data, updated_at FROM app_records WHERE table_name='legal_policies'`);
    const saved = new Map(q.rows.map((row) => [String(row.record_id), { ...(row.data || {}), updatedAt: row.updated_at }]));
    return MANAGED_POLICY_DEFAULTS.map((item) => ({
      ...item,
      locale: 'ko',
      published: true,
      ...(saved.get(item.type) || {}),
      type: item.type,
      consentKey: item.consentKey,
    }));
  };

  app.get('/api/legal/policies', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    try {
      const policies = (await listPolicies()).filter((item) => item.published);
      return res.json({ policies });
    } catch {
      return res.json({ policies: [] });
    }
  });

  app.get('/api/legal/signup-consents', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    const policies = await listPolicies();
    const config = await loadSignupConsentConfig(pool);
    return res.json({
      version: SIGNUP_CONSENT_VERSION,
      acceptedVersions: [SIGNUP_CONSENT_VERSION, ...LEGACY_SIGNUP_CONSENT_VERSIONS],
      policies: config,
      documents: policies.filter((item) => item.published && item.enabledForSignup),
    });
  });

  app.get('/api/admin/legal/policies', requireAdmin, async (_req, res) => {
    try {
      return res.json({ policies: await listPolicies() });
    } catch {
      return res.status(500).json({ error: 'legal_policy_list_failed' });
    }
  });

  app.put('/api/admin/legal/policies/:type', requireAdmin, async (req, res) => {
    const type = String(req.params.type || '').trim();
    const definition = MANAGED_POLICY_DEFAULTS.find((item) => item.type === type);
    if (!definition) return res.status(404).json({ error: 'unsupported_policy_type' });
    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    const version = String(req.body?.version || '').trim();
    const effectiveFrom = String(req.body?.effectiveFrom || '').trim();
    if (!title || !content || !version || !effectiveFrom) return res.status(400).json({ error: 'required_policy_fields_missing' });
    const data = {
      ...definition,
      title,
      content,
      version,
      effectiveFrom,
      locale: 'ko',
      published: req.body?.published !== false,
      requiredForSignup: definition.requiredForSignup,
      enabledForSignup: definition.enabledForSignup,
      updatedAt: new Date().toISOString(),
    };
    await pool.query(
      `INSERT INTO app_records(table_name,record_id,data,updated_at)
       VALUES ('legal_policies',$1,$2::jsonb,now())
       ON CONFLICT (table_name,record_id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()`,
      [type, JSON.stringify(data)]
    );
    return res.json({ ok: true, policy: data });
  });

  app.get('/api/legal/:slug', async (req, res) => {
    const slug = String(req.params.slug || '').trim();
    const managedDefinition = MANAGED_POLICY_DEFAULTS.find((item) => item.type === slug);
    if (slug !== 'app-info' && !managedDefinition) return res.status(404).json({ error: 'not_found' });

    try {
      const managed = await pool.query(
        `SELECT data FROM app_records
         WHERE table_name='legal_policies' AND record_id=$1
           AND COALESCE((data->>'published')::boolean, false)=true
         LIMIT 1`,
        [slug]
      );
      if (managed.rows[0]?.data) {
        const policy = managed.rows[0].data;
        return res.json({
          ok: true,
          slug,
          title: policy.title,
          html: policy.content,
          content: policy.content,
          version: policy.version,
          effectiveFrom: policy.effectiveFrom,
          source: 'managed_policy',
        });
      }
      const q = await pool.query(
        'SELECT data FROM app_records WHERE table_name=$1 AND record_id=$2 LIMIT 1',
        ['legal_docs', slug]
      );
      const row = q.rows[0];
      const fallback = DEFAULT_LEGAL_DOCS[slug] || managedDefinition;
      const payload = row?.data || fallback;
      return res.json({
        ok: true,
        slug,
        title: payload.title,
        html: payload.html || payload.content,
        content: payload.content || payload.html,
        version: payload.version,
        effectiveFrom: payload.effectiveFrom,
        source: row ? 'db' : 'default',
      });
    } catch {
      const fallback = DEFAULT_LEGAL_DOCS[slug] || managedDefinition;
      return res.json({
        ok: true,
        slug,
        title: fallback.title,
        html: fallback.html || fallback.content,
        content: fallback.content || fallback.html,
        version: fallback.version,
        effectiveFrom: fallback.effectiveFrom,
        source: 'default',
      });
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
