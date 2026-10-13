function text(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function extractCredential(value) {
  const raw = text(value, 5000);
  if (!raw) return '';
  if (!raw.includes('://')) return raw;
  try {
    return text(new URL(raw).searchParams.get('credential'), 5000);
  } catch {
    return '';
  }
}

async function managedResorts(pool, userId) {
  const result = await pool.query(
    `SELECT DISTINCT p.id::text AS id,p.full_name AS name,p.avatar_url
       FROM app_profiles p
       LEFT JOIN app_resort_managers m ON m.resort_id=p.id AND m.user_id=$1
      WHERE m.user_id=$1 OR p.resort_owner_user_id=$1
      ORDER BY p.full_name ASC`,
    [userId]
  );
  return result.rows || [];
}

export function registerResortCheckinRoutes(app, { pool, getAuthUserId, authRateLimit, jwt, jwtSecret }) {
  app.get('/api/resort-checkins/context', authRateLimit(30, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const resorts = await managedResorts(pool, userId);
      const resortIds = resorts.map((item) => item.id);
      const recent = resortIds.length
        ? await pool.query(
            `SELECT c.id::text,c.resort_id,c.checked_in_at,c.method,c.member_number,c.license_id,
                    COALESCE(NULLIF(p.full_name,''),u.username) AS member_name,p.avatar_url
               FROM app_resort_checkins c
               JOIN app_users u ON u.id=c.member_user_id
               LEFT JOIN app_profiles p ON p.id=u.id::text
              WHERE c.resort_id=ANY($1::text[])
              ORDER BY c.checked_in_at DESC LIMIT 30`,
            [resortIds]
          )
        : { rows: [] };
      return res.json({ ok: true, resorts, recent: recent.rows || [] });
    } catch (error) {
      return res.status(500).json({ error: 'resort_checkin_context_failed', detail: text(error?.message) });
    }
  });

  app.post('/api/resort-checkins/scan', authRateLimit(60, 60_000), async (req, res) => {
    const operatorId = getAuthUserId(req);
    if (!operatorId) return res.status(401).json({ error: 'unauthorized' });
    const resortId = text(req.body?.resortId, 120);
    const credential = extractCredential(req.body?.qrData ?? req.body?.credential);
    if (!resortId || !credential) return res.status(400).json({ error: 'checkin_scan_required' });

    try {
      const permission = await pool.query(
        `SELECT 1 FROM app_profiles p
          LEFT JOIN app_resort_managers m ON m.resort_id=p.id AND m.user_id=$2
         WHERE p.id=$1 AND (m.user_id=$2 OR p.resort_owner_user_id=$2) LIMIT 1`,
        [resortId, operatorId]
      );
      if (!permission.rows.length) return res.status(403).json({ error: 'resort_manager_required' });

      const payload = jwt.verify(credential, jwtSecret, { issuer: 'divergram' });
      if (payload?.scope !== 'resort_checkin_credential') return res.status(400).json({ error: 'invalid_checkin_credential' });
      const memberId = text(payload.sub, 40);
      const memberNumber = text(payload.memberNumber, 40);
      const licenseId = text(payload.licenseId, 120);
      const member = await pool.query(
        `SELECT u.id,u.is_blocked,COALESCE(NULLIF(p.full_name,''),u.username) AS member_name,p.avatar_url
           FROM app_users u LEFT JOIN app_profiles p ON p.id=u.id::text
          WHERE u.id=$1 LIMIT 1`,
        [memberId]
      );
      if (!member.rows.length || member.rows[0].is_blocked) return res.status(404).json({ error: 'checkin_member_unavailable' });
      const licenses = await pool.query(
        "SELECT data FROM app_records WHERE table_name='diving_licenses' AND record_id=$1 LIMIT 1",
        [memberId]
      );
      const activeLicense = (Array.isArray(licenses.rows[0]?.data?.items) ? licenses.rows[0].data.items : []).find(
        (item) => text(item?.id, 120) === licenseId && text(item?.memberNumber ?? item?.member_number, 40) === memberNumber && text(item?.status, 40) === 'active'
      );
      if (!activeLicense) return res.status(404).json({ error: 'checkin_license_unavailable' });

      const duplicate = await pool.query(
        `SELECT id::text,checked_in_at FROM app_resort_checkins
          WHERE resort_id=$1 AND member_user_id=$2 AND checked_in_at > now() - interval '2 hours'
          ORDER BY checked_in_at DESC LIMIT 1`,
        [resortId, memberId]
      );
      if (duplicate.rows.length) {
        return res.json({ ok: true, duplicate: true, checkin: { ...duplicate.rows[0], ...member.rows[0], resort_id: resortId } });
      }

      const inserted = await pool.query(
        `INSERT INTO app_resort_checkins(resort_id,member_user_id,checked_in_by,license_id,member_number,method)
         VALUES($1,$2,$3,$4,$5,'wallet_qr') RETURNING id::text,resort_id,checked_in_at,method,license_id,member_number`,
        [resortId, memberId, operatorId, licenseId, memberNumber]
      );
      return res.status(201).json({ ok: true, duplicate: false, checkin: { ...inserted.rows[0], ...member.rows[0] } });
    } catch (error) {
      if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error?.name)) {
        return res.status(400).json({ error: 'invalid_checkin_credential' });
      }
      return res.status(500).json({ error: 'resort_checkin_failed', detail: text(error?.message) });
    }
  });
}
