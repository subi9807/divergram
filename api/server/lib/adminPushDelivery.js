import { ALL_USERS_TOPIC, isExpoPushToken, sendPushToToken, sendFcmPushToTopic } from './pushDelivery.js';
import crypto from 'node:crypto';

const PUSH_RETRY_DELAYS_MS = [60_000, 5 * 60_000, 20 * 60_000];

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
  const targetTokenIds = normalizeUserIds(filters?.targetTokenIds || filters?.target_token_ids);

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

  if (targetTokenIds.length) {
    params.push(targetTokenIds);
    clauses.push(`t.id::text = ANY($${params.length}::text[])`);
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
        t.id::text AS token_id,
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

export function summarizePushAudience(rows = [], filters = {}) {
  const userIds = new Set(rows.map((row) => String(row.user_id || '').trim()).filter(Boolean));
  const platforms = rows.reduce((summary, row) => {
    const platform = String(row.platform || 'unknown').trim().toLowerCase() || 'unknown';
    summary[platform] = (summary[platform] || 0) + 1;
    return summary;
  }, {});
  const tokenTypes = rows.reduce((summary, row) => {
    const tokenType = String(row.tokenType || 'unknown').trim().toLowerCase() || 'unknown';
    summary[tokenType] = (summary[tokenType] || 0) + 1;
    return summary;
  }, {});
  const fingerprintInput = rows
    .map((row) => `${row.user_id}:${row.platform}:${crypto.createHash('sha256').update(String(row.push_token || '')).digest('hex')}`)
    .sort();
  const filterSnapshot = {
    targetRole: normalizeAudienceRole(filters?.targetRole || filters?.target_role || 'all'),
    targetUserIds: normalizeUserIds(filters?.targetUserIds || filters?.target_user_ids || filters?.userIds).sort(),
    createdAfter: normalizeIso(filters?.createdAfter || filters?.created_after),
    createdBefore: normalizeIso(filters?.createdBefore || filters?.created_before),
    scubaLevel: String(filters?.scubaLevel || filters?.scuba_level || '').trim(),
    freedivingLevel: String(filters?.freedivingLevel || filters?.freediving_level || '').trim(),
    blockedState: String(filters?.blockedState || filters?.blocked_state || 'all').trim().toLowerCase() || 'all',
  };
  const fingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify({ filters: filterSnapshot, recipients: fingerprintInput }))
    .digest('hex');
  return {
    userCount: userIds.size,
    tokenCount: rows.length,
    platforms,
    tokenTypes,
    fingerprint,
    requiresConfirmation: requiresPushAudienceConfirmation(filterSnapshot, rows.length),
  };
}

export function requiresPushAudienceConfirmation(filters = {}, tokenCount = 0) {
  const hasSpecificUsers = normalizeUserIds(filters?.targetUserIds || filters?.target_user_ids || filters?.userIds).length > 0;
  const hasSegment = Boolean(
    String(filters?.createdAfter || filters?.created_after || '').trim() ||
    String(filters?.createdBefore || filters?.created_before || '').trim() ||
    String(filters?.scubaLevel || filters?.scuba_level || '').trim() ||
    String(filters?.freedivingLevel || filters?.freediving_level || '').trim() ||
    !['', 'all'].includes(String(filters?.blockedState || filters?.blocked_state || 'all').trim().toLowerCase())
  );
  const isAllUsers = normalizeAudienceRole(filters?.targetRole || filters?.target_role || 'all') === 'all' && !hasSpecificUsers && !hasSegment;
  return isAllUsers || Number(tokenCount || 0) >= 100;
}

export function summarizeTokenDelivery(rows = [], deliveryResults = []) {
  const userSuccess = new Map();
  const invalidTokens = [];
  const retryTokenIds = [];
  const permanentFailureTokenIds = [];
  let successCount = 0;

  rows.forEach((row, index) => {
    const result = deliveryResults[index];
    const succeeded = result?.status === 'fulfilled' && result.value?.ok === true;
    const userId = String(row?.user_id || '').trim();
    if (userId) userSuccess.set(userId, Boolean(userSuccess.get(userId)) || succeeded);
    if (succeeded) {
      successCount += 1;
      return;
    }

    const reason = result?.status === 'fulfilled'
      ? String(result.value?.reason || result.value?.detail?.error?.details?.[0]?.errorCode || '')
      : String(result?.reason || 'rejected');
    if (/notregistered|unregistered/i.test(reason) && row?.push_token) {
      invalidTokens.push(String(row.push_token));
    } else if (isRetryablePushFailure(result) && row?.token_id) {
      retryTokenIds.push(String(row.token_id));
    } else if (row?.token_id) {
      permanentFailureTokenIds.push(String(row.token_id));
    }
  });

  return {
    successCount,
    failureCount: Math.max(0, rows.length - successCount),
    invalidTokens,
    retryTokenIds,
    permanentFailureTokenIds,
    userStatuses: Array.from(userSuccess, ([userId, succeeded]) => ({
      userId,
      status: succeeded ? 'sent' : 'failed',
    })),
  };
}

export function isRetryablePushFailure(result) {
  if (result?.status === 'rejected') return true;
  const reason = String(result?.value?.reason || result?.reason || '').toLowerCase();
  return /(timeout|timed out|unavailable|internal|quota|too many|http_429|http_5\d\d|network|fetch|temporar|connection|socket|econn)/i.test(reason);
}

async function queuePushRetry(pool, payload, tokenIds, retryAttempt) {
  const scheduledAt = new Date(Date.now() + PUSH_RETRY_DELAYS_MS[retryAttempt]).toISOString();
  const jobId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO app_jobs(id,type,payload,status,attempts,created_at,updated_at)
     VALUES($1,'admin.push.retry',$2::jsonb,'queued',0,now(),now())`,
    [jobId, JSON.stringify({
      ...payload,
      useTopic: false,
      eventKey: payload.eventKey,
      retryAttempt: retryAttempt + 1,
      scheduledAt,
      filters: { ...(payload.filters || {}), targetTokenIds: tokenIds },
    })]
  );
  return { jobId, scheduledAt, tokenCount: tokenIds.length };
}

async function recordPushDeadLetter(pool, payload, tokenIds, retryAttempt) {
  if (!tokenIds.length) return null;
  const jobId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO app_jobs(id,type,payload,status,attempts,last_error,created_at,updated_at)
     VALUES($1,'admin.push.dead-letter',$2::jsonb,'failed',$3,'push_delivery_failed',now(),now())`,
    [jobId, JSON.stringify({
      eventKey: payload.eventKey,
      title: payload.title,
      targetTokenIds: tokenIds,
      retryAttempt,
    }), retryAttempt]
  );
  return jobId;
}

export async function processAdminPushJob(pool, jobPayload = {}, { actorUserId = null } = {}) {
  const title = String(jobPayload?.title || '').trim();
  const body = String(jobPayload?.body || '').trim();
  const data = normalizePushData(jobPayload?.data || {});
  const filters = jobPayload?.filters || {};
  const notificationType = String(jobPayload?.type || data.type || 'admin_broadcast').trim() || 'admin_broadcast';
  const deepLink = String(jobPayload?.deepLink || jobPayload?.deep_link || data.deepLink || data.deep_link || 'divergram://notifications').trim();
  const eventKey = String(jobPayload?.eventKey || jobPayload?.event_key || data.eventKey || data.event_key || `admin:${crypto.randomUUID()}`).trim();
  const retryAttempt = Math.max(0, Math.min(PUSH_RETRY_DELAYS_MS.length, Number(jobPayload?.retryAttempt || 0) || 0));

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
                     data=EXCLUDED.data,
                     delivery_status=CASE
                       WHEN app_notifications.delivery_status IN ('sent','topic_accepted') THEN app_notifications.delivery_status
                       ELSE 'queued'
                     END,
                     sent_at=now(), updated_at=now()`,
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
          bodyLength: body.length,
          filters,
          tokenCount: 0,
          unsupportedCount,
          successCount: 0,
          failureCount: 0,
          invalidTokenCount: 0,
          eventKey,
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
      invalidTokenCount: 0,
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
  let invalidTokenCount = 0;
  let userStatuses = [];
  let retry = null;
  let deadLetterCount = 0;

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
          normalizePushData({
            ...baseData,
            userId: row.user_id,
            username: row.username,
            role: row.role,
            createdAt: String(row.created_at || ''),
            scubaLevel: row.scuba_level || '',
            freedivingLevel: row.freediving_level || '',
            isBlocked: Boolean(row.is_blocked),
          })
        )
      )
    );
    const deliverySummary = summarizeTokenDelivery(rows, deliveryResults);
    successCount = deliverySummary.successCount;
    failureCount = deliverySummary.failureCount;
    const invalidTokens = deliverySummary.invalidTokens;
    invalidTokenCount = invalidTokens.length;
    userStatuses = deliverySummary.userStatuses;
    if (invalidTokens.length) {
      await pool.query(
        'UPDATE app_device_tokens SET is_active=false WHERE push_token=ANY($1::text[])',
        [invalidTokens]
      );
    }
    if (deliverySummary.retryTokenIds.length && retryAttempt < PUSH_RETRY_DELAYS_MS.length) {
      retry = await queuePushRetry(pool, { ...jobPayload, title, body, data, type: notificationType, deepLink, filters, eventKey }, deliverySummary.retryTokenIds, retryAttempt);
    }
    const deadLetterTokenIds = [
      ...deliverySummary.permanentFailureTokenIds,
      ...(retryAttempt >= PUSH_RETRY_DELAYS_MS.length ? deliverySummary.retryTokenIds : []),
    ];
    if (deadLetterTokenIds.length) {
      await recordPushDeadLetter(pool, { title, eventKey }, deadLetterTokenIds, retryAttempt);
      deadLetterCount = deadLetterTokenIds.length;
    }
  }

  if (targetUsers.length) {
    if (useTopicDelivery) {
      await pool.query(
        `UPDATE app_notifications
         SET delivery_status=$1, updated_at=now()
         WHERE user_id::text=ANY($2::text[]) AND event_key=$3`,
        [successCount > 0 ? 'topic_accepted' : 'failed', targetUsers, eventKey]
      );
    } else if (userStatuses.length) {
      await pool.query(
        `UPDATE app_notifications AS notification
         SET delivery_status=statuses.status, updated_at=now()
         FROM unnest($1::text[], $2::text[]) AS statuses(user_id, status)
         WHERE notification.user_id::text=statuses.user_id AND notification.event_key=$3
           AND notification.delivery_status NOT IN ('sent','topic_accepted')`,
        [userStatuses.map((item) => item.userId), userStatuses.map((item) => item.status), eventKey]
      );
    }
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
        bodyLength: body.length,
        filters,
        deliveryMode: useTopicDelivery ? 'topic' : 'tokens',
        topic: useTopicDelivery ? ALL_USERS_TOPIC : '',
        tokenCount: rows.length,
        expoTokenCount,
        fcmTokenCount,
        unsupportedCount,
        successCount,
        failureCount,
        invalidTokenCount,
        retryAttempt,
        retryQueuedCount: retry?.tokenCount || 0,
        retryScheduledAt: retry?.scheduledAt || '',
        deadLetterCount,
        eventKey,
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
    invalidTokenCount,
    retryAttempt,
    retryQueuedCount: retry?.tokenCount || 0,
    retryScheduledAt: retry?.scheduledAt || '',
    deadLetterCount,
    deliveryPreview: useTopicDelivery
      ? [topicDelivery]
      : deliveryResults.slice(0, 5).map((item) => (item.status === 'fulfilled' ? item.value : { ok: false, reason: String(item.reason || 'rejected') })),
    sentAt: new Date().toISOString(),
    preview: { title, body, data },
  };
}
