export function registerChatRoutes(app, deps) {
  const { pool, authRateLimit, getAuthUserId, crypto, enqueueMessageCreated } = deps;

  app.get('/api/chat/rooms', async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    try {
      const q = await pool.query(
        `SELECT r.id, r.type, r.name, r.created_by, r.created_at,
                COALESCE((SELECT m.content FROM app_messages m WHERE m.room_id=r.id ORDER BY m.created_at DESC LIMIT 1), '') AS last_message,
                (SELECT m.created_at FROM app_messages m WHERE m.room_id=r.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
                COALESCE((
                  SELECT count(*)::int
                  FROM app_message_deliveries delivery
                  JOIN app_messages message ON message.id=delivery.message_id
                  WHERE message.room_id=r.id AND delivery.user_id=$1 AND delivery.status <> 'read'
                ), 0) AS unread_count,
                (SELECT count(*)::int FROM app_participants member WHERE member.room_id=r.id) AS participant_count,
                COALESCE((
                  SELECT json_agg(json_build_object(
                    'id', member.user_id,
                    'username', member_profile.username,
                    'full_name', member_profile.full_name,
                    'avatar_url', member_profile.avatar_url
                  ) ORDER BY member.joined_at)
                  FROM app_participants member
                  LEFT JOIN app_profiles member_profile ON member_profile.id::text=member.user_id::text
                  WHERE member.room_id=r.id
                ), '[]'::json) AS participants,
                other.user_id AS other_user_id,
                profile.username AS other_username,
                profile.full_name AS other_full_name,
                profile.avatar_url AS other_avatar_url
         FROM app_rooms r
         JOIN app_participants p ON p.room_id=r.id
         LEFT JOIN LATERAL (
           SELECT participant.user_id
           FROM app_participants participant
           WHERE participant.room_id=r.id AND participant.user_id <> $1
           ORDER BY participant.joined_at ASC
           LIMIT 1
         ) other ON true
         LEFT JOIN app_profiles profile ON profile.id=other.user_id
         WHERE p.user_id=$1
         ORDER BY last_message_at DESC NULLS LAST, r.created_at DESC`,
        [userId]
      );
      return res.json({ rooms: q.rows });
    } catch {
      return res.status(500).json({ error: 'chat_rooms_failed' });
    }
  });

  app.post('/api/chat/groups', authRateLimit(20, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const name = String(req.body?.name || '').trim().slice(0, 60);
    const targetUserIds = [...new Set(
      (Array.isArray(req.body?.targetUserIds) ? req.body.targetUserIds : [])
        .map((value) => String(value || '').trim())
        .filter((value) => value && value !== String(userId))
    )];
    if (!name) return res.status(400).json({ error: 'group_name_required' });
    if (targetUserIds.length < 2 || targetUserIds.length > 49) {
      return res.status(400).json({ error: 'group_participants_invalid' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const targets = await client.query(
        `SELECT u.id::text AS id
         FROM app_users u
         WHERE u.id::text = ANY($1::text[]) AND COALESCE(u.is_blocked, false)=false`,
        [targetUserIds]
      );
      if (targets.rows.length !== targetUserIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'group_participant_not_found' });
      }

      const roomId = crypto.randomUUID();
      const room = await client.query(
        `INSERT INTO app_rooms(id, type, name, created_by, created_at)
         VALUES ($1, 'group', $2, $3, now())
         RETURNING id, type, name, created_by, created_at`,
        [roomId, name, String(userId)]
      );
      for (const participantUserId of [String(userId), ...targetUserIds]) {
        await client.query(
          `INSERT INTO app_participants(id, room_id, user_id, joined_at)
           VALUES ($1,$2,$3,now())`,
          [crypto.randomUUID(), roomId, participantUserId]
        );
      }
      await client.query('COMMIT');
      return res.status(201).json({
        room: {
          ...room.rows[0],
          participant_count: targetUserIds.length + 1,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[chat] group room failed', error);
      return res.status(500).json({ error: 'group_room_failed', detail: String(error?.message || error) });
    } finally {
      client.release();
    }
  });

  app.post('/api/chat/direct', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const targetUserId = String(req.body?.targetUserId || '').trim();
    if (!targetUserId || targetUserId === String(userId)) {
      return res.status(400).json({ error: 'invalid_target_user' });
    }

    const directKey = [String(userId), targetUserId].sort().join(':');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const target = await client.query(
        `SELECT u.id, p.username, p.full_name, p.avatar_url
         FROM app_users u
         LEFT JOIN app_profiles p ON p.id::text=u.id::text
         WHERE u.id::text=$1 AND COALESCE(u.is_blocked, false)=false
         LIMIT 1`,
        [targetUserId]
      );
      if (!target.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'target_user_not_found' });
      }

      const roomId = crypto.randomUUID();
      const room = await client.query(
        `INSERT INTO app_rooms(id, type, direct_key, created_at)
         VALUES ($1, 'direct', $2, now())
         ON CONFLICT (direct_key) WHERE direct_key IS NOT NULL
         DO UPDATE SET direct_key=EXCLUDED.direct_key
         RETURNING id, type, created_at`,
        [roomId, directKey]
      );
      const resolvedRoomId = String(room.rows[0].id);
      for (const participantUserId of [String(userId), targetUserId]) {
        await client.query(
          `INSERT INTO app_participants(id, room_id, user_id, joined_at)
           VALUES ($1,$2,$3,now())
           ON CONFLICT (room_id, user_id) DO NOTHING`,
          [crypto.randomUUID(), resolvedRoomId, participantUserId]
        );
      }
      await client.query('COMMIT');
      return res.json({
        room: {
          ...room.rows[0],
          other_user_id: targetUserId,
          other_username: target.rows[0].username,
          other_full_name: target.rows[0].full_name,
          other_avatar_url: target.rows[0].avatar_url,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[chat] direct room failed', error);
      return res.status(500).json({ error: 'direct_room_failed', detail: String(error?.message || error) });
    } finally {
      client.release();
    }
  });

  app.get('/api/chat/rooms/:roomId/messages', async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const roomId = String(req.params.roomId || '');
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
    const before = req.query.before ? String(req.query.before) : null;

    try {
      const allowed = await pool.query('SELECT 1 FROM app_participants WHERE room_id=$1 AND user_id=$2 LIMIT 1', [roomId, userId]);
      if (!allowed.rows.length) return res.status(403).json({ error: 'forbidden' });

      let rows;
      if (before) {
        rows = await pool.query(
          `SELECT message.*,
                  profile.username AS sender_username,
                  profile.full_name AS sender_full_name,
                  profile.avatar_url AS sender_avatar_url,
                  COALESCE(receipts.read_count, 0)::int AS read_count,
                  COALESCE(receipts.recipient_count, 0)::int AS recipient_count
           FROM app_messages message
           LEFT JOIN app_profiles profile ON profile.id::text=message.sender_id::text
           LEFT JOIN LATERAL (
             SELECT count(*) FILTER (WHERE delivery.status='read') AS read_count,
                    count(*) AS recipient_count
             FROM app_message_deliveries delivery
             WHERE delivery.message_id=message.id
           ) receipts ON true
           WHERE message.room_id=$1 AND message.created_at < $2
           ORDER BY message.created_at DESC LIMIT $3`,
          [roomId, before, limit]
        );
      } else {
        rows = await pool.query(
          `SELECT message.*,
                  profile.username AS sender_username,
                  profile.full_name AS sender_full_name,
                  profile.avatar_url AS sender_avatar_url,
                  COALESCE(receipts.read_count, 0)::int AS read_count,
                  COALESCE(receipts.recipient_count, 0)::int AS recipient_count
           FROM app_messages message
           LEFT JOIN app_profiles profile ON profile.id::text=message.sender_id::text
           LEFT JOIN LATERAL (
             SELECT count(*) FILTER (WHERE delivery.status='read') AS read_count,
                    count(*) AS recipient_count
             FROM app_message_deliveries delivery
             WHERE delivery.message_id=message.id
           ) receipts ON true
           WHERE message.room_id=$1
           ORDER BY message.created_at DESC LIMIT $2`,
          [roomId, limit]
        );
      }
      return res.json({ messages: rows.rows.reverse() });
    } catch {
      return res.status(500).json({ error: 'chat_messages_failed' });
    }
  });

  app.post('/api/chat/rooms/:roomId/messages', authRateLimit(120, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const roomId = String(req.params.roomId || '');
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'content_required' });

    try {
      const allowed = await pool.query('SELECT 1 FROM app_participants WHERE room_id=$1 AND user_id=$2 LIMIT 1', [roomId, userId]);
      if (!allowed.rows.length) return res.status(403).json({ error: 'forbidden' });

      const message = {
        id: crypto.randomUUID(),
        room_id: roomId,
        sender_id: userId,
        content,
        created_at: new Date().toISOString(),
        read_at: null,
      };

      await pool.query(
        `INSERT INTO app_messages(id, room_id, sender_id, content, created_at, read_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [message.id, message.room_id, message.sender_id, message.content, message.created_at, message.read_at]
      );

      const participants = await pool.query('SELECT user_id FROM app_participants WHERE room_id=$1 AND user_id <> $2', [roomId, userId]);
      for (const p of participants.rows) {
        await pool.query(
          `INSERT INTO app_message_deliveries(id, message_id, user_id, status, updated_at)
           VALUES ($1,$2,$3,'queued',now())`,
          [crypto.randomUUID(), message.id, String(p.user_id)]
        );
      }

      await enqueueMessageCreated(message);

      return res.json({ ok: true, message });
    } catch {
      return res.status(500).json({ error: 'chat_send_failed' });
    }
  });

  app.post('/api/chat/messages/:id/read', authRateLimit(180, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const messageId = String(req.params.id || '');

    try {
      const msg = await pool.query('SELECT room_id FROM app_messages WHERE id=$1 LIMIT 1', [messageId]);
      if (!msg.rows.length) return res.status(404).json({ error: 'message_not_found' });

      const roomId = String(msg.rows[0].room_id);
      const allowed = await pool.query('SELECT 1 FROM app_participants WHERE room_id=$1 AND user_id=$2 LIMIT 1', [roomId, userId]);
      if (!allowed.rows.length) return res.status(403).json({ error: 'forbidden' });

      await pool.query(
        `UPDATE app_message_deliveries SET status='read', updated_at=now() WHERE message_id=$1 AND user_id=$2`,
        [messageId, userId]
      );
      await pool.query(
        `UPDATE app_messages message
         SET read_at=COALESCE(message.read_at, now())
         WHERE message.id=$1
           AND NOT EXISTS (
             SELECT 1 FROM app_message_deliveries delivery
             WHERE delivery.message_id=message.id AND delivery.status <> 'read'
           )`,
        [messageId]
      );

      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'chat_read_failed' });
    }
  });

  app.post('/api/chat/rooms/:roomId/read', authRateLimit(180, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const roomId = String(req.params.roomId || '').trim();
    try {
      const allowed = await pool.query('SELECT 1 FROM app_participants WHERE room_id=$1 AND user_id=$2 LIMIT 1', [roomId, userId]);
      if (!allowed.rows.length) return res.status(403).json({ error: 'forbidden' });
      const updated = await pool.query(
        `UPDATE app_message_deliveries delivery
         SET status='read', updated_at=now()
         FROM app_messages message
         WHERE delivery.message_id=message.id
           AND message.room_id=$1
           AND delivery.user_id=$2
           AND delivery.status <> 'read'
         RETURNING delivery.message_id AS id`,
        [roomId, userId]
      );
      if (updated.rows.length) {
        await pool.query(
          `UPDATE app_messages message
           SET read_at=COALESCE(message.read_at, now())
           WHERE message.id = ANY($1::text[])
             AND NOT EXISTS (
               SELECT 1 FROM app_message_deliveries delivery
               WHERE delivery.message_id=message.id AND delivery.status <> 'read'
             )`,
          [updated.rows.map((row) => String(row.id))]
        );
      }
      return res.json({ ok: true, readCount: updated.rowCount });
    } catch {
      return res.status(500).json({ error: 'chat_room_read_failed' });
    }
  });
}
