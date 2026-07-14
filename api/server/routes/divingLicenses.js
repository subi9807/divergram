function text(value, max = 300) {
  return String(value ?? '').trim().slice(0, max);
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

function normalizeLicenses(input, userId) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 100).map((item) => normalizeLicense(item, userId)).filter(Boolean);
}

export function registerDivingLicenseRoutes(app, { pool, getAuthUserId, authRateLimit }) {
  app.get('/api/diving-licenses/me', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const result = await pool.query(
        "SELECT data, updated_at FROM app_records WHERE table_name='diving_licenses' AND record_id=$1 LIMIT 1",
        [String(userId)]
      );
      const found = result.rows[0] || null;
      return res.json({
        ok: true,
        data: normalizeLicenses(found?.data?.items, userId),
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
