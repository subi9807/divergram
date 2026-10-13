const ALLOWED_PERIODS = new Set([7, 30, 90]);

function isoDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function periodStart(days) {
  const requested = new Date(Date.now() - (days - 1) * 86400000);
  const retentionStart = new Date();
  retentionStart.setUTCDate(1);
  retentionStart.setUTCMonth(retentionStart.getUTCMonth() - 2);
  return isoDate(requested < retentionStart ? retentionStart : requested);
}

function resolveColumnName(column) {
  if (typeof column === 'string') return column.toUpperCase();
  return String(column?.name || column?.code || column?.key || '').toUpperCase();
}

function normalizeRows(payload) {
  const response = payload?.response || {};
  const columns = (response.columns || []).map(resolveColumnName);
  return (response.rows || []).map((row) => {
    if (!Array.isArray(row)) {
      return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [String(key).toUpperCase(), value]));
    }
    return Object.fromEntries(columns.map((column, index) => [column, row[index]]));
  });
}

function numberValue(row, ...names) {
  for (const name of names) {
    const value = Number(row[name]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

export function summarizeBillingPayload(payload) {
  const daily = new Map();
  const channels = new Map();
  const currencies = new Set();

  for (const row of normalizeRows(payload)) {
    const channel = String(row.CATEGORY_CODE || row.CATEGORY_NAME || 'OTHER').toUpperCase();
    const day = String(row.DAY || '').slice(0, 10);
    const currency = String(row.CURRENCY || 'USD').toUpperCase();
    const quantity = numberValue(row, 'QUANTITY', 'VOLUME');
    const cost = numberValue(row, 'TOTAL_PER_UNIT', 'TOTAL_COST', 'AMOUNT', 'COST');
    currencies.add(currency);

    const channelRow = channels.get(channel) || { channel, quantity: 0, cost: 0, currency };
    channelRow.quantity += quantity;
    channelRow.cost += cost;
    channels.set(channel, channelRow);

    if (day) {
      const dailyRow = daily.get(day) || { day, quantity: 0, cost: 0, currency };
      dailyRow.quantity += quantity;
      dailyRow.cost += cost;
      daily.set(day, dailyRow);
    }
  }

  const channelRows = [...channels.values()].map((row) => ({ ...row, cost: Number(row.cost.toFixed(6)) }));
  const usdRows = channelRows.filter((row) => row.currency === 'USD');
  return {
    currency: currencies.size === 0 || (currencies.size === 1 && currencies.has('USD')) ? 'USD' : [...currencies].join(', '),
    spendUsd: Number(usdRows.reduce((sum, row) => sum + row.cost, 0).toFixed(6)),
    quantity: channelRows.reduce((sum, row) => sum + row.quantity, 0),
    channels: channelRows,
    daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)).map((row) => ({ ...row, cost: Number(row.cost.toFixed(6)) })),
  };
}

export function registerAdminMessagingUsageRoutes(app, { pool, requireAdmin }) {
  app.get('/api/admin/communication-usage', requireAdmin, async (req, res) => {
    const days = ALLOWED_PERIODS.has(Number(req.query.days)) ? Number(req.query.days) : 30;
    const sentUntil = isoDate(new Date());
    const sentSince = periodStart(days);
    const configured = Boolean(process.env.INFOBIP_BASE_URL && process.env.INFOBIP_API_KEY && process.env.INFOBIP_BILLING_CALLBACK_TOKEN);
    try {
      const result = await pool.query(
        `SELECT request_id, sent_since, sent_until, status, response_payload, failure_message, requested_at, received_at
           FROM app_infobip_billing_usage
          WHERE sent_since <= $2::date AND sent_until >= $1::date
          ORDER BY received_at DESC NULLS LAST, requested_at DESC
          LIMIT 1`,
        [sentSince, sentUntil]
      );
      const latest = result.rows[0] || null;
      return res.json({
        ok: true,
        configured,
        period: { days, sentSince, sentUntil },
        latest: latest ? {
          requestId: latest.request_id,
          status: latest.status,
          requestedAt: latest.requested_at,
          receivedAt: latest.received_at,
          failureMessage: latest.failure_message,
          provisional: new Date(sentUntil).getUTCMonth() === new Date().getUTCMonth(),
          ...summarizeBillingPayload(latest.response_payload),
        } : null,
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'admin_communication_usage_failed', detail: String(error?.message || error) });
    }
  });

  app.post('/api/admin/communication-usage/refresh', requireAdmin, async (req, res) => {
    const days = ALLOWED_PERIODS.has(Number(req.body?.days)) ? Number(req.body.days) : 30;
    const baseUrl = String(process.env.INFOBIP_BASE_URL || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const apiKey = String(process.env.INFOBIP_API_KEY || '').trim();
    const callbackToken = String(process.env.INFOBIP_BILLING_CALLBACK_TOKEN || '').trim();
    const publicApiBase = String(process.env.PUBLIC_API_BASE_URL || 'https://api.divergram.com').replace(/\/$/, '');
    if (!baseUrl || !apiKey || !callbackToken) return res.status(503).json({ ok: false, error: 'infobip_billing_not_configured' });

    const sentUntil = isoDate(new Date());
    const sentSince = periodStart(days);
    try {
      const response = await fetch(`https://${baseUrl}/billing/1/usage/query`, {
        method: 'POST',
        headers: { authorization: `App ${apiKey}`, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          callbackUrl: `${publicApiBase}/api/integrations/infobip/billing/callback?token=${encodeURIComponent(callbackToken)}`,
          request: {
            filterBy: { dateInterval: { sentSince, sentUntil }, categories: ['SMS', 'SMS_OPERATOR_FEE', 'EMAIL'] },
            aggregateBy: ['CATEGORY_CODE', 'DAY'],
            options: { includeUnfinalizedData: true },
          },
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.requestId) throw new Error(`infobip_billing_query_failed:${response.status}`);
      await pool.query(
        `INSERT INTO app_infobip_billing_usage(request_id,sent_since,sent_until,status,requested_at,updated_at)
         VALUES($1,$2,$3,'pending',now(),now())
         ON CONFLICT(request_id) DO UPDATE SET status='pending',updated_at=now()`,
        [body.requestId, sentSince, sentUntil]
      );
      return res.status(202).json({ ok: true, requestId: body.requestId, status: 'pending', period: { days, sentSince, sentUntil } });
    } catch (error) {
      return res.status(502).json({ ok: false, error: 'infobip_billing_query_failed', detail: String(error?.message || error) });
    }
  });

  app.post('/api/integrations/infobip/billing/callback', async (req, res) => {
    const expected = String(process.env.INFOBIP_BILLING_CALLBACK_TOKEN || '').trim();
    const supplied = String(req.query.token || '').trim();
    if (!expected || !supplied || supplied !== expected) return res.status(401).json({ ok: false, error: 'unauthorized_callback' });
    const requestId = String(req.body?.requestId || '').trim();
    if (!requestId) return res.status(400).json({ ok: false, error: 'request_id_required' });
    const status = String(req.body?.status || 'FAILED').toLowerCase();
    try {
      await pool.query(
        `UPDATE app_infobip_billing_usage
            SET status=$2,response_payload=$3::jsonb,failure_message=$4,received_at=now(),updated_at=now()
          WHERE request_id=$1`,
        [requestId, status, JSON.stringify(req.body || {}), String(req.body?.failureMessage || '')]
      );
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'infobip_billing_callback_failed', detail: String(error?.message || error) });
    }
  });
}
