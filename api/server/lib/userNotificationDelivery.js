import crypto from 'node:crypto';
import { sendPushToToken } from './pushDelivery.js';

const DEFAULT_PUSH_ITEMS = {
  like: true,
  comment: true,
  follow: true,
  mention: true,
  message: true,
};

async function readPushPreference(pool, userId, type) {
  const result = await pool.query(
    `SELECT data FROM app_records WHERE table_name='notification_settings' AND record_id=$1 LIMIT 1`,
    [String(userId)]
  );
  const setting = result.rows[0]?.data || {};
  const pushEnabled = setting.pushEnabled ?? setting.push_enabled ?? true;
  const items = setting.items || setting.notificationItems || {};
  return Boolean(pushEnabled) && Boolean(items[type] ?? DEFAULT_PUSH_ITEMS[type] ?? true);
}

async function actorLabel(pool, actorUserId) {
  const result = await pool.query(
    `SELECT COALESCE(NULLIF(p.full_name,''), NULLIF(p.username,''), NULLIF(u.username,''), 'Diver') AS label
     FROM app_users u LEFT JOIN app_profiles p ON p.id::text=u.id::text
     WHERE u.id::text=$1 LIMIT 1`,
    [String(actorUserId)]
  );
  return String(result.rows[0]?.label || 'Diver');
}

export async function deliverUserEventNotification(pool, input) {
  const userId = String(input?.userId || '').trim();
  const actorUserId = String(input?.actorUserId || '').trim();
  const type = String(input?.type || 'system').trim() || 'system';
  const eventKey = String(input?.eventKey || '').trim() || `${type}:${crypto.randomUUID()}`;
  if (!userId || userId === actorUserId) return { stored: false, reason: 'self_or_missing_target' };

  const actor = await actorLabel(pool, actorUserId);
  const title = String(input?.title || 'Divergram').trim();
  const body = String(input?.body || `${actor}님의 새로운 활동이 있습니다.`).trim();
  const deepLink = String(input?.deepLink || 'divergram://notifications').trim();
  const data = { ...(input?.data || {}), type, deepLink, eventKey };
  const notificationId = crypto.randomUUID();

  const inserted = await pool.query(
    `INSERT INTO app_notifications(id,user_id,actor_id,type,post_id,title,body,deep_link,source,event_key,data,delivery_status,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'event',$9,$10::jsonb,'stored',now())
     ON CONFLICT (user_id,event_key) WHERE event_key IS NOT NULL AND event_key <> '' DO NOTHING
     RETURNING id`,
    [notificationId, userId, actorUserId || null, type, input?.postId || null, title, body, deepLink, eventKey, JSON.stringify(data)]
  );
  if (!inserted.rows.length) return { stored: false, reason: 'duplicate_event' };

  const pushAllowed = await readPushPreference(pool, userId, type);
  if (!pushAllowed) {
    await pool.query(`UPDATE app_notifications SET delivery_status='push_disabled',updated_at=now() WHERE id=$1`, [notificationId]);
    return { stored: true, pushed: false, reason: 'push_disabled' };
  }

  const tokens = await pool.query(
    `SELECT push_token FROM app_device_tokens WHERE user_id::text=$1 AND is_active=true ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );
  if (!tokens.rows.length) {
    await pool.query(`UPDATE app_notifications SET delivery_status='no_token',updated_at=now() WHERE id=$1`, [notificationId]);
    return { stored: true, pushed: false, reason: 'no_token' };
  }

  const results = await Promise.allSettled(tokens.rows.map((row) => sendPushToToken(row.push_token, title, body, data)));
  const successCount = results.filter((result) => result.status === 'fulfilled' && result.value?.ok).length;
  await pool.query(
    `UPDATE app_notifications SET delivery_status=$1,sent_at=CASE WHEN $2 THEN now() ELSE sent_at END,updated_at=now() WHERE id=$3`,
    [successCount > 0 ? 'sent' : 'failed', successCount > 0, notificationId]
  );
  return { stored: true, pushed: successCount > 0, successCount, failureCount: results.length - successCount };
}
