function limitValue(value, fallback = 100, max = 500) {
  return Math.min(Math.max(Number(value || fallback), 1), max);
}

async function audit(pool, req, action, targetUserId, detail = {}) {
  await pool.query(
    `INSERT INTO admin_audit_logs(action, target_user_id, detail) VALUES ($1,$2,$3::jsonb)`,
    [action, targetUserId || null, JSON.stringify({ ...detail, adminEmail: req.adminAuth?.email || '', adminUserId: req.adminAuth?.userId || '' })],
  );
}

export function registerAdminOperationsRoutes(app, { pool, requireAdmin }) {
  app.get('/api/admin/store-subscriptions', requireAdmin, async (req, res) => {
    const page = Number(req.query.page || 1);
    const q = String(req.query.q || '').trim().slice(0, 200);
    if (!Number.isInteger(page) || page < 1 || page > 10000) return res.status(400).json({ error: 'invalid_page' });
    const effectiveStatus = "CASE WHEN m.status='active' AND m.expires_at<=now() THEN 'expired' WHEN m.status='active' AND m.started_at>now() THEN 'scheduled' ELSE m.status END";
    const search = "($1='' OR u.email ILIKE '%'||$1||'%' OR u.username ILIKE '%'||$1||'%' OR m.user_id::text=$1 OR m.store_product_id ILIKE '%'||$1||'%')";
    try {
      const [summary, memberships, events] = await Promise.all([
        pool.query(`SELECT ${effectiveStatus} AS status,COUNT(*)::int AS count FROM app_memberships m GROUP BY 1`),
        pool.query(`SELECT m.id,m.user_id,u.email,u.username,m.platform,m.plan_code,m.store_product_id,m.status,${effectiveStatus} AS effective_status,m.started_at,m.expires_at,m.auto_renews,m.updated_at FROM app_memberships m LEFT JOIN app_users u ON u.id=m.user_id WHERE ${search} ORDER BY m.updated_at DESC,m.id DESC LIMIT 51 OFFSET $2`, [q, (page - 1) * 50]),
        pool.query(`SELECT e.id,e.user_id,e.platform,e.event_type,e.store_product_id,e.environment,e.status,e.expires_at,e.created_at FROM app_store_subscription_events e LEFT JOIN app_users u ON u.id=e.user_id WHERE ($1='' OR u.email ILIKE '%'||$1||'%' OR u.username ILIKE '%'||$1||'%' OR e.user_id::text=$1 OR e.store_product_id ILIKE '%'||$1||'%') ORDER BY e.created_at DESC,e.id DESC LIMIT 50`, [q]),
      ]);
      return res.json({ ok: true, checkedAt: new Date().toISOString(), summary: summary.rows, memberships: memberships.rows.slice(0, 50), hasMore: memberships.rows.length > 50, page, events: events.rows });
    } catch {
      return res.status(500).json({ error: 'store_subscriptions_read_failed' });
    }
  });

  app.get('/api/admin/device-tokens', requireAdmin, async (req, res) => {
    const limit = limitValue(req.query.limit);
    const q = String(req.query.q || '').trim();
    try {
      const result = await pool.query(
        `SELECT t.id,t.user_id,t.platform,t.device_id,t.is_active,t.created_at,
                left(t.push_token,12) || '...' || right(t.push_token,6) AS token_masked,
                u.email,u.username
           FROM app_device_tokens t LEFT JOIN app_users u ON u.id::text=t.user_id
          WHERE ($1='' OR u.email ILIKE '%'||$1||'%' OR u.username ILIKE '%'||$1||'%' OR t.user_id ILIKE '%'||$1||'%')
          ORDER BY t.is_active DESC,t.created_at DESC LIMIT $2`, [q, limit]);
      res.json({ ok: true, tokens: result.rows });
    } catch (error) { res.status(500).json({ ok: false, error: 'admin_device_tokens_failed', detail: String(error.message || error) }); }
  });

  app.patch('/api/admin/device-tokens/:id/status', requireAdmin, async (req, res) => {
    try {
      const result = await pool.query('UPDATE app_device_tokens SET is_active=$2 WHERE id=$1 RETURNING id,user_id,platform,is_active,created_at', [req.params.id, Boolean(req.body?.isActive)]);
      if (!result.rows.length) return res.status(404).json({ error: 'device_token_not_found' });
      await audit(pool, req, 'device_token_status_updated', result.rows[0].user_id, { tokenId: req.params.id, isActive: result.rows[0].is_active });
      res.json({ ok: true, token: result.rows[0] });
    } catch (error) { res.status(500).json({ ok: false, error: 'admin_device_token_update_failed', detail: String(error.message || error) }); }
  });

  app.get('/api/admin/user-consents', requireAdmin, async (req, res) => {
    const limit = limitValue(req.query.limit, 200);
    const q = String(req.query.q || '').trim();
    try {
      const result = await pool.query(
        `SELECT c.id,c.user_id,c.consent_key,c.policy_type,c.policy_version,c.agreed,c.agreed_at,c.source,c.locale,c.created_at,u.email,u.username
           FROM app_user_consents c LEFT JOIN app_users u ON u.id=c.user_id
          WHERE ($1='' OR u.email ILIKE '%'||$1||'%' OR u.username ILIKE '%'||$1||'%' OR c.policy_type ILIKE '%'||$1||'%' OR c.policy_version ILIKE '%'||$1||'%')
          ORDER BY COALESCE(c.agreed_at,c.created_at) DESC LIMIT $2`, [q, limit]);
      res.json({ ok: true, consents: result.rows });
    } catch (error) { res.status(500).json({ ok: false, error: 'admin_user_consents_failed', detail: String(error.message || error) }); }
  });

  app.get('/api/admin/comments', requireAdmin, async (req, res) => {
    const limit = limitValue(req.query.limit, 200);
    const q = String(req.query.q || '').trim();
    try {
      const result = await pool.query(
        `SELECT c.id,c.post_id,c.user_id,c.content,c.created_at,u.email,u.username,p.caption
           FROM app_comments c LEFT JOIN app_users u ON u.id::text=c.user_id LEFT JOIN app_posts p ON p.id=c.post_id
          WHERE ($1='' OR c.content ILIKE '%'||$1||'%' OR u.email ILIKE '%'||$1||'%' OR u.username ILIKE '%'||$1||'%' OR c.post_id ILIKE '%'||$1||'%')
          ORDER BY c.created_at DESC LIMIT $2`, [q, limit]);
      res.json({ ok: true, comments: result.rows });
    } catch (error) { res.status(500).json({ ok: false, error: 'admin_comments_failed', detail: String(error.message || error) }); }
  });

  app.delete('/api/admin/comments/:id', requireAdmin, async (req, res) => {
    try {
      const result = await pool.query('DELETE FROM app_comments WHERE id=$1 RETURNING id,user_id,post_id,content', [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'comment_not_found' });
      await audit(pool, req, 'comment_deleted', result.rows[0].user_id, { commentId: req.params.id, postId: result.rows[0].post_id, content: result.rows[0].content });
      res.json({ ok: true, removed: result.rows[0] });
    } catch (error) { res.status(500).json({ ok: false, error: 'admin_comment_delete_failed', detail: String(error.message || error) }); }
  });

  app.get('/api/admin/notifications', requireAdmin, async (req, res) => {
    const limit = limitValue(req.query.limit, 200);
    const q = String(req.query.q || '').trim();
    try {
      const result = await pool.query(
        `SELECT n.id,n.user_id,n.actor_id,n.type,n.post_id,n.title,n.body,n.deep_link,n.source,n.delivery_status,n.is_read,n.read_at,n.opened_at,n.sent_at,n.created_at,u.email,u.username
           FROM app_notifications n LEFT JOIN app_users u ON u.id::text=n.user_id
          WHERE ($1='' OR n.title ILIKE '%'||$1||'%' OR n.body ILIKE '%'||$1||'%' OR u.email ILIKE '%'||$1||'%' OR u.username ILIKE '%'||$1||'%')
          ORDER BY n.created_at DESC LIMIT $2`, [q, limit]);
      res.json({ ok: true, notifications: result.rows });
    } catch (error) { res.status(500).json({ ok: false, error: 'admin_notifications_failed', detail: String(error.message || error) }); }
  });

  app.get('/api/admin/reported-chats', requireAdmin, async (req, res) => {
    const limit = limitValue(req.query.limit, 100);
    try {
      const result = await pool.query(
        `SELECT r.id AS report_id,r.status AS report_status,r.reason,r.created_at AS reported_at,
                m.id AS message_id,m.room_id,m.sender_id,m.content,m.created_at AS message_created_at,
                u.email AS sender_email,u.username AS sender_username
           FROM app_reports r JOIN app_messages m ON m.id=r.target_id
           LEFT JOIN app_users u ON u.id::text=m.sender_id
          WHERE lower(COALESCE(r.target_type,'')) IN ('message','chat')
          ORDER BY r.created_at DESC LIMIT $1`, [limit]);
      res.json({ ok: true, chats: result.rows });
    } catch (error) { res.status(500).json({ ok: false, error: 'admin_reported_chats_failed', detail: String(error.message || error) }); }
  });

  app.get('/api/admin/admin-users', requireAdmin, async (_req, res) => {
    try {
      const result = await pool.query("SELECT id,email,username,role,is_blocked,email_verified,created_at FROM app_users WHERE lower(role)='admin' ORDER BY created_at");
      res.json({ ok: true, admins: result.rows });
    } catch (error) { res.status(500).json({ ok: false, error: 'admin_users_failed', detail: String(error.message || error) }); }
  });

  app.get('/api/admin/operations-overview', requireAdmin, async (_req, res) => {
    try {
      const results = await Promise.allSettled([
        pool.query("SELECT status,COUNT(*)::int AS count FROM app_jobs GROUP BY status"),
        pool.query("SELECT platform,is_active,COUNT(*)::int AS count FROM app_device_tokens GROUP BY platform,is_active"),
        pool.query("SELECT delivery_status,COUNT(*)::int AS count FROM app_notifications GROUP BY delivery_status"),
        pool.query("SELECT status,COUNT(*)::int AS count FROM app_reports GROUP BY status"),
        pool.query("SELECT detail->>'platform' AS platform,detail->>'stage' AS stage,COUNT(*)::int AS count,MAX(created_at) AS last_seen FROM admin_audit_logs WHERE action='iap_diagnostic' AND created_at >= now() - interval '7 days' GROUP BY 1,2 ORDER BY last_seen DESC"),
      ]);
      const keys = ['jobs', 'tokens', 'notifications', 'reports', 'iap'];
      const unavailable = keys.filter((_, index) => results[index].status === 'rejected');
      const data = Object.fromEntries(keys.map((key, index) => [key, results[index].status === 'fulfilled' ? results[index].value.rows : []]));
      res.json({ ok: true, partial: unavailable.length > 0, unavailable, checkedAt: new Date().toISOString(), ...data });
    } catch (error) { res.status(500).json({ ok: false, error: 'admin_operations_overview_failed', detail: String(error.message || error) }); }
  });

  app.get('/api/admin/operational-modules/:type', requireAdmin, async (req, res) => {
    const type = String(req.params.type || '').trim();
    const queries = {
      'dive-logs': `SELECT id,user_id,caption,dive_type,dive_date,max_depth,water_temperature,dive_duration,dive_site,created_at FROM app_posts WHERE dive_date IS NOT NULL OR max_depth IS NOT NULL OR dive_duration IS NOT NULL ORDER BY created_at DESC LIMIT 300`,
      media: `SELECT m.id,m.post_id,m.media_type,m.media_url,m.order_index,m.created_at,p.user_id FROM app_post_media m LEFT JOIN app_posts p ON p.id=m.post_id ORDER BY m.created_at DESC LIMIT 300`,
      stamps: `SELECT table_name,record_id,data,created_at,updated_at FROM app_records WHERE table_name IN ('stamps','user_stamps','stamp_definitions') ORDER BY updated_at DESC LIMIT 300`,
      support: `SELECT id,user_id,target_type,target_id,reason,status,resolution_note,created_at,updated_at FROM app_reports WHERE lower(COALESCE(target_type,'')) IN ('support','inquiry','contact') ORDER BY created_at DESC LIMIT 300`,
      donations: `SELECT table_name,record_id,data,created_at,updated_at FROM app_records WHERE table_name IN ('donations','paypal_donations','payments') ORDER BY updated_at DESC LIMIT 300`,
      engagement: `SELECT u.id,u.email,u.username,COALESCE(f.followers,0)::int AS followers,COALESCE(l.likes,0)::int AS likes FROM app_users u LEFT JOIN (SELECT following_id,COUNT(*) AS followers FROM app_follows GROUP BY following_id) f ON f.following_id=u.id::text LEFT JOIN (SELECT p.user_id,COUNT(*) AS likes FROM app_likes l JOIN app_posts p ON p.id=l.post_id GROUP BY p.user_id) l ON l.user_id=u.id::text ORDER BY (COALESCE(f.followers,0)+COALESCE(l.likes,0)) DESC LIMIT 300`,
      analytics: `SELECT series_day::date AS activity_date,COALESCE(u.c,0)::int AS signups,COALESCE(p.c,0)::int AS posts,COALESCE(c.c,0)::int AS comments FROM generate_series(current_date - interval '29 days',current_date,interval '1 day') AS series_day LEFT JOIN (SELECT created_at::date AS activity_date,COUNT(*) c FROM app_users GROUP BY 1) u ON u.activity_date=series_day::date LEFT JOIN (SELECT created_at::date AS activity_date,COUNT(*) c FROM app_posts GROUP BY 1) p ON p.activity_date=series_day::date LEFT JOIN (SELECT created_at::date AS activity_date,COUNT(*) c FROM app_comments GROUP BY 1) c ON c.activity_date=series_day::date ORDER BY series_day DESC`,
      versions: `SELECT table_name,record_id,data,created_at,updated_at FROM app_records WHERE table_name='admin_app_version' ORDER BY updated_at DESC`,
    };
    if (!queries[type]) return res.status(404).json({ error: 'operational_module_not_found' });
    try { const result = await pool.query(queries[type]); res.json({ ok: true, type, rows: result.rows }); }
    catch (error) { res.status(500).json({ ok: false, error: 'admin_operational_module_failed', detail: String(error.message || error) }); }
  });

  app.put('/api/admin/operational-modules/versions', requireAdmin, async (req, res) => {
    const data = {
      iosVersion: String(req.body?.iosVersion || ''), iosBuild: String(req.body?.iosBuild || ''),
      androidVersion: String(req.body?.androidVersion || ''), androidBuild: String(req.body?.androidBuild || ''),
      minimumIosVersion: String(req.body?.minimumIosVersion || ''), minimumAndroidVersion: String(req.body?.minimumAndroidVersion || ''),
      forceUpdate: Boolean(req.body?.forceUpdate), notice: String(req.body?.notice || ''),
    };
    try {
      await pool.query(`INSERT INTO app_records(table_name,record_id,data,updated_at) VALUES ('admin_app_version','global',$1::jsonb,now()) ON CONFLICT(table_name,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()`, [JSON.stringify(data)]);
      await audit(pool, req, 'app_version_policy_updated', null, data);
      res.json({ ok: true, data });
    } catch (error) { res.status(500).json({ ok: false, error: 'admin_app_version_update_failed', detail: String(error.message || error) }); }
  });
}
