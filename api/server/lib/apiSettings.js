import { decryptSensitiveJson, encryptSensitiveJson } from './dataEncryption.js';

export const API_SERVICE_CATALOG = [
  { id: 'fcm', name: 'Firebase Cloud Messaging', category: '메시징', description: 'iOS·Android 푸시 전송', docsUrl: 'https://console.firebase.google.com/', fields: [
    ['FCM_SERVICE_ACCOUNT_JSON', '서비스 계정 JSON', true, 'textarea'], ['FCM_SERVICE_ACCOUNT_PATH', '서비스 계정 파일 경로', false, 'text'], ['FCM_ALL_USERS_TOPIC', '전체 회원 토픽', false, 'text'],
  ] },
  { id: 'infobip', name: 'Infobip', category: '메시징', description: 'SMS·이메일 인증 및 사용량', docsUrl: 'https://portal.infobip.com/', callbacks: [
    { id: 'billing', label: 'Billing Callback URL', kind: '사용량 콜백', base: 'api', path: '/api/integrations/infobip/billing/callback', note: 'Infobip 사용량 조회 요청에 서버가 인증 토큰을 자동으로 추가합니다.' },
  ], fields: [
    ['INFOBIP_BASE_URL', 'Base URL', false, 'text'], ['INFOBIP_API_KEY', 'API Key', true, 'password'], ['INFOBIP_SMS_SENDER', 'SMS 발신자', false, 'text'], ['INFOBIP_EMAIL_SENDER', '이메일 발신자', false, 'text'], ['INFOBIP_BILLING_CALLBACK_TOKEN', 'Billing Callback Token', true, 'password'],
  ] },
  { id: 'smtp', name: 'SMTP Email', category: '메시징', description: 'Infobip 장애 시 이메일 대체 발송', fields: [
    ['SMTP_HOST', '호스트', false, 'text'], ['SMTP_PORT', '포트', false, 'number'], ['SMTP_USER', '사용자', false, 'text'], ['SMTP_PASS', '비밀번호', true, 'password'], ['SMTP_FROM', '발신 주소', false, 'text'],
  ] },
  { id: 'openai', name: 'OpenAI', category: 'AI', description: '번역·해양생물·이미지 분석', docsUrl: 'https://platform.openai.com/api-keys', fields: [
    ['OPENAI_API_KEY', 'API Key', true, 'password'], ['OPENAI_MODEL', '기본 모델', false, 'text'], ['OPENAI_TRANSLATION_MODEL', '번역 모델', false, 'text'],
  ] },
  { id: 'cloudinary', name: 'Cloudinary', category: '미디어', description: '이미지·영상 저장과 변환', docsUrl: 'https://console.cloudinary.com/', fields: [
    ['CLOUDINARY_CLOUD_NAME', 'Cloud Name', false, 'text'], ['CLOUDINARY_API_KEY', 'API Key', true, 'password'], ['CLOUDINARY_API_SECRET', 'API Secret', true, 'password'], ['CLOUDINARY_UPLOAD_PRESET', 'Upload Preset', false, 'text'],
  ] },
  { id: 'stormglass', name: 'Stormglass', category: '데이터', description: '해양 날씨·파도·조류', docsUrl: 'https://dashboard.stormglass.io/', fields: [['STORMGLASS_API_KEY', 'API Key', true, 'password']] },
  { id: 'google-maps', name: 'Google Maps', category: '데이터', description: '지도·장소 검색·지오코딩', docsUrl: 'https://console.cloud.google.com/google/maps-apis/', fields: [['GOOGLE_MAPS_API_KEY', '서버 API Key', true, 'password'], ['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', '앱 API Key', true, 'password']] },
  { id: 'google-login', name: 'Google Login', category: '로그인', description: 'Google OAuth 로그인', callbacks: [
    { id: 'oauth', label: 'Google OAuth Callback URL', kind: 'OAuth 콜백', base: 'oauth', path: '/api/auth/oauth/google/callback', note: 'Google Cloud Console의 승인된 리디렉션 URI에 등록합니다.' },
  ], fields: [['GOOGLE_CLIENT_ID', 'Client ID', false, 'text'], ['GOOGLE_CLIENT_SECRET', 'Client Secret', true, 'password']] },
  { id: 'apple-login', name: 'Apple Login', category: '로그인', description: 'Sign in with Apple', callbacks: [
    { id: 'oauth', label: 'Apple OAuth Return URL', kind: 'OAuth 콜백', base: 'oauth', path: '/api/auth/oauth/apple/callback', note: 'Apple Service ID의 Return URLs에 등록합니다.' },
  ], fields: [['APPLE_CLIENT_ID', 'Service ID', false, 'text'], ['APPLE_TEAM_ID', 'Team ID', false, 'text'], ['APPLE_KEY_ID', 'Key ID', false, 'text'], ['APPLE_PRIVATE_KEY', 'Private Key', true, 'textarea']] },
  { id: 'facebook-login', name: 'Facebook Login', category: '로그인', description: 'Facebook OAuth 로그인', callbacks: [
    { id: 'oauth', label: 'Facebook OAuth Redirect URI', kind: 'OAuth 콜백', base: 'oauth', path: '/api/auth/oauth/facebook/callback', note: 'Meta 앱의 유효한 OAuth 리디렉션 URI에 등록합니다.' },
  ], fields: [['FACEBOOK_CLIENT_ID', 'App ID', false, 'text'], ['FACEBOOK_CLIENT_SECRET', 'App Secret', true, 'password']] },
  { id: 'instagram', name: 'Instagram', category: '로그인', description: 'Instagram 계정 연결', callbacks: [
    { id: 'mobile-oauth', label: 'Instagram OAuth Redirect URI', kind: 'OAuth 콜백', base: 'api', path: '/api/auth/oauth/instagram/mobile/callback', envName: 'INSTAGRAM_REDIRECT_URI', note: 'Meta 앱의 Instagram 로그인 리디렉션 URI에 등록합니다.' },
  ], fields: [['INSTAGRAM_CLIENT_ID', 'Client ID', false, 'text'], ['INSTAGRAM_CLIENT_SECRET', 'Client Secret', true, 'password'], ['INSTAGRAM_REDIRECT_URI', 'Redirect URI', false, 'url']] },
  { id: 'threads', name: 'Threads', category: '로그인', description: 'Threads 계정 연결', callbacks: [
    { id: 'oauth', label: 'Threads OAuth Redirect URI', kind: 'OAuth 콜백', base: 'oauth', path: '/api/auth/oauth/threads/callback', envName: 'THREADS_REDIRECT_URI', note: 'Meta 앱의 Threads 리디렉션 URL에 등록합니다.' },
  ], fields: [['THREADS_APP_ID', 'App ID', false, 'text'], ['THREADS_APP_SECRET', 'App Secret', true, 'password'], ['THREADS_REDIRECT_URI', 'Redirect URI', false, 'url']] },
  { id: 'naver', name: 'Naver Login', category: '로그인', description: '네이버 로그인', fields: [['NAVER_CLIENT_ID', 'Client ID', false, 'text'], ['NAVER_CLIENT_SECRET', 'Client Secret', true, 'password'], ['NAVER_REDIRECT_URI', 'Redirect URI', false, 'url']] },
  { id: 'kakao', name: 'Kakao Login', category: '로그인', description: '카카오 로그인', fields: [['KAKAO_REST_API_KEY', 'REST API Key', true, 'password'], ['KAKAO_REDIRECT_URI', 'Redirect URI', false, 'url']] },
  { id: 'apple-iap', name: 'Apple In-App Purchase', category: '결제', description: 'App Store 구독 검증', fields: [['APPLE_IAP_ISSUER_ID', 'Issuer ID', false, 'text'], ['APPLE_IAP_KEY_ID', 'Key ID', false, 'text'], ['APPLE_IAP_PRIVATE_KEY', 'Private Key', true, 'textarea'], ['APPLE_IAP_PRIVATE_KEY_PATH', 'Private Key 경로', false, 'text'], ['APPLE_IAP_ANNUAL_PRODUCT_ID', '상품 ID', false, 'text']] },
  { id: 'google-iap', name: 'Google Play Billing', category: '결제', description: 'Google Play 구독 검증', fields: [['GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', '서비스 계정 JSON', true, 'textarea'], ['GOOGLE_PLAY_SERVICE_ACCOUNT_PATH', '서비스 계정 경로', false, 'text'], ['GOOGLE_PLAY_ANNUAL_PRODUCT_ID', '연간 상품 ID', false, 'text'], ['GOOGLE_PLAY_PACKAGE_NAME', '앱 패키지 이름', false, 'text']] },
  { id: 'paypal', name: 'PayPal', category: '결제', description: '리조트 예약금 Sandbox·Live 결제', docsUrl: 'https://developer.paypal.com/dashboard/applications/', callbacks: [
    { id: 'webhook', label: 'PayPal Webhook URL', kind: '결제 웹훅', base: 'api', path: '/api/resort-payments/webhooks/paypal', note: 'Sandbox와 Live 앱에 동일한 URL을 등록하되 각각 발급된 Webhook ID를 사용합니다.' },
    { id: 'return', label: 'PayPal Return URL', kind: '결제 복귀', base: 'api', path: '/api/resort-payments/paypal/return', note: '결제 승인·취소 후 앱으로 돌아오기 위해 서버가 주문별 토큰과 함께 사용합니다.' },
  ], fields: [
    ['PAYPAL_SANDBOX_CLIENT_ID', 'Sandbox Client ID', true, 'password'],
    ['PAYPAL_SANDBOX_CLIENT_SECRET', 'Sandbox Secret', true, 'password'],
    ['PAYPAL_SANDBOX_WEBHOOK_ID', 'Sandbox Webhook ID', true, 'password'],
    ['PAYPAL_LIVE_CLIENT_ID', 'Live Client ID', true, 'password'],
    ['PAYPAL_LIVE_CLIENT_SECRET', 'Live Secret', true, 'password'],
    ['PAYPAL_LIVE_WEBHOOK_ID', 'Live Webhook ID', true, 'password'],
  ] },
  { id: 'sentry', name: 'Sentry', category: '모니터링', description: '앱·서버 오류 수집', fields: [['SENTRY_DSN', 'Server DSN', true, 'password'], ['EXPO_PUBLIC_SENTRY_DSN', 'App DSN', true, 'password'], ['SENTRY_ORG', 'Organization', false, 'text'], ['SENTRY_PROJECT', 'Project', false, 'text']] },
  { id: 'admob', name: 'Google AdMob', category: '광고', description: '앱 광고 노출', fields: [['GOOGLE_ADMOB_ANDROID_APP_ID', 'Android App ID', false, 'text'], ['GOOGLE_ADMOB_IOS_APP_ID', 'iOS App ID', false, 'text'], ['GOOGLE_ADMOB_ANDROID_BANNER_UNIT_ID', 'Android Banner Unit', false, 'text'], ['GOOGLE_ADMOB_IOS_BANNER_UNIT_ID', 'iOS Banner Unit', false, 'text']] },
];

function callbackBase(type) {
  if (type === 'oauth') return String(process.env.OAUTH_CALLBACK_BASE_URL || 'https://divergram.com').replace(/\/+$/, '');
  return String(process.env.PUBLIC_API_BASE_URL || process.env.API_PUBLIC_BASE_URL || 'https://api.divergram.com').replace(/\/+$/, '');
}

function publicCallbacks(service) {
  return (service.callbacks || []).map((callback) => ({
    id: callback.id,
    label: callback.label,
    kind: callback.kind,
    url: String((callback.envName && process.env[callback.envName]) || `${callbackBase(callback.base)}${callback.path}`).trim(),
    note: callback.note || '',
  }));
}

const baseEnvironment = new Map();
const MOBILE_BUILD_KEYS = new Set([
  'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', 'EXPO_PUBLIC_SENTRY_DSN',
  'NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET', 'NAVER_REDIRECT_URI',
  'KAKAO_REST_API_KEY', 'KAKAO_REDIRECT_URI',
  'INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET', 'INSTAGRAM_REDIRECT_URI',
  'GOOGLE_ADMOB_ANDROID_APP_ID', 'GOOGLE_ADMOB_IOS_APP_ID',
  'GOOGLE_ADMOB_ANDROID_BANNER_UNIT_ID', 'GOOGLE_ADMOB_IOS_BANNER_UNIT_ID',
]);
let baseCaptured = false;
function captureBaseEnvironment() {
  if (baseCaptured) return;
  for (const service of API_SERVICE_CATALOG) {
    for (const [envName] of service.fields) baseEnvironment.set(envName, process.env[envName]);
  }
  baseCaptured = true;
}

export async function ensureApiSettingsSchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS app_api_settings (
    service_id TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    encrypted_config TEXT NOT NULL,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}

export async function readStoredApiSettings(pool) {
  const result = await pool.query('SELECT service_id,enabled,encrypted_config,updated_by,updated_at FROM app_api_settings');
  return new Map(result.rows.map((row) => [row.service_id, { ...row, config: decryptSensitiveJson(row.encrypted_config, {}) || {} }]));
}

export function applyApiSetting(service, stored) {
  if (!service || !stored) return;
  for (const [envName] of service.fields) {
    const override = stored.config?.[envName];
    const base = baseEnvironment.get(envName);
    if (!stored.enabled) delete process.env[envName];
    else if (typeof override === 'string' && override.length) process.env[envName] = override;
    else if (base !== undefined) process.env[envName] = base;
    else delete process.env[envName];
  }
  if (service.id === 'paypal') {
    process.env.RESORT_PAYMENT_ENABLED = stored.enabled ? 'true' : 'false';
    if (stored.enabled) process.env.RESORT_PAYMENT_PROVIDER = 'paypal';
  }
}

export async function loadApiSettingsIntoEnvironment(pool) {
  captureBaseEnvironment();
  await ensureApiSettingsSchema(pool);
  const settings = await readStoredApiSettings(pool);
  for (const service of API_SERVICE_CATALOG) applyApiSetting(service, settings.get(service.id));
  return settings.size;
}

export async function saveApiSetting(pool, service, { enabled, values, updatedBy }) {
  validateApiSettingInput(service, { enabled, values });
  captureBaseEnvironment();
  const existingResult = await pool.query('SELECT enabled,encrypted_config FROM app_api_settings WHERE service_id=$1', [service.id]);
  const previous = existingResult.rows[0] ? decryptSensitiveJson(existingResult.rows[0].encrypted_config, {}) || {} : {};
  const allowed = new Set(service.fields.map(([name]) => name));
  const next = { ...previous };
  for (const [name, value] of Object.entries(values || {})) {
    if (!allowed.has(name)) continue;
    const normalized = String(value ?? '').trim();
    if (normalized) next[name] = normalized;
  }
  const encrypted = encryptSensitiveJson(next);
  if (typeof encrypted !== 'string' || !encrypted.startsWith('enc:v1:')) throw new Error('api_settings_encryption_not_configured');
  const result = await pool.query(
    `INSERT INTO app_api_settings(service_id,enabled,encrypted_config,updated_by,updated_at)
     VALUES($1,$2,$3,$4,now())
     ON CONFLICT(service_id) DO UPDATE SET enabled=EXCLUDED.enabled,encrypted_config=EXCLUDED.encrypted_config,updated_by=EXCLUDED.updated_by,updated_at=now()
     RETURNING service_id,enabled,updated_by,updated_at`,
    [service.id, enabled ?? existingResult.rows[0]?.enabled ?? true, encrypted, updatedBy || null],
  );
  const stored = { ...result.rows[0], config: next };
  applyApiSetting(service, stored);
  return stored;
}

export function publicApiService(service, stored) {
  captureBaseEnvironment();
  const fields = service.fields.map(([envName, label, sensitive, inputType]) => {
    const override = stored?.config?.[envName];
    const effective = typeof override === 'string' && override.length ? override : String(baseEnvironment.get(envName) || '');
    return {
      envName, label, sensitive, inputType,
      configured: Boolean(effective),
      requiresBuild: MOBILE_BUILD_KEYS.has(envName),
      source: override ? 'admin' : effective ? 'environment' : 'none',
      value: sensitive ? '' : effective,
      maskedValue: sensitive && effective ? '••••••••' : '',
    };
  });
  return {
    id: service.id, name: service.name, category: service.category, description: service.description,
    docsUrl: service.docsUrl || '', enabled: stored?.enabled !== false, updatedAt: stored?.updated_at || null,
    updatedBy: stored?.updated_by || '', configuredCount: fields.filter((field) => field.configured).length,
    fieldCount: fields.length, fields, callbacks: publicCallbacks(service),
  };
}

export function validateApiSettingInput(service, { enabled, values } = {}) {
  const fail = (field, reason) => { const error = new Error(`${field}: ${reason}`); error.status = 400; throw error; };
  if (enabled !== undefined && typeof enabled !== 'boolean') fail('enabled', '활성 상태가 올바르지 않습니다.');
  if (values === undefined) return;
  if (!values || typeof values !== 'object' || Array.isArray(values)) fail('values', '설정 형식이 올바르지 않습니다.');
  const allowed = new Map(service.fields.map(field => [field[0], field]));
  for (const [name, raw] of Object.entries(values)) {
    if (!allowed.has(name)) fail('field', '허용되지 않은 설정 항목입니다.');
    if (typeof raw !== 'string') fail(name, '문자열을 입력해 주세요.');
    const value = raw.trim();
    if (value.length > 32_768) fail(name, '설정값이 너무 큽니다.');
    if (!value) continue; // Blank secret inputs preserve their existing value.
    if (name.startsWith('PAYPAL_') && value.length < 8) fail(name, 'PayPal에서 복사한 전체 값을 입력해 주세요.');
    if (name === 'SMTP_PORT' && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535)) fail(name, '1~65535 사이의 포트가 필요합니다.');
    if (name.endsWith('_JSON')) {
      let parsed;
      try { parsed = JSON.parse(value); } catch { fail(name, '올바른 JSON을 입력해 주세요.'); }
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' || !parsed.client_email || !parsed.private_key || !parsed.project_id) fail(name, '서비스 계정 JSON의 필수 항목이 없습니다.');
    }
    if (allowed.get(name)[3] === 'url' || name === 'INFOBIP_BASE_URL') {
      let url;
      try { url = new URL(name === 'INFOBIP_BASE_URL' && !value.includes('://') ? `https://${value}` : value); } catch { fail(name, '올바른 HTTPS URL을 입력해 주세요.'); }
      if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) fail(name, '인증정보 없는 HTTPS URL이 필요합니다.');
      if (name === 'INFOBIP_BASE_URL' && (!url.hostname.endsWith('.api.infobip.com') || url.port || !['', '/'].includes(url.pathname) || url.search || url.hash)) fail(name, 'Infobip에서 발급한 API 호스트를 입력해 주세요.');
    }
  }
}
