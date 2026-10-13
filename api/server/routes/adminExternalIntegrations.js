import crypto from 'node:crypto';
import fs from 'node:fs';
import nodemailer from 'nodemailer';

const CACHE_MS = 45_000;
let cached = null;
let cachedAt = 0;
let inFlight = null;
let cacheVersion = 0;

export function invalidateExternalIntegrationCache() { cached = null; cachedAt = 0; cacheVersion++; }

const text = (value) => String(value || '').trim();
const configured = (...names) => names.every((name) => Boolean(text(process.env[name])));
const optionalFileReady = (envName) => {
  const filePath = text(process.env[envName]);
  if (!filePath) return false;
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

function item(id, name, category, status, detail, extra = {}) {
  return { id, name, category, status, detail, ...extra };
}

async function timed(label, task, timeoutMs = 5_000) {
  const startedAt = Date.now();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs);
    timer.unref?.();
  });
  try {
    const value = await Promise.race([task(), timeout]);
    return { ok: true, latencyMs: Date.now() - startedAt, value };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - startedAt, error: String(error?.message || error) };
  } finally { clearTimeout(timer); }
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function probeFcm() {
  const jsonValue = text(process.env.FCM_SERVICE_ACCOUNT_JSON);
  const filePath = text(process.env.FCM_SERVICE_ACCOUNT_PATH);
  if (!jsonValue && !filePath) return { configured: false };
  const raw = jsonValue || fs.readFileSync(filePath, 'utf8');
  const account = JSON.parse(raw);
  if (!account.client_email || !account.private_key || !account.project_id) throw new Error('invalid_service_account');
  const now = Math.floor(Date.now() / 1000);
  const head = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 600,
  }));
  const unsigned = `${head}.${claims}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), account.private_key).toString('base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    signal: AbortSignal.timeout(4500),
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  if (!response.ok) throw new Error(`fcm_auth_${response.status}`);
  return { configured: true, projectId: account.project_id };
}

async function probeInfobip(path) {
  const base = text(process.env.INFOBIP_BASE_URL).replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!base || !text(process.env.INFOBIP_API_KEY)) return { configured: false };
  const response = await fetch(`https://${base}${path}`, {
    signal: AbortSignal.timeout(4500),
    method: 'POST',
    headers: { authorization: `App ${process.env.INFOBIP_API_KEY}`, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ messages: [] }),
  });
  const body = await response.json().catch(() => ({}));
  const validationOnly = response.status === 400 && JSON.stringify(body).toLowerCase().includes('messages');
  if (!response.ok && !validationOnly) throw new Error(`infobip_auth_${response.status}`);
  return { configured: true, authenticated: true };
}

async function probeOpenAi() {
  const key = text(process.env.OPENAI_API_KEY);
  if (!key) return { configured: false };
  const response = await fetch('https://api.openai.com/v1/models', { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(4500) });
  if (!response.ok) throw new Error(`openai_auth_${response.status}`);
  return { configured: true, authenticated: true };
}

async function probeSmtp() {
  if (!configured('SMTP_HOST', 'SMTP_USER', 'SMTP_PASS')) return { configured: false };
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.verify();
  return { configured: true, authenticated: true };
}

async function buildReport(pool) {
  const [fcm, sms, email, smtp, openai, database] = await Promise.all([
    timed('fcm', probeFcm),
    timed('infobip_sms', () => probeInfobip('/sms/3/messages')),
    timed('infobip_email', () => probeInfobip('/email/4/messages')),
    timed('smtp', probeSmtp),
    timed('openai', probeOpenAi),
    timed('database', async () => {
      const result = await pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM app_device_tokens WHERE is_active=true) AS active_tokens,
          (SELECT COUNT(*)::int FROM app_notifications WHERE created_at >= now() - interval '30 days' AND delivery_status='sent') AS sent_30d,
          (SELECT COUNT(*)::int FROM app_notifications WHERE created_at >= now() - interval '30 days' AND delivery_status='no_token') AS no_token_30d
      `);
      return result.rows[0];
    }, 3_000),
  ]);

  const live = (probe, okDetail, missingDetail) => {
    if (probe.ok && probe.value?.configured) return { status: 'operational', detail: okDetail, latencyMs: probe.latencyMs };
    if (probe.ok) return { status: 'not_configured', detail: missingDetail, latencyMs: probe.latencyMs };
    return { status: 'degraded', detail: probe.error, latencyMs: probe.latencyMs };
  };
  const configState = (ready, detail, missingDetail, extra = {}) => ({
    status: ready ? 'configured' : 'not_configured',
    detail: ready ? detail : missingDetail,
    ...extra,
  });

  const dbStats = database.ok ? database.value : {};
  const integrations = [
    item('api', 'Divergram API', 'core', 'operational', '관리자 진단 API 응답 정상', { checkType: 'live' }),
    item('database', 'PostgreSQL', 'core', database.ok ? 'operational' : 'degraded', database.ok ? '운영 데이터베이스 조회 정상' : database.error, { checkType: 'live', latencyMs: database.latencyMs }),
    item('fcm', 'Firebase Cloud Messaging', 'messaging', live(fcm, `인증 정상 · 활성 토큰 ${dbStats.active_tokens || 0}개`, '서비스 계정 미설정').status, live(fcm, `인증 정상 · 활성 토큰 ${dbStats.active_tokens || 0}개`, '서비스 계정 미설정').detail, { checkType: 'live', latencyMs: fcm.latencyMs, metrics: { activeTokens: dbStats.active_tokens || 0, sent30d: dbStats.sent_30d || 0, noToken30d: dbStats.no_token_30d || 0 } }),
    item('infobip-sms', 'Infobip SMS', 'messaging', live(sms, 'SMS API 인증 및 발송 권한 정상', 'SMS API 미설정').status, live(sms, 'SMS API 인증 및 발송 권한 정상', 'SMS API 미설정').detail, { checkType: 'live', latencyMs: sms.latencyMs }),
    item('infobip-email', 'Infobip Email', 'messaging', live(email, 'Email API 인증 정상', 'Email API 미설정').status, live(email, 'Email API 인증 정상', 'Email API 미설정').detail, { checkType: 'live', latencyMs: email.latencyMs }),
    item('smtp', 'SMTP Email', 'messaging', live(smtp, 'SMTP 연결 및 인증 정상', 'SMTP 미설정').status, live(smtp, 'SMTP 연결 및 인증 정상', 'SMTP 미설정').detail, { checkType: 'live', latencyMs: smtp.latencyMs }),
    item('openai', 'OpenAI', 'ai', live(openai, 'API 키 인증 정상', 'API 키 미설정').status, live(openai, 'API 키 인증 정상', 'API 키 미설정').detail, { checkType: 'live', latencyMs: openai.latencyMs }),
    item('cloudinary', 'Cloudinary', 'media', ...Object.values(configState(configured('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'), '서명 업로드 사용 가능', '미설정 · 자체 서버 업로드 사용 중')).slice(0, 2), { checkType: 'configuration' }),
    item('stormglass', 'Stormglass', 'data', ...Object.values(configState(Boolean(text(process.env.STORMGLASS_API_KEY)), '실시간 해양 날씨 키 설정됨', '미설정 · 캐시/대체 데이터 사용')).slice(0, 2), { checkType: 'configuration' }),
    item('google-maps', 'Google Maps', 'data', ...Object.values(configState(Boolean(text(process.env.GOOGLE_MAPS_API_KEY)), '서버 API 키 설정됨', '서버 API 키 미설정')).slice(0, 2), { checkType: 'configuration' }),
    item('google-login', 'Google Login', 'auth', ...Object.values(configState(configured('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'), 'OAuth 서버 설정 완료', 'OAuth 서버 설정 누락')).slice(0, 2), { checkType: 'configuration' }),
    item('apple-login', 'Apple Login', 'auth', ...Object.values(configState(configured('APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'), 'Sign in with Apple 설정 완료', 'Apple 로그인 설정 누락')).slice(0, 2), { checkType: 'configuration' }),
    item('facebook-login', 'Facebook Login', 'auth', ...Object.values(configState(configured('FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'), 'OAuth 서버 설정 완료', 'OAuth 서버 설정 누락')).slice(0, 2), { checkType: 'configuration' }),
    item('instagram', 'Instagram', 'auth', ...Object.values(configState(configured('INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET'), '서버 OAuth 설정 완료', '서버 OAuth 설정 누락')).slice(0, 2), { checkType: 'configuration' }),
    item('threads', 'Threads', 'auth', ...Object.values(configState(configured('THREADS_APP_ID', 'THREADS_APP_SECRET'), '서버 OAuth 설정 완료', '미설정')).slice(0, 2), { checkType: 'configuration' }),
    item('naver', 'Naver Login', 'auth', ...Object.values(configState(configured('NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET'), '서버 OAuth 설정 완료', '서버 설정 없음 · 앱 설정 확인 필요')).slice(0, 2), { checkType: 'configuration' }),
    item('kakao', 'Kakao Login', 'auth', ...Object.values(configState(Boolean(text(process.env.KAKAO_REST_API_KEY)), 'REST API 키 설정됨', '서버 설정 없음 · 앱 설정 확인 필요')).slice(0, 2), { checkType: 'configuration' }),
    item('apple-iap', 'Apple In-App Purchase', 'payments', ...Object.values(configState(configured('APPLE_IAP_ISSUER_ID', 'APPLE_IAP_KEY_ID') && (Boolean(text(process.env.APPLE_IAP_PRIVATE_KEY)) || optionalFileReady('APPLE_IAP_PRIVATE_KEY_PATH')), '검증 자격 증명 준비됨', '검증 자격 증명 누락')).slice(0, 2), { checkType: 'configuration' }),
    item('google-iap', 'Google Play Billing', 'payments', ...Object.values(configState(Boolean(text(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)) || optionalFileReady('GOOGLE_PLAY_SERVICE_ACCOUNT_PATH'), '검증 서비스 계정 준비됨', '검증 서비스 계정 누락')).slice(0, 2), { checkType: 'configuration' }),
    item('paypal', 'PayPal', 'payments', ...Object.values(configState(
      configured('PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET', 'PAYPAL_SANDBOX_WEBHOOK_ID')
        || configured('PAYPAL_LIVE_CLIENT_ID', 'PAYPAL_LIVE_CLIENT_SECRET', 'PAYPAL_LIVE_WEBHOOK_ID'),
      `예약결제 자격증명 설정됨 · Sandbox ${configured('PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET', 'PAYPAL_SANDBOX_WEBHOOK_ID') ? '완료' : '미완료'} · Live ${configured('PAYPAL_LIVE_CLIENT_ID', 'PAYPAL_LIVE_CLIENT_SECRET', 'PAYPAL_LIVE_WEBHOOK_ID') ? '완료' : '미완료'}`,
      'Sandbox 또는 Live의 Client ID, Secret, Webhook ID를 설정해 주세요.',
    )).slice(0, 2), { checkType: 'configuration' }),
    item('sentry', 'Sentry', 'observability', ...Object.values(configState(Boolean(text(process.env.SENTRY_DSN)), '서버 오류 수집 설정됨', '서버 DSN 미설정 · 앱 설정과 별도')).slice(0, 2), { checkType: 'configuration' }),
  ];

  const counts = integrations.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  return { ok: true, checkedAt: new Date().toISOString(), counts, integrations };
}

export function registerAdminExternalIntegrationRoutes(app, { pool, requireAdmin }) {
  app.get('/api/admin/external-integrations', requireAdmin, async (req, res) => {
    try {
      const force = String(req.query.refresh || '') === '1';
      if (!force && cached && Date.now() - cachedAt < CACHE_MS) return res.json({ ...cached, cached: true });
      if (!inFlight || inFlight.version !== cacheVersion) {
        const version = cacheVersion;
        const promise = buildReport(pool);
        inFlight = { version, promise };
        void promise.finally(() => { if (inFlight?.promise === promise) inFlight = null; }).catch(() => undefined);
      }
      const request = inFlight;
      const report = await request.promise;
      if (request.version === cacheVersion) { cached = report; cachedAt = Date.now(); }
      return res.json({ ...report, cached: false });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'external_integration_check_failed', detail: String(error?.message || error) });
    }
  });
}
