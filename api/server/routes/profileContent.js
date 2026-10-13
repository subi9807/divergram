import { canViewVisibility, effectiveVisibility, normalizeItemVisibility, normalizeVisibility, VISIBILITY_VALUES } from '../lib/contentVisibility.js';
import { marineLifeSightingResponse } from '../lib/marineLife.js';

const SETTINGS_COLUMNS = {
  profile: 'profile_content_visibility',
  feed: 'feed_content_visibility',
  reels: 'reels_content_visibility',
  diveLogs: 'dive_log_content_visibility',
  marineLife: 'marine_life_content_visibility',
};

function presentSettings(row) {
  return {
    profile: normalizeVisibility(row?.profile_content_visibility, 'public'),
    feed: normalizeVisibility(row?.feed_content_visibility, 'public'),
    reels: normalizeVisibility(row?.reels_content_visibility, 'public'),
    diveLogs: normalizeVisibility(row?.dive_log_content_visibility, 'followers'),
    marineLife: normalizeVisibility(row?.marine_life_content_visibility, 'private'),
  };
}

async function loadAccess(pool, targetUserId, viewerUserId) {
  const profileResult = await pool.query(
    `SELECT p.profile_content_visibility,p.feed_content_visibility,p.reels_content_visibility,
            p.dive_log_content_visibility,p.marine_life_content_visibility
       FROM app_profiles p
       JOIN app_users u ON u.id::text=p.id
      WHERE p.id=$1 AND COALESCE(u.is_blocked,false)=false
      LIMIT 1`,
    [targetUserId]
  );
  if (!profileResult.rows.length) return null;
  const isOwner = Boolean(viewerUserId && String(viewerUserId) === targetUserId);
  let isFollowing = false;
  if (viewerUserId && !isOwner) {
    const follow = await pool.query('SELECT 1 FROM app_follows WHERE follower_id=$1 AND following_id=$2 LIMIT 1', [String(viewerUserId), targetUserId]);
    isFollowing = follow.rows.length > 0;
  }
  return { settings: presentSettings(profileResult.rows[0]), isOwner, isFollowing };
}

function allowed(scope, access) {
  return canViewVisibility(scope, access);
}

function postResponse(row) {
  return {
    id: String(row.id),
    image_url: row.image_url || null,
    video_url: row.video_url || null,
    caption: String(row.caption || ''),
    location: row.location || row.dive_site || null,
    dive_type: row.dive_type || null,
    max_depth: row.max_depth ?? null,
    dive_duration: row.dive_duration ?? null,
    publishToFeed: row.publish_to_feed !== false,
    publishToReels: row.publish_to_reels === true,
    visibilityType: normalizeItemVisibility(row.visibility_type),
    media: Array.isArray(row.media) ? row.media : [],
    created_at: row.created_at,
  };
}

export function registerProfileContentRoutes(app, { pool, getAuthUserId, authRateLimit }) {
  const limit = authRateLimit(120, 60_000);

  app.get('/api/profile/content-visibility', limit, async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const result = await pool.query(`SELECT ${Object.values(SETTINGS_COLUMNS).join(',')} FROM app_profiles WHERE id=$1 LIMIT 1`, [String(userId)]);
      if (!result.rows.length) return res.status(404).json({ error: 'profile_not_found' });
      return res.json({ data: presentSettings(result.rows[0]) });
    } catch (error) {
      return res.status(error?.code === '42703' ? 503 : 500).json({ error: error?.code === '42703' ? 'content_visibility_migration_required' : 'content_visibility_load_failed' });
    }
  });

  app.patch('/api/profile/content-visibility', limit, async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const input = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const entries = Object.entries(SETTINGS_COLUMNS).filter(([key]) => input[key] !== undefined);
    if (!entries.length || entries.some(([key]) => !VISIBILITY_VALUES.has(String(input[key] || '').toLowerCase()))) {
      return res.status(400).json({ error: 'invalid_content_visibility' });
    }
    const values = entries.map(([key]) => String(input[key]).toLowerCase());
    values.push(String(userId));
    const assignments = entries.map(([, column], index) => `${column}=$${index + 1}`).join(',');
    try {
      const result = await pool.query(`UPDATE app_profiles SET ${assignments} WHERE id=$${values.length} RETURNING ${Object.values(SETTINGS_COLUMNS).join(',')}`, values);
      if (!result.rows.length) return res.status(404).json({ error: 'profile_not_found' });
      return res.json({ data: presentSettings(result.rows[0]) });
    } catch (error) {
      return res.status(error?.code === '42703' ? 503 : 500).json({ error: error?.code === '42703' ? 'content_visibility_migration_required' : 'content_visibility_update_failed' });
    }
  });

  app.patch('/api/profile/content-visibility/posts/:id', limit, async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const visibility = normalizeItemVisibility(req.body?.visibility);
    if (!String(req.params.id || '').trim() || String(req.body?.visibility || '').toLowerCase() !== visibility) return res.status(400).json({ error: 'invalid_content_visibility' });
    try {
      const result = await pool.query('UPDATE app_posts SET visibility_type=$1 WHERE id=$2 AND user_id=$3 RETURNING id,visibility_type', [visibility, String(req.params.id), String(userId)]);
      if (!result.rows.length) return res.status(404).json({ error: 'post_not_found' });
      return res.json({ data: { id: String(result.rows[0].id), visibility: result.rows[0].visibility_type } });
    } catch (error) {
      return res.status(error?.code === '42703' ? 503 : 500).json({ error: error?.code === '42703' ? 'content_visibility_migration_required' : 'content_visibility_update_failed' });
    }
  });

  app.get('/api/profiles/:userId/content', limit, async (req, res) => {
    const targetUserId = String(req.params.userId || '').trim();
    if (!targetUserId) return res.status(400).json({ error: 'user_id_required' });
    const viewerUserId = getAuthUserId(req);
    try {
      const access = await loadAccess(pool, targetUserId, viewerUserId);
      if (!access) return res.status(404).json({ error: 'profile_not_found' });
      if (!allowed(access.settings.profile, access)) {
        return res.json({ data: { posts: [], reels: [], diveLogs: [], marineLife: [], visibility: access.settings, restricted: true } });
      }

      const [postsResult, divesResult, marineResult] = await Promise.all([
        pool.query(
          `SELECT p.*,
                  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',m.id,'url',m.media_url,'type',m.media_type,'order',m.order_index) ORDER BY m.order_index) FROM app_post_media m WHERE m.post_id=p.id),'[]'::jsonb) AS media
             FROM app_posts p WHERE p.user_id=$1 ORDER BY p.created_at DESC LIMIT 500`,
          [targetUserId]
        ),
        pool.query('SELECT id,data,created_at,updated_at FROM app_dive_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 500', [targetUserId]),
        pool.query('SELECT * FROM app_marine_life_sightings WHERE user_id=$1 ORDER BY created_at DESC LIMIT 500', [targetUserId]),
      ]);

      const posts = postsResult.rows
        .filter(row => row.publish_to_feed !== false && allowed(effectiveVisibility(row.visibility_type, access.settings.feed), access))
        .map(postResponse);
      const reels = postsResult.rows
        .filter(row => (row.publish_to_reels === true || row.video_url) && allowed(effectiveVisibility(row.visibility_type, access.settings.reels), access))
        .map(postResponse);
      const diveLogs = divesResult.rows.filter(row => allowed(effectiveVisibility(row.data?.visibilityType, access.settings.diveLogs), access)).map(row => ({
        id: String(row.id),
        diveDate: row.data?.diveDate || null,
        divePointName: row.data?.divePointName || '',
        maxDepth: row.data?.maxDepth ?? null,
        totalDiveTime: row.data?.totalDiveTime ?? null,
        media: Array.isArray(row.data?.media) ? row.data.media.filter(item => item?.url).slice(0, 8) : [],
        visibilityType: effectiveVisibility(row.data?.visibilityType, access.settings.diveLogs),
      }));
      const marineLife = marineResult.rows.filter(row => allowed(effectiveVisibility(row.visibility_type, access.settings.marineLife), access)).map(marineLifeSightingResponse);
      return res.json({ data: { posts, reels, diveLogs, marineLife, visibility: access.settings, restricted: false } });
    } catch (error) {
      const migrationError = error?.code === '42703' || error?.code === '42P01';
      return res.status(migrationError ? 503 : 500).json({ error: migrationError ? 'content_visibility_migration_required' : 'profile_content_load_failed' });
    }
  });
}
