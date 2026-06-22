export function registerAdminCoreRoutes(app, { pool, requireAdmin }) {
  app.get('/api/admin/health', requireAdmin, async (_req, res) => {
    res.json({ ok: true, service: 'admin-api' });
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
        const net = execSync("netstat -ib", { encoding: 'utf8' }).split('\n');
        let inBytes = 0;
        let outBytes = 0;
        for (const line of net) {
          if (!line || line.startsWith('Name')) continue;
          const parts = line.trim().split(/\s+/);
          const i = Number(parts[6]);
          const o = Number(parts[9]);
          if (Number.isFinite(i)) inBytes += i;
          if (Number.isFinite(o)) outBytes += o;
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
      where += ` AND (username ILIKE $1 OR full_name ILIKE $1 OR resort_address ILIKE $1 OR resort_region ILIKE $1 OR website ILIKE $1)`;
    }
    try {
      const q = await pool.query(
        `SELECT id::text AS id, username, full_name, bio, avatar_url, website, account_type, resort_address, resort_region, resort_lat, resort_lng, resort_rating_avg, resort_review_count, created_at
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
    if (req.body?.website !== undefined) push('website', String(req.body.website || '').trim() || null);
    if (req.body?.resort_address !== undefined) push('resort_address', String(req.body.resort_address || '').trim());
    if (req.body?.resort_region !== undefined) push('resort_region', String(req.body.resort_region || '').trim());
    if (req.body?.resort_lat !== undefined) push('resort_lat', req.body.resort_lat === '' ? null : Number(req.body.resort_lat));
    if (req.body?.resort_lng !== undefined) push('resort_lng', req.body.resort_lng === '' ? null : Number(req.body.resort_lng));
    if (req.body?.resort_rating_avg !== undefined) push('resort_rating_avg', req.body.resort_rating_avg === '' ? null : Number(req.body.resort_rating_avg));
    if (req.body?.resort_review_count !== undefined) push('resort_review_count', req.body.resort_review_count === '' ? null : Math.max(0, Math.round(Number(req.body.resort_review_count) || 0)));
    if (req.body?.account_type !== undefined) push('account_type', String(req.body.account_type || '').trim() || 'resort');

    if (!fields.length) return res.status(400).json({ ok: false, error: 'no_fields_to_update' });

    try {
      values.push(id);
      const q = await pool.query(
        `UPDATE app_profiles SET ${fields.join(', ')} WHERE id=$${values.length}
         RETURNING id::text AS id, username, full_name, bio, avatar_url, website, account_type, resort_address, resort_region, resort_lat, resort_lng, resort_rating_avg, resort_review_count, created_at`,
        values
      );
      if (!q.rows.length) return res.status(404).json({ ok: false, error: 'resort_not_found' });
      res.json({ ok: true, resort: q.rows[0] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_resort_update_failed', detail: String(error?.message || error) });
    }
  });
}
