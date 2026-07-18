import { ALL_USERS_TOPIC, isExpoPushToken, sendPushToToken, sendFcmPushToTopic } from './pushDelivery.js';
import crypto from 'node:crypto';

export function normalizeAudienceRole(value) {
  const role = String(value || '').trim().toLowerCase();
  if (!role || role === 'all') return 'all';
  if (['general', 'member', 'resort', 'admin'].includes(role)) return role;
  return 'all';
}

export function normalizeUserIds(input) {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : String(input).split(/[\s,]+/g);
  return Array.from(
    new Set(
      raw
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );
}

export function normalizePushData(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    const safeKey = String(key || '').trim();
    if (!safeKey) continue;
    out[safeKey] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return out;
}

export function normalizeIso(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
}

function buildWhereClause(filters, params) {
  const clauses = ['t.is_active = true'];

  const role = normalizeAudienceRole(filters?.targetRole || filters?.target_role || 'all');
  const userIds = normalizeUserIds(filters?.targetUserIds || filters?.target_user_ids || filters?.userIds);
  const createdAfter = normalizeIso(filters?.createdAfter || filters?.created_after);
  const createdBefore = normalizeIso(filters?.createdBefore || filters?.created_before);
  const scubaLevel = String(filters?.scubaLevel || filters?.scuba_level || '').trim();
  const freedivingLevel = String(filters?.freedivingLevel || filters?.freediving_level || '').trim();
  const blockedState = String(filters?.blockedState || filters?.blocked_state || 'all').trim().toLowerCase();

  if (role !== 'all') {
    if (role === 'general' || role === 'member') {
      clauses.push(`lower(COALESCE(u.role, 'user')) NOT IN ('admin', 'resort')`);
    } else {
      params.push(role);
      clauses.push(`lower(COALESCE(u.role, 'user')) = $${params.length}`);
    }
  }

  if (userIds.length) {
    params.push(userIds);
    clauses.push(`t.user_id::text = ANY($${params.length}::text[])`);
  }

  if (createdAfter) {
    params.push(createdAfter);
    clauses.push(`u.created_at >= $${params.length}::timestamptz`);
  }

  if (createdBefore) {
    params.push(createdBefore);
    clauses.push(`u.created_at <= $${params.length}::timestamptz`);
  }

  if (scubaLevel) {
    params.push(`%${scubaLevel}%`);
    clauses.push(`COALESCE(p.scuba_level, '') ILIKE $${params.length}`);
  }

  if (freedivingLevel) {
    params.push(`%${freedivingLevel}%`);
    clauses.push(`COALESCE(p.freediving_level, '') ILIKE $${params.length}`);
  }

  if (blockedState === 'blocked') {
    clauses.push(`COALESCE(u.is_blocked, false) = true`);
  } else if (blockedState === 'unblocked') {
    clauses.push(`COALESCE(u.is_blocked, false) = false`);
  }

  return clauses;
}

export async function collectPushRecipients(pool, filters = {}) {
  const params = [];
  const clauses = buildWhereClause(filters, params);
  const limit = Math.max(1, Math.min(5000, Number(filters?.limit || filters?.maxRecipients || 2000) || 2000));
  params.push(limit);

  const q = await pool.query(
    `SELECT
        t.user_id::text AS user_id,
        t.platform,
        t.device_id,
        t.push_token,
        COALESCE(u.email, '') AS email,
        COALESCE(u.username, '') AS username,
        lower(COALESCE(u.role, 'user')) AS role,
        COALESCE(p.scuba_level, '') AS scuba_level,
        COALESCE(p.freediving_level, '') AS freediving_level,
        COALESCE(u.is_blocked, false) AS is_blocked,
        COALESCE(u.created_at, now()) AS created_at
     FROM app_device_tokens t
     LEFT JOIN app_users u ON u.id::text = t.user_id::text
     LEFT JOIN app_profiles p ON p.id::text = u.id::text
     WHERE ${clauses.join(' AND ')}
     ORDER BY u.created_at DESC NULLS LAST, t.created_at DESC
     LIMIT $${params.length}`,
    params
  );

  const rows = (q.rows || []).map((row) => ({
    ...row,
    tokenType: isExpoPushToken(row.push_token) ? 'expo' : 'fcm',
  })).filter((row) => String(row.push_token || '').trim());
  const unsupportedCount = 0;
  return { rows, unsupportedCount };
}

export async function processAdminPushJob(pool, jobPayload = {}, { actorUserId = null } = {}) {
  const title = String(jobPayload?.title || '').trim();
  const body = String(jobPayload?.body || '').trim();
  const data = normalizePushData(jobPayload?.data || {});
  const filters = jobPayload?.filters || {};
  const notificationType = String(jobPayload?.type || data.type || 'admin_broadcast').trim() || 'admin_broadcast';
  const deepLink = String(jobPayload?.deepLink || jobPayload?.deep_link || data.deepLink || data.deep_link || 'divergram://notifications').trim();
  const eventKey = String(jobPayload?.eventKey || jobPayload?.event_key || data.eventKey || data.event_key || `admin:${crypto.randomUUID()}`).trim();

  if (!title || !body) {
    throw new Error('title_and_body_required');
  }

  const { rows, unsupportedCount } = await collectPushRecipients(pool, filters);
  const targetUsers = Array.from(new Set(rows.map((row) => String(row.user_id || '').trim()).filter(Boolean)));
  if (targetUsers.length) {
    const notificationRows = targetUsers.map((userId) => ({
      id: crypto.randomUUID(),
      userId,
      eventKey,
    }));
    const values = [];
    const tuples = notificationRows.map((row) => {
      values.push(row.id, row.userId, actorUserId ? String(actorUserId) : null, notificationType, title, body, deepLink, 'admin', row.eventKey, JSON.stringify(data));
      const offset = values.length - 10;
      return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7},$${offset + 8},$${offset + 9},$${offset + 10}::jsonb,'queued',now(),now())`;
    });
    await pool.query(
      `INSERT INTO app_notifications(id,user_id,actor_id,type,title,body,deep_link,source,event_key,data,delivery_status,sent_at,updated_at)
       VALUES ${tuples.join(',')}
       ON CONFLICT (user_id,event_key) WHERE event_key IS NOT NULL AND event_key <> ''
       DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body, deep_link=EXCLUDED.deep_link,
                     data=EXCLUDED.data, delivery_status='queued', sent_at=now(), updated_at=now()`,
      values
    );
  }
  const isBroadAudience =
    String(filters?.targetRole || 'all').trim().toLowerCase() === 'all' &&
    (!normalizeUserIds(filters?.targetUserIds || filters?.target_user_ids || filters?.userIds).length) &&
    !String(filters?.createdAfter || filters?.created_after || '').trim() &&
    !String(filters?.createdBefore || filters?.created_before || '').trim() &&
    !String(filters?.scubaLevel || filters?.scuba_level || '').trim() &&
    !String(filters?.freedivingLevel || filters?.freediving_level || '').trim() &&
    String(filters?.blockedState || filters?.blocked_state || 'all').trim().toLowerCase() === 'all';
  const useTopicDelivery = isBroadAudience && jobPayload?.useTopic === true;
  if (!rows.length) {
    await pool.query(
      `INSERT INTO admin_audit_logs(action, target_user_id, detail)
       VALUES ($1, $2, $3::jsonb)`,
      [
        'push_send',
        actorUserId ? Number(actorUserId) || null : null,
        JSON.stringify({
          actorUserId,
          title,
          body,
          filters,
          tokenCount: 0,
          unsupportedCount,
          successCount: 0,
          failureCount: 0,
          queued: false,
          scheduledAt: normalizeIso(jobPayload?.scheduledAt || ''),
        }),
      ]
    );

    return {
      ok: true,
      queued: false,
      message: 'no_active_push_token',
      targetRole: filters.targetRole || 'all',
      targetUserIds: filters.targetUserIds || [],
      tokenCount: 0,
      expoTokenCount: 0,
      unsupportedCount,
      successCount: 0,
      failureCount: 0,
      sentAt: new Date().toISOString(),
      preview: { title, body, data },
    };
  }

  const baseData = {
    ...data,
    type: notificationType,
    deepLink,
    eventKey,
    targetRole: filters.targetRole || 'all',
  };

  let deliveryResults = [];
  let successCount = 0;
  let failureCount = 0;
  let expoTokenCount = rows.filter((row) => row.tokenType === 'expo').length;
  let fcmTokenCount = rows.filter((row) => row.tokenType === 'fcm').length;
  let topicDelivery = null;

  if (useTopicDelivery) {
    topicDelivery = await sendFcmPushToTopic(ALL_USERS_TOPIC, title, body, baseData);
    deliveryResults = [topicDelivery];
    successCount = topicDelivery?.ok ? 1 : 0;
    failureCount = topicDelivery?.ok ? 0 : 1;
    expoTokenCount = 0;
    fcmTokenCount = 0;
  } else {
    deliveryResults = await Promise.allSettled(
      rows.map((row) =>
        sendPushToToken(
          row.push_token,
          title,
          body,
          {
            ...baseData,
            userId: row.user_id,
            username: row.username,
            role: row.role,
            createdAt: String(row.created_at || ''),
            scubaLevel: row.scuba_level || '',
            freedivingLevel: row.freediving_level || '',
            isBlocked: Boolean(row.is_blocked),
          }
        )
      )
    );
    successCount = deliveryResults.filter((item) => item.status === 'fulfilled' && item.value?.ok).length;
    failureCount = deliveryResults.length - successCount;
    const invalidTokens = deliveryResults.flatMap((item, index) => {
      if (item.status !== 'fulfilled' || item.value?.ok) return [];
      const reason = String(item.value?.reason || item.value?.detail?.error?.details?.[0]?.errorCode || '').toLowerCase();
      return reason.includes('notregistered') || reason.includes('unregistered') ? [rows[index]?.push_token] : [];
    }).filter(Boolean);
    if (invalidTokens.length) {
      await pool.query(
        'UPDATE app_device_tokens SET is_active=false WHERE push_token=ANY($1::text[])',
        [invalidTokens]
      );
    }
  }

  if (targetUsers.length) {
    await pool.query(
      `UPDATE app_notifications
       SET delivery_status=$1, updated_at=now()
       WHERE user_id::text=ANY($2::text[]) AND event_key=$3`,
      [successCount > 0 ? 'sent' : 'failed', targetUsers, eventKey]
    );
  }

  await pool.query(
    `INSERT INTO admin_audit_logs(action, target_user_id, detail)
     VALUES ($1, $2, $3::jsonb)`,
    [
      'push_send',
      actorUserId ? Number(actorUserId) || null : null,
      JSON.stringify({
        actorUserId,
        title,
        body,
        filters,
        deliveryMode: useTopicDelivery ? 'topic' : 'tokens',
        topic: useTopicDelivery ? ALL_USERS_TOPIC : '',
        tokenCount: rows.length,
        expoTokenCount,
        fcmTokenCount,
        unsupportedCount,
        successCount,
        failureCount,
        scheduledAt: normalizeIso(jobPayload?.scheduledAt || ''),
      }),
    ]
  );

  return {
    ok: true,
    queued: successCount > 0,
    message: successCount > 0 ? 'push_queued' : 'push_not_queued',
    deliveryMode: useTopicDelivery ? 'topic' : 'tokens',
    topic: useTopicDelivery ? ALL_USERS_TOPIC : '',
    targetRole: filters.targetRole || 'all',
    targetUserIds: filters.targetUserIds || [],
    tokenCount: rows.length,
    expoTokenCount,
    fcmTokenCount,
    unsupportedCount,
    successCount,
    failureCount,
    deliveryPreview: useTopicDelivery
      ? [topicDelivery]
      : deliveryResults.slice(0, 5).map((item) => (item.status === 'fulfilled' ? item.value : { ok: false, reason: String(item.reason || 'rejected') })),
    sentAt: new Date().toISOString(),
    preview: { title, body, data },
  };
}
