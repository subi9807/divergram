import { deliverUserEventNotification } from '../lib/userNotificationDelivery.js';
import { canViewVisibility, effectiveVisibility, normalizeVisibility } from '../lib/contentVisibility.js';
import { compileRead, compileFilters } from '../lib/dataQuery.js';

function applyJsonFilters(rows, filters = []) {
  const get = (obj, key) => obj?.[key];
  return rows.filter((r) => filters.every((f) => {
    const value = get(r, f.column);
    if (f.op === 'eq') return value === f.value;
    if (f.op === 'neq') return value !== f.value;
    if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(value);
    if (f.op === 'is') return f.value === null ? value == null : value === f.value;
    if (f.op === 'not') {
      if (f.operator === 'is' && f.value === null) return value != null;
      if (f.operator === 'eq') return value !== f.value;
      return true;
    }
    if (f.op === 'ilike') {
      const pattern = String(f.value || '').toLowerCase().replace(/%/g, '');
      return String(value || '').toLowerCase().includes(pattern);
    }
    if (f.op === 'or') {
      const clauses = String(f.value || '').split(',').map((s) => s.trim()).filter(Boolean);
      return clauses.some((clause) => {
        const m = clause.match(/^([^\.]+)\.(eq|ilike)\.(.+)$/);
        if (!m) return false;
        const [, col, op, raw] = m;
        const rowVal = get(r, col);
        if (op === 'eq') return String(rowVal ?? '') === raw;
        if (op === 'ilike') return String(rowVal ?? '').toLowerCase().includes(raw.toLowerCase().replace(/%/g, ''));
        return false;
      });
    }
    return true;
  }));
}

export const DATA_TABLES = {
  profiles: {
    table: 'app_profiles',
    columns: [
      'id',
      'username',
      'full_name',
      'bio',
      'avatar_url',
      'resort_cover_url',
      'resort_photo_urls',
      'resort_amenities',
      'website',
      'resort_instagram_url',
      'resort_facebook_url',
      'resort_youtube_url',
      'resort_tiktok_url',
      'account_type',
      'diving_level',
      'scuba_level',
      'freediving_level',
      'license_image_url',
      'license_type',
      'license_number',
      'license_agency',
      'license_issued_at',
      'resort_address',
      'resort_region',
      'resort_lat',
      'resort_lng',
      'resort_rating_avg',
      'resort_review_count',
      'resort_record_key',
      'resort_source',
      'resort_source_record_id',
      'resort_source_url',
      'resort_country',
      'resort_country_code',
      'resort_city',
      'resort_phones',
      'resort_emails',
      'resort_certifications',
      'resort_source_raw',
      'resort_collected_at',
      'resort_coordinate_source',
      'resort_geocoded_at',
      'resort_reverse_geocode_source',
      'resort_nearest_city_distance_km',
      'resort_booking_enabled',
      'resort_booking_deposit_amount',
      'resort_booking_deposit_currency',
      'created_at',
    ],
  },
  posts: { table: 'app_posts', columns: ['id','user_id','image_url','video_url','caption','location','dive_type','dive_date','max_depth','water_temperature','dive_duration','dive_site','location_lat','location_lng','visibility','visibility_type','gas_type','gas_percent','buddy','buddy_name','publish_to_feed','publish_to_reels','created_at'] },
  post_media: { table: 'app_post_media', columns: ['id','post_id','media_url','media_type','order_index','created_at'] },
  likes: { table: 'app_likes', columns: ['id','post_id','user_id','created_at'] },
  comments: { table: 'app_comments', columns: ['id','post_id','user_id','content','created_at'] },
  follows: { table: 'app_follows', columns: ['id','follower_id','following_id','created_at'] },
  saved_posts: { table: 'app_saved_posts', columns: ['id','user_id','post_id','created_at'] },
  saved_resorts: { table: 'app_saved_resorts', columns: ['id','user_id','resort_id','created_at'] },
  notifications: { table: 'app_notifications', columns: ['id','user_id','actor_id','type','post_id','title','body','image_url','deep_link','source','event_key','data','delivery_status','is_read','read_at','opened_at','sent_at','updated_at','created_at'] },
  rooms: { table: 'app_rooms', columns: ['id','type','created_at'] },
  participants: { table: 'app_participants', columns: ['id','room_id','user_id','joined_at'] },
  messages: { table: 'app_messages', columns: ['id','room_id','sender_id','content','created_at','read_at'] },
  reports: { table: 'app_reports', columns: ['id','user_id','reason','status','created_at'] },
  certifications: { table: 'app_certifications', columns: ['id','user_id','discipline','agency','certification_number','level','issued_at','expires_at','image_url','status','created_at','updated_at'] },
  resort_reviews: { table: 'app_resort_reviews', columns: ['id','resort_id','user_id','rating','content','created_at'] },
  resort_prices: { table: 'app_resort_prices', columns: ['id','resort_id','price_type','title','image_url','description','duration_text','unit_label','currency','amount','included_items','sort_order','is_active','created_at','updated_at'] },
};

function resolveDataTable(name) {
  return DATA_TABLES[name] || null;
}

const PRIVATE_READ_TABLES = new Set(['saved_posts', 'saved_resorts', 'notifications', 'rooms', 'participants', 'messages', 'reports', 'certifications']);

async function getRequestIdentity(req, pool, getAuthUserId) {
  const userId = getAuthUserId(req);
  if (!userId) return null;
  const result = await pool.query('SELECT role, is_blocked FROM app_users WHERE id=$1 LIMIT 1', [userId]);
  const user = result.rows[0];
  if (!user || user.is_blocked) return null;
  return { userId, isAdmin: String(user.role || '').toLowerCase() === 'admin' };
}

function requireIdentity(identity, res) {
  if (identity) return true;
  res.status(401).json({ error: 'unauthorized' });
  return false;
}

async function visiblePostRows(rows, identity, pool, channel = '') {
  if (!rows.length || identity?.isAdmin) return rows;
  const ownerIds = [...new Set(rows.map((row) => String(row.user_id || '')).filter(Boolean))];
  const profileResult = await pool.query(
    `SELECT id,profile_content_visibility,feed_content_visibility,reels_content_visibility
       FROM app_profiles WHERE id = ANY($1::text[])`,
    [ownerIds]
  );
  const profileMap = new Map(profileResult.rows.map((row) => [String(row.id), row]));
  let followingIds = new Set();
  if (identity?.userId && ownerIds.length) {
    const follows = await pool.query(
      'SELECT following_id FROM app_follows WHERE follower_id=$1 AND following_id = ANY($2::text[])',
      [String(identity.userId), ownerIds]
    );
    followingIds = new Set(follows.rows.map((row) => String(row.following_id)));
  }
  return rows.flatMap((row) => {
    const ownerId = String(row.user_id || '');
    const profile = profileMap.get(ownerId);
    if (!profile) return [];
    const access = { isOwner: ownerId === String(identity?.userId || ''), isFollowing: followingIds.has(ownerId) };
    if (!canViewVisibility(normalizeVisibility(profile.profile_content_visibility, 'private'), access)) return [];
    const scopes = channel === 'feed'
      ? [profile.feed_content_visibility]
      : channel === 'reels'
        ? [profile.reels_content_visibility]
        : [
            ...(row.publish_to_feed !== false ? [profile.feed_content_visibility] : []),
            ...(row.publish_to_reels === true || row.video_url ? [profile.reels_content_visibility] : []),
          ];
    const effectiveScopes = (scopes.length ? scopes : [profile.feed_content_visibility]).map((scope) => effectiveVisibility(row.visibility_type, scope));
    if (!effectiveScopes.some((scope) => canViewVisibility(scope, access))) return [];
    const effective = effectiveScopes.includes('public') ? 'public' : effectiveScopes.includes('followers') ? 'followers' : 'private';
    return [{ ...row, effective_visibility: effective }];
  });
}

async function scopeRowsForRead(key, rows, identity, pool, channel = '') {
  const userId = identity?.userId;
  if (identity?.isAdmin) return rows;
  if (key === 'posts') {
    return visiblePostRows(rows, identity, pool, channel);
  }
  if (key === 'saved_posts' || key === 'saved_resorts' || key === 'notifications' || key === 'reports' || key === 'certifications') {
    return rows.filter((row) => row.user_id === userId);
  }
  if (key === 'rooms' || key === 'participants' || key === 'messages') {
    if (!userId) return [];
    const memberships = await pool.query('SELECT room_id FROM app_participants WHERE user_id=$1', [userId]);
    const roomIds = new Set(memberships.rows.map((row) => row.room_id));
    return key === 'rooms' ? rows.filter((row) => roomIds.has(row.id)) : rows.filter((row) => roomIds.has(row.room_id));
  }
  if (['post_media', 'likes', 'comments'].includes(key)) {
    const candidateIds = [...new Set(rows.map((row) => String(row.post_id || '')).filter(Boolean))];
    if (!candidateIds.length) return [];
    const candidates = await pool.query(
      'SELECT id,user_id,video_url,publish_to_feed,publish_to_reels,visibility_type FROM app_posts WHERE id = ANY($1::text[])',
      [candidateIds]
    );
    const visiblePosts = await visiblePostRows(candidates.rows, identity, pool, channel);
    const postIds = new Set(visiblePosts.map((row) => String(row.id)));
    return rows.filter((row) => postIds.has(String(row.post_id)));
  }
  return rows;
}

async function enrichResortImages(key, rows, pool) {
  if (key !== 'profiles') return rows;

  const resortIds = rows
    .filter((row) => row.account_type === 'resort')
    .map((row) => String(row.id || ''))
    .filter(Boolean);
  if (!resortIds.length) return rows;

  const imports = await pool.query(
    `SELECT approved_resort_id, source_image_urls, mirrored_image_urls, image_rights_status
       FROM app_resort_import_staging
      WHERE approved_resort_id = ANY($1::text[])
        AND status = 'approved'`,
    [resortIds],
  );
  const importByResort = new Map(imports.rows.map((row) => [String(row.approved_resort_id), row]));

  return rows.map((row) => {
    if (row.account_type !== 'resort') return row;
    const imported = importByResort.get(String(row.id));
    if (!imported) return row;

    const currentPhotos = Array.isArray(row.resort_photo_urls) ? row.resort_photo_urls.filter(Boolean) : [];
    const mirroredPhotos = Array.isArray(imported.mirrored_image_urls) ? imported.mirrored_image_urls.filter(Boolean) : [];
    const sourcePhotos = Array.isArray(imported.source_image_urls) ? imported.source_image_urls.filter(Boolean) : [];
    const fallbackPhotos = mirroredPhotos.length ? mirroredPhotos : sourcePhotos;
    const photos = currentPhotos.length ? currentPhotos : fallbackPhotos;

    return {
      ...row,
      resort_cover_url: row.resort_cover_url || row.avatar_url || photos[0] || null,
      resort_photo_urls: photos,
      resort_image_rights_status: imported.image_rights_status || null,
    };
  });
}

async function canWriteRow(key, row, identity, pool, operation) {
  if (identity.isAdmin) return true;
  const userId = identity.userId;
  if (key === 'profiles') return row.id === userId;
  if (key === 'posts') return row.user_id === userId;
  if (['likes', 'comments', 'saved_posts'].includes(key)) {
    if (row.user_id !== userId) return false;
    if (operation !== 'create') return true;
    const result = await pool.query(
      'SELECT id,user_id,video_url,publish_to_feed,publish_to_reels,visibility_type FROM app_posts WHERE id=$1 LIMIT 1',
      [row.post_id]
    );
    return (await visiblePostRows(result.rows, identity, pool)).length > 0;
  }
  if (['saved_resorts', 'reports', 'certifications', 'resort_reviews'].includes(key)) return row.user_id === userId;
  if (key === 'follows') return row.follower_id === userId;
  if (key === 'notifications') return operation === 'create' ? row.actor_id === userId : row.user_id === userId;
  if (key === 'post_media') {
    const post = await pool.query('SELECT user_id FROM app_posts WHERE id=$1 LIMIT 1', [row.post_id]);
    return post.rows[0]?.user_id === userId;
  }
  if (key === 'messages') {
    if (row.sender_id !== userId) return false;
    const member = await pool.query('SELECT 1 FROM app_participants WHERE room_id=$1 AND user_id=$2 LIMIT 1', [row.room_id, userId]);
    return member.rows.length > 0;
  }
  if (key === 'rooms') {
    return false; // Use the transactional direct/group chat endpoints.
  }
  if (key === 'participants') {
    return operation === 'delete' && row.user_id === userId;
  }
  return false;
}

export function registerDataRoutes(app, { pool, crypto, getAuthUserId, requireAdmin }) {
  app.get('/api/data/:table', async (req, res) => {
    const key = String(req.params.table || '').trim();
    const spec = resolveDataTable(key);
    if (!spec) return res.status(400).json({ error: 'invalid_table' });

    try {
      const identity = await getRequestIdentity(req, pool, getAuthUserId);
      if (PRIVATE_READ_TABLES.has(key) && !requireIdentity(identity, res)) return;
      const compiled = compileRead(spec, key, req.query, identity);
      const raw = await pool.query(compiled.sql, compiled.values);
      let rows = raw.rows;
      rows = await scopeRowsForRead(key, rows, identity, pool, String(req.query.channel || ''));
      rows = await enrichResortImages(key, rows, pool);

      res.json({ data: rows, error: null, count: rows.length });
    } catch {
      res.status(500).json({ error: 'data_read_failed' });
    }
  });

  app.post('/api/data/:table', async (req, res) => {
    const key = String(req.params.table || '').trim();
    const spec = resolveDataTable(key);
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!spec) return res.status(400).json({ error: 'invalid_table' });

    try {
      const identity = await getRequestIdentity(req, pool, getAuthUserId);
      if (!requireIdentity(identity, res)) return;
      for (const row of rows) {
        const payload = { ...row, id: String(row.id || crypto.randomUUID()) };
        if (key === 'certifications') {
          if (!identity.isAdmin) payload.status = 'pending';
          if (!['scuba', 'freediving'].includes(String(payload.discipline || ''))) {
            return res.status(400).json({ error: 'invalid_certification_discipline' });
          }
          if (!String(payload.agency || '').trim()) {
            return res.status(400).json({ error: 'certification_agency_required' });
          }
          if (!String(payload.image_url || '').trim()) {
            return res.status(400).json({ error: 'certification_image_required' });
          }
        }
        if (!(await canWriteRow(key, payload, identity, pool, 'create'))) {
          return res.status(403).json({ error: 'forbidden' });
        }
        const cols = spec.columns.filter((c) => payload[c] !== undefined);
        if (!cols.includes('id')) cols.unshift('id');
        const vals = cols.map((c) => payload[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const owner = { profiles: 'id', posts: 'user_id', likes: 'user_id', comments: 'user_id', saved_posts: 'user_id', saved_resorts: 'user_id', follows: 'follower_id', reports: 'user_id', certifications: 'user_id', resort_reviews: 'user_id' }[key];
        const immutable = new Set(['id', owner, 'user_id', 'post_id', 'resort_id', 'follower_id', 'following_id', 'sender_id', 'room_id', 'actor_id']);
        const updates = cols.filter(c => !immutable.has(c)).map(c => `${c}=EXCLUDED.${c}`).join(', ');
        const conflict = owner && updates ? `DO UPDATE SET ${updates} WHERE ${spec.table}.${owner}=EXCLUDED.${owner}` : 'DO NOTHING';
        const inserted = await pool.query(
          `INSERT INTO ${spec.table}(${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT (id) ${conflict} RETURNING *`,
          vals
        );
        if (!inserted.rowCount) return res.status(409).json({ error: 'data_conflict' });
        Object.assign(row, inserted.rows[0]);
        if (key === 'likes') {
          const post = await pool.query(`SELECT user_id FROM app_posts WHERE id=$1 LIMIT 1`, [payload.post_id]);
          const targetUserId = post.rows[0]?.user_id;
          if (targetUserId) await deliverUserEventNotification(pool, {
            userId: targetUserId,
            actorUserId: identity.userId,
            type: 'like',
            eventKey: `like:${payload.id}`,
            postId: payload.post_id,
            deepLink: `https://divergram.com/post?post=${encodeURIComponent(payload.post_id)}`,
          }).catch(() => undefined);
        } else if (key === 'comments') {
          const post = await pool.query(`SELECT user_id FROM app_posts WHERE id=$1 LIMIT 1`, [payload.post_id]);
          const targetUserId = post.rows[0]?.user_id;
          if (targetUserId) await deliverUserEventNotification(pool, {
            userId: targetUserId,
            actorUserId: identity.userId,
            type: 'comment',
            eventKey: `comment:${payload.id}`,
            postId: payload.post_id,
            deepLink: `https://divergram.com/post?post=${encodeURIComponent(payload.post_id)}`,
          }).catch(() => undefined);
        } else if (key === 'follows') {
          await deliverUserEventNotification(pool, {
            userId: payload.following_id,
            actorUserId: identity.userId,
            type: 'follow',
            eventKey: `follow:${payload.id}`,
            deepLink: 'divergram://notifications',
          }).catch(() => undefined);
        }
      }
      res.json({ data: rows, error: null });
    } catch {
      res.status(500).json({ error: 'data_insert_failed' });
    }
  });

  app.patch('/api/data/:table', async (req, res) => {
    const key = String(req.params.table || '').trim();
    const spec = resolveDataTable(key);
    const filters = Array.isArray(req.body?.filters) ? req.body.filters : [];
    const patch = req.body?.patch || {};
    if (!spec) return res.status(400).json({ error: 'invalid_table' });
    if (!filters.length) return res.status(400).json({ error: 'filters_required' });

    try {
      const identity = await getRequestIdentity(req, pool, getAuthUserId);
      if (!requireIdentity(identity, res)) return;
      const compiled = compileFilters(filters, spec.columns);
      const raw = await pool.query(`SELECT * FROM ${spec.table} WHERE ${compiled.where}`, compiled.values);
      const matched = raw.rows;
      if (key === 'certifications' && !identity.isAdmin) {
        if (patch.status !== undefined && patch.status !== 'pending') return res.status(403).json({ error: 'certification_review_admin_only' });
        patch.status = 'pending';
      }
      const patchCols = spec.columns.filter((c) => c !== 'id' && patch[c] !== undefined);

      if (key === 'certifications') {
        for (const row of matched) {
          const next = { ...row, ...patch };
          if (!['scuba', 'freediving'].includes(String(next.discipline || ''))) {
            return res.status(400).json({ error: 'invalid_certification_discipline' });
          }
          if (!String(next.agency || '').trim()) {
            return res.status(400).json({ error: 'certification_agency_required' });
          }
          if (!String(next.image_url || '').trim()) {
            return res.status(400).json({ error: 'certification_image_required' });
          }
        }
      }

      const ownerColumns = {
        posts: ['user_id'], likes: ['user_id'], comments: ['user_id'], follows: ['follower_id'],
        saved_posts: ['user_id'], saved_resorts: ['user_id'], notifications: ['user_id', 'actor_id'], messages: ['sender_id', 'room_id'],
        reports: ['user_id'], certifications: ['user_id'], resort_reviews: ['user_id'], post_media: ['post_id'],
        participants: ['room_id', 'user_id'],
      };
      if (!identity.isAdmin && (ownerColumns[key] || []).some((column) => patch[column] !== undefined)) {
        return res.status(403).json({ error: 'ownership_fields_immutable' });
      }
      for (const row of matched) {
        if (!(await canWriteRow(key, row, identity, pool, 'update'))) {
          return res.status(403).json({ error: 'forbidden' });
        }
      }

      for (const row of matched) {
        if (!patchCols.length) continue;
        const assigns = patchCols.map((c, i) => `${c}=$${i + 1}`).join(', ');
        const vals = patchCols.map((c) => patch[c]);
        vals.push(row.id);
        await pool.query(`UPDATE ${spec.table} SET ${assigns} WHERE id=$${vals.length}`, vals);
      }

      res.json({ data: null, error: null, updated: matched.length });
    } catch {
      res.status(500).json({ error: 'data_update_failed' });
    }
  });

  app.delete('/api/data/:table', async (req, res) => {
    const key = String(req.params.table || '').trim();
    const spec = resolveDataTable(key);
    const filters = Array.isArray(req.body?.filters) ? req.body.filters : [];
    if (!spec) return res.status(400).json({ error: 'invalid_table' });
    if (!filters.length) return res.status(400).json({ error: 'filters_required' });

    try {
      const identity = await getRequestIdentity(req, pool, getAuthUserId);
      if (!requireIdentity(identity, res)) return;
      const compiled = compileFilters(filters, spec.columns);
      const raw = await pool.query(`SELECT * FROM ${spec.table} WHERE ${compiled.where}`, compiled.values);
      const matched = raw.rows;
      for (const row of matched) {
        if (!(await canWriteRow(key, row, identity, pool, 'delete'))) {
          return res.status(403).json({ error: 'forbidden' });
        }
      }
      for (const row of matched) {
        await pool.query(`DELETE FROM ${spec.table} WHERE id=$1`, [row.id]);
      }
      res.json({ data: null, error: null, deleted: matched.length });
    } catch {
      res.status(500).json({ error: 'data_delete_failed' });
    }
  });

  app.post('/api/data/seed/default', requireAdmin, async (_req, res) => {
    const now = new Date().toISOString();
    try {
      const exists = await pool.query('SELECT COUNT(*)::int AS count FROM app_profiles');
      if ((exists.rows[0]?.count || 0) > 0) return res.json({ ok: true, seeded: false, reason: 'already_seeded' });

      await pool.query(`INSERT INTO app_profiles(id,username,full_name,bio,avatar_url,created_at) VALUES
        ('u_demo','demo','Demo User','Diver','',$1),
        ('u_ocean','ocean_lee','Ocean Lee','Ocean lover','',$1),
        ('u_blue','blue_fin','Blue Fin','Freediver','',$1)
      ON CONFLICT (id) DO NOTHING`, [now]);

      await pool.query(`INSERT INTO app_posts(id,user_id,image_url,caption,location,created_at) VALUES
        ('p1','u_ocean','https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200','야간다이빙 기록 #Jeju','Jeju',$1),
        ('p2','u_blue','https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=1200','프리다이빙 세션 #Bali','Bali',$1)
      ON CONFLICT (id) DO NOTHING`, [now]);

      await pool.query(`INSERT INTO app_post_media(id,post_id,media_url,media_type,order_index,created_at) VALUES
        ('pm1','p1','https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200','image',0,$1),
        ('pm2','p2','https://www.youtube.com/watch?v=dQw4w9WgXcQ','video',0,$1)
      ON CONFLICT (id) DO NOTHING`, [now]);

      res.json({ ok: true, seeded: true });
    } catch {
      res.status(500).json({ ok: false, error: 'seed_failed' });
    }
  });
}
