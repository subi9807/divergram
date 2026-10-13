import {
  normalizeIso,
  normalizePushData,
  normalizeUserIds,
  collectPushRecipients,
  processAdminPushJob,
  summarizePushAudience,
} from '../lib/adminPushDelivery.js';
import { sendPushToToken } from '../lib/pushDelivery.js';

function normalizeLimit(value, fallback = 20, max = 100) {
  const next = Number(value || fallback);
  if (!Number.isFinite(next) || next <= 0) return fallback;
  return Math.min(max, Math.max(1, Math.round(next)));
}

function normalizeScheduleAt(value) {
  return normalizeIso(value);
}

function normalizeTemplateData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

function buildFilters(body = {}) {
  return {
    targetRole: String(body.targetRole || body.target_role || 'all').trim() || 'all',
    targetUserIds: normalizeUserIds(body.targetUserIds || body.target_user_ids || body.userIds),
    createdAfter: normalizeScheduleAt(body.createdAfter || body.created_after),
    createdBefore: normalizeScheduleAt(body.createdBefore || body.created_before),
    scubaLevel: String(body.scubaLevel || body.scuba_level || '').trim(),
    freedivingLevel: String(body.freedivingLevel || body.freediving_level || '').trim(),
    blockedState: String(body.blockedState || body.blocked_state || 'all').trim() || 'all',
    limit: Number(body.limit || body.maxRecipients || 2000),
  };
}

async function queueScheduledPush(pool, crypto, actorUserId, payload) {
  const jobId = crypto.randomUUID();
  const queuedPayload = { ...payload, actorUserId };
  await pool.query(
    `INSERT INTO app_jobs(id, type, payload, status, attempts, created_at, updated_at)
     VALUES ($1,'admin.push.send',$2::jsonb,'queued',0,now(),now())`,
    [jobId, JSON.stringify(queuedPayload)]
  );
  await pool.query(
    `INSERT INTO admin_audit_logs(action, target_user_id, detail)
     VALUES ($1, $2, $3::jsonb)`,
    [
      'push_schedule',
      actorUserId ? Number(actorUserId) || null : null,
      JSON.stringify({
        actorUserId,
        jobId,
        title: payload?.title || '',
        bodyLength: String(payload?.body || '').length,
        scheduledAt: payload?.scheduledAt || '',
        filters: payload?.filters || {},
      }),
    ]
  );
  return jobId;
}

export function registerAdminPushRoutes(app, { pool, requireAdmin, crypto }) {
  app.post('/api/admin/push/audience-preview', requireAdmin, async (req, res) => {
    try {
      const filters = buildFilters(req.body || {});
      const { rows, unsupportedCount } = await collectPushRecipients(pool, filters);
      return res.json({ ok: true, ...summarizePushAudience(rows, filters), unsupportedCount });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: 'admin_push_audience_preview_failed',
        detail: String(error?.message || error),
      });
    }
  });

  app.get('/api/admin/push/templates', requireAdmin, async (req, res) => {
    const limit = normalizeLimit(req.query.limit, 20, 100);
    try {
      const q = await pool.query(
        `SELECT id, title, body, target_role, data_json, created_by, created_at, updated_at
         FROM admin_push_templates
         ORDER BY updated_at DESC, created_at DESC
         LIMIT $1`,
        [limit]
      );
      return res.json({ ok: true, templates: q.rows || [] });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: 'admin_push_templates_failed',
        detail: String(error?.message || error),
      });
    }
  });

  app.post('/api/admin/push/templates', requireAdmin, async (req, res) => {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const targetRole = String(req.body?.targetRole || req.body?.target_role || 'all').trim() || 'all';
    const data = normalizeTemplateData(req.body?.data || req.body?.data_json || {});
    const templateId = String(req.body?.id || '').trim() || crypto.randomUUID();

    if (!title || !body) {
      return res.status(400).json({ ok: false, error: 'title_and_body_required' });
    }

    try {
      const q = await pool.query(
        `INSERT INTO admin_push_templates(id, title, body, target_role, data_json, created_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,now(),now())
         ON CONFLICT (id) DO UPDATE SET
           title=EXCLUDED.title,
           body=EXCLUDED.body,
           target_role=EXCLUDED.target_role,
           data_json=EXCLUDED.data_json,
           created_by=COALESCE(EXCLUDED.created_by, admin_push_templates.created_by),
           updated_at=now()
         RETURNING id, title, body, target_role, data_json, created_by, created_at, updated_at`,
        [templateId, title, body, targetRole, JSON.stringify(data), String(req.adminAuth?.userId || '').trim() || null]
      );

      await pool.query(
        `INSERT INTO admin_audit_logs(action, target_user_id, detail)
         VALUES ($1, $2, $3::jsonb)`,
        [
          'push_template_save',
          String(req.adminAuth?.userId || '').trim() ? Number(req.adminAuth?.userId) || null : null,
          JSON.stringify({ actorUserId: req.adminAuth?.userId || null, templateId, title, targetRole }),
        ]
      );

      return res.json({ ok: true, template: q.rows?.[0] || null });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: 'admin_push_template_save_failed',
        detail: String(error?.message || error),
      });
    }
  });

  app.delete('/api/admin/push/templates/:templateId', requireAdmin, async (req, res) => {
    const templateId = String(req.params.templateId || '').trim();
    if (!templateId) {
      return res.status(400).json({ ok: false, error: 'template_id_required' });
    }
    try {
      const q = await pool.query(
        `DELETE FROM admin_push_templates WHERE id=$1 RETURNING id`,
        [templateId]
      );
      if (!q.rows.length) {
        return res.status(404).json({ ok: false, error: 'template_not_found' });
      }
      return res.json({ ok: true, removed: q.rows[0] });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: 'admin_push_template_delete_failed',
        detail: String(error?.message || error),
      });
    }
  });

  app.post('/api/admin/push/test', requireAdmin, async (req, res) => {
    const token = String(req.body?.token || '').trim();
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const data = normalizePushData(req.body?.data || {});

    if (!token) {
      return res.status(400).json({ ok: false, error: 'token_required' });
    }
    if (!title || !body) {
      return res.status(400).json({ ok: false, error: 'title_and_body_required' });
    }

    try {
      const result = await sendPushToToken(token, title, body, data);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      await pool.query(
        `INSERT INTO admin_audit_logs(action, target_user_id, detail)
         VALUES ($1, $2, $3::jsonb)`,
        [
          'push_test',
          String(req.adminAuth?.userId || '').trim() ? Number(req.adminAuth?.userId) || null : null,
          JSON.stringify({
            actorUserId: req.adminAuth?.userId || null,
            tokenHash,
            tokenSuffix: token.slice(-8),
            title,
            bodyLength: body.length,
            provider: result?.provider || 'fcm',
            ok: Boolean(result?.ok),
            reason: result?.reason || '',
          }),
        ]
      );

      return res.json({
        ok: true,
        queued: false,
        message: result?.ok ? 'push_sent' : 'push_not_sent',
        provider: result?.provider || 'fcm',
        successCount: result?.ok ? 1 : 0,
        failureCount: result?.ok ? 0 : 1,
        tokenCount: 1,
        expoTokenCount: 0,
        fcmTokenCount: 1,
        unsupportedCount: 0,
        deliveryPreview: [result],
        preview: { title, body, data },
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: 'admin_push_test_failed',
        detail: String(error?.message || error),
      });
    }
  });

  app.post('/api/admin/push/send', requireAdmin, async (req, res) => {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const data = normalizePushData(req.body?.data || {});
    const filters = buildFilters(req.body || {});
    const scheduledAt = normalizeScheduleAt(req.body?.scheduleAt || req.body?.scheduledAt);
    const type = String(req.body?.type || req.body?.notificationType || 'admin_broadcast').trim() || 'admin_broadcast';
    const deepLink = String(req.body?.deepLink || req.body?.deep_link || 'divergram://notifications').trim();

    if (!title || !body) {
      return res.status(400).json({ ok: false, error: 'title_and_body_required' });
    }

    try {
      const { rows: previewRows } = await collectPushRecipients(pool, filters);
      const audience = summarizePushAudience(previewRows, filters);
      if (audience.requiresConfirmation) {
        const confirmed = req.body?.confirmAudience === true || req.body?.confirm_audience === true;
        const fingerprint = String(req.body?.audienceFingerprint || req.body?.audience_fingerprint || '').trim();
        if (!confirmed || !fingerprint || fingerprint !== audience.fingerprint) {
          return res.status(409).json({
            ok: false,
            error: 'push_audience_confirmation_required',
            audience,
          });
        }
      }
      if (scheduledAt && new Date(scheduledAt).getTime() > Date.now()) {
        const jobId = await queueScheduledPush(pool, crypto, String(req.adminAuth?.userId || '').trim() || null, {
          title,
          body,
          data,
          type,
          deepLink,
          filters,
          scheduledAt,
        });
        return res.json({
          ok: true,
          queued: true,
          scheduled: true,
          jobId,
          scheduledAt,
          targetRole: filters.targetRole,
          targetUserIds: filters.targetUserIds,
          preview: { title, body, data },
        });
      }

      const result = await processAdminPushJob(
        pool,
        { title, body, data, type, deepLink, filters, scheduledAt: '' },
        { actorUserId: String(req.adminAuth?.userId || '').trim() || null }
      );
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: 'admin_push_send_failed',
        detail: String(error?.message || error),
      });
    }
  });

  app.get('/api/admin/push/history', requireAdmin, async (req, res) => {
    const limit = normalizeLimit(req.query.limit, 20, 100);
    try {
      const sentQ = await pool.query(
        `SELECT audit.id, audit.action, audit.target_user_id, audit.detail, audit.created_at,
                COALESCE(stats.notification_count, 0) AS notification_count,
                COALESCE(stats.queued_count, 0) AS queued_count,
                COALESCE(stats.sent_count, 0) AS sent_count,
                COALESCE(stats.failed_count, 0) AS failed_count,
                COALESCE(stats.read_count, 0) AS read_count,
                COALESCE(stats.open_count, 0) AS open_count
         FROM admin_audit_logs audit
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS notification_count,
                  (COUNT(*) FILTER (WHERE notification.delivery_status='queued'))::int AS queued_count,
                  (COUNT(*) FILTER (WHERE notification.delivery_status IN ('sent','topic_accepted')))::int AS sent_count,
                  (COUNT(*) FILTER (WHERE notification.delivery_status='failed'))::int AS failed_count,
                  (COUNT(*) FILTER (WHERE notification.read_at IS NOT NULL OR notification.is_read=true))::int AS read_count,
                  (COUNT(*) FILTER (WHERE notification.opened_at IS NOT NULL))::int AS open_count
           FROM app_notifications notification
           WHERE notification.event_key=NULLIF(audit.detail->>'eventKey', '')
         ) stats ON true
         WHERE audit.action IN ('push_send', 'push_schedule', 'push_test')
         ORDER BY audit.created_at DESC
         LIMIT $1`,
        [limit]
      );
      const scheduledQ = await pool.query(
        `SELECT id, type, status, payload, attempts, last_error, created_at, updated_at
         FROM app_jobs
         WHERE type IN ('admin.push.send','admin.push.retry','admin.push.dead-letter')
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return res.json({
        ok: true,
        sent: sentQ.rows || [],
        scheduled: scheduledQ.rows || [],
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: 'admin_push_history_failed',
        detail: String(error?.message || error),
      });
    }
  });
}
