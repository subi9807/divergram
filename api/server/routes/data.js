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

export function registerDataRoutes(app, { pool, crypto }) {
  app.get('/api/data/:table', async (req, res) => {
    const key = String(req.params.table || '').trim();
    const spec = resolveDataTable(key);
    if (!spec) return res.status(400).json({ error: 'invalid_table' });

    try {
      const raw = await pool.query(`SELECT * FROM ${spec.table}`);
      let rows = raw.rows;
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
      for (const row of rows) {
        const payload = { ...row, id: String(row.id || crypto.randomUUID()) };
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

    try {
      const raw = await pool.query(`SELECT * FROM ${spec.table}`);
      const matched = applyJsonFilters(raw.rows, filters);
      const patchCols = spec.columns.filter((c) => c !== 'id' && patch[c] !== undefined);

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

    try {
      const raw = await pool.query(`SELECT * FROM ${spec.table}`);
      const matched = applyJsonFilters(raw.rows, filters);
      for (const row of matched) {
        await pool.query(`DELETE FROM ${spec.table} WHERE id=$1`, [row.id]);
      }
      res.json({ data: null, error: null, deleted: matched.length });
    } catch {
      res.status(500).json({ error: 'data_delete_failed' });
    }
  });

  app.post('/api/data/seed/default', async (_req, res) => {
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
