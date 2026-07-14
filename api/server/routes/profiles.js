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

function parseAvatarImage(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(png|jpe?g|webp));base64,(.+)$/i);
  if (!match) return null;
  const buffer = Buffer.from(match[3], 'base64');
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) return null;
  return {
    ext: match[2].toLowerCase().replace('jpeg', 'jpg'),
    buffer,
  };
}

function buildAvatarUrl(req, userId) {
  const configuredBase = String(process.env.PUBLIC_API_BASE_URL || 'https://api.divergram.com').replace(/\/+$/, '');
  return `${configuredBase}/api/profile/avatar/${encodeURIComponent(String(userId))}`;
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
  app.get('/api/profile/avatar/:userId', authRateLimit(240, 60_000), async (req, res) => {
    try {
      const result = await pool.query('SELECT avatar_image_path FROM app_profiles WHERE id=$1 LIMIT 1', [String(req.params.userId)]);
      const imagePath = String(result.rows[0]?.avatar_image_path || '').trim();
      if (!imagePath) return res.status(404).json({ error: 'avatar_not_found' });
      const safePath = path.resolve(imagePath);
      const safeRoot = path.resolve(PROFILE_AVATAR_DIR);
      if (!safePath.startsWith(`${safeRoot}${path.sep}`)) return res.status(403).json({ error: 'avatar_forbidden' });
      return res.sendFile(safePath);
    } catch {
      return res.status(500).json({ error: 'avatar_read_failed' });
    }
  });

  app.post('/api/profile/avatar', authRateLimit(12, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const image = parseAvatarImage(req.body?.imageData);
    if (!image) return res.status(400).json({ error: 'invalid_avatar_image' });

    let nextPath = '';
    try {
      await fs.mkdir(PROFILE_AVATAR_DIR, { recursive: true, mode: 0o700 });
      nextPath = path.join(PROFILE_AVATAR_DIR, `${userId}-${Date.now()}-${crypto.randomUUID()}.${image.ext}`);
      await fs.writeFile(nextPath, image.buffer, { mode: 0o600 });

      const previous = await pool.query('SELECT avatar_image_path FROM app_profiles WHERE id=$1 LIMIT 1', [String(userId)]);
      const avatarUrl = buildAvatarUrl(req, userId);
      const updated = await pool.query(
        'UPDATE app_profiles SET avatar_image_path=$1, avatar_url=$2 WHERE id=$3 RETURNING avatar_url',
        [nextPath, avatarUrl, String(userId)]
      );
      if (!updated.rowCount) throw new Error('profile_not_found');

      const previousPath = String(previous.rows[0]?.avatar_image_path || '').trim();
      if (previousPath && previousPath !== nextPath) void fs.unlink(previousPath).catch(() => undefined);
      return res.json({ ok: true, data: { avatar_url: avatarUrl } });
    } catch {
      if (nextPath) void fs.unlink(nextPath).catch(() => undefined);
      return res.status(500).json({ error: 'avatar_upload_failed' });
    }
  });

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
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const PROFILE_AVATAR_DIR = process.env.PROFILE_AVATAR_DIR || '/home/divergram/private/profile-avatars';
