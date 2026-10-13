import crypto from 'node:crypto';
import { normalizeInternationalPhone } from '../lib/internationalPhone.js';
import { REFUND_POLICY, calculateRefund } from './resortPartners.js';
import { bookingDateRange, reserveCapacity } from '../lib/bookingCapacity.js';
import { getCancellationType } from '../lib/bookingPolicy.js';
import {
  authorizeWalletWithGateway,
  canTransitionPayment,
  capturePayPalOrder,
  createAirwallexPaymentIntent,
  createCheckoutToken,
  createPayPalOrder,
  extractPayPalPaymentDetails,
  getResortPaymentConfig,
  paymentTokenFingerprint,
  parseAirwallexWebhookEvent,
  parsePayPalWebhookEvent,
  publicResortPaymentConfig,
  validateApplePayToken,
  validateGooglePayToken,
  validateIdempotencyKey,
  verifyAirwallexSignature,
  verifyCheckoutToken,
  verifyGatewaySignature,
  verifyPayPalWebhookSignature,
} from '../lib/resortPayments.js';

const STATUSES = new Set(['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show']);
const DEPOSIT_STATUSES = new Set(['pending', 'paid', 'waived', 'refund_requested', 'partially_refunded', 'refunded']);
const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

const SELECT_BOOKING = `
  SELECT b.*, to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
         to_char(b.booking_end_date, 'YYYY-MM-DD') AS booking_end_date,
         p.full_name AS resort_name, p.resort_cover_url,
         rp.title AS price_title, rp.currency, rp.amount,
         u.email AS user_email, u.username
    FROM app_resort_bookings b
    JOIN app_profiles p ON p.id=b.resort_id
    LEFT JOIN app_resort_prices rp ON rp.id=b.price_id
    LEFT JOIN app_users u ON u.id::text=b.user_id
`;

function mapBooking(row) {
  return {
    id: row.id, bookingNumber: row.booking_number || '', resortId: row.resort_id, resortName: row.resort_name || '', resortCoverUrl: row.resort_cover_url || '',
    userId: row.user_id, userEmail: row.user_email || '', username: row.username || '', priceId: row.price_id,
    priceTitle: row.price_title || '', currency: row.currency || '', amount: Number(row.amount || 0),
    bookingDate: row.booking_date, bookingEndDate: row.booking_end_date || row.booking_date, participants: Number(row.participants), diveType: row.dive_type,
    applicantName: row.applicant_name, contactPhone: row.contact_phone, contactEmail: row.contact_email,
    note: row.note, adminNote: row.admin_note, status: row.status, confirmedAt: row.confirmed_at,
    depositAmount: Number(row.deposit_amount || 0), depositCurrency: row.deposit_currency || 'USD',
    depositStatus: row.deposit_status || 'pending', paymentReference: row.payment_reference || '', depositPaidAt: row.deposit_paid_at,
    refundPolicyVersion: row.refund_policy_version || REFUND_POLICY.version,
    refundPolicy: row.refund_policy_snapshot && Object.keys(row.refund_policy_snapshot).length ? row.refund_policy_snapshot : REFUND_POLICY,
    bookingPolicyAcceptedAt: row.booking_policy_accepted_at || null, noShowAt: row.no_show_at || null,
    cancellationType: row.cancellation_type || '',
    refundRequestedAt: row.refund_requested_at, refundReason: row.refund_reason || '',
    refundAmount: Number(row.refund_amount || 0), refundProcessedAt: row.refund_processed_at,
    cancelledAt: row.cancelled_at, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function createBookingNumber() {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).replaceAll('-', '');
  return `RB-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

const AIRWALLEX_COPY = {
  ko: { sampleNotice: '샘플 결제 화면입니다. 실제 청구되지 않으며 예약금은 미결제 상태로 유지됩니다.', liveNotice: '카드 정보는 Airwallex의 보안 결제 화면에서 입력합니다.', sampleAction: '카드로 예약금 결제', liveAction: '카드로 예약금 결제', privacy: 'Divergram은 카드 번호를 저장하지 않습니다.', sampleTitle: '샘플 흐름 완료', liveTitle: '결제 확인 중', sampleBody: '실제 결제는 발생하지 않았습니다.', liveBody: '웹훅 확인 후 예약 내역에 결제 상태가 반영됩니다.', back: 'Divergram으로 돌아가기' },
  en: { sampleNotice: 'This is a sample checkout. No charge is made and the deposit remains unpaid.', liveNotice: 'Enter your card details on the secure Airwallex checkout page.', sampleAction: 'Pay deposit by card', liveAction: 'Pay deposit by card', privacy: 'Divergram does not store card numbers.', sampleTitle: 'Sample flow complete', liveTitle: 'Confirming payment', sampleBody: 'No real payment was made.', liveBody: 'The booking updates after the signed webhook is verified.', back: 'Return to Divergram' },
  ja: { sampleNotice: 'サンプル決済画面です。実際の請求はなく、予約金は未払いのままです。', liveNotice: 'カード情報はAirwallexの安全な決済画面で入力します。', sampleAction: 'カードで予約金を支払う', liveAction: 'カードで予約金を支払う', privacy: 'Divergramはカード番号を保存しません。', sampleTitle: 'サンプルフロー完了', liveTitle: '決済確認中', sampleBody: '実際の決済は発生していません。', liveBody: '署名済みWebhookの確認後、予約に反映されます。', back: 'Divergramに戻る' },
  zh: { sampleNotice: '这是示例支付页面，不会实际扣款，订金仍保持未支付状态。', liveNotice: '银行卡信息将在Airwallex安全支付页面中输入。', sampleAction: '使用银行卡支付订金', liveAction: '使用银行卡支付订金', privacy: 'Divergram不会存储银行卡号。', sampleTitle: '示例流程完成', liveTitle: '正在确认支付', sampleBody: '本次未产生实际付款。', liveBody: '签名Webhook验证后，支付状态将更新至预约记录。', back: '返回Divergram' },
};

function airwallexLocale(value) {
  const locale = text(value, 10).toLowerCase().split(/[-_]/)[0];
  return ['ko', 'en', 'ja', 'zh'].includes(locale) ? locale : 'en';
}

function renderAirwallexCheckout({ booking, intent, token, paymentConfig, apiBaseUrl }) {
  const sample = paymentConfig.sampleMode;
  const locale = airwallexLocale(booking.checkout_locale);
  const copy = AIRWALLEX_COPY[locale];
  const returnUrl = `${apiBaseUrl}/api/resort-payments/airwallex/return?token=${encodeURIComponent(token)}`;
  const metadata = intent.metadata || {};
  const sdkEnvironment = paymentConfig.airwallex.environment === 'production' ? 'prod' : 'demo';
  const checkoutScript = sample ? '' : `
    const { payments } = await window.AirwallexComponentsSDK.init({ env: ${JSON.stringify(sdkEnvironment)}, enabledElements: ['payments'] });
    payments.redirectToCheckout({
      env: ${JSON.stringify(sdkEnvironment)}, mode: 'payment', currency: ${JSON.stringify(intent.currency)},
      intent_id: ${JSON.stringify(intent.provider_intent_id)}, client_secret: ${JSON.stringify(metadata.clientSecret)},
      successUrl: ${JSON.stringify(returnUrl)}, appearance: { mode: 'light', variables: { colorBrand: '#087F79' } }
    });`;
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Divergram Airwallex</title>${sample ? '' : '<script src="https://static.airwallex.com/components/sdk/v1/index.js"></script>'}<style>*{box-sizing:border-box}body{margin:0;background:#eff7f6;color:#102a36;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(100%,440px);background:#fff;border:1px solid #dce8ea;border-radius:24px;padding:24px;box-shadow:0 18px 60px rgba(4,48,57,.12)}.brand{font-size:13px;letter-spacing:.15em;color:#087f79;font-weight:800}.amount{font-size:36px;font-weight:900;margin:18px 0 4px}.muted{color:#60747d;line-height:1.55}.notice{margin:18px 0;padding:14px;border-radius:14px;background:${sample ? '#fff7df' : '#e9f7f4'};color:${sample ? '#8a5b00' : '#086761'};font-weight:700}.action,button{display:block;width:100%;border:0;border-radius:14px;padding:15px;background:#087f79;color:#fff;font-size:16px;font-weight:900;text-align:center;text-decoration:none}button:disabled{opacity:.55}.foot{margin-top:16px;text-align:center;font-size:12px;color:#789098}</style></head><body><main class="wrap"><section class="card"><div class="brand">DIVERGRAM · AIRWALLEX</div><div class="amount">${escapeHtml(intent.currency)} ${Number(intent.amount).toFixed(2)}</div><p class="muted">${escapeHtml(booking.resort_name || 'Resort')}<br>${escapeHtml(booking.booking_number || booking.id)}</p><div class="notice">${escapeHtml(sample ? copy.sampleNotice : copy.liveNotice)}</div>${sample ? `<a class="action" href="${apiBaseUrl}/api/resort-payments/airwallex/sample-complete?token=${encodeURIComponent(token)}">${escapeHtml(copy.sampleAction)}</a>` : `<button id="pay" type="button">${escapeHtml(copy.liveAction)}</button>`}<p class="foot">${escapeHtml(copy.privacy)}</p></section></main>${sample ? '' : `<script>document.getElementById('pay').addEventListener('click',async function(){this.disabled=true;try{${checkoutScript}}catch(error){this.disabled=false;alert('Airwallex checkout could not start.');}});</script>`}</body></html>`;
}

function renderAirwallexReturn(bookingId, sample, localeValue) {
  const locale = airwallexLocale(localeValue);
  const copy = AIRWALLEX_COPY[locale];
  const appUrl = `divergram://payment/airwallex?bookingId=${encodeURIComponent(bookingId)}&sample=${sample ? '1' : '0'}`;
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Divergram</title><style>body{font-family:-apple-system,sans-serif;text-align:center;padding:48px 20px;color:#102a36}a{display:inline-block;margin-top:20px;padding:14px 22px;border-radius:12px;background:#087f79;color:#fff;text-decoration:none;font-weight:800}</style></head><body><h1>${escapeHtml(sample ? copy.sampleTitle : copy.liveTitle)}</h1><p>${escapeHtml(sample ? copy.sampleBody : copy.liveBody)}</p><a href="${escapeHtml(appUrl)}">${escapeHtml(copy.back)}</a><script>setTimeout(function(){location.href=${JSON.stringify(appUrl)}},350);</script></body></html>`;
}

const PAYPAL_COPY = {
  ko: { title: 'PayPal로 예약금 결제', notice: 'PayPal의 보안 결제 화면에서 승인합니다. Divergram은 카드번호를 저장하지 않습니다.', processing: '결제를 확인하고 있습니다.', failed: '결제를 완료하지 못했습니다. 다시 시도해 주세요.', back: 'Divergram으로 돌아가기' },
  en: { title: 'Pay resort deposit with PayPal', notice: 'Approve the payment securely with PayPal. Divergram never stores card numbers.', processing: 'Confirming your payment.', failed: 'The payment could not be completed. Please try again.', back: 'Return to Divergram' },
  ja: { title: 'PayPalで予約金を支払う', notice: 'PayPalの安全な決済画面で承認します。Divergramはカード番号を保存しません。', processing: '決済を確認しています。', failed: '決済を完了できませんでした。もう一度お試しください。', back: 'Divergramに戻る' },
  zh: { title: '使用PayPal支付订金', notice: '请在PayPal安全支付页面完成授权。Divergram不会存储银行卡号。', processing: '正在确认付款。', failed: '无法完成付款，请重试。', back: '返回Divergram' },
};

function renderPayPalCheckout({ booking, intent, token, paymentConfig, apiBaseUrl }) {
  const locale = airwallexLocale(booking.checkout_locale);
  const copy = PAYPAL_COPY[locale];
  const captureUrl = `${apiBaseUrl}/api/resort-payments/paypal/capture?token=${encodeURIComponent(token)}`;
  const returnUrl = `${apiBaseUrl}/api/resort-payments/paypal/return?token=${encodeURIComponent(token)}`;
  const sdkUrl = `${paymentConfig.paypal.sdkBaseUrl}/sdk/js?client-id=${encodeURIComponent(paymentConfig.paypal.clientId)}&currency=${encodeURIComponent(intent.currency)}&intent=capture&components=buttons`;
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Divergram PayPal</title><script src="${sdkUrl}"></script><style>*{box-sizing:border-box}body{margin:0;background:#eff7f6;color:#102a36;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(100%,440px);background:#fff;border:1px solid #dce8ea;border-radius:24px;padding:24px;box-shadow:0 18px 60px rgba(4,48,57,.12)}.brand{font-size:13px;letter-spacing:.15em;color:#087f79;font-weight:800}.amount{font-size:36px;font-weight:900;margin:18px 0 4px}.muted{color:#60747d;line-height:1.55}.notice{margin:18px 0;padding:14px;border-radius:14px;background:#e9f7f4;color:#086761;font-weight:700}.message{min-height:20px;margin-top:14px;color:#b42318;font-size:13px}.foot{margin-top:16px;text-align:center;font-size:12px;color:#789098}</style></head><body><main class="wrap"><section class="card"><div class="brand">DIVERGRAM · PAYPAL</div><h1>${escapeHtml(copy.title)}</h1><div class="amount">${escapeHtml(intent.currency)} ${Number(intent.amount).toFixed(2)}</div><p class="muted">${escapeHtml(booking.resort_name || 'Resort')}<br>${escapeHtml(booking.booking_number || booking.id)}</p><div class="notice">${escapeHtml(copy.notice)}</div><div id="paypal-button-container"></div><p id="message" class="message"></p><p class="foot">${escapeHtml(copy.back)}</p></section></main><script>const message=document.getElementById('message');window.paypal.Buttons({createOrder:function(){return ${JSON.stringify(intent.provider_intent_id)};},onApprove:async function(){message.textContent=${JSON.stringify(copy.processing)};const response=await fetch(${JSON.stringify(captureUrl)},{method:'POST',headers:{'content-type':'application/json'}});const body=await response.json().catch(function(){return {};});if(!response.ok||!body.ok){message.textContent=${JSON.stringify(copy.failed)};return;}location.href=${JSON.stringify(returnUrl)};},onCancel:function(){location.href=${JSON.stringify(returnUrl + '&cancelled=1')};},onError:function(){message.textContent=${JSON.stringify(copy.failed)};}}).render('#paypal-button-container');</script></body></html>`;
}

function renderPayPalReturn(bookingId, localeValue, cancelled = false) {
  const locale = airwallexLocale(localeValue);
  const copy = PAYPAL_COPY[locale];
  const appUrl = `divergram://payment/paypal?bookingId=${encodeURIComponent(bookingId)}&cancelled=${cancelled ? '1' : '0'}`;
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Divergram</title><style>body{font-family:-apple-system,sans-serif;text-align:center;padding:48px 20px;color:#102a36}a{display:inline-block;margin-top:20px;padding:14px 22px;border-radius:12px;background:#087f79;color:#fff;text-decoration:none;font-weight:800}</style></head><body><h1>${escapeHtml(cancelled ? copy.failed : copy.processing)}</h1><a href="${escapeHtml(appUrl)}">${escapeHtml(copy.back)}</a><script>setTimeout(function(){location.href=${JSON.stringify(appUrl)}},350);</script></body></html>`;
}

export function registerResortBookingRoutes(app, { pool, getAuthUserId, authRateLimit, requireAdmin }) {
  let activePayPalEnvironment = 'sandbox';
  let paymentConfig = getResortPaymentConfig();
  let paymentEnvironmentLoad = pool.query("SELECT environment FROM app_payment_environment_settings WHERE provider='paypal' LIMIT 1")
    .then((result) => {
      activePayPalEnvironment = result.rows[0]?.environment === 'production' ? 'production' : 'sandbox';
      paymentConfig = getResortPaymentConfig({ ...process.env, PAYPAL_ENVIRONMENT: activePayPalEnvironment });
    })
    .catch(() => undefined);

  const awaitPaymentEnvironment = async () => {
    await paymentEnvironmentLoad;
    // API credentials can be updated from the encrypted admin settings at runtime.
    paymentConfig = getResortPaymentConfig({ ...process.env, PAYPAL_ENVIRONMENT: activePayPalEnvironment });
  };

  const paypalCredentialState = () => ({
    sandbox: {
      clientId: Boolean(text(process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID, 500)),
      clientSecret: Boolean(text(process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET, 2000)),
      webhookId: Boolean(text(process.env.PAYPAL_SANDBOX_WEBHOOK_ID || process.env.PAYPAL_WEBHOOK_ID, 500)),
    },
    production: {
      clientId: Boolean(text(process.env.PAYPAL_LIVE_CLIENT_ID, 500)),
      clientSecret: Boolean(text(process.env.PAYPAL_LIVE_CLIENT_SECRET, 2000)),
      webhookId: Boolean(text(process.env.PAYPAL_LIVE_WEBHOOK_ID, 500)),
    },
  });

  const readPayPalEnvironmentStatus = async () => {
    await awaitPaymentEnvironment();
    const counts = await pool.query(`SELECT
      COUNT(*) FILTER (WHERE provider='paypal' AND status='succeeded' AND metadata->>'environment'='sandbox')::int AS sandbox_success_count,
      COUNT(*) FILTER (WHERE provider='paypal' AND status IN ('pending','processing') AND metadata->>'environment'='sandbox')::int AS sandbox_open_count,
      MAX(processed_at) FILTER (WHERE provider='paypal' AND status='succeeded' AND metadata->>'environment'='sandbox') AS last_sandbox_success_at
      FROM app_resort_payment_intents`);
    const credentialState = paypalCredentialState();
    const sandboxReady = Object.values(credentialState.sandbox).every(Boolean);
    const productionReady = Object.values(credentialState.production).every(Boolean);
    const row = counts.rows[0] || {};
    const sandboxSuccessCount = Number(row.sandbox_success_count || 0);
    const sandboxOpenCount = Number(row.sandbox_open_count || 0);
    return {
      environment: paymentConfig.paypal.environment === 'production' ? 'production' : 'sandbox',
      enabled: paymentConfig.enabled && paymentConfig.provider === 'paypal',
      credentials: { sandbox: sandboxReady, production: productionReady },
      sandboxSuccessCount,
      sandboxOpenCount,
      lastSandboxSuccessAt: row.last_sandbox_success_at || null,
      sandboxTestPassed: sandboxSuccessCount > 0,
      canActivateProduction: sandboxReady && productionReady && sandboxOpenCount === 0,
    };
  };

  app.use(async (req, _res, next) => {
    if (req.path.startsWith('/api/resort-payments') || req.path.includes('/payments/')) await awaitPaymentEnvironment();
    next();
  });

  app.get('/api/resort-payments/config', authRateLimit(120, 60_000), async (_req, res) => {
    await awaitPaymentEnvironment();
    return res.json({ ok: true, ...publicResortPaymentConfig(paymentConfig) });
  });

  app.get('/api/admin/resort-payments/environment', requireAdmin, async (_req, res) => {
    try {
      return res.json({ ok: true, ...(await readPayPalEnvironmentStatus()) });
    } catch (error) {
      return res.status(500).json({ error: 'paypal_environment_status_failed', detail: text(error?.message, 300) });
    }
  });

  app.patch('/api/admin/resort-payments/environment', requireAdmin, async (req, res) => {
    const environment = text(req.body?.environment, 20).toLowerCase();
    if (!['sandbox', 'production'].includes(environment)) return res.status(400).json({ error: 'invalid_paypal_environment' });
    try {
      const before = await readPayPalEnvironmentStatus();
      if (environment === 'production') {
        if (text(req.body?.confirmation, 20) !== 'LIVE') return res.status(400).json({ error: 'paypal_live_confirmation_required' });
        if (!before.credentials.production) return res.status(409).json({ error: 'paypal_live_credentials_missing' });
        if (!before.credentials.sandbox) return res.status(409).json({ error: 'paypal_sandbox_credentials_missing' });
        if (before.sandboxSuccessCount < 1 && req.body?.acknowledgeUntested !== true) return res.status(409).json({ error: 'paypal_sandbox_test_acknowledgement_required' });
        if (before.sandboxOpenCount > 0) return res.status(409).json({ error: 'paypal_sandbox_payments_still_open' });
      } else if (!before.credentials.sandbox) {
        return res.status(409).json({ error: 'paypal_sandbox_credentials_missing' });
      }
      const actor = text(req.adminAuth?.email || req.adminAuth?.userId || 'admin', 200);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`INSERT INTO app_payment_environment_settings(provider,environment,updated_by,updated_at)
          VALUES('paypal',$1,$2,now()) ON CONFLICT(provider) DO UPDATE SET environment=EXCLUDED.environment,updated_by=EXCLUDED.updated_by,updated_at=now()`, [environment, actor]);
        await client.query(`INSERT INTO admin_audit_logs(action,detail) VALUES('paypal_environment_changed',$1::jsonb)`, [JSON.stringify({ from: before.environment, to: environment, adminEmail: req.adminAuth?.email || '', adminUserId: req.adminAuth?.userId || '' })]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      paymentConfig = getResortPaymentConfig({ ...process.env, PAYPAL_ENVIRONMENT: environment });
      activePayPalEnvironment = environment;
      return res.json({ ok: true, ...(await readPayPalEnvironmentStatus()) });
    } catch (error) {
      return res.status(500).json({ error: 'paypal_environment_update_failed', detail: text(error?.message, 300) });
    }
  });

  app.post('/api/resort-bookings/:id/payments/paypal/session', authRateLimit(5, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!paymentConfig.card.enabled || paymentConfig.provider !== 'paypal' || !paymentConfig.paypal.ready) return res.status(503).json({ error: 'paypal_payment_not_configured' });
    let idempotencyKey;
    try { idempotencyKey = validateIdempotencyKey(req.get('idempotency-key') || req.body?.idempotencyKey); }
    catch (error) { return res.status(error.status || 400).json({ error: error.message }); }
    const bookingId = text(req.params.id, 140);
    const apiBaseUrl = text(process.env.PUBLIC_API_BASE_URL || 'https://api.divergram.com', 500).replace(/\/+$/, '');
    const client = await pool.connect();
    let paymentIntent;
    let bookingRow;
    try {
      await client.query('BEGIN');
      const booking = await client.query('SELECT * FROM app_resort_bookings WHERE id=$1 AND user_id=$2 FOR UPDATE', [bookingId, String(userId)]);
      if (!booking.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'resort_booking_not_found' }); }
      bookingRow = booking.rows[0];
      if (!['pending', 'confirmed'].includes(bookingRow.status)) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'resort_booking_payment_not_allowed' }); }
      if (bookingRow.deposit_status === 'paid') { await client.query('ROLLBACK'); return res.json({ ok: true, alreadyProcessed: true, status: 'succeeded' }); }
      const amount = Number(bookingRow.deposit_amount || 0);
      if (!Number.isFinite(amount) || amount <= 0 || bookingRow.deposit_currency !== 'USD') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'resort_booking_deposit_not_payable' }); }
      const existing = await client.query('SELECT * FROM app_resort_payment_intents WHERE user_id=$1 AND idempotency_key=$2', [String(userId), idempotencyKey]);
      if (existing.rows.length) {
        const previous = existing.rows[0];
        if (previous.booking_id !== bookingId || previous.provider !== 'paypal' || Number(previous.amount) !== amount || previous.currency !== bookingRow.deposit_currency) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'payment_idempotency_conflict' }); }
        paymentIntent = previous;
      } else {
        const id = `rpi_${crypto.randomUUID()}`;
        const inserted = await client.query(`INSERT INTO app_resort_payment_intents (id,booking_id,user_id,provider,payment_method,idempotency_key,amount,currency,status,metadata) VALUES($1,$2,$3,'paypal','paypal',$4,$5,$6,'processing',$7::jsonb) RETURNING *`, [id, bookingId, String(userId), idempotencyKey, amount.toFixed(2), bookingRow.deposit_currency, JSON.stringify({ environment: paymentConfig.paypal.environment })]);
        paymentIntent = inserted.rows[0];
      }
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK').catch(() => undefined);
      return res.status(500).json({ error: 'resort_payment_intent_create_failed' });
    } finally { client.release(); }

    try {
      const locale = airwallexLocale(req.body?.locale);
      if (!paymentIntent.provider_intent_id) {
        const order = await createPayPalOrder(paymentConfig, {
          requestId: paymentIntent.id,
          paymentIntentId: paymentIntent.id,
          bookingId,
          invoiceId: bookingRow.booking_number || paymentIntent.id,
          description: `Divergram resort deposit ${bookingRow.booking_number || bookingId}`,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        });
        const updated = await pool.query(`UPDATE app_resort_payment_intents SET provider_intent_id=$2,metadata=metadata || $3::jsonb,updated_at=now() WHERE id=$1 AND provider='paypal' RETURNING *`, [paymentIntent.id, text(order.id, 200), JSON.stringify({ paypalOrderStatus: text(order.status, 40) })]);
        paymentIntent = updated.rows[0];
      }
      const token = createCheckoutToken({ intentId: paymentIntent.id, bookingId, locale }, paymentConfig.paypal.checkoutSecret);
      return res.json({ ok: true, sample: paymentConfig.paypal.environment === 'sandbox', paymentIntentId: paymentIntent.id, checkoutUrl: `${apiBaseUrl}/api/resort-payments/paypal/checkout?token=${encodeURIComponent(token)}` });
    } catch (error) {
      await pool.query(`UPDATE app_resort_payment_intents SET status='failed',failure_code=$2,failure_message=$3,processed_at=now(),updated_at=now() WHERE id=$1 AND status IN ('pending','processing')`, [paymentIntent.id, text(error.gatewayCode || error.message, 100), text(error.message, 500)]).catch(() => undefined);
      return res.status(error.status || 502).json({ error: 'paypal_payment_session_failed', paymentIntentId: paymentIntent.id });
    }
  });

  app.get('/api/resort-payments/paypal/checkout', async (req, res) => {
    if (!paymentConfig.enabled || paymentConfig.provider !== 'paypal') return res.status(404).send('Not found.');
    const payload = verifyCheckoutToken(req.query?.token, paymentConfig.paypal.checkoutSecret);
    if (!payload) return res.status(401).send('Invalid or expired checkout link.');
    const q = await pool.query(`SELECT i.*,b.booking_number,p.full_name AS resort_name FROM app_resort_payment_intents i JOIN app_resort_bookings b ON b.id=i.booking_id JOIN app_profiles p ON p.id=b.resort_id WHERE i.id=$1 AND i.booking_id=$2 AND i.provider='paypal'`, [payload.intentId, payload.bookingId]);
    if (!q.rows.length || !q.rows[0].provider_intent_id) return res.status(404).send('Payment session not found.');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.paypal.com https://*.paypalobjects.com; connect-src 'self' https://*.paypal.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.paypal.com https://*.paypalobjects.com; frame-src https://*.paypal.com");
    return res.send(renderPayPalCheckout({ booking: { ...q.rows[0], checkout_locale: payload.locale }, intent: q.rows[0], token: req.query.token, paymentConfig, apiBaseUrl: text(process.env.PUBLIC_API_BASE_URL || 'https://api.divergram.com', 500).replace(/\/+$/, '') }));
  });

  app.post('/api/resort-payments/paypal/capture', authRateLimit(10, 60_000), async (req, res) => {
    const payload = verifyCheckoutToken(req.query?.token, paymentConfig.paypal.checkoutSecret);
    if (!payload || !paymentConfig.enabled || paymentConfig.provider !== 'paypal') return res.status(401).json({ error: 'invalid_paypal_checkout_token' });
    const found = await pool.query(`SELECT * FROM app_resort_payment_intents WHERE id=$1 AND booking_id=$2 AND provider='paypal'`, [payload.intentId, payload.bookingId]);
    if (!found.rows.length) return res.status(404).json({ error: 'paypal_payment_not_found' });
    if (found.rows[0].status === 'succeeded') return res.json({ ok: true, alreadyProcessed: true });
    try {
      const order = await capturePayPalOrder(paymentConfig, found.rows[0].provider_intent_id, `capture:${found.rows[0].id}`);
      const details = extractPayPalPaymentDetails(order);
      if (details.orderStatus !== 'COMPLETED' || details.captureStatus !== 'COMPLETED' || details.orderId !== found.rows[0].provider_intent_id || details.currency !== found.rows[0].currency || details.amount !== Number(found.rows[0].amount)) return res.status(409).json({ error: 'paypal_capture_mismatch' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const locked = await client.query(`SELECT * FROM app_resort_payment_intents WHERE id=$1 AND provider='paypal' FOR UPDATE`, [found.rows[0].id]);
        if (!locked.rows.length || !canTransitionPayment(locked.rows[0].status, 'succeeded')) throw new Error('invalid_payment_transition');
        await client.query(`UPDATE app_resort_payment_intents SET status='succeeded',provider_payment_id=$2,payer_id=$3,payer_email=$4,payer_name=$5,payment_source=$6,gross_amount=$7,fee_amount=$8,net_amount=$9,settlement_currency=$10,processed_at=now(),updated_at=now(),metadata=metadata || $11::jsonb WHERE id=$1`, [locked.rows[0].id, details.captureId, details.payerId, details.payerEmail, details.payerName, details.paymentSource, details.grossAmount, details.feeAmount, details.netAmount, details.settlementCurrency, JSON.stringify({ paypalOrderStatus: details.orderStatus, paypalCaptureStatus: details.captureStatus })]);
        const paid = await client.query(`UPDATE app_resort_bookings SET deposit_status='paid',payment_reference=$2,deposit_paid_at=COALESCE(deposit_paid_at,now()),updated_at=now() WHERE id=$1 AND deposit_status='pending' RETURNING *`, [locked.rows[0].booking_id, details.captureId]);
        if (!paid.rows.length) throw new Error('booking_payment_state_changed');
        await client.query(`INSERT INTO app_resort_booking_history(booking_id,actor_user_id,action,from_status,to_status,snapshot) VALUES($1,$2,'deposit_paid',$3,$3,$4::jsonb)`, [paid.rows[0].id, locked.rows[0].user_id, paid.rows[0].status, JSON.stringify({ provider: 'paypal', paymentIntentId: locked.rows[0].id, providerOrderId: details.orderId, providerPaymentId: details.captureId, amount: details.amount, currency: details.currency })]);
        await client.query('COMMIT');
        return res.json({ ok: true, paymentIntentId: locked.rows[0].id, status: 'succeeded' });
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally { client.release(); }
    } catch (error) {
      await pool.query(`UPDATE app_resort_payment_intents SET status='failed',failure_code=$2,failure_message=$3,processed_at=now(),updated_at=now() WHERE id=$1 AND status='processing'`, [found.rows[0].id, text(error.gatewayCode || error.message, 100), text(error.message, 500)]).catch(() => undefined);
      return res.status(error.status || 502).json({ error: 'paypal_capture_failed' });
    }
  });

  app.get('/api/resort-payments/paypal/return', (req, res) => {
    const payload = verifyCheckoutToken(req.query?.token, paymentConfig.paypal.checkoutSecret);
    if (!payload || !paymentConfig.enabled || paymentConfig.provider !== 'paypal') return res.status(401).send('Invalid or expired checkout link.');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(renderPayPalReturn(payload.bookingId, payload.locale, req.query?.cancelled === '1'));
  });

  app.post('/api/resort-bookings/:id/payments/airwallex/session', authRateLimit(5, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!paymentConfig.card.enabled || paymentConfig.provider !== 'airwallex') return res.status(503).json({ error: 'airwallex_payment_not_configured' });
    let idempotencyKey;
    try { idempotencyKey = validateIdempotencyKey(req.get('idempotency-key') || req.body?.idempotencyKey); }
    catch (error) { return res.status(error.status || 400).json({ error: error.message }); }
    const bookingId = text(req.params.id, 140);
    const apiBaseUrl = text(process.env.PUBLIC_API_BASE_URL || 'https://api.divergram.com', 500).replace(/\/+$/, '');
    const client = await pool.connect();
    let paymentIntent;
    let bookingRow;
    try {
      await client.query('BEGIN');
      const booking = await client.query('SELECT * FROM app_resort_bookings WHERE id=$1 AND user_id=$2 FOR UPDATE', [bookingId, String(userId)]);
      if (!booking.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'resort_booking_not_found' }); }
      bookingRow = booking.rows[0];
      if (!['pending', 'confirmed'].includes(bookingRow.status)) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'resort_booking_payment_not_allowed' }); }
      if (bookingRow.deposit_status === 'paid') { await client.query('ROLLBACK'); return res.json({ ok: true, alreadyProcessed: true, status: 'succeeded' }); }
      const amount = Number(bookingRow.deposit_amount || 0);
      if (!Number.isFinite(amount) || amount <= 0 || bookingRow.deposit_currency !== 'USD') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'resort_booking_deposit_not_payable' }); }
      const existing = await client.query('SELECT * FROM app_resort_payment_intents WHERE user_id=$1 AND idempotency_key=$2', [String(userId), idempotencyKey]);
      if (existing.rows.length) {
        const previous = existing.rows[0];
        if (previous.booking_id !== bookingId || Number(previous.amount) !== amount || previous.currency !== bookingRow.deposit_currency) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'payment_idempotency_conflict' }); }
        paymentIntent = previous;
      } else {
        const id = `rpi_${crypto.randomUUID()}`;
        const inserted = await client.query(`INSERT INTO app_resort_payment_intents (id,booking_id,user_id,provider,payment_method,idempotency_key,amount,currency,status,metadata) VALUES($1,$2,$3,'airwallex','card',$4,$5,$6,$7,$8::jsonb) RETURNING *`, [id, bookingId, String(userId), idempotencyKey, amount.toFixed(2), bookingRow.deposit_currency, paymentConfig.sampleMode ? 'pending' : 'processing', JSON.stringify({ sample: paymentConfig.sampleMode })]);
        paymentIntent = inserted.rows[0];
      }
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK').catch(() => undefined);
      return res.status(500).json({ error: 'resort_payment_intent_create_failed' });
    } finally { client.release(); }

    try {
      const locale = airwallexLocale(req.body?.locale);
      const token = createCheckoutToken({ intentId: paymentIntent.id, bookingId, locale }, paymentConfig.airwallex.checkoutSecret);
      if (!paymentConfig.sampleMode && !paymentIntent.provider_intent_id) {
        const returnUrl = `${apiBaseUrl}/api/resort-payments/airwallex/return?token=${encodeURIComponent(token)}`;
        const airwallexIntent = await createAirwallexPaymentIntent(paymentConfig, {
          requestId: crypto.randomUUID(), merchantOrderId: paymentIntent.id, amount: paymentIntent.amount,
          currency: paymentIntent.currency, returnUrl, metadata: { booking_id: bookingId, divergram_payment_intent_id: paymentIntent.id },
        });
        const updated = await pool.query(`UPDATE app_resort_payment_intents SET provider_intent_id=$2,metadata=metadata || $3::jsonb,updated_at=now() WHERE id=$1 RETURNING *`, [paymentIntent.id, text(airwallexIntent.id, 200), JSON.stringify({ clientSecret: text(airwallexIntent.client_secret, 5000), airwallexStatus: text(airwallexIntent.status, 80) })]);
        paymentIntent = updated.rows[0];
      }
      return res.json({ ok: true, sample: paymentConfig.sampleMode, paymentIntentId: paymentIntent.id, checkoutUrl: `${apiBaseUrl}/api/resort-payments/airwallex/checkout?token=${encodeURIComponent(token)}` });
    } catch (error) {
      await pool.query(`UPDATE app_resort_payment_intents SET status='failed',failure_code=$2,failure_message=$3,processed_at=now(),updated_at=now() WHERE id=$1 AND status IN ('pending','processing')`, [paymentIntent.id, text(error.gatewayCode || error.message, 100), text(error.message, 500)]).catch(() => undefined);
      return res.status(error.status || 502).json({ error: 'airwallex_payment_session_failed', paymentIntentId: paymentIntent.id });
    }
  });

  app.get('/api/resort-payments/airwallex/checkout', async (req, res) => {
    if (!paymentConfig.enabled) return res.status(404).send('Not found.');
    const payload = verifyCheckoutToken(req.query?.token, paymentConfig.airwallex.checkoutSecret);
    if (!payload) return res.status(401).send('Invalid or expired checkout link.');
    const q = await pool.query(`SELECT i.*,b.booking_number,p.full_name AS resort_name FROM app_resort_payment_intents i JOIN app_resort_bookings b ON b.id=i.booking_id JOIN app_profiles p ON p.id=b.resort_id WHERE i.id=$1 AND i.booking_id=$2 AND i.provider='airwallex'`, [payload.intentId, payload.bookingId]);
    if (!q.rows.length) return res.status(404).send('Payment session not found.');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.airwallex.com; connect-src 'self' https://*.airwallex.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://*.airwallex.com");
    return res.send(renderAirwallexCheckout({ booking: { ...q.rows[0], checkout_locale: payload.locale }, intent: q.rows[0], token: req.query.token, paymentConfig, apiBaseUrl: text(process.env.PUBLIC_API_BASE_URL || 'https://api.divergram.com', 500).replace(/\/+$/, '') }));
  });

  app.get('/api/resort-payments/airwallex/sample-complete', async (req, res) => {
    if (!paymentConfig.enabled || !paymentConfig.sampleMode) return res.status(404).send('Not found.');
    const payload = verifyCheckoutToken(req.query?.token, paymentConfig.airwallex.checkoutSecret);
    if (!payload) return res.status(401).send('Invalid or expired checkout link.');
    await pool.query(`UPDATE app_resort_payment_intents SET status='cancelled',metadata=metadata || '{"sampleCompleted":true}'::jsonb,processed_at=now(),updated_at=now() WHERE id=$1 AND booking_id=$2 AND provider='airwallex' AND status='pending'`, [payload.intentId, payload.bookingId]);
    return res.redirect(303, `/api/resort-payments/airwallex/return?token=${encodeURIComponent(req.query.token)}`);
  });

  app.get('/api/resort-payments/airwallex/return', (req, res) => {
    if (!paymentConfig.enabled) return res.status(404).send('Not found.');
    const payload = verifyCheckoutToken(req.query?.token, paymentConfig.airwallex.checkoutSecret);
    if (!payload) return res.status(401).send('Invalid or expired checkout link.');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(renderAirwallexReturn(payload.bookingId, paymentConfig.sampleMode, payload.locale));
  });

  app.post('/api/resort-payments/webhooks/airwallex', async (req, res) => {
    if (!paymentConfig.airwallex.liveReady) return res.status(503).json({ error: 'airwallex_payment_not_configured' });
    if (!verifyAirwallexSignature(req.rawBody, req.get('x-timestamp'), req.get('x-signature'), paymentConfig.airwallex.webhookSecret)) return res.status(401).json({ error: 'invalid_payment_webhook_signature' });
    const { eventId, eventType, providerIntentId, nextStatus, providerPaymentId, providerStatus } = parseAirwallexWebhookEvent(req.body);
    if (!eventId || !providerIntentId || !nextStatus) return res.json({ ok: true, ignored: true });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const intent = await client.query("SELECT * FROM app_resort_payment_intents WHERE provider='airwallex' AND provider_intent_id=$1 FOR UPDATE", [providerIntentId]);
      if (!intent.rows.length) { await client.query('COMMIT'); return res.json({ ok: true, ignored: true }); }
      const row = intent.rows[0];
      const event = await client.query(`INSERT INTO app_resort_payment_events(payment_intent_id,provider,provider_event_id,event_type,payload_hash,payload) VALUES($1,'airwallex',$2,$3,$4,$5::jsonb) ON CONFLICT(provider,provider_event_id) DO NOTHING RETURNING id`, [row.id, eventId, eventType, crypto.createHash('sha256').update(req.rawBody).digest('hex'), JSON.stringify({ id: eventId, name: eventType, paymentIntentId: providerIntentId, status: providerStatus })]);
      if (!event.rows.length) { await client.query('COMMIT'); return res.json({ ok: true, duplicate: true }); }
      if (!canTransitionPayment(row.status, nextStatus)) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'invalid_payment_transition' }); }
      await client.query(`UPDATE app_resort_payment_intents SET status=$2,provider_payment_id=COALESCE(NULLIF($3,''),provider_payment_id),metadata=CASE WHEN $2 IN ('succeeded','cancelled','refunded') THEN metadata - 'clientSecret' ELSE metadata END,processed_at=now(),updated_at=now() WHERE id=$1`, [row.id, nextStatus, providerPaymentId]);
      if (nextStatus === 'succeeded') await client.query(`UPDATE app_resort_bookings SET deposit_status='paid',payment_reference=$2,deposit_paid_at=COALESCE(deposit_paid_at,now()),updated_at=now() WHERE id=$1 AND deposit_status='pending'`, [row.booking_id, providerPaymentId || providerIntentId]);
      if (nextStatus === 'refunded') await client.query(`UPDATE app_resort_bookings SET deposit_status='refunded',refund_processed_at=COALESCE(refund_processed_at,now()),updated_at=now() WHERE id=$1 AND deposit_status IN ('paid','refund_requested','partially_refunded')`, [row.booking_id]);
      await client.query('UPDATE app_resort_payment_events SET processed_at=now() WHERE id=$1', [event.rows[0].id]);
      await client.query('COMMIT');
      return res.json({ ok: true });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      return res.status(500).json({ error: 'payment_webhook_processing_failed' });
    } finally { client.release(); }
  });

  app.post('/api/resort-payments/webhooks/paypal', async (req, res) => {
    if (!paymentConfig.paypal.ready) return res.status(503).json({ error: 'paypal_payment_not_configured' });
    let verified = false;
    try { verified = await verifyPayPalWebhookSignature(paymentConfig, req.headers, req.body); }
    catch { return res.status(502).json({ error: 'paypal_webhook_verification_failed' }); }
    if (!verified) return res.status(401).json({ error: 'invalid_payment_webhook_signature' });
    const parsed = parsePayPalWebhookEvent(req.body);
    if (!parsed.eventId || !parsed.nextStatus || (!parsed.orderId && !parsed.captureId)) return res.json({ ok: true, ignored: true });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const intent = await client.query(`SELECT * FROM app_resort_payment_intents WHERE provider='paypal' AND (provider_intent_id=$1 OR provider_payment_id=$2) ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [parsed.orderId, parsed.captureId]);
      if (!intent.rows.length) { await client.query('COMMIT'); return res.json({ ok: true, ignored: true }); }
      const row = intent.rows[0];
      const event = await client.query(`INSERT INTO app_resort_payment_events(payment_intent_id,provider,provider_event_id,event_type,payload_hash,payload) VALUES($1,'paypal',$2,$3,$4,$5::jsonb) ON CONFLICT(provider,provider_event_id) DO NOTHING RETURNING id`, [row.id, parsed.eventId, parsed.eventType, crypto.createHash('sha256').update(req.rawBody || JSON.stringify(req.body)).digest('hex'), JSON.stringify({ id: parsed.eventId, eventType: parsed.eventType, orderId: parsed.orderId, captureId: parsed.captureId, refundId: parsed.refundId, refundAmount: parsed.refundAmount, currency: parsed.currency })]);
      if (!event.rows.length) { await client.query('COMMIT'); return res.json({ ok: true, duplicate: true }); }
      if (!canTransitionPayment(row.status, parsed.nextStatus)) {
        await client.query('UPDATE app_resort_payment_events SET processed_at=now() WHERE id=$1', [event.rows[0].id]);
        await client.query('COMMIT');
        return res.json({ ok: true, ignored: true, reason: 'payment_state_already_advanced' });
      }
      await client.query(`UPDATE app_resort_payment_intents SET status=$2,provider_payment_id=COALESCE(NULLIF($3,''),provider_payment_id),refunded_amount=CASE WHEN $2='refunded' THEN GREATEST(refunded_amount,$4) ELSE refunded_amount END,processed_at=now(),updated_at=now() WHERE id=$1`, [row.id, parsed.nextStatus, parsed.captureId, parsed.refundAmount]);
      if (parsed.nextStatus === 'succeeded') await client.query(`UPDATE app_resort_bookings SET deposit_status='paid',payment_reference=$2,deposit_paid_at=COALESCE(deposit_paid_at,now()),updated_at=now() WHERE id=$1 AND deposit_status='pending'`, [row.booking_id, parsed.captureId || parsed.orderId]);
      if (parsed.nextStatus === 'refunded') await client.query(`UPDATE app_resort_bookings SET deposit_status='refunded',refund_processed_at=COALESCE(refund_processed_at,now()),updated_at=now() WHERE id=$1 AND deposit_status IN ('paid','refund_requested','partially_refunded')`, [row.booking_id]);
      await client.query('UPDATE app_resort_payment_events SET processed_at=now() WHERE id=$1', [event.rows[0].id]);
      await client.query('COMMIT');
      return res.json({ ok: true });
    } catch {
      await client.query('ROLLBACK').catch(() => undefined);
      return res.status(500).json({ error: 'payment_webhook_processing_failed' });
    } finally { client.release(); }
  });

  app.get('/api/resorts/:id/booking-availability', authRateLimit(120, 60_000), async (req, res) => {
    const resortId = text(req.params.id, 140);
    const profile = await pool.query("SELECT resort_booking_enabled,resort_booking_default_capacity,resort_booking_min_notice_days,resort_booking_timezone FROM app_profiles WHERE id=$1 AND lower(account_type)='resort'", [resortId]);
    if (!profile.rows.length) return res.status(404).json({ error: 'resort_not_found' });
    const slots = await pool.query(`SELECT to_char(a.booking_date,'YYYY-MM-DD') date,a.capacity,a.is_open,COALESCE(b.reserved,0)::int reserved
      FROM app_resort_booking_availability a LEFT JOIN (SELECT day::date booking_date,SUM(participants)::int reserved FROM app_resort_bookings CROSS JOIN LATERAL generate_series(booking_date,COALESCE(booking_end_date,booking_date),'1 day') day WHERE resort_id=$1 AND status IN ('pending','confirmed') GROUP BY day)b USING(booking_date)
      WHERE a.resort_id=$1 AND a.booking_date>=CURRENT_DATE ORDER BY a.booking_date LIMIT 180`, [resortId]);
    return res.json({ ok: true, bookingEnabled: profile.rows[0].resort_booking_enabled, defaultCapacity: profile.rows[0].resort_booking_default_capacity, minNoticeDays: profile.rows[0].resort_booking_min_notice_days, timezone: profile.rows[0].resort_booking_timezone, currency: 'USD', refundPolicy: REFUND_POLICY, slots: slots.rows });
  });

  app.get('/api/resort-bookings/me', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const q = await pool.query(`${SELECT_BOOKING} WHERE b.user_id=$1 ORDER BY b.created_at DESC`, [String(userId)]);
      return res.json({ ok: true, bookings: q.rows.map(mapBooking) });
    } catch (error) { return res.status(500).json({ error: 'resort_bookings_read_failed', detail: String(error?.message || error) }); }
  });

  app.get('/api/resort-bookings/:id', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const q = await pool.query(`${SELECT_BOOKING} WHERE b.id=$1 AND b.user_id=$2`, [text(req.params.id, 140), String(userId)]);
      if (!q.rows.length) return res.status(404).json({ error: 'resort_booking_not_found' });
      return res.json({ ok: true, booking: mapBooking(q.rows[0]) });
    } catch (error) {
      return res.status(500).json({ error: 'resort_booking_read_failed', detail: String(error?.message || error) });
    }
  });

  app.post('/api/resort-bookings', authRateLimit(10, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const resortId = text(req.body?.resortId, 140);
    const bookingDate = text(req.body?.bookingDate, 10);
    const bookingEndDate = text(req.body?.bookingEndDate, 10) || bookingDate;
    const participants = Number(req.body?.participants || 1);
    const applicantName = text(req.body?.applicantName, 120);
    const contactPhone = normalizeInternationalPhone(text(req.body?.contactPhone, 80));
    const contactEmail = text(req.body?.contactEmail, 200);
    const termsAccepted = req.body?.bookingTermsAccepted === true;
    if (!contactPhone) {
      return res.status(400).json({ error: 'invalid_resort_booking_phone' });
    }
    try { bookingDateRange(bookingDate, bookingEndDate); } catch { return res.status(400).json({ error: 'invalid_resort_booking_date_range' }); }
    if (!resortId || !validDate(bookingDate) || !validDate(bookingEndDate) || !Number.isInteger(participants) || participants < 1 || participants > 50 || !applicantName || !termsAccepted) {
      return res.status(400).json({ error: 'invalid_resort_booking' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const resort = { rows: [await reserveCapacity(client, resortId, bookingDate, participants, bookingEndDate)] };
      const priceId = text(req.body?.priceId, 140) || null;
      if (priceId) {
        const price = await client.query('SELECT id FROM app_resort_prices WHERE id=$1 AND resort_id=$2 AND is_active=true', [priceId, resortId]);
        if (!price.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'invalid_resort_booking_price' }); }
      }
      const duplicate = await client.query("SELECT 1 FROM app_resort_bookings WHERE user_id=$1 AND resort_id=$2 AND booking_date<=$4 AND booking_end_date>=$3 AND status IN ('pending','confirmed') LIMIT 1", [String(userId), resortId, bookingDate, bookingEndDate]);
      if (duplicate.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'duplicate_resort_booking' }); }
      const id = `rb_${crypto.randomUUID()}`;
      const bookingNumber = createBookingNumber();
      const depositAmount = Math.max(0, Number(resort.rows[0].resort_booking_deposit_amount) || 0);
      const depositCurrency = 'USD';
      const depositStatus = depositAmount > 0 ? 'pending' : 'waived';
      const q = await client.query(`INSERT INTO app_resort_bookings(id,booking_number,resort_id,user_id,price_id,booking_date,booking_end_date,participants,dive_type,applicant_name,contact_phone,contact_email,note,deposit_amount,deposit_currency,deposit_status,booking_terms_accepted,booking_policy_accepted_at,refund_policy_version,refund_policy_snapshot)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,now(),$17,$18::jsonb) RETURNING *`, [id, bookingNumber, resortId, String(userId), priceId, bookingDate, bookingEndDate, participants, text(req.body?.diveType, 60) || 'fun_diving', applicantName, contactPhone, contactEmail, text(req.body?.note, 2000), depositAmount, depositCurrency, depositStatus, REFUND_POLICY.version, JSON.stringify(REFUND_POLICY)]);
      await client.query(`INSERT INTO app_resort_booking_history(booking_id,actor_user_id,action,to_status,snapshot) VALUES($1,$2,'created','pending',$3::jsonb)`, [id, String(userId), JSON.stringify(q.rows[0])]);
      await client.query('COMMIT');
      const result = await pool.query(`${SELECT_BOOKING} WHERE b.id=$1`, [id]);
      return res.status(201).json({ ok: true, booking: mapBooking(result.rows[0]) });
    } catch (error) { await client.query('ROLLBACK'); return res.status(error.status || 400).json({ error: error.status ? error.message : 'resort_booking_create_failed' }); }
    finally { client.release(); }
  });

  app.post('/api/resort-bookings/:id/payments/:paymentMethod/authorize', authRateLimit(5, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!paymentConfig.enabled) return res.status(503).json({ error: 'resort_payment_provider_not_configured' });

    let idempotencyKey;
    const paymentMethod = text(req.params.paymentMethod, 30).replaceAll('-', '_');
    if (!['apple_pay', 'google_pay'].includes(paymentMethod) || !paymentConfig[paymentMethod === 'apple_pay' ? 'applePay' : 'googlePay']?.enabled) {
      return res.status(400).json({ error: 'unsupported_payment_method' });
    }
    let walletToken;
    try {
      idempotencyKey = validateIdempotencyKey(req.get('idempotency-key') || req.body?.idempotencyKey);
      walletToken = paymentMethod === 'apple_pay'
        ? validateApplePayToken(req.body?.applePayToken)
        : validateGooglePayToken(req.body?.googlePayToken);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }

    const bookingId = text(req.params.id, 140);
    const transactionIdentifier = text(req.body?.transactionIdentifier, 200);
    const client = await pool.connect();
    let paymentIntent;
    try {
      await client.query('BEGIN');
      const booking = await client.query('SELECT * FROM app_resort_bookings WHERE id=$1 AND user_id=$2 FOR UPDATE', [bookingId, String(userId)]);
      if (!booking.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'resort_booking_not_found' });
      }
      const row = booking.rows[0];
      if (!['pending', 'confirmed'].includes(row.status)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'resort_booking_payment_not_allowed' });
      }
      if (row.deposit_status === 'paid') {
        await client.query('ROLLBACK');
        return res.json({ ok: true, alreadyProcessed: true, status: 'succeeded' });
      }
      const amount = Number(row.deposit_amount || 0);
      if (!Number.isFinite(amount) || amount <= 0 || row.deposit_currency !== 'USD') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'resort_booking_deposit_not_payable' });
      }
      const existing = await client.query('SELECT * FROM app_resort_payment_intents WHERE user_id=$1 AND idempotency_key=$2', [String(userId), idempotencyKey]);
      if (existing.rows.length) {
        await client.query('ROLLBACK');
        const previous = existing.rows[0];
        if (previous.booking_id !== bookingId || Number(previous.amount) !== amount || previous.currency !== row.deposit_currency) {
          return res.status(409).json({ error: 'payment_idempotency_conflict' });
        }
        return res.status(previous.status === 'succeeded' ? 200 : 409).json({
          ok: previous.status === 'succeeded', alreadyProcessed: true, status: previous.status,
          paymentIntentId: previous.id,
        });
      }
      const id = `rpi_${crypto.randomUUID()}`;
      const inserted = await client.query(`INSERT INTO app_resort_payment_intents
        (id,booking_id,user_id,provider,payment_method,idempotency_key,amount,currency,status,token_fingerprint,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'processing',$9,$10::jsonb) RETURNING *`, [
        id, bookingId, String(userId), paymentConfig.provider, paymentMethod, idempotencyKey, amount.toFixed(2), row.deposit_currency,
        paymentTokenFingerprint(walletToken), JSON.stringify({ transactionIdentifier }),
      ]);
      paymentIntent = inserted.rows[0];
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      return res.status(500).json({ error: 'resort_payment_intent_create_failed' });
    } finally {
      client.release();
    }

    try {
      const gatewayResult = await authorizeWalletWithGateway(paymentConfig, paymentMethod, {
        paymentIntentId: paymentIntent.id,
        bookingId,
        amount: Number(paymentIntent.amount).toFixed(2),
        currency: paymentIntent.currency,
        walletToken,
        ...(paymentMethod === 'apple_pay' ? { applePayToken: walletToken } : { googlePayToken: walletToken }),
        transactionIdentifier,
        idempotencyKey,
      });
      const finalize = await pool.connect();
      try {
        await finalize.query('BEGIN');
        const locked = await finalize.query('SELECT * FROM app_resort_payment_intents WHERE id=$1 FOR UPDATE', [paymentIntent.id]);
        if (!locked.rows.length || !canTransitionPayment(locked.rows[0].status, 'succeeded')) throw new Error('invalid_payment_transition');
        await finalize.query(`UPDATE app_resort_payment_intents SET status='succeeded',provider_intent_id=$2,provider_payment_id=$3,receipt_url=$4,processed_at=now(),updated_at=now() WHERE id=$1`, [paymentIntent.id, gatewayResult.providerIntentId, gatewayResult.providerPaymentId, gatewayResult.receiptUrl]);
        const paid = await finalize.query(`UPDATE app_resort_bookings SET deposit_status='paid',payment_reference=$2,deposit_paid_at=now(),updated_at=now() WHERE id=$1 AND deposit_status='pending' RETURNING *`, [bookingId, gatewayResult.providerPaymentId || paymentIntent.id]);
        if (!paid.rows.length) throw new Error('booking_payment_state_changed');
        await finalize.query(`INSERT INTO app_resort_booking_history(booking_id,actor_user_id,action,from_status,to_status,snapshot) VALUES($1,$2,'deposit_paid',$3,$3,$4::jsonb)`, [bookingId, String(userId), paid.rows[0].status, JSON.stringify({ paymentIntentId: paymentIntent.id, amount: paymentIntent.amount, currency: paymentIntent.currency })]);
        await finalize.query('COMMIT');
      } catch (error) {
        await finalize.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        finalize.release();
      }
      return res.json({ ok: true, status: 'succeeded', paymentIntentId: paymentIntent.id, receiptUrl: gatewayResult.receiptUrl });
    } catch (error) {
      await pool.query(`UPDATE app_resort_payment_intents SET status='failed',failure_code=$2,failure_message=$3,processed_at=now(),updated_at=now() WHERE id=$1 AND status='processing'`, [paymentIntent.id, text(error.gatewayCode || error.message, 100), text(error.message, 500)]).catch(() => undefined);
      return res.status(error.status || 502).json({ error: 'resort_payment_authorization_failed', paymentIntentId: paymentIntent.id });
    }
  });

  app.post('/api/resort-payments/webhooks/gateway', async (req, res) => {
    if (!paymentConfig.enabled) return res.status(503).json({ error: 'resort_payment_provider_not_configured' });
    if (!verifyGatewaySignature(req.rawBody, req.get('x-divergram-signature'), paymentConfig.webhookSecret)) {
      return res.status(401).json({ error: 'invalid_payment_webhook_signature' });
    }
    const eventId = text(req.body?.eventId, 200);
    const paymentIntentId = text(req.body?.paymentIntentId, 140);
    const eventType = text(req.body?.type, 100);
    const nextStatus = text(req.body?.status, 30);
    if (!eventId || !paymentIntentId || !['succeeded', 'failed', 'refunded'].includes(nextStatus)) {
      return res.status(400).json({ error: 'invalid_payment_webhook' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const intent = await client.query('SELECT * FROM app_resort_payment_intents WHERE id=$1 FOR UPDATE', [paymentIntentId]);
      if (!intent.rows.length || !canTransitionPayment(intent.rows[0].status, nextStatus)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'invalid_payment_transition' });
      }
      const event = await client.query(`INSERT INTO app_resort_payment_events(payment_intent_id,provider,provider_event_id,event_type,payload_hash,payload)
        VALUES($1,'gateway',$2,$3,$4,$5::jsonb) ON CONFLICT(provider,provider_event_id) DO NOTHING RETURNING id`, [paymentIntentId, eventId, eventType, crypto.createHash('sha256').update(req.rawBody).digest('hex'), JSON.stringify({ eventId, paymentIntentId, type: eventType, status: nextStatus })]);
      if (!event.rows.length) {
        await client.query('COMMIT');
        return res.json({ ok: true, duplicate: true });
      }
      const providerPaymentId = text(req.body?.providerPaymentId, 200);
      const receiptUrl = text(req.body?.receiptUrl, 1000);
      await client.query(`UPDATE app_resort_payment_intents SET status=$2,provider_payment_id=COALESCE(NULLIF($3,''),provider_payment_id),receipt_url=COALESCE(NULLIF($4,''),receipt_url),processed_at=now(),updated_at=now() WHERE id=$1`, [paymentIntentId, nextStatus, providerPaymentId, receiptUrl]);
      if (nextStatus === 'succeeded') {
        await client.query(`UPDATE app_resort_bookings SET deposit_status='paid',payment_reference=$2,deposit_paid_at=COALESCE(deposit_paid_at,now()),updated_at=now() WHERE id=$1 AND deposit_status='pending'`, [intent.rows[0].booking_id, providerPaymentId || paymentIntentId]);
      } else if (nextStatus === 'refunded') {
        await client.query(`UPDATE app_resort_bookings SET deposit_status='refunded',refund_processed_at=COALESCE(refund_processed_at,now()),updated_at=now() WHERE id=$1 AND deposit_status IN ('paid','refund_requested','partially_refunded')`, [intent.rows[0].booking_id]);
      }
      await client.query('UPDATE app_resort_payment_events SET processed_at=now() WHERE id=$1', [event.rows[0].id]);
      await client.query('COMMIT');
      return res.json({ ok: true });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      return res.status(500).json({ error: 'payment_webhook_processing_failed' });
    } finally {
      client.release();
    }
  });

  app.patch('/api/resort-bookings/:id/cancel', authRateLimit(10, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const before = await client.query('SELECT * FROM app_resort_bookings WHERE id=$1 AND user_id=$2 FOR UPDATE', [text(req.params.id, 140), String(userId)]);
      if (!before.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'resort_booking_not_found' }); }
      if (before.rows[0].status !== 'pending' || before.rows[0].deposit_status === 'paid') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'resort_booking_cancellation_not_allowed' }); }
      const cancellationType = getCancellationType(before.rows[0].deposit_status);
      const q = await client.query("UPDATE app_resort_bookings SET status='cancelled',cancellation_type=$2,cancelled_at=now(),updated_at=now() WHERE id=$1 RETURNING *", [before.rows[0].id, cancellationType]);
      await client.query(`INSERT INTO app_resort_booking_history(booking_id,actor_user_id,action,from_status,to_status,snapshot) VALUES($1,$2,'user_cancelled','pending','cancelled',$3::jsonb)`, [q.rows[0].id, String(userId), JSON.stringify(q.rows[0])]);
      await client.query('COMMIT');
      const result = await pool.query(`${SELECT_BOOKING} WHERE b.id=$1`, [q.rows[0].id]);
      return res.json({ ok: true, booking: mapBooking(result.rows[0]) });
    } catch (error) { await client.query('ROLLBACK'); return res.status(500).json({ error: 'resort_booking_cancel_failed', detail: String(error?.message || error) }); }
    finally { client.release(); }
  });

  app.post('/api/resort-bookings/:id/refund-request', authRateLimit(5, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const before = await client.query('SELECT * FROM app_resort_bookings WHERE id=$1 AND user_id=$2 FOR UPDATE', [text(req.params.id, 140), String(userId)]);
      if (!before.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'resort_booking_not_found' }); }
      const row = before.rows[0];
      if (!['pending', 'confirmed'].includes(row.status) || row.deposit_status !== 'paid' || row.refund_requested_at) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'resort_booking_refund_not_allowed' }); }
      const refund = calculateRefund(row.deposit_amount, row.booking_date);
      const reason = text(req.body?.reason, 1000);
      const updated = await client.query(`UPDATE app_resort_bookings SET deposit_status='refund_requested',refund_requested_at=now(),refund_reason=$2,refund_amount=$3,updated_at=now() WHERE id=$1 RETURNING *`, [row.id, reason, refund.refundAmount]);
      await client.query(`INSERT INTO app_resort_booking_history(booking_id,actor_user_id,action,from_status,to_status,note,snapshot) VALUES($1,$2,'refund_requested',$3,$3,$4,$5::jsonb)`, [row.id, String(userId), row.status, reason, JSON.stringify({ ...updated.rows[0], refundCalculation: refund })]);
      await client.query('COMMIT'); return res.json({ ok: true, refund });
    } catch (error) { await client.query('ROLLBACK'); return res.status(500).json({ error: 'resort_booking_refund_request_failed', detail: String(error?.message || error) }); }
    finally { client.release(); }
  });

  app.patch('/api/admin/resorts/booking/bulk', requireAdmin, async (req, res) => {
    const ids = Array.from(new Set((Array.isArray(req.body?.resortIds) ? req.body.resortIds : []).map((v) => text(v, 140)).filter(Boolean))).slice(0, 300);
    if (!ids.length || typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'invalid_resort_booking_bulk_update' });
    const q = await pool.query("UPDATE app_profiles SET resort_booking_enabled=$1 WHERE id=ANY($2::text[]) AND lower(account_type)='resort' RETURNING id", [req.body.enabled, ids]);
    return res.json({ ok: true, updated: q.rowCount });
  });

  app.get('/api/admin/resort-bookings', requireAdmin, async (req, res) => {
    const values = []; const where = [];
    const status = text(req.query?.status, 30); const query = text(req.query?.q, 120);
    if (status && STATUSES.has(status)) { values.push(status); where.push(`b.status=$${values.length}`); }
    if (query) { values.push(`%${query}%`); where.push(`concat_ws(' ',b.booking_number,p.full_name,b.applicant_name,b.contact_email,b.contact_phone,u.email) ILIKE $${values.length}`); }
    const q = await pool.query(`${SELECT_BOOKING} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY b.created_at DESC LIMIT 300`, values);
    const counts = await pool.query('SELECT status,COUNT(*)::int count FROM app_resort_bookings GROUP BY status');
    return res.json({ ok: true, bookings: q.rows.map(mapBooking), counts: counts.rows });
  });

  app.get('/api/admin/resort-payments', requireAdmin, async (req, res) => {
    const values = []; const where = [];
    const status = text(req.query?.status, 30);
    const provider = text(req.query?.provider, 40);
    const query = text(req.query?.q, 160);
    const from = text(req.query?.from, 10);
    const to = text(req.query?.to, 10);
    if (status && ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'].includes(status)) { values.push(status); where.push(`i.status=$${values.length}`); }
    if (provider && ['paypal', 'airwallex', 'gateway'].includes(provider)) { values.push(provider); where.push(`i.provider=$${values.length}`); }
    if (query) { values.push(`%${query}%`); where.push(`concat_ws(' ',i.id,i.provider_intent_id,i.provider_payment_id,i.payer_email,i.payer_name,b.booking_number,b.applicant_name,b.contact_email,p.full_name,u.email,u.username) ILIKE $${values.length}`); }
    if (validDate(from)) { values.push(from); where.push(`i.created_at >= $${values.length}::date`); }
    if (validDate(to)) { values.push(to); where.push(`i.created_at < ($${values.length}::date + interval '1 day')`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await pool.query(`SELECT i.*,b.booking_number,b.applicant_name,b.contact_email,b.contact_phone,b.booking_date,b.booking_end_date,b.status AS booking_status,b.deposit_status,p.full_name AS resort_name,u.email AS member_email,u.username AS member_username
      FROM app_resort_payment_intents i
      JOIN app_resort_bookings b ON b.id=i.booking_id
      JOIN app_profiles p ON p.id=b.resort_id
      LEFT JOIN app_users u ON u.id::text=i.user_id
      ${whereSql}
      ORDER BY i.created_at DESC LIMIT 500`, values);
    const summary = await pool.query(`SELECT
        COUNT(*)::int AS transaction_count,
        COUNT(*) FILTER (WHERE i.status='succeeded')::int AS succeeded_count,
        COUNT(*) FILTER (WHERE i.status IN ('pending','processing'))::int AS pending_count,
        COALESCE(SUM(CASE WHEN i.status IN ('succeeded','refunded') THEN COALESCE(NULLIF(i.gross_amount,0),i.amount) ELSE 0 END),0)::numeric AS gross_sales,
        COALESCE(SUM(CASE WHEN i.status='refunded' THEN COALESCE(NULLIF(i.refunded_amount,0),i.amount) ELSE i.refunded_amount END),0)::numeric AS refunds,
        COALESCE(SUM(CASE WHEN i.status IN ('succeeded','refunded') THEN i.fee_amount ELSE 0 END),0)::numeric AS fees,
        COALESCE(SUM(CASE WHEN i.status IN ('succeeded','refunded') THEN COALESCE(NULLIF(i.net_amount,0),i.amount-i.fee_amount) ELSE 0 END),0)::numeric AS processor_net
      FROM app_resort_payment_intents i
      JOIN app_resort_bookings b ON b.id=i.booking_id
      JOIN app_profiles p ON p.id=b.resort_id
      LEFT JOIN app_users u ON u.id::text=i.user_id
      ${whereSql}`, values);
    const mapped = rows.rows.map((row) => ({
      id: row.id, bookingId: row.booking_id, bookingNumber: row.booking_number || '', userId: row.user_id,
      memberEmail: row.member_email || '', memberUsername: row.member_username || '', applicantName: row.applicant_name || '', contactEmail: row.contact_email || '', contactPhone: row.contact_phone || '',
      resortName: row.resort_name || '', bookingDate: row.booking_date, bookingEndDate: row.booking_end_date, bookingStatus: row.booking_status, depositStatus: row.deposit_status,
      provider: row.provider, paymentMethod: row.payment_method, status: row.status, amount: Number(row.amount || 0), currency: row.currency,
      grossAmount: Number(row.gross_amount || row.amount || 0), feeAmount: Number(row.fee_amount || 0), netAmount: Number(row.net_amount || row.amount || 0), refundedAmount: Number(row.refunded_amount || 0), settlementCurrency: row.settlement_currency || row.currency,
      providerOrderId: row.provider_intent_id || '', providerPaymentId: row.provider_payment_id || '', payerId: row.payer_id || '', payerEmail: row.payer_email || '', payerName: row.payer_name || '', paymentSource: row.payment_source || row.payment_method,
      failureCode: row.failure_code || '', failureMessage: row.failure_message || '', receiptUrl: row.receipt_url || '', processedAt: row.processed_at, createdAt: row.created_at, updatedAt: row.updated_at,
    }));
    const s = summary.rows[0] || {};
    const grossSales = Number(s.gross_sales || 0); const refunds = Number(s.refunds || 0);
    return res.json({ ok: true, payments: mapped, summary: { transactionCount: Number(s.transaction_count || 0), succeededCount: Number(s.succeeded_count || 0), pendingCount: Number(s.pending_count || 0), grossSales, refunds, netSales: grossSales - refunds, fees: Number(s.fees || 0), processorNet: Number(s.processor_net || 0), currency: 'USD' } });
  });

  app.patch('/api/admin/resort-bookings/:id', requireAdmin, async (req, res) => {
    const status = text(req.body?.status, 30);
    const depositStatus = text(req.body?.depositStatus, 30);
    if (!STATUSES.has(status) || status === 'cancelled') return res.status(400).json({ error: 'invalid_resort_booking_status' });
    if (!DEPOSIT_STATUSES.has(depositStatus)) return res.status(400).json({ error: 'invalid_resort_booking_deposit_status' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const before = await client.query('SELECT *, booking_date <= CURRENT_DATE AS no_show_eligible FROM app_resort_bookings WHERE id=$1 FOR UPDATE', [text(req.params.id, 140)]);
      if (!before.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'resort_booking_not_found' }); }
      if (['pending', 'confirmed'].includes(status) && !['pending', 'confirmed'].includes(before.rows[0].status)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'resort_booking_reopen_requires_new_booking' });
      }
      if (status === 'no_show' && (!['paid', 'waived'].includes(depositStatus) || before.rows[0].status !== 'confirmed' || before.rows[0].no_show_eligible !== true)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'no_show_transition_not_allowed' });
      }
      const q = await client.query(`UPDATE app_resort_bookings SET status=$2,admin_note=$3,deposit_status=$4,payment_reference=$5,deposit_paid_at=CASE WHEN $4='paid' THEN COALESCE(deposit_paid_at,now()) ELSE deposit_paid_at END,refund_processed_at=CASE WHEN $4 IN ('refunded','partially_refunded') THEN COALESCE(refund_processed_at,now()) ELSE refund_processed_at END,confirmed_at=CASE WHEN $2='confirmed' THEN COALESCE(confirmed_at,now()) ELSE confirmed_at END,no_show_at=CASE WHEN $2='no_show' THEN COALESCE(no_show_at,now()) ELSE no_show_at END,updated_at=now() WHERE id=$1 RETURNING *`, [before.rows[0].id, status, text(req.body?.adminNote, 2000), depositStatus, text(req.body?.paymentReference, 200)]);
      await client.query(`INSERT INTO app_resort_booking_history(booking_id,actor_user_id,action,from_status,to_status,note,snapshot) VALUES($1,$2,'admin_updated',$3,$4,$5,$6::jsonb)`, [q.rows[0].id, text(req.adminAuth?.userId, 120) || null, before.rows[0].status, status, q.rows[0].admin_note, JSON.stringify(q.rows[0])]);
      await client.query('COMMIT'); return res.json({ ok: true, booking: mapBooking(q.rows[0]) });
    } catch (error) { await client.query('ROLLBACK'); return res.status(500).json({ error: 'admin_resort_booking_update_failed', detail: String(error?.message || error) }); }
    finally { client.release(); }
  });
}
