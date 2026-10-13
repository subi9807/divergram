const connectionCountryCache = new Map();

export function parseLinuxNetworkBytes(value) {
  let inBytes = 0;
  let outBytes = 0;
  for (const line of String(value || '').split('\n')) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const name = line.slice(0, separator).trim();
    if (!name || name === 'lo') continue;
    const fields = line.slice(separator + 1).trim().split(/\s+/);
    const received = Number(fields[0]);
    const transmitted = Number(fields[8]);
    if (Number.isFinite(received)) inBytes += received;
    if (Number.isFinite(transmitted)) outBytes += transmitted;
  }
  return { inBytes, outBytes };
}

const getClientIp = (req) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return String(forwarded || req.headers['x-real-ip'] || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
};

const isPrivateIp = (ip) => !ip || ip === '::1' || ip === '127.0.0.1' || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip);

async function resolveCountryCode(req, ip) {
  const headerCountry = String(req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || req.headers['cloudfront-viewer-country'] || '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(headerCountry)) return headerCountry;
  if (isPrivateIp(ip)) return '--';
  const cached = connectionCountryCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.code;
  try {
    const response = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(1800) });
    const body = response.ok ? await response.json() : {};
    const code = String(body.country || '').trim().toUpperCase();
    const resolved = /^[A-Z]{2}$/.test(code) ? code : '--';
    connectionCountryCache.set(ip, { code: resolved, expiresAt: Date.now() + 10 * 60 * 1000 });
    return resolved;
  } catch {
    return '--';
  }
}

export function registerAdminCoreRoutes(app, { pool, requireAdmin }) {
  const toNullableNumber = (value, fallback = null) => {
    if (value === '' || value === undefined || value === null) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const toTextArray = (value) => Array.from(new Set((Array.isArray(value) ? value : []).map((item) => String(item || '').trim()).filter(Boolean)));
  const toJsonArray = (value) => JSON.stringify(toTextArray(value));

  app.get('/api/admin/health', requireAdmin, async (_req, res) => {
    res.json({ ok: true, service: 'admin-api' });
  });

  app.get('/api/admin/connection-info', requireAdmin, async (req, res) => {
    const ip = getClientIp(req);
    const countryCode = await resolveCountryCode(req, ip);
    res.json({ ok: true, ip: ip || '-', countryCode });
  });

  app.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 200);
    try {
      const logs = await pool.query(
        `SELECT id, action, target_user_id, detail, created_at
         FROM admin_audit_logs
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );
      res.json({ ok: true, logs: logs.rows || [] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_audit_logs_failed', detail: String(error?.message || error) });
    }
  });

  app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
    try {
      const os = await import('node:os');
      const { execSync } = await import('node:child_process');

      const totalUsers = await pool.query('SELECT COUNT(*)::int AS count FROM app_users');
      const blockedUsers = await pool.query('SELECT COUNT(*)::int AS count FROM app_users WHERE is_blocked = true');
      const personalUsers = await pool.query("SELECT COUNT(*)::int AS count FROM app_profiles WHERE account_type = 'personal'");
      const resortUsers = await pool.query("SELECT COUNT(*)::int AS count FROM app_profiles WHERE account_type = 'resort'");
      const latest = await pool.query('SELECT id, email, username, role, is_blocked, created_at FROM app_users ORDER BY created_at DESC LIMIT 5');
      const feedCount = await pool.query('SELECT COUNT(*)::int AS count FROM app_posts WHERE video_url IS NULL');
      const reelsCount = await pool.query('SELECT COUNT(*)::int AS count FROM app_posts WHERE video_url IS NOT NULL');

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const cpuLoad = os.loadavg?.()[0] || 0;
      const cpuCores = os.cpus?.().length || 1;
      const cpuUsagePct = Math.min(100, Math.max(0, (cpuLoad / cpuCores) * 100));

      let disk = { usedGb: 0, totalGb: 0, usedPct: 0 };
      try {
        const df = execSync("df -k / | tail -1", { encoding: 'utf8' }).trim().split(/\s+/);
        const totalKb = Number(df[1] || 0);
        const usedKb = Number(df[2] || 0);
        disk = {
          usedGb: Number((usedKb / 1024 / 1024).toFixed(2)),
          totalGb: Number((totalKb / 1024 / 1024).toFixed(2)),
          usedPct: totalKb ? Number(((usedKb / totalKb) * 100).toFixed(1)) : 0,
        };
      } catch {}

      let network = { inMb: 0, outMb: 0 };
      try {
        let inBytes = 0;
        let outBytes = 0;
        if (process.platform === 'linux') {
          const { readFileSync } = await import('node:fs');
          ({ inBytes, outBytes } = parseLinuxNetworkBytes(readFileSync('/proc/net/dev', 'utf8')));
        } else {
          const net = execSync('netstat -ib', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n');
          for (const line of net) {
            if (!line || line.startsWith('Name')) continue;
            const parts = line.trim().split(/\s+/);
            const received = Number(parts[6]);
            const transmitted = Number(parts[9]);
            if (Number.isFinite(received)) inBytes += received;
            if (Number.isFinite(transmitted)) outBytes += transmitted;
          }
        }
        network = {
          inMb: Number((inBytes / 1024 / 1024).toFixed(1)),
          outMb: Number((outBytes / 1024 / 1024).toFixed(1)),
        };
      } catch {}

      res.json({
        ok: true,
        stats: {
          users: totalUsers.rows[0]?.count || 0,
          blockedUsers: blockedUsers.rows[0]?.count || 0,
          personalUsers: personalUsers.rows[0]?.count || 0,
          resortUsers: resortUsers.rows[0]?.count || 0,
          feedCount: feedCount.rows[0]?.count || 0,
          reelsCount: reelsCount.rows[0]?.count || 0,
          uptimeSec: Math.round(process.uptime()),
          system: {
            cpuUsagePct: Number(cpuUsagePct.toFixed(1)),
            memoryUsedGb: Number((usedMem / 1024 / 1024 / 1024).toFixed(2)),
            memoryTotalGb: Number((totalMem / 1024 / 1024 / 1024).toFixed(2)),
            memoryUsagePct: Number(((usedMem / totalMem) * 100).toFixed(1)),
            disk,
            network,
          },
        },
        latestUsers: latest.rows,
      });
    } catch {
      res.status(500).json({ ok: false, error: 'admin_stats_failed' });
    }
  });

  app.delete('/api/admin/posts/:postId', requireAdmin, async (req, res) => {
    const postId = String(req.params.postId || '').trim();
    if (!postId) return res.status(400).json({ ok: false, error: 'post_id_required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const postQ = await client.query('SELECT id, user_id, caption FROM app_posts WHERE id=$1 LIMIT 1', [postId]);
      if (!postQ.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ ok: false, error: 'post_not_found' });
      }
      const postRow = postQ.rows[0];
      const removedMedia = await client.query('DELETE FROM app_post_media WHERE post_id=$1 RETURNING id', [postId]);
      const removedLikes = await client.query('DELETE FROM app_likes WHERE post_id=$1 RETURNING id', [postId]);
      const removedComments = await client.query('DELETE FROM app_comments WHERE post_id=$1 RETURNING id', [postId]);
      const removedSaved = await client.query('DELETE FROM app_saved_posts WHERE post_id=$1 RETURNING id', [postId]);
      const removedNotifications = await client.query('DELETE FROM app_notifications WHERE post_id=$1 RETURNING id', [postId]);
      const removed = await client.query('DELETE FROM app_posts WHERE id=$1 RETURNING id', [postId]);

      await client.query(
        `INSERT INTO admin_audit_logs(action, target_user_id, detail)
         VALUES ($1, $2, $3::jsonb)`,
        [
          'post_delete',
          postRow.user_id || null,
          JSON.stringify({
            postId,
            caption: postRow.caption || '',
            userId: postRow.user_id || null,
            removedMedia: removedMedia.rowCount,
            removedLikes: removedLikes.rowCount,
            removedComments: removedComments.rowCount,
            removedSaved: removedSaved.rowCount,
            removedNotifications: removedNotifications.rowCount,
          }),
        ]
      );
      await client.query('COMMIT');
      res.json({
        ok: true,
        removed: {
          postId,
          media: removedMedia.rowCount,
          likes: removedLikes.rowCount,
          comments: removedComments.rowCount,
          saved: removedSaved.rowCount,
          notifications: removedNotifications.rowCount,
          post: removed.rowCount,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      res.status(500).json({ ok: false, error: 'admin_post_delete_failed', detail: String(error?.message || error) });
    } finally {
      client.release();
    }
  });

  app.patch('/api/admin/users/:userId/account-type', requireAdmin, async (req, res) => {
    try {
      const userId = String(req.params.userId || '').trim();
      const accountType = String(req.body?.accountType || '').trim();
      if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });
      if (!['personal', 'resort'].includes(accountType)) return res.status(400).json({ ok: false, error: 'invalid_account_type' });

      const q = await pool.query(
        `UPDATE app_profiles SET account_type=$1 WHERE id=$2 RETURNING id,username,full_name,bio,avatar_url,website,account_type,created_at`,
        [accountType, userId]
      );
      if (!q.rows.length) return res.status(404).json({ ok: false, error: 'profile_not_found' });

      await pool.query('UPDATE app_users SET account_scope=$1 WHERE id::text=$2', [accountType === 'resort' ? 'resort' : 'personal', userId]);

      return res.json({ ok: true, profile: q.rows[0] });
    } catch {
      return res.status(500).json({ ok: false, error: 'update_account_type_failed' });
    }
  });

  app.get('/api/admin/resorts', requireAdmin, async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 300);
    const search = String(req.query.search || req.query.q || '').trim();
    const params = [limit];
    let where = `WHERE lower(account_type)='resort'`;
    if (search) {
      params.unshift(`%${search}%`);
      where += ` AND (username ILIKE $1 OR full_name ILIKE $1 OR resort_address ILIKE $1 OR resort_region ILIKE $1 OR resort_city ILIKE $1 OR resort_country ILIKE $1 OR website ILIKE $1 OR resort_source_record_id ILIKE $1)`;
    }
    try {
      const q = await pool.query(
        `SELECT id::text AS id, username, full_name, bio, avatar_url, resort_cover_url, resort_photo_urls, resort_amenities, website, account_type, resort_address, resort_region, resort_lat, resort_lng, resort_rating_avg, resort_review_count,
                resort_record_key, resort_source, resort_source_record_id, resort_source_url, resort_instagram_url, resort_facebook_url, resort_youtube_url, resort_tiktok_url, resort_country, resort_country_code, resort_city,
                resort_phones, resort_emails, resort_certifications, resort_source_raw, resort_collected_at, resort_coordinate_source,
                resort_geocoded_at, resort_reverse_geocode_source, resort_nearest_city_distance_km, resort_booking_enabled,
                resort_booking_deposit_amount, resort_booking_deposit_currency, created_at
         FROM app_profiles
         ${where}
         ORDER BY COALESCE(resort_rating_avg, 0) DESC, COALESCE(resort_review_count, 0) DESC, created_at DESC
         LIMIT $${params.length}`,
        params
      );
      res.json({ ok: true, resorts: q.rows || [] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_resorts_failed', detail: String(error?.message || error) });
    }
  });

  app.get('/api/admin/resorts/:id/managers', requireAdmin, async (req, res) => {
    try {
      const q = await pool.query(
        `SELECT m.id,m.resort_id,m.user_id::text AS user_id,m.is_primary,m.permissions,m.created_at,m.updated_at,
                u.email,u.username,COALESCE(NULLIF(p.full_name,''),u.username,u.email) AS display_name,p.avatar_url
         FROM app_resort_managers m
         JOIN app_users u ON u.id=m.user_id
         LEFT JOIN app_profiles p ON p.id=u.id::text
         WHERE m.resort_id=$1
         ORDER BY m.is_primary DESC,m.created_at ASC`,
        [String(req.params.id || '')]
      );
      res.json({ ok: true, managers: q.rows });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'resort_managers_failed', detail: String(error?.message || error) });
    }
  });

  app.post('/api/admin/resorts/:id/managers', requireAdmin, async (req, res) => {
    const resortId = String(req.params.id || '').trim();
    const userId = String(req.body?.user_id || '').trim();
    const isPrimary = req.body?.is_primary === true;
    if (!resortId || !/^\d+$/.test(userId)) return res.status(400).json({ ok: false, error: 'invalid_resort_manager' });
    const permissions = req.body?.permissions && typeof req.body.permissions === 'object' && !Array.isArray(req.body.permissions) ? req.body.permissions : {};
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (isPrimary) await client.query('UPDATE app_resort_managers SET is_primary=false,updated_at=now() WHERE resort_id=$1', [resortId]);
      await client.query(
        `INSERT INTO app_resort_managers(resort_id,user_id,is_primary,permissions)
         VALUES($1,$2,$3,$4::jsonb)
         ON CONFLICT(resort_id,user_id) DO UPDATE SET is_primary=EXCLUDED.is_primary,permissions=EXCLUDED.permissions,updated_at=now()`,
        [resortId, userId, isPrimary, JSON.stringify(permissions)]
      );
      if (isPrimary) await client.query('UPDATE app_profiles SET resort_owner_user_id=$1,resort_owner_verified_at=now() WHERE id=$2', [userId, resortId]);
      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ ok: false, error: 'resort_manager_save_failed', detail: String(error?.message || error) });
    } finally { client.release(); }
  });

  app.delete('/api/admin/resorts/:id/managers/:userId', requireAdmin, async (req, res) => {
    try {
      const q = await pool.query('DELETE FROM app_resort_managers WHERE resort_id=$1 AND user_id=$2 RETURNING is_primary', [String(req.params.id || ''), String(req.params.userId || '')]);
      if (!q.rows.length) return res.status(404).json({ ok: false, error: 'resort_manager_not_found' });
      if (q.rows[0].is_primary) await pool.query('UPDATE app_profiles SET resort_owner_user_id=NULL,resort_owner_verified_at=NULL WHERE id=$1', [String(req.params.id || '')]);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'resort_manager_delete_failed', detail: String(error?.message || error) });
    }
  });

  app.post('/api/admin/resorts', requireAdmin, async (req, res) => {
    const fullName = String(req.body?.full_name || '').trim();
    const username = String(req.body?.username || '').trim();
    const resortRegion = String(req.body?.resort_region || '').trim();
    const resortAddress = String(req.body?.resort_address || '').trim();
    const website = String(req.body?.website || '').trim();
    if (!fullName) return res.status(400).json({ ok: false, error: 'full_name_required' });
    if (!username) return res.status(400).json({ ok: false, error: 'username_required' });
    if (!Number.isFinite(Number(req.body?.resort_lat)) || !Number.isFinite(Number(req.body?.resort_lng))) return res.status(400).json({ ok: false, error: 'resort_coordinates_required' });

    const safeUsername = username.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase();
    const id = String(req.body?.id || `resort_${safeUsername || 'new'}_${Date.now()}`).trim();
    const payload = {
      id,
      username,
      full_name: fullName,
      bio: String(req.body?.bio || '').trim(),
      avatar_url: String(req.body?.avatar_url || '').trim(),
      resort_cover_url: String(req.body?.resort_cover_url || '').trim(),
      resort_photo_urls: toTextArray(req.body?.resort_photo_urls),
      resort_amenities: toTextArray(req.body?.resort_amenities),
      website: website || null,
      account_type: 'resort',
      resort_address: resortAddress || null,
      resort_region: resortRegion || null,
      resort_lat: toNullableNumber(req.body?.resort_lat, null),
      resort_lng: toNullableNumber(req.body?.resort_lng, null),
      resort_rating_avg: 0,
      resort_review_count: 0,
      resort_country: String(req.body?.resort_country || '').trim() || null,
      resort_country_code: String(req.body?.resort_country_code || '').trim().toUpperCase() || null,
      resort_city: String(req.body?.resort_city || '').trim() || null,
      resort_phones: toTextArray(req.body?.resort_phones),
      resort_emails: toTextArray(req.body?.resort_emails),
      resort_certifications: toTextArray(req.body?.resort_certifications),
      resort_source_url: String(req.body?.resort_source_url || website || '').trim() || null,
      resort_instagram_url: String(req.body?.resort_instagram_url || '').trim() || null,
      resort_facebook_url: String(req.body?.resort_facebook_url || '').trim() || null,
      resort_youtube_url: String(req.body?.resort_youtube_url || '').trim() || null,
      resort_tiktok_url: String(req.body?.resort_tiktok_url || '').trim() || null,
      created_at: new Date().toISOString(),
    };

    try {
      const q = await pool.query(
        `INSERT INTO app_profiles(
           id, username, full_name, bio, avatar_url, resort_cover_url, resort_photo_urls, resort_amenities, website, account_type,
           resort_address, resort_region, resort_lat, resort_lng, resort_rating_avg, resort_review_count,
           resort_country,resort_country_code,resort_city,resort_phones,resort_emails,resort_certifications,resort_source_url,resort_instagram_url,resort_facebook_url,resort_youtube_url,resort_tiktok_url,created_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
         ON CONFLICT (id) DO UPDATE SET
           username=EXCLUDED.username,
           full_name=EXCLUDED.full_name,
           bio=EXCLUDED.bio,
           avatar_url=EXCLUDED.avatar_url,
           resort_cover_url=EXCLUDED.resort_cover_url,
           resort_photo_urls=EXCLUDED.resort_photo_urls,
           resort_amenities=EXCLUDED.resort_amenities,
           website=EXCLUDED.website,
           account_type=EXCLUDED.account_type,
           resort_address=EXCLUDED.resort_address,
           resort_region=EXCLUDED.resort_region,
           resort_lat=EXCLUDED.resort_lat,
           resort_lng=EXCLUDED.resort_lng,
           resort_rating_avg=EXCLUDED.resort_rating_avg,
           resort_review_count=EXCLUDED.resort_review_count,
           resort_country=EXCLUDED.resort_country,resort_country_code=EXCLUDED.resort_country_code,resort_city=EXCLUDED.resort_city,
           resort_phones=EXCLUDED.resort_phones,resort_emails=EXCLUDED.resort_emails,resort_certifications=EXCLUDED.resort_certifications,
           resort_source_url=EXCLUDED.resort_source_url,resort_instagram_url=EXCLUDED.resort_instagram_url,resort_facebook_url=EXCLUDED.resort_facebook_url,resort_youtube_url=EXCLUDED.resort_youtube_url,resort_tiktok_url=EXCLUDED.resort_tiktok_url
         RETURNING id::text AS id, username, full_name, bio, avatar_url, resort_cover_url, resort_photo_urls, resort_amenities, website, account_type, resort_address, resort_region, resort_lat, resort_lng, resort_rating_avg, resort_review_count,resort_country,resort_country_code,resort_city,resort_phones,resort_emails,resort_certifications,resort_source_url,resort_instagram_url,resort_facebook_url,resort_youtube_url,resort_tiktok_url, created_at`,
        [
          payload.id,
          payload.username,
          payload.full_name,
          payload.bio,
          payload.avatar_url,
          payload.resort_cover_url,
          toJsonArray(payload.resort_photo_urls),
          toJsonArray(payload.resort_amenities),
          payload.website,
          payload.account_type,
          payload.resort_address,
          payload.resort_region,
          payload.resort_lat,
          payload.resort_lng,
          payload.resort_rating_avg,
          payload.resort_review_count,
          payload.resort_country,
          payload.resort_country_code,
          payload.resort_city,
          toJsonArray(payload.resort_phones),
          toJsonArray(payload.resort_emails),
          toJsonArray(payload.resort_certifications),
          payload.resort_source_url,
          payload.resort_instagram_url,
          payload.resort_facebook_url,
          payload.resort_youtube_url,
          payload.resort_tiktok_url,
          payload.created_at,
        ]
      );

      const resort = q.rows[0] || null;
      if (!resort) return res.status(500).json({ ok: false, error: 'admin_resort_create_failed' });

      await pool.query(
        `INSERT INTO app_records(table_name, record_id, data)
         VALUES ('profiles', $1, $2::jsonb)
         ON CONFLICT (table_name, record_id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()`,
        [resort.id, JSON.stringify(resort)]
      );

      await pool.query(
        `INSERT INTO app_resort_import_staging(
           record_key,source,source_record_id,source_url,name,address,country,country_code,region,city,latitude,longitude,
           phones,emails,certifications,source_image_urls,mirrored_image_urls,image_rights_status,status,approved_resort_id,reviewed_at,updated_at
         ) VALUES($1,'manual',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$15::jsonb,'owner_provided','approved',$16,now(),now())
         ON CONFLICT(record_key) DO UPDATE SET name=EXCLUDED.name,address=EXCLUDED.address,region=EXCLUDED.region,
           latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,source_image_urls=EXCLUDED.source_image_urls,
           mirrored_image_urls=EXCLUDED.mirrored_image_urls,status='approved',approved_resort_id=EXCLUDED.approved_resort_id,updated_at=now()`,
        [
          `manual:${resort.id}`,
          resort.id,
          payload.website || `https://divergram.com/resorts/${encodeURIComponent(resort.id)}`,
          payload.full_name,
          payload.resort_address,
          payload.resort_country,
          payload.resort_country_code,
          payload.resort_region,
          payload.resort_city,
          payload.resort_lat,
          payload.resort_lng,
          JSON.stringify(payload.resort_phones),
          JSON.stringify(payload.resort_emails),
          JSON.stringify(payload.resort_certifications),
          JSON.stringify(payload.resort_photo_urls),
          resort.id,
        ]
      );

      res.json({ ok: true, resort });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_resort_create_failed', detail: String(error?.message || error) });
    }
  });

  app.patch('/api/admin/resorts/:id', requireAdmin, async (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ ok: false, error: 'resort_id_required' });

    const fields = [];
    const values = [];
    const push = (column, value) => {
      values.push(value);
      fields.push(`${column}=$${values.length}`);
    };

    if (req.body?.full_name !== undefined) push('full_name', String(req.body.full_name || '').trim());
    if (req.body?.bio !== undefined) push('bio', String(req.body.bio || '').trim());
    // app_profiles.avatar_url is NOT NULL; an image-less resort uses an empty string.
    if (req.body?.avatar_url !== undefined) push('avatar_url', String(req.body.avatar_url || '').trim());
    if (req.body?.resort_cover_url !== undefined) push('resort_cover_url', String(req.body.resort_cover_url || '').trim() || null);
    if (req.body?.resort_photo_urls !== undefined) push('resort_photo_urls', toJsonArray(req.body.resort_photo_urls));
    if (req.body?.resort_amenities !== undefined) push('resort_amenities', toJsonArray(req.body.resort_amenities));
    if (req.body?.resort_record_key !== undefined) push('resort_record_key', String(req.body.resort_record_key || '').trim() || null);
    if (req.body?.resort_source !== undefined) push('resort_source', String(req.body.resort_source || '').trim().toLowerCase() || null);
    if (req.body?.resort_source_record_id !== undefined) push('resort_source_record_id', String(req.body.resort_source_record_id || '').trim() || null);
    if (req.body?.resort_source_url !== undefined) push('resort_source_url', String(req.body.resort_source_url || '').trim() || null);
    if (req.body?.resort_instagram_url !== undefined) push('resort_instagram_url', String(req.body.resort_instagram_url || '').trim() || null);
    if (req.body?.resort_facebook_url !== undefined) push('resort_facebook_url', String(req.body.resort_facebook_url || '').trim() || null);
    if (req.body?.resort_youtube_url !== undefined) push('resort_youtube_url', String(req.body.resort_youtube_url || '').trim() || null);
    if (req.body?.resort_tiktok_url !== undefined) push('resort_tiktok_url', String(req.body.resort_tiktok_url || '').trim() || null);
    if (req.body?.resort_country !== undefined) push('resort_country', String(req.body.resort_country || '').trim() || null);
    if (req.body?.resort_country_code !== undefined) push('resort_country_code', String(req.body.resort_country_code || '').trim().toUpperCase() || null);
    if (req.body?.resort_city !== undefined) push('resort_city', String(req.body.resort_city || '').trim() || null);
    if (req.body?.resort_phones !== undefined) push('resort_phones', toJsonArray(req.body.resort_phones));
    if (req.body?.resort_emails !== undefined) push('resort_emails', toJsonArray(req.body.resort_emails));
    if (req.body?.resort_certifications !== undefined) push('resort_certifications', toJsonArray(req.body.resort_certifications));
    if (req.body?.resort_source_raw !== undefined) push('resort_source_raw', JSON.stringify(req.body.resort_source_raw && typeof req.body.resort_source_raw === 'object' && !Array.isArray(req.body.resort_source_raw) ? req.body.resort_source_raw : {}));
    if (req.body?.resort_collected_at !== undefined) push('resort_collected_at', req.body.resort_collected_at || null);
    if (req.body?.resort_coordinate_source !== undefined) push('resort_coordinate_source', String(req.body.resort_coordinate_source || '').trim() || null);
    if (req.body?.resort_geocoded_at !== undefined) push('resort_geocoded_at', req.body.resort_geocoded_at || null);
    if (req.body?.resort_reverse_geocode_source !== undefined) push('resort_reverse_geocode_source', String(req.body.resort_reverse_geocode_source || '').trim() || null);
    if (req.body?.resort_nearest_city_distance_km !== undefined) push('resort_nearest_city_distance_km', toNullableNumber(req.body.resort_nearest_city_distance_km, null));
    if (req.body?.website !== undefined) push('website', String(req.body.website || '').trim() || null);
    if (req.body?.resort_address !== undefined) push('resort_address', String(req.body.resort_address || '').trim());
    if (req.body?.resort_region !== undefined) push('resort_region', String(req.body.resort_region || '').trim());
    if (req.body?.resort_lat !== undefined) push('resort_lat', toNullableNumber(req.body.resort_lat, null));
    if (req.body?.resort_lng !== undefined) push('resort_lng', toNullableNumber(req.body.resort_lng, null));
    if (req.body?.account_type !== undefined) push('account_type', String(req.body.account_type || '').trim() || 'resort');
    if (req.body?.resort_booking_enabled !== undefined) push('resort_booking_enabled', req.body.resort_booking_enabled === true);
    if (req.body?.resort_booking_deposit_amount !== undefined) push('resort_booking_deposit_amount', Math.max(0, Number(req.body.resort_booking_deposit_amount) || 0));
    if (req.body?.resort_booking_deposit_currency !== undefined) push('resort_booking_deposit_currency', 'USD');

    if (!fields.length) return res.status(400).json({ ok: false, error: 'no_fields_to_update' });

    try {
      values.push(id);
      const q = await pool.query(
        `UPDATE app_profiles SET ${fields.join(', ')} WHERE id=$${values.length}
         RETURNING id::text AS id, username, full_name, bio, avatar_url, resort_cover_url, resort_photo_urls, resort_amenities, website, account_type, resort_address, resort_region, resort_lat, resort_lng, resort_rating_avg, resort_review_count,
                   resort_record_key, resort_source, resort_source_record_id, resort_source_url, resort_instagram_url, resort_facebook_url, resort_youtube_url, resort_tiktok_url, resort_country, resort_country_code, resort_city,
                   resort_phones, resort_emails, resort_certifications, resort_source_raw, resort_collected_at, resort_coordinate_source,
                   resort_geocoded_at, resort_reverse_geocode_source, resort_nearest_city_distance_km, resort_booking_enabled,
                   resort_booking_deposit_amount, resort_booking_deposit_currency, created_at`,
        values
      );
      if (!q.rows.length) return res.status(404).json({ ok: false, error: 'resort_not_found' });
      const updated = q.rows[0];
      await pool.query(
        `UPDATE app_resort_import_staging SET
           name=$1,address=$2,country=$3,country_code=$4,region=$5,city=$6,latitude=$7,longitude=$8,
           phones=$9::jsonb,emails=$10::jsonb,certifications=$11::jsonb,source_url=COALESCE($12,source_url),website_url=$15,
           instagram_url=$16,facebook_url=$17,youtube_url=$18,tiktok_url=$19,
           source_image_urls=$13::jsonb,mirrored_image_urls=$13::jsonb,
           image_rights_status=CASE WHEN jsonb_array_length($13::jsonb)>0 THEN 'owner_provided' ELSE image_rights_status END,updated_at=now()
         WHERE approved_resort_id=$14`,
        [updated.full_name,updated.resort_address,updated.resort_country,updated.resort_country_code,updated.resort_region,updated.resort_city,
          updated.resort_lat,updated.resort_lng,JSON.stringify(updated.resort_phones || []),JSON.stringify(updated.resort_emails || []),
          JSON.stringify(updated.resort_certifications || []),updated.resort_source_url || updated.website || null,
          JSON.stringify(updated.resort_photo_urls || []),updated.id,updated.website || null,updated.resort_instagram_url || null,
          updated.resort_facebook_url || null,updated.resort_youtube_url || null,updated.resort_tiktok_url || null]
      );
      res.json({ ok: true, resort: updated });
    } catch (error) {
      console.error('[admin_resort_update_failed]', { id, message: String(error?.message || error) });
      res.status(500).json({ ok: false, error: 'admin_resort_update_failed', detail: String(error?.message || error) });
    }
  });

  app.delete('/api/admin/resorts/:id', requireAdmin, async (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ ok: false, error: 'resort_id_required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT id::text AS id, username, full_name, account_type
         FROM app_profiles
         WHERE id=$1
         LIMIT 1`,
        [id]
      );
      if (!current.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ ok: false, error: 'resort_not_found' });
      }

      const removedProfile = await client.query('DELETE FROM app_profiles WHERE id=$1 RETURNING id', [id]);
      await client.query(
        `DELETE FROM app_records WHERE table_name='profiles' AND record_id=$1`,
        [id]
      );

      const maybeUser = await client.query('SELECT id::text AS id, role FROM app_users WHERE id::text=$1 LIMIT 1', [id]);
      if (maybeUser.rows.length && String(maybeUser.rows[0]?.role || '').toLowerCase() === 'resort') {
        await client.query(`UPDATE app_users SET role='user' WHERE id::text=$1`, [id]);
      }

      await client.query(
        `INSERT INTO admin_audit_logs(action, target_user_id, detail)
         VALUES ($1, $2, $3::jsonb)`,
        [
          'resort_delete',
          Number.isFinite(Number(id)) ? Number(id) : null,
          JSON.stringify({
            resortId: id,
            username: current.rows[0]?.username || '',
            fullName: current.rows[0]?.full_name || '',
            accountType: current.rows[0]?.account_type || 'resort',
            removedProfile: removedProfile.rowCount,
          }),
        ]
      );

      await client.query('COMMIT');
      res.json({ ok: true, removed: { resortId: id, profile: removedProfile.rowCount } });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      res.status(500).json({ ok: false, error: 'admin_resort_delete_failed', detail: String(error?.message || error) });
    } finally {
      client.release();
    }
  });
}
