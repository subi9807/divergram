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

const DATA_TABLES = {
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
      'created_at',
    ],
  },
  posts: { table: 'app_posts', columns: ['id','user_id','image_url','video_url','caption','location','dive_type','dive_date','max_depth','water_temperature','dive_duration','dive_site','location_lat','location_lng','visibility','gas_type','gas_percent','buddy','buddy_name','publish_to_feed','publish_to_reels','created_at'] },
  post_media: { table: 'app_post_media', columns: ['id','post_id','media_url','media_type','order_index','created_at'] },
  likes: { table: 'app_likes', columns: ['id','post_id','user_id','created_at'] },
  comments: { table: 'app_comments', columns: ['id','post_id','user_id','content','created_at'] },
  follows: { table: 'app_follows', columns: ['id','follower_id','following_id','created_at'] },
  saved_posts: { table: 'app_saved_posts', columns: ['id','user_id','post_id','created_at'] },
  notifications: { table: 'app_notifications', columns: ['id','user_id','actor_id','type','post_id','is_read','created_at'] },
  rooms: { table: 'app_rooms', columns: ['id','type','created_at'] },
  participants: { table: 'app_participants', columns: ['id','room_id','user_id','joined_at'] },
  messages: { table: 'app_messages', columns: ['id','room_id','sender_id','content','created_at','read_at'] },
  reports: { table: 'app_reports', columns: ['id','user_id','reason','status','created_at'] },
  certifications: { table: 'app_certifications', columns: ['id','user_id','agency','certification_number','level','issued_at','expires_at','image_url','status','created_at','updated_at'] },
  resort_reviews: { table: 'app_resort_reviews', columns: ['id','resort_id','user_id','rating','content','created_at'] },
};

function resolveDataTable(name) {
  return DATA_TABLES[name] || null;
}

const PRIVATE_READ_TABLES = new Set(['saved_posts', 'notifications', 'rooms', 'participants', 'messages', 'reports', 'certifications']);

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

async function scopeRowsForRead(key, rows, identity, pool) {
  const userId = identity?.userId;
  if (identity?.isAdmin) return rows;
  if (key === 'posts') {
    return rows.filter((row) => row.user_id === userId || !row.visibility || row.visibility === 'public');
  }
  if (key === 'saved_posts' || key === 'notifications' || key === 'reports' || key === 'certifications') {
    return rows.filter((row) => row.user_id === userId);
  }
  if (key === 'rooms' || key === 'participants' || key === 'messages') {
    if (!userId) return [];
    const memberships = await pool.query('SELECT room_id FROM app_participants WHERE user_id=$1', [userId]);
    const roomIds = new Set(memberships.rows.map((row) => row.room_id));
    return key === 'rooms' ? rows.filter((row) => roomIds.has(row.id)) : rows.filter((row) => roomIds.has(row.room_id));
  }
  if (['post_media', 'likes', 'comments'].includes(key)) {
    const visiblePosts = await pool.query(
      `SELECT id FROM app_posts WHERE visibility IS NULL OR visibility='public' OR user_id=$1`,
      [userId || '']
    );
    const postIds = new Set(visiblePosts.rows.map((row) => row.id));
    return rows.filter((row) => postIds.has(row.post_id));
  }
  return rows;
}

async function canWriteRow(key, row, identity, pool, operation) {
  if (identity.isAdmin) return true;
  const userId = identity.userId;
  if (key === 'profiles') return row.id === userId;
  if (key === 'posts') return row.user_id === userId;
  if (['likes', 'comments', 'saved_posts', 'reports', 'certifications', 'resort_reviews'].includes(key)) return row.user_id === userId;
  if (key === 'follows') return row.follower_id === userId;
  if (key === 'notifications') return operation === 'create' ? row.actor_id === userId : row.user_id === userId;
  if (key === 'post_media') {
    const post = await pool.query('SELECT user_id FROM app_posts WHERE id=$1 LIMIT 1', [row.post_id]);
    return post.rows[0]?.user_id === userId;
  }
  if (key === 'messages') {
    if (operation === 'create' && row.sender_id !== userId) return false;
    const member = await pool.query('SELECT 1 FROM app_participants WHERE room_id=$1 AND user_id=$2 LIMIT 1', [row.room_id, userId]);
    return member.rows.length > 0;
  }
  if (key === 'rooms') {
    if (operation === 'create') return true;
    const member = await pool.query('SELECT 1 FROM app_participants WHERE room_id=$1 AND user_id=$2 LIMIT 1', [row.id, userId]);
    return member.rows.length > 0;
  }
  if (key === 'participants') {
    if (row.user_id === userId) return true;
    const member = await pool.query('SELECT 1 FROM app_participants WHERE room_id=$1 AND user_id=$2 LIMIT 1', [row.room_id, userId]);
    return member.rows.length > 0;
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
      const raw = await pool.query(`SELECT * FROM ${spec.table}`);
      let rows = await scopeRowsForRead(key, raw.rows, identity, pool);
      const filters = req.query.filters ? JSON.parse(String(req.query.filters)) : [];
      rows = applyJsonFilters(rows, filters);

      if (req.query.order) {
        const order = JSON.parse(String(req.query.order));
        const col = order.column;
        const asc = order.ascending !== false;
        rows.sort((a, b) => (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1));
      }
      if (req.query.range) {
        const [a, b] = JSON.parse(String(req.query.range));
        rows = rows.slice(Number(a), Number(b) + 1);
      }
      if (req.query.limit) rows = rows.slice(0, Number(req.query.limit));

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
        if (!(await canWriteRow(key, payload, identity, pool, 'create'))) {
          return res.status(403).json({ error: 'forbidden' });
        }
        const cols = spec.columns.filter((c) => payload[c] !== undefined);
        if (!cols.includes('id')) cols.unshift('id');
        const vals = cols.map((c) => payload[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const updates = cols.filter((c) => c !== 'id').map((c) => `${c}=EXCLUDED.${c}`).join(', ');
        await pool.query(
          `INSERT INTO ${spec.table}(${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updates || 'id=EXCLUDED.id'}`,
          vals
        );
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
      const raw = await pool.query(`SELECT * FROM ${spec.table}`);
      const matched = applyJsonFilters(raw.rows, filters);
      const patchCols = spec.columns.filter((c) => c !== 'id' && patch[c] !== undefined);

      const ownerColumns = {
        posts: ['user_id'], likes: ['user_id'], comments: ['user_id'], follows: ['follower_id'],
        saved_posts: ['user_id'], notifications: ['user_id', 'actor_id'], messages: ['sender_id', 'room_id'],
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
      const raw = await pool.query(`SELECT * FROM ${spec.table}`);
      const matched = applyJsonFilters(raw.rows, filters);
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
