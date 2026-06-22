function normalizeLimit(value, fallback = 50, max = 200) {
  const n = Number(value || fallback);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(1, Math.round(n)));
}

function normalizeAdminStatus(value, allowed, fallback) {
  const status = String(value || '').trim().toLowerCase();
  return allowed.includes(status) ? status : fallback;
}

function normalizeUserRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return ['user', 'member', 'resort', 'admin'].includes(role) ? role : '';
}

function normalizeAccountType(value) {
  const type = String(value || '').trim().toLowerCase();
  return ['personal', 'resort'].includes(type) ? type : '';
}

function normalizeEditableText(value, allowEmpty = true) {
  const text = String(value ?? '').trim();
  if (!allowEmpty && !text) return null;
  return text;
}

function normalizeNullableText(value) {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

function uniqueTextIds(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [values])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );
}

async function deleteAndCollectIds(client, sql, params = [], idColumn = 'id') {
  const q = await client.query(sql, params);
  const ids = (q.rows || [])
    .map((row) => String(row?.[idColumn] ?? row?.id ?? row?.record_id ?? '').trim())
    .filter(Boolean);
  return { rowCount: q.rowCount || ids.length, ids };
}

async function deleteAppRecordRows(client, tableName, ids = []) {
  const uniqueIds = uniqueTextIds(ids);
  if (!uniqueIds.length) return 0;
  const q = await client.query(
    `DELETE FROM app_records
     WHERE table_name=$1
       AND record_id = ANY($2::text[])`,
    [tableName, uniqueIds]
  );
  return q.rowCount || 0;
}

async function purgePostCascade(client, postIds = []) {
  const ids = uniqueTextIds(postIds);
  if (!ids.length) {
    return {
      postIds: [],
      postMedia: 0,
      likes: 0,
      comments: 0,
      savedPosts: 0,
      notifications: 0,
      reports: 0,
      posts: 0,
    };
  }

  const removedPostMedia = await deleteAndCollectIds(
    client,
    `DELETE FROM app_post_media WHERE post_id = ANY($1::text[]) RETURNING id`,
    [ids]
  );
  const removedLikes = await deleteAndCollectIds(
    client,
    `DELETE FROM app_likes WHERE post_id = ANY($1::text[]) RETURNING id`,
    [ids]
  );
  const removedComments = await deleteAndCollectIds(
    client,
    `DELETE FROM app_comments WHERE post_id = ANY($1::text[]) RETURNING id`,
    [ids]
  );
  const removedSaved = await deleteAndCollectIds(
    client,
    `DELETE FROM app_saved_posts WHERE post_id = ANY($1::text[]) RETURNING id`,
    [ids]
  );
  const removedNotifications = await deleteAndCollectIds(
    client,
    `DELETE FROM app_notifications WHERE post_id = ANY($1::text[]) RETURNING id`,
    [ids]
  );
  const removedReports = await deleteAndCollectIds(
    client,
    `DELETE FROM app_reports WHERE target_id = ANY($1::text[]) RETURNING id`,
    [ids]
  );
  const removedPosts = await deleteAndCollectIds(
    client,
    `DELETE FROM app_posts WHERE id = ANY($1::text[]) RETURNING id`,
    [ids]
  );

  await deleteAppRecordRows(client, 'post_media', removedPostMedia.ids);
  await deleteAppRecordRows(client, 'likes', removedLikes.ids);
  await deleteAppRecordRows(client, 'comments', removedComments.ids);
  await deleteAppRecordRows(client, 'saved_posts', removedSaved.ids);
  await deleteAppRecordRows(client, 'notifications', removedNotifications.ids);
  await deleteAppRecordRows(client, 'reports', removedReports.ids);
  await deleteAppRecordRows(client, 'posts', removedPosts.ids);

  return {
    postIds: ids,
    postMedia: removedPostMedia.rowCount,
    likes: removedLikes.rowCount,
    comments: removedComments.rowCount,
    savedPosts: removedSaved.rowCount,
    notifications: removedNotifications.rowCount,
    reports: removedReports.rowCount,
    posts: removedPosts.rowCount,
  };
}

export function registerAdminModerationRoutes(app, { pool, requireAdmin }) {
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    const limit = normalizeLimit(req.query.limit, 20, 100);
    const search = String(req.query.search || req.query.q || '').trim();
    const roleFilter = String(req.query.role || '').trim().toLowerCase();
    try {
      const params = [];
      const clauses = [];
      if (search) {
        params.push(`%${search}%`);
        const p = params.length;
        clauses.push(`(u.email ILIKE $${p} OR u.username ILIKE $${p})`);
      }
      if (['general', 'member', 'resort', 'admin'].includes(roleFilter)) {
        if (roleFilter === 'general' || roleFilter === 'member') {
          clauses.push(`lower(COALESCE(u.role, 'user')) NOT IN ('admin', 'resort')`);
        } else {
          params.push(roleFilter);
          const p = params.length;
          clauses.push(`lower(COALESCE(u.role, 'user')) = $${p}`);
        }
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      params.push(limit);
      const q = await pool.query(
        `SELECT u.id::text AS id,
                u.email,
                u.username,
                u.role,
                u.is_blocked,
                u.email_verified,
                u.created_at,
                p.account_type,
                COALESCE(p.full_name, '') AS full_name,
                COALESCE(p.bio, '') AS bio,
                COALESCE(p.avatar_url, '') AS avatar_url,
                COALESCE(p.website, '') AS website,
                COALESCE(p.scuba_level, '') AS scuba_level,
                COALESCE(p.freediving_level, '') AS freediving_level,
                COALESCE(NULLIF(array_to_string(oauth.providers, ', '), ''), 'email') AS signup_method,
                COALESCE(oauth.providers, ARRAY[]::text[]) AS auth_methods,
                COALESCE((SELECT COUNT(*)::int FROM app_posts ap WHERE ap.user_id::text = u.id::text), 0) AS post_count
         FROM app_users u
         LEFT JOIN app_profiles p ON p.id::text = u.id::text
         LEFT JOIN LATERAL (
           SELECT ARRAY(
             SELECT DISTINCT lower(i.provider)
             FROM app_user_oauth_identities i
             WHERE i.user_id::text = u.id::text
             ORDER BY 1
           ) AS providers
         ) oauth ON true
         ${where}
         ORDER BY u.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      res.json({ ok: true, users: q.rows || [] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_users_failed', detail: String(error?.message || error) });
    }
  });

  app.patch('/api/admin/users/:userId', requireAdmin, async (req, res) => {
    const userId = String(req.params.userId || '').trim();
    if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });

    try {
      const body = req.body || {};
      const hasField = (key) => Object.prototype.hasOwnProperty.call(body, key);
      const currentQ = await pool.query(
        `SELECT u.id::text AS id, u.email, u.username, u.role, u.is_blocked, u.email_verified, u.created_at,
                p.username AS profile_username, p.full_name, p.bio, p.avatar_url, p.website, p.account_type, p.scuba_level, p.freediving_level
         FROM app_users u
         LEFT JOIN app_profiles p ON p.id::text = u.id::text
         WHERE u.id=$1
         LIMIT 1`,
        [userId]
      );
      if (!currentQ.rows.length) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const current = currentQ.rows[0];

      const updates = [];
      const values = [];
      const pushUser = (sql, value) => {
        values.push(value);
        updates.push(`${sql}=$${values.length}`);
      };

      const profilePayload = {
        username: hasField('username') ? normalizeEditableText(body.username, false) : current.username,
        full_name: hasField('full_name') || hasField('fullName') ? normalizeEditableText(body.full_name ?? body.fullName, true) : (current.full_name || ''),
        bio: hasField('bio') ? normalizeEditableText(body.bio, true) : (current.bio || ''),
        avatar_url: hasField('avatar_url') || hasField('avatarUrl') ? normalizeNullableText(body.avatar_url ?? body.avatarUrl) : (current.avatar_url || ''),
        website: hasField('website') ? normalizeNullableText(body.website) : (current.website || null),
        account_type: hasField('account_type') || hasField('accountType') ? (normalizeAccountType(body.account_type ?? body.accountType) || 'personal') : (normalizeAccountType(current.account_type) || 'personal'),
        scuba_level: hasField('scuba_level') || hasField('scubaLevel') ? normalizeEditableText(body.scuba_level ?? body.scubaLevel, true) : (current.scuba_level || ''),
        freediving_level: hasField('freediving_level') || hasField('freedivingLevel') ? normalizeEditableText(body.freediving_level ?? body.freedivingLevel, true) : (current.freediving_level || ''),
      };

      if (req.body?.username !== undefined) {
        const username = normalizeEditableText(req.body.username, false);
        if (!username) return res.status(400).json({ ok: false, error: 'username_required' });
        pushUser('username', username);
        profilePayload.username = username;
      }

      if (req.body?.email !== undefined) {
        const email = normalizeEditableText(req.body.email, false);
        if (!email) return res.status(400).json({ ok: false, error: 'email_required' });
        pushUser('email', email);
        if (req.body?.emailVerified === undefined && req.body?.email_verified === undefined) {
          pushUser('email_verified', false);
        }
      }

      const role = normalizeUserRole(req.body?.role);
      if (role) pushUser('role', role === 'member' ? 'user' : role);

      if (req.body?.isBlocked !== undefined || req.body?.blocked !== undefined || req.body?.is_blocked !== undefined) {
        const blocked = Boolean(req.body?.isBlocked ?? req.body?.blocked ?? req.body?.is_blocked);
        pushUser('is_blocked', blocked);
      }

      const emailVerifiedValue = req.body?.emailVerified ?? req.body?.email_verified;
      if (emailVerifiedValue !== undefined) pushUser('email_verified', Boolean(emailVerifiedValue));

      if (!updates.length && !Object.values(profilePayload).some((value, index) => {
        if (index === 0) return value !== current.username;
        if (index === 1) return value !== (current.full_name || '');
        if (index === 2) return value !== (current.bio || '');
        if (index === 3) return value !== (current.avatar_url || null);
        if (index === 4) return value !== (current.website || null);
        if (index === 5) return value !== (current.account_type || 'personal');
        if (index === 6) return value !== (current.scuba_level || '');
        if (index === 7) return value !== (current.freediving_level || '');
        return false;
      })) {
        return res.status(400).json({ ok: false, error: 'no_fields_to_update' });
      }

      let userRow = current;
      if (updates.length) {
        values.push(userId);
        const q = await pool.query(
          `UPDATE app_users SET ${updates.join(', ')} WHERE id=$${values.length}
           RETURNING id::text AS id, email, username, role, is_blocked, email_verified, created_at`,
          values
        );
        if (!q.rows.length) return res.status(404).json({ ok: false, error: 'user_not_found' });
        userRow = q.rows[0];
      }

      const profileQ = await pool.query(
        `INSERT INTO app_profiles(id, username, full_name, bio, avatar_url, website, account_type, scuba_level, freediving_level)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           username=EXCLUDED.username,
           full_name=EXCLUDED.full_name,
           bio=EXCLUDED.bio,
           avatar_url=EXCLUDED.avatar_url,
           website=EXCLUDED.website,
           account_type=EXCLUDED.account_type,
           scuba_level=EXCLUDED.scuba_level,
           freediving_level=EXCLUDED.freediving_level
         RETURNING id, username, full_name, bio, avatar_url, website, account_type, scuba_level, freediving_level, created_at`,
        [
          userId,
          profilePayload.username || userRow.username || current.username,
          profilePayload.full_name !== null ? profilePayload.full_name : (current.full_name || userRow.username || current.username),
          profilePayload.bio !== null ? profilePayload.bio : (current.bio || ''),
          profilePayload.avatar_url !== null ? profilePayload.avatar_url : (current.avatar_url || ''),
          profilePayload.website !== null ? profilePayload.website : (current.website || null),
          profilePayload.account_type || 'personal',
          profilePayload.scuba_level !== null ? profilePayload.scuba_level : (current.scuba_level || ''),
          profilePayload.freediving_level !== null ? profilePayload.freediving_level : (current.freediving_level || ''),
        ]
      );

      res.json({ ok: true, user: userRow, profile: profileQ.rows[0] || null });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_user_update_failed', detail: String(error?.message || error) });
    }
  });

  app.delete('/api/admin/users/:userId/posts', requireAdmin, async (req, res) => {
    const userId = String(req.params.userId || '').trim();
    if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userQ = await client.query(`SELECT id::text AS id, email, username, role FROM app_users WHERE id=$1 LIMIT 1`, [userId]);
      if (!userQ.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ ok: false, error: 'user_not_found' });
      }

      const postIdsQ = await client.query(`SELECT id::text AS id FROM app_posts WHERE user_id=$1 ORDER BY created_at DESC`, [userId]);
      const postIds = postIdsQ.rows.map((row) => String(row.id || '').trim()).filter(Boolean);
      const removedPosts = await purgePostCascade(client, postIds);

      const actorUserId = String(req.adminAuth?.userId || '').trim() || null;
      await client.query(
        `INSERT INTO admin_audit_logs(action, target_user_id, detail)
         VALUES ($1, $2, $3::jsonb)`,
        [
          'user_posts_delete',
          Number.isFinite(Number(userId)) ? Number(userId) : null,
          JSON.stringify({
            userId,
            email: userQ.rows[0]?.email || '',
            username: userQ.rows[0]?.username || '',
            role: userQ.rows[0]?.role || 'user',
            actorUserId,
            removed: removedPosts,
          }),
        ]
      );

      await client.query('COMMIT');
      res.json({ ok: true, removed: removedPosts, user: userQ.rows[0], postCount: postIds.length });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      res.status(500).json({ ok: false, error: 'admin_user_posts_delete_failed', detail: String(error?.message || error) });
    } finally {
      client.release();
    }
  });

  app.delete('/api/admin/users/:userId', requireAdmin, async (req, res) => {
    const userId = String(req.params.userId || '').trim();
    if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userQ = await client.query(
        `SELECT u.id::text AS id, u.email, u.username, u.role, u.is_blocked, u.email_verified, u.created_at, p.account_type
         FROM app_users u
         LEFT JOIN app_profiles p ON p.id::text = u.id::text
         WHERE u.id=$1
         LIMIT 1`,
        [userId]
      );
      if (!userQ.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ ok: false, error: 'user_not_found' });
      }

      const postIdsQ = await client.query(`SELECT id::text AS id FROM app_posts WHERE user_id=$1 ORDER BY created_at DESC`, [userId]);
      const postIds = postIdsQ.rows.map((row) => String(row.id || '').trim()).filter(Boolean);
      const removedPosts = await purgePostCascade(client, postIds);

      const removedOwnLikes = await deleteAndCollectIds(
        client,
        `DELETE FROM app_likes WHERE user_id=$1 RETURNING id`,
        [userId]
      );
      const removedOwnComments = await deleteAndCollectIds(
        client,
        `DELETE FROM app_comments WHERE user_id=$1 RETURNING id`,
        [userId]
      );
      const removedFollows = await deleteAndCollectIds(
        client,
        `DELETE FROM app_follows WHERE follower_id=$1 OR following_id=$1 RETURNING id`,
        [userId]
      );
      const removedSavedPosts = await deleteAndCollectIds(
        client,
        `DELETE FROM app_saved_posts WHERE user_id=$1 RETURNING id`,
        [userId]
      );
      const removedNotifications = await deleteAndCollectIds(
        client,
        `DELETE FROM app_notifications WHERE user_id=$1 OR actor_id=$1 RETURNING id`,
        [userId]
      );
      const removedDeviceTokens = await deleteAndCollectIds(
        client,
        `DELETE FROM app_device_tokens WHERE user_id=$1 RETURNING id`,
        [userId]
      );
      const removedOauth = await deleteAndCollectIds(
        client,
        `DELETE FROM app_user_oauth_identities WHERE user_id=$1 RETURNING id`,
        [userId]
      );
      const removedCertifications = await deleteAndCollectIds(
        client,
        `DELETE FROM app_certifications WHERE user_id=$1 RETURNING id`,
        [userId]
      );
      const removedReports = await deleteAndCollectIds(
        client,
        `DELETE FROM app_reports WHERE user_id=$1 RETURNING id`,
        [userId]
      );
      const removedParticipants = await deleteAndCollectIds(
        client,
        `DELETE FROM app_participants WHERE user_id=$1 RETURNING id`,
        [userId]
      );
      const removedMessages = await deleteAndCollectIds(
        client,
        `DELETE FROM app_messages WHERE sender_id=$1 RETURNING id`,
        [userId]
      );
      const removedDeliveries = await deleteAndCollectIds(
        client,
        `DELETE FROM app_message_deliveries WHERE user_id=$1 OR message_id = ANY($2::text[]) RETURNING id`,
        [userId, removedMessages.ids]
      );
      const removedRooms = await deleteAndCollectIds(
        client,
        `DELETE FROM app_rooms WHERE NOT EXISTS (SELECT 1 FROM app_participants p WHERE p.room_id = app_rooms.id) RETURNING id`,
        []
      );
      const removedProfile = await deleteAndCollectIds(
        client,
        `DELETE FROM app_profiles WHERE id=$1 RETURNING id`,
        [userId]
      );
      const removedUser = await deleteAndCollectIds(
        client,
        `DELETE FROM app_users WHERE id=$1 RETURNING id`,
        [userId]
      );

      await deleteAppRecordRows(client, 'profiles', removedProfile.ids);
      await deleteAppRecordRows(client, 'posts', removedPosts.postIds || postIds);
      await deleteAppRecordRows(client, 'likes', removedOwnLikes.ids);
      await deleteAppRecordRows(client, 'comments', removedOwnComments.ids);
      await deleteAppRecordRows(client, 'follows', removedFollows.ids);
      await deleteAppRecordRows(client, 'saved_posts', removedSavedPosts.ids);
      await deleteAppRecordRows(client, 'notifications', removedNotifications.ids);
      await deleteAppRecordRows(client, 'reports', removedReports.ids);
      await deleteAppRecordRows(client, 'certifications', removedCertifications.ids);
      await deleteAppRecordRows(client, 'participants', removedParticipants.ids);
      await deleteAppRecordRows(client, 'messages', removedMessages.ids);
      await deleteAppRecordRows(client, 'rooms', removedRooms.ids);

      const actorUserId = String(req.adminAuth?.userId || '').trim() || null;
      await client.query(
        `INSERT INTO admin_audit_logs(action, target_user_id, detail)
         VALUES ($1, $2, $3::jsonb)`,
        [
          'user_delete',
          Number.isFinite(Number(userId)) ? Number(userId) : null,
          JSON.stringify({
            userId,
            email: userQ.rows[0]?.email || '',
            username: userQ.rows[0]?.username || '',
            role: userQ.rows[0]?.role || 'user',
            actorUserId,
            removed: {
              posts: removedPosts,
              likes: removedOwnLikes.rowCount,
              comments: removedOwnComments.rowCount,
              follows: removedFollows.rowCount,
              savedPosts: removedSavedPosts.rowCount,
              notifications: removedNotifications.rowCount,
              deviceTokens: removedDeviceTokens.rowCount,
              oauth: removedOauth.rowCount,
              certifications: removedCertifications.rowCount,
              reports: removedReports.rowCount,
              participants: removedParticipants.rowCount,
              messages: removedMessages.rowCount,
              deliveries: removedDeliveries.rowCount,
              rooms: removedRooms.rowCount,
              profile: removedProfile.rowCount,
              user: removedUser.rowCount,
            },
          }),
        ]
      );

      await client.query('COMMIT');
      res.json({
        ok: true,
        removed: {
          posts: removedPosts,
          likes: removedOwnLikes.rowCount,
          comments: removedOwnComments.rowCount,
          follows: removedFollows.rowCount,
          savedPosts: removedSavedPosts.rowCount,
          notifications: removedNotifications.rowCount,
          deviceTokens: removedDeviceTokens.rowCount,
          oauth: removedOauth.rowCount,
          certifications: removedCertifications.rowCount,
          reports: removedReports.rowCount,
          participants: removedParticipants.rowCount,
          messages: removedMessages.rowCount,
          deliveries: removedDeliveries.rowCount,
          rooms: removedRooms.rowCount,
          profile: removedProfile.rowCount,
          user: removedUser.rowCount,
        },
        user: userQ.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      res.status(500).json({ ok: false, error: 'admin_user_delete_failed', detail: String(error?.message || error) });
    } finally {
      client.release();
    }
  });

  app.patch('/api/admin/users/:userId/block', requireAdmin, async (req, res) => {
    const userId = String(req.params.userId || '').trim();
    const blocked = Boolean(req.body?.blocked ?? req.body?.isBlocked ?? true);
    if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });
    try {
      const q = await pool.query(
        `UPDATE app_users SET is_blocked=$1 WHERE id=$2 RETURNING id::text AS id, email, username, role, is_blocked, email_verified, created_at`,
        [blocked, userId]
      );
      if (!q.rows.length) return res.status(404).json({ ok: false, error: 'user_not_found' });
      res.json({ ok: true, user: q.rows[0] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_user_block_failed', detail: String(error?.message || error) });
    }
  });

  app.get('/api/admin/certifications', requireAdmin, async (req, res) => {
    const limit = normalizeLimit(req.query.limit, 50, 200);
    const status = String(req.query.status || '').trim().toLowerCase();
    const params = [limit];
    let where = '';
    if (status) {
      params.unshift(status);
      where = 'WHERE lower(status)=lower($1)';
    }
    try {
      const q = await pool.query(
        `SELECT id, user_id, agency, certification_number, level, issued_at, expires_at, image_url, status, created_at, updated_at
         FROM app_certifications
         ${where}
         ORDER BY updated_at DESC, created_at DESC
         LIMIT $${params.length}`,
        params
      );
      res.json({ ok: true, certifications: q.rows || [] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_certifications_failed', detail: String(error?.message || error) });
    }
  });

  app.patch('/api/admin/certifications/:certificationId/status', requireAdmin, async (req, res) => {
    const certificationId = String(req.params.certificationId || '').trim();
    const status = normalizeAdminStatus(req.body?.status, ['unregistered', 'reviewing', 'verified', 'rejected'], 'reviewing');
    if (!certificationId) return res.status(400).json({ ok: false, error: 'certification_id_required' });
    try {
      const q = await pool.query(
        `UPDATE app_certifications SET status=$1, updated_at=now() WHERE id=$2 RETURNING id, user_id, agency, certification_number, level, issued_at, expires_at, image_url, status, created_at, updated_at`,
        [status, certificationId]
      );
      if (!q.rows.length) return res.status(404).json({ ok: false, error: 'certification_not_found' });
      res.json({ ok: true, certification: q.rows[0] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_certification_update_failed', detail: String(error?.message || error) });
    }
  });

  app.get('/api/admin/reports', requireAdmin, async (req, res) => {
    const limit = normalizeLimit(req.query.limit, 50, 200);
    const status = String(req.query.status || '').trim().toLowerCase();
    const targetType = String(req.query.targetType || req.query.target_type || '').trim().toLowerCase();
    const search = String(req.query.q || req.query.search || '').trim();
    const params = [];
    const clauses = [];
    if (status) {
      params.push(status);
      const p = params.length;
      clauses.push(`lower(status)=lower($${p})`);
    }
    if (targetType && targetType !== 'all') {
      params.push(targetType);
      const p = params.length;
      clauses.push(`lower(COALESCE(target_type, 'post'))=lower($${p})`);
    }
    if (search) {
      params.push(`%${search}%`);
      const p = params.length;
      clauses.push(`(r.reason ILIKE $${p} OR COALESCE(r.detail::text, '') ILIKE $${p} OR COALESCE(r.target_id, '') ILIKE $${p} OR COALESCE(r.resolution_note, '') ILIKE $${p} OR COALESCE(u.email, '') ILIKE $${p} OR COALESCE(u.username, '') ILIKE $${p})`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    params.push(limit);
    try {
      const q = await pool.query(
        `SELECT r.id, r.user_id, r.reason, r.status, r.created_at, r.updated_at, r.target_type, r.target_id, r.detail, r.resolution_note, r.handled_by,
                u.email AS user_email, u.username AS user_username
         FROM app_reports r
         LEFT JOIN app_users u ON u.id::text = r.user_id::text
         ${where}
         ORDER BY r.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      res.json({ ok: true, reports: q.rows || [] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_reports_failed', detail: String(error?.message || error) });
    }
  });

  app.patch('/api/admin/reports/:reportId/status', requireAdmin, async (req, res) => {
    const reportId = String(req.params.reportId || '').trim();
    const status = normalizeAdminStatus(req.body?.status, ['open', 'received', 'reviewing', 'resolved', 'rejected'], 'reviewing');
    const note = String(req.body?.note || req.body?.resolution_note || '').trim();
    if (!reportId) return res.status(400).json({ ok: false, error: 'report_id_required' });
    try {
      const actorUserId = String(req.adminAuth?.userId || '').trim() || null;
      const q = await pool.query(
        `UPDATE app_reports SET status=$1, resolution_note=COALESCE(NULLIF($2,''), resolution_note), handled_by=COALESCE($3, handled_by), updated_at=now()
         WHERE id=$4
         RETURNING id, user_id, reason, status, created_at, updated_at, target_type, target_id, detail, resolution_note, handled_by`,
        [status, note, actorUserId, reportId]
      );
      if (!q.rows.length) return res.status(404).json({ ok: false, error: 'report_not_found' });
      await pool.query(
        `INSERT INTO app_moderation_actions(id, report_id, actor_user_id, target_type, target_id, action, note, status_after, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())`,
        [
          `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          reportId,
          actorUserId,
          String(q.rows[0].target_type || 'report'),
          String(q.rows[0].target_id || ''),
          'status_change',
          note,
          status,
        ]
      );
      res.json({ ok: true, report: q.rows[0] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_report_update_failed', detail: String(error?.message || error) });
    }
  });

  app.get('/api/admin/reports/:reportId', requireAdmin, async (req, res) => {
    const reportId = String(req.params.reportId || '').trim();
    if (!reportId) return res.status(400).json({ ok: false, error: 'report_id_required' });
    try {
      const reportQ = await pool.query(
        `SELECT r.id, r.user_id, r.reason, r.status, r.created_at, r.updated_at, r.target_type, r.target_id, r.detail, r.resolution_note, r.handled_by,
                u.email AS user_email, u.username AS user_username
         FROM app_reports r
         LEFT JOIN app_users u ON u.id::text = r.user_id::text
         WHERE r.id=$1
         LIMIT 1`,
        [reportId]
      );
      if (!reportQ.rows.length) return res.status(404).json({ ok: false, error: 'report_not_found' });
      const actionsQ = await pool.query(
        `SELECT id, report_id, actor_user_id, target_type, target_id, action, note, status_after, created_at
         FROM app_moderation_actions
         WHERE report_id=$1
         ORDER BY created_at DESC`,
        [reportId]
      );
      res.json({ ok: true, report: reportQ.rows[0], actions: actionsQ.rows || [] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_report_detail_failed', detail: String(error?.message || error) });
    }
  });

  app.get('/api/admin/reports/:reportId/actions', requireAdmin, async (req, res) => {
    const reportId = String(req.params.reportId || '').trim();
    if (!reportId) return res.status(400).json({ ok: false, error: 'report_id_required' });
    try {
      const q = await pool.query(
        `SELECT id, report_id, actor_user_id, target_type, target_id, action, note, status_after, created_at
         FROM app_moderation_actions
         WHERE report_id=$1
         ORDER BY created_at DESC`,
        [reportId]
      );
      res.json({ ok: true, actions: q.rows || [] });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_report_actions_failed', detail: String(error?.message || error) });
    }
  });

  app.post('/api/admin/reports/:reportId/actions', requireAdmin, async (req, res) => {
    const reportId = String(req.params.reportId || '').trim();
    if (!reportId) return res.status(400).json({ ok: false, error: 'report_id_required' });
    const action = String(req.body?.action || '').trim() || 'note';
    const note = String(req.body?.note || '').trim();
    const statusAfter = normalizeAdminStatus(req.body?.statusAfter || req.body?.status_after, ['open', 'received', 'reviewing', 'resolved', 'rejected'], 'reviewing');
    const targetType = String(req.body?.targetType || req.body?.target_type || 'report').trim() || 'report';
    const targetId = String(req.body?.targetId || req.body?.target_id || reportId).trim() || reportId;
    const actorUserId = String(req.adminAuth?.userId || '').trim() || null;
    try {
      const actionId = `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await pool.query(
        `INSERT INTO app_moderation_actions(id, report_id, actor_user_id, target_type, target_id, action, note, status_after, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())`,
        [actionId, reportId, actorUserId, targetType, targetId, action, note, statusAfter]
      );
      if (statusAfter) {
        await pool.query(
          `UPDATE app_reports SET status=$1, resolution_note=COALESCE(NULLIF($2,''), resolution_note), handled_by=COALESCE($3, handled_by), updated_at=now()
           WHERE id=$4`,
          [statusAfter, note, actorUserId, reportId]
        );
      }
      const q = await pool.query(
        `SELECT id, report_id, actor_user_id, target_type, target_id, action, note, status_after, created_at
         FROM app_moderation_actions
         WHERE id=$1
         LIMIT 1`,
        [actionId]
      );
      res.json({ ok: true, action: q.rows[0] || null });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'admin_report_action_failed', detail: String(error?.message || error) });
    }
  });
}
