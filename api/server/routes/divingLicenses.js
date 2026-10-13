import crypto from 'crypto';

function text(value, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function maskHolderName(value) {
  return text(value, 160)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.length <= 1 ? part : `${part[0]}${'*'.repeat(Math.min(part.length - 1, 6))}`)
    .join(' ');
}

function verificationPage(license) {
  const active = license.status === 'active';
  const accent = active ? '#087f6b' : '#b45309';
  const status = active ? '유효한 라이선스' : license.status === 'pending_review' ? '검토 중' : license.status === 'expired' ? '만료됨' : license.status === 'revoked' ? '취소됨' : '임시 저장';
  const discipline = license.discipline === 'freediving' ? '프리다이빙' : '스쿠버다이빙';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#071d2a"><title>Divergram 라이선스 확인</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;display:grid;place-items:center;color:#102a35;background:radial-gradient(circle at 20% 10%,#174c62 0,#071d2a 48%,#04121b 100%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{width:min(100%,440px)}.brand{display:flex;align-items:center;gap:12px;margin:0 0 18px;color:#fff}.brand img{width:46px;height:46px;border-radius:13px}.brand strong{display:block;font-size:20px}.brand span{font-size:11px;letter-spacing:.12em;color:#9ec5d2}.card{overflow:hidden;border:1px solid rgba(255,255,255,.32);border-radius:24px;background:#fff;box-shadow:0 28px 70px rgba(0,0,0,.32)}.hero{padding:22px;background:linear-gradient(135deg,#eefbfa,#e8f3fb)}.badge{display:inline-flex;padding:7px 11px;border-radius:999px;color:${accent};background:#fff;font-size:12px;font-weight:800}.hero h1{margin:18px 0 5px;font-size:28px}.hero p{margin:0;color:#58717b}.details{padding:22px;display:grid;grid-template-columns:1fr 1fr;gap:18px}.field{min-width:0}.field.wide{grid-column:1/-1}.field span{display:block;margin-bottom:5px;color:#78909a;font-size:10px;font-weight:800;letter-spacing:.08em}.field strong{display:block;overflow-wrap:anywhere;font-size:15px}.notice{margin:0 22px 22px;padding:14px;border-radius:14px;color:#58717b;background:#f3f7f8;font-size:12px;line-height:1.6}.footer{padding:0 22px 22px;color:#91a4aa;font-size:10px;text-align:center}@media(max-width:380px){body{padding:14px}.details{grid-template-columns:1fr}.field.wide{grid-column:auto}}
  </style></head><body><main class="wrap"><div class="brand"><img src="https://divergram.com/assets/divergram-logo-blue.png" alt=""><div><strong>Divergram</strong><span>DIGITAL DIVING LICENSE</span></div></div><section class="card"><header class="hero"><span class="badge">${escapeHtml(status)}</span><h1>${escapeHtml(maskHolderName(license.holderName))}</h1><p>${escapeHtml(discipline)}</p></header><div class="details"><div class="field wide"><span>LICENSE NUMBER</span><strong>${escapeHtml(license.licenseNumber)}</strong></div><div class="field"><span>AGENCY</span><strong>${escapeHtml(license.trainingAgency || '-')}</strong></div><div class="field"><span>LEVEL</span><strong>${escapeHtml(license.certificationLevel || '-')}</strong></div><div class="field"><span>ISSUED</span><strong>${escapeHtml(license.issueDate || '-')}</strong></div><div class="field"><span>STATUS</span><strong style="color:${accent}">${escapeHtml(status)}</strong></div></div><p class="notice">이 화면은 Divergram에 등록된 라이선스 정보의 현재 상태를 확인합니다. 발급 교육기관의 공식 자격증을 대체하지 않습니다.</p><footer class="footer">Verified by Divergram</footer></section></main></body></html>`;
}

function normalizeLicense(row, userId) {
  const source = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
  const id = text(source.id, 120);
  const licenseNumber = text(source.licenseNumber ?? source.license_number, 120);
  const holderName = text(source.holderName ?? source.holder_name, 160);
  if (!id || !licenseNumber || !holderName) return null;
  const maxDepth = Number(source.maxDepth ?? source.max_depth);
  return {
    id,
    userId: String(userId),
    licenseNumber,
    memberNumber: text(source.memberNumber ?? source.member_number, 32) || undefined,
    holderName,
    profileImageUrl: text(source.profileImageUrl ?? source.profile_image_url, 1000) || undefined,
    discipline: ['scuba', 'freediving'].includes(source.discipline) ? source.discipline : 'scuba',
    certificationLevel: text(source.certificationLevel ?? source.certification_level, 160),
    issueDate: text(source.issueDate ?? source.issue_date, 40),
    expirationDate: text(source.expirationDate ?? source.expiration_date, 40) || undefined,
    hasExpiration: source.hasExpiration === true || source.has_expiration === true,
    maxDepth: Number.isFinite(maxDepth) ? maxDepth : undefined,
    trainingAgency: text(source.trainingAgency ?? source.training_agency, 160) || undefined,
    instructorName: text(source.instructorName ?? source.instructor_name, 160) || undefined,
    instructorNumber: text(source.instructorNumber ?? source.instructor_number, 120) || undefined,
    emergencyContact: text(source.emergencyContact ?? source.emergency_contact, 300) || undefined,
    verificationUrl: text(source.verificationUrl ?? source.verification_url, 1000) || undefined,
    walletPassUrl: text(source.walletPassUrl ?? source.wallet_pass_url, 1000) || undefined,
    status: ['draft', 'active', 'pending_review', 'expired', 'revoked'].includes(source.status) ? source.status : 'draft',
    notes: text(source.notes, 2000) || undefined,
    createdAt: text(source.createdAt ?? source.created_at, 40) || new Date().toISOString(),
    updatedAt: text(source.updatedAt ?? source.updated_at, 40) || new Date().toISOString(),
  };
}

export function normalizeLicenses(input, userId) {
  if (!Array.isArray(input)) return [];
  const used = new Set();
  return input.slice(0, 100).map((item) => normalizeLicense(item, userId)).filter(Boolean).map((license) => {
    const year = /^\d{4}/.test(license.issueDate) ? license.issueDate.slice(0, 4) : String(new Date().getFullYear());
    const prefix = license.discipline === 'freediving' ? 'FD' : 'SC';
    const expected = `DG-${prefix}-${year}-`;
    let memberNumber = text(license.memberNumber, 32).toUpperCase();
    if (!new RegExp(`^DG-${prefix}-${year}-[0-9A-F]{4}$`).test(memberNumber) || used.has(memberNumber)) {
      let attempt = 0;
      do {
        const digest = crypto.createHash('sha256').update(`${userId}:${license.id}:${prefix}:${year}:${attempt}`).digest('hex').slice(0, 4).toUpperCase();
        memberNumber = `${expected}${digest}`;
        attempt += 1;
      } while (used.has(memberNumber));
    }
    used.add(memberNumber);
    return { ...license, memberNumber };
  });
}

export function registerDivingLicenseRoutes(app, { pool, getAuthUserId, authRateLimit }) {
  app.get('/api/diving-licenses/verify/:licenseNumber', authRateLimit(60, 60_000), async (req, res) => {
    const licenseNumber = text(req.params.licenseNumber, 120);
    if (!licenseNumber) return res.status(400).type('html').send('<h1>라이선스 번호가 필요합니다.</h1>');
    try {
      if (licenseNumber.toUpperCase() === 'DG-SC-2026-A7F2') {
        return res.type('html').send(verificationPage({
          licenseNumber: 'DG-SC-2026-A7F2', holderName: 'SAMPLE USER', discipline: 'scuba',
          certificationLevel: 'PREVIEW LICENSE', issueDate: '2026-08-28', trainingAgency: 'DIVERGRAM', status: 'draft',
        }));
      }
      const result = await pool.query(
        `SELECT record_id, data FROM app_records
          WHERE table_name='diving_licenses'
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(COALESCE(data->'items','[]'::jsonb)) item
               WHERE upper(COALESCE(item->>'licenseNumber',item->>'license_number',''))=upper($1)
            )
          LIMIT 1`,
        [licenseNumber]
      );
      const row = result.rows[0];
      const license = row
        ? normalizeLicenses(row.data?.items, row.record_id).find((item) => item.licenseNumber.toUpperCase() === licenseNumber.toUpperCase())
        : null;
      if (!license) {
        return res.status(404).type('html').send('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;padding:32px"><h1>라이선스를 찾을 수 없습니다.</h1><p>번호를 확인하거나 Divergram 고객센터로 문의해주세요.</p></body></html>');
      }
      if (String(req.get('accept') || '').includes('application/json')) {
        return res.json({ ok: true, data: { ...license, holderName: maskHolderName(license.holderName), emergencyContact: undefined, notes: undefined } });
      }
      return res.type('html').send(verificationPage(license));
    } catch (error) {
      console.error('diving_license_verify_failed', error?.message || error);
      return res.status(500).type('html').send('<h1>라이선스 확인 중 오류가 발생했습니다.</h1>');
    }
  });

  app.get('/api/diving-licenses/me', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const result = await pool.query(
        "SELECT data, updated_at FROM app_records WHERE table_name='diving_licenses' AND record_id=$1 LIMIT 1",
        [String(userId)]
      );
      const found = result.rows[0] || null;
      const items = normalizeLicenses(found?.data?.items, userId);
      if (found && JSON.stringify(found.data?.items || []) !== JSON.stringify(items)) {
        await pool.query(
          "UPDATE app_records SET data=$1::jsonb,updated_at=now() WHERE table_name='diving_licenses' AND record_id=$2",
          [JSON.stringify({ items }), String(userId)]
        );
      }
      return res.json({
        ok: true,
        data: items,
        exists: Boolean(found),
        updatedAt: found?.updated_at || null,
      });
    } catch {
      return res.status(500).json({ error: 'diving_licenses_read_failed' });
    }
  });

  app.put('/api/diving-licenses/me', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const items = normalizeLicenses(req.body?.items, userId);
      const result = await pool.query(
        `INSERT INTO app_records(table_name, record_id, data, updated_at)
         VALUES ('diving_licenses',$1,$2::jsonb,now())
         ON CONFLICT (table_name, record_id)
         DO UPDATE SET data=EXCLUDED.data, updated_at=now()
         RETURNING updated_at`,
        [String(userId), JSON.stringify({ items })]
      );
      return res.json({ ok: true, data: items, exists: true, updatedAt: result.rows[0]?.updated_at || null });
    } catch {
      return res.status(500).json({ error: 'diving_licenses_update_failed' });
    }
  });
}
