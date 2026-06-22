export function registerChatRoutes(app, deps) {
  const { pool, authRateLimit, getAuthUserId, crypto, enqueueMessageCreated } = deps;

  app.get('/api/chat/rooms', async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    try {
      const q = await pool.query(
        `SELECT r.id, r.type, r.created_at,
                COALESCE((SELECT m.content FROM app_messages m WHERE m.room_id=r.id ORDER BY m.created_at DESC LIMIT 1), '') AS last_message,
                (SELECT m.created_at FROM app_messages m WHERE m.room_id=r.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
         FROM app_rooms r
         JOIN app_participants p ON p.room_id=r.id
         WHERE p.user_id=$1
         ORDER BY last_message_at DESC NULLS LAST, r.created_at DESC`,
        [userId]
      );
      return res.json({ rooms: q.rows });
    } catch {
      return res.status(500).json({ error: 'chat_rooms_failed' });
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
          `SELECT * FROM app_messages WHERE room_id=$1 AND created_at < $2 ORDER BY created_at DESC LIMIT $3`,
          [roomId, before, limit]
        );
      } else {
        rows = await pool.query(
          `SELECT * FROM app_messages WHERE room_id=$1 ORDER BY created_at DESC LIMIT $2`,
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

      await pool.query('UPDATE app_messages SET read_at=COALESCE(read_at, now()) WHERE id=$1', [messageId]);
      await pool.query(
        `UPDATE app_message_deliveries SET status='read', updated_at=now() WHERE message_id=$1 AND user_id=$2`,
        [messageId, userId]
      );

      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'chat_read_failed' });
    }
  });
}
