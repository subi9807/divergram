const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_CHUNK_SIZE = 50;

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

export function isExpoPushToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return false;
  return /^ExponentPushToken\[[^\]]+\]$/.test(raw) || /^ExpoPushToken\[[^\]]+\]$/.test(raw);
}

export function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function sendExpoPushMessages(messages) {
  const tickets = [];
  const errors = [];
  if (!messages.length) return { tickets, errors };

  for (const batch of chunkArray(messages, EXPO_PUSH_CHUNK_SIZE)) {
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        errors.push({ type: 'http_error', status: response.status, payload });
        continue;
      }
      if (!payload || !Array.isArray(payload.data)) {
        errors.push({ type: 'invalid_response', payload });
        continue;
      }
      tickets.push(...payload.data);
    } catch (error) {
      errors.push({ type: 'network_error', message: String(error?.message || error) });
    }
  }

  return { tickets, errors };
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
    `SELECT DISTINCT
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

  const rows = (q.rows || []).filter((row) => isExpoPushToken(row.push_token));
  const unsupportedCount = (q.rows || []).length - rows.length;
  return { rows, unsupportedCount };
}

export async function processAdminPushJob(pool, jobPayload = {}, { actorUserId = null } = {}) {
  const title = String(jobPayload?.title || '').trim();
  const body = String(jobPayload?.body || '').trim();
  const data = normalizePushData(jobPayload?.data || {});
  const filters = jobPayload?.filters || {};

  if (!title || !body) {
    throw new Error('title_and_body_required');
  }

  const { rows, unsupportedCount } = await collectPushRecipients(pool, filters);
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

  const messages = rows.map((row) => ({
    to: row.push_token,
    title,
    body,
    sound: 'default',
    priority: 'high',
    data: {
      ...data,
      type: 'admin_broadcast',
      targetRole: filters.targetRole || 'all',
      userId: row.user_id,
      username: row.username,
      role: row.role,
      createdAt: String(row.created_at || ''),
      scubaLevel: row.scuba_level || '',
      freedivingLevel: row.freediving_level || '',
      isBlocked: Boolean(row.is_blocked),
    },
  }));

  const result = await sendExpoPushMessages(messages);
  const successCount = result.tickets.filter((ticket) => ticket?.status === 'ok').length;
  const failureCount = result.tickets.filter((ticket) => ticket?.status !== 'ok').length + result.errors.length;

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
        tokenCount: rows.length,
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
    targetRole: filters.targetRole || 'all',
    targetUserIds: filters.targetUserIds || [],
    tokenCount: rows.length,
    expoTokenCount: rows.length,
    unsupportedCount,
    successCount,
    failureCount,
    ticketPreview: result.tickets.slice(0, 5),
    errorPreview: result.errors.slice(0, 3),
    sentAt: new Date().toISOString(),
    preview: { title, body, data },
  };
}
