const PROFILE_COLUMNS = [
  'username',
  'full_name',
  'contact_phone',
  'bio',
  'avatar_url',
  'resort_cover_url',
  'resort_photo_urls',
  'resort_amenities',
  'website',
  'account_type',
  'diving_level',
  'scuba_level',
  'freediving_level',
  'license_image_url',
  'license_type',
  'license_number',
  'license_agency',
  'license_issued_at',
  'created_at',
];

const EDITABLE_COLUMNS = new Set([
  'full_name',
  'contact_phone',
  'bio',
  'avatar_url',
  'resort_cover_url',
  'resort_photo_urls',
  'resort_amenities',
  'website',
  'diving_level',
  'scuba_level',
  'freediving_level',
  'license_image_url',
  'license_type',
  'license_number',
  'license_agency',
  'license_issued_at',
]);

function cleanText(value) {
  return String(value ?? '').trim();
}

function sanitizePatch(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key]) => EDITABLE_COLUMNS.has(key))
      .map(([key, value]) => [key, cleanText(value)])
  );
}

async function findProfile(pool, userId) {
  const result = await pool.query(
    `SELECT id, ${PROFILE_COLUMNS.join(', ')} FROM app_profiles WHERE id=$1 LIMIT 1`,
    [String(userId)]
  );
  return result.rows[0] || null;
}

export function registerProfileRoutes(app, { pool, getAuthUserId, authRateLimit }) {
  app.get('/api/profiles/:userId', authRateLimit(120, 60_000), async (req, res) => {
    try {
      const profile = await findProfile(pool, req.params.userId);
      if (!profile) return res.status(404).json({ error: 'profile_not_found' });
      return res.json({ ok: true, data: profile });
    } catch {
      return res.status(500).json({ error: 'profile_read_failed' });
    }
  });

  app.get('/api/profile/me', authRateLimit(120, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const profile = await findProfile(pool, userId);
      if (!profile) return res.status(404).json({ error: 'profile_not_found' });
      return res.json({ ok: true, data: profile });
    } catch {
      return res.status(500).json({ error: 'profile_read_failed' });
    }
  });

  app.patch('/api/profile/me', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const patch = sanitizePatch(req.body);
    const columns = Object.keys(patch);
    if (!columns.length) return res.status(400).json({ error: 'profile_patch_empty' });

    try {
      const values = columns.map((column) => patch[column]);
      values.push(String(userId));
      const assignments = columns.map((column, index) => `${column}=$${index + 1}`).join(', ');
      await pool.query(
        `UPDATE app_profiles SET ${assignments} WHERE id=$${values.length}`,
        values
      );
      const profile = await findProfile(pool, userId);
      return res.json({ ok: true, data: profile });
    } catch {
      return res.status(500).json({ error: 'profile_update_failed' });
    }
  });
}
