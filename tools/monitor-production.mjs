import fs from 'node:fs/promises';
import process from 'node:process';

export const DEFAULT_API_BASE = 'https://api.divergram.com';
export const DEFAULT_WEB_BASE = 'https://divergram.com';

export function validateJson(check, value) {
  if (check.validator === 'health') return value?.ok === true ? '' : 'health payload does not report ok=true';
  if (check.validator === 'oauth') {
    const providers = value?.providers || {};
    if (providers.google?.enabled !== true) return 'Google OAuth is not enabled';
    if (providers.apple?.enabled !== true) return 'Apple OAuth is not enabled';
    for (const provider of ['google', 'apple']) {
      const redirect = String(providers[provider]?.redirectUri || '');
      if (!redirect.startsWith('https://api.divergram.com/')) return `${provider} redirect URI is not production HTTPS`;
    }
    return '';
  }
  if (check.validator === 'guide-list') {
    const rows = Array.isArray(value?.data) ? value.data : [];
    if (!rows.length) return 'guide list is empty';
    const item = rows[0];
    return item?.id && item?.title && item?.body && item?.coverImageUrl ? '' : 'latest guide is incomplete';
  }
  if (check.validator === 'feed-list') {
    const item = Array.isArray(value?.data) ? value.data[0] : null;
    if (!item) return 'public feed is empty';
    if (!item.id || !item.user_id) return 'latest feed item is incomplete';
    return item.caption || item.image_url || item.video_url ? '' : 'latest feed item has no content';
  }
  if (check.validator === 'reel-list') {
    const item = Array.isArray(value?.data) ? value.data[0] : null;
    if (!item) return 'public reels are empty';
    if (!item.id || item.publish_to_reels !== true) return 'latest reel is incomplete';
    return item.video_url ? '' : 'latest reel has no video';
  }
  if (check.validator === 'resort-list') {
    const item = Array.isArray(value?.data) ? value.data[0] : null;
    if (!item) return 'public resort list is empty';
    if (!item.id || item.account_type !== 'resort') return 'latest resort is incomplete';
    return item.full_name || item.username ? '' : 'latest resort has no display name';
  }
  if (check.validator === 'ads-list') return Array.isArray(value?.ads) ? '' : 'ads payload is invalid';
  if (check.validator === 'payment-config') {
    if (value?.ok !== true || value?.enabled !== true) return 'resort payment configuration is disabled';
    return value?.provider === 'paypal' && value?.paypal?.enabled === true ? '' : 'PayPal resort checkout is not enabled';
  }
  if (check.validator === 'session-empty') return value?.session === null ? '' : 'anonymous request unexpectedly has a session';
  if (check.validator === 'aasa') {
    const details = value?.applinks?.details;
    if (!Array.isArray(details) || !details.length) return 'AASA applinks details are missing';
    const hasAppIdentifier = details.some((item) => {
      const identifiers = [item?.appID, ...(Array.isArray(item?.appIDs) ? item.appIDs : [])];
      return identifiers.some((identifier) => String(identifier || '').endsWith('.com.divergram.app.ios'));
    });
    if (!hasAppIdentifier) return 'AASA iOS app identifier is missing';
    if (!details.some((item) => (Array.isArray(item?.components) && item.components.length) || (Array.isArray(item?.paths) && item.paths.length))) return 'AASA routes are missing';
    return '';
  }
  if (check.validator === 'assetlinks') {
    const rows = Array.isArray(value) ? value : [];
    const app = rows.find((item) => item?.target?.package_name === 'com.divergram.app');
    if (!app) return 'Android package is missing from assetlinks';
    return Array.isArray(app.target?.sha256_cert_fingerprints) && app.target.sha256_cert_fingerprints.length
      ? ''
      : 'Play signing fingerprint is missing from assetlinks';
  }
  return '';
}

export function buildChecks({ apiBase = DEFAULT_API_BASE, webBase = DEFAULT_WEB_BASE } = {}) {
  const api = apiBase.replace(/\/+$/, '');
  const web = webBase.replace(/\/+$/, '');
  const guarded = [
    ['Annual membership guard', '/api/memberships/annual/config'],
    ['Booking history guard', '/api/resort-bookings/me'],
    ['Private dive log guard', '/api/dive-logs'],
    ['Notification settings guard', '/api/notifications/settings'],
    ['Notification inbox guard', '/api/data/notifications'],
  ].map(([name, path]) => ({ name, url: `${api}${path}`, expect: 401, json: true }));
  const query = (value) => encodeURIComponent(JSON.stringify(value));

  return [
    { name: 'API health', url: `${api}/api/health`, expect: 200, json: true, validator: 'health' },
    { name: 'OAuth providers', url: `${api}/api/auth/oauth/providers`, expect: 200, json: true, validator: 'oauth' },
    { name: 'Anonymous session', url: `${api}/api/auth/session`, expect: 200, json: true, validator: 'session-empty' },
    ...['ko', 'en', 'ja', 'zh'].map((locale) => ({
      name: `Dive guides ${locale}`,
      url: `${api}/api/dive-guides?locale=${locale}&limit=1`,
      expect: 200,
      json: true,
      validator: 'guide-list',
      capture: locale === 'ko' ? 'latestGuide' : undefined,
    })),
    {
      name: 'Public feed data',
      url: `${api}/api/data/posts?channel=feed&limit=1&order=${query({ column: 'created_at', ascending: false })}`,
      expect: 200,
      json: true,
      validator: 'feed-list',
      capture: 'latestFeed',
    },
    {
      name: 'Public reels data',
      url: `${api}/api/data/posts?channel=reels&limit=1&filters=${query([{ column: 'publish_to_reels', op: 'eq', value: true }])}&order=${query({ column: 'created_at', ascending: false })}`,
      expect: 200,
      json: true,
      validator: 'reel-list',
      capture: 'latestReel',
    },
    {
      name: 'Public resort data',
      url: `${api}/api/data/profiles?limit=1&filters=${query([{ column: 'account_type', op: 'eq', value: 'resort' }])}`,
      expect: 200,
      json: true,
      validator: 'resort-list',
      capture: 'latestResort',
    },
    { name: 'Feed advertising data', url: `${api}/api/ads?placement=feed&limit=1`, expect: 200, json: true, validator: 'ads-list' },
    {
      name: 'Resort payment config',
      url: `${api}/api/resort-payments/config`,
      expect: 200,
      json: true,
      validator: 'payment-config',
      warning: (value) => value?.sampleMode === true || value?.paypal?.environment === 'sandbox'
        ? 'resort payments are still in PayPal sandbox/sample mode'
        : '',
    },
    ...guarded,
    { name: 'Media upload guard', url: `${api}/api/uploads`, method: 'POST', expect: 401, json: true },
    { name: 'Cloudinary signing guard', url: `${api}/api/media/cloudinary/sign-upload`, method: 'POST', expect: 401, json: true },
    { name: 'Public homepage', url: `${web}/`, expect: 200, contains: 'Divergram' },
    { name: 'Service page', url: `${web}/service`, expect: 200, contains: 'AI 다이빙 로그' },
    { name: 'Privacy policy', url: `${web}/privacy`, expect: 200, contains: 'Divergram' },
    { name: 'Apple universal links', url: `${web}/.well-known/apple-app-site-association`, expect: 200, json: true, validator: 'aasa' },
    { name: 'Android app links', url: `${web}/.well-known/assetlinks.json`, expect: 200, json: true, validator: 'assetlinks' },
    { name: 'Android app links www', url: 'https://www.divergram.com/.well-known/assetlinks.json', expect: 200, json: true, validator: 'assetlinks' },
    { name: 'Admin login', url: 'https://adm.divergram.com/', expect: 200, contains: 'Divergram' },
    { name: 'Admin access guard', url: `${api}/api/admin/api-settings`, expect: 401, json: true },
  ];
}

export function buildAuthenticatedChecks({ apiBase = DEFAULT_API_BASE, token } = {}) {
  const api = apiBase.replace(/\/+$/, '');
  const headers = { authorization: `Bearer ${token}` };
  return [
    { name: 'Authenticated session', url: `${api}/api/auth/session`, expect: 200, json: true, headers },
    { name: 'Authenticated dive logs', url: `${api}/api/dive-logs`, expect: 200, json: true, headers },
    { name: 'Authenticated booking history', url: `${api}/api/resort-bookings/me`, expect: 200, json: true, headers },
    { name: 'Authenticated annual membership', url: `${api}/api/memberships/annual/config`, expect: 200, json: true, headers },
    { name: 'Authenticated notification settings', url: `${api}/api/notifications/settings`, expect: 200, json: true, headers },
    { name: 'Authenticated notification inbox', url: `${api}/api/data/notifications`, expect: 200, json: true, headers },
  ];
}

export async function runCheck(check, { timeoutMs = 12_000 } = {}) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(check.url, {
      method: check.method || 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'DivergramProductionMonitor/2.0', ...(check.headers || {}) },
      body: check.body,
    });
    const expectedStatuses = Array.isArray(check.expect) ? check.expect : [check.expect];
    const body = check.readBody === false ? '' : await response.text();
    if (check.readBody === false) await response.body?.cancel().catch(() => undefined);
    let parsed;
    let error = expectedStatuses.includes(response.status) ? '' : `expected ${expectedStatuses.join(' or ')}, received ${response.status}`;
    if (!error && check.contains && !body.includes(check.contains)) error = `missing marker: ${check.contains}`;
    if (!error && check.json) {
      try { parsed = JSON.parse(body); } catch { error = 'invalid JSON response'; }
    }
    if (!error && check.validator) error = validateJson(check, parsed);
    const warning = !error && typeof check.warning === 'function' ? check.warning(parsed) : '';
    return {
      name: check.name,
      url: check.url,
      ok: !error,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      error,
      warning,
      captured: check.capture && !error ? { key: check.capture, value: parsed } : undefined,
    };
  } catch (error) {
    return { name: check.name, url: check.url, ok: false, status: 0, latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error), warning: '' };
  } finally {
    clearTimeout(timer);
  }
}

async function runAuthenticatedChecks(options, timeoutMs) {
  const email = String(options.monitorEmail || process.env.DIVERGRAM_MONITOR_EMAIL || '').trim();
  const password = String(options.monitorPassword || process.env.DIVERGRAM_MONITOR_PASSWORD || '');
  if (!email && !password) return { configured: false, results: [] };
  if (!email || !password) {
    return {
      configured: true,
      results: [{ name: 'Authenticated monitor setup', url: '', ok: false, status: 0, latencyMs: 0, error: 'both DIVERGRAM_MONITOR_EMAIL and DIVERGRAM_MONITOR_PASSWORD are required', warning: '' }],
    };
  }

  const api = String(options.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  const login = await runCheck({
    name: 'Monitor account login',
    url: `${api}/api/auth/login`,
    method: 'POST',
    expect: 200,
    json: true,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, sessionDays: 1, accountScope: 'personal' }),
    capture: 'monitorLogin',
  }, { timeoutMs });
  if (!login.ok) return { configured: true, results: [login] };

  const token = login.captured?.value?.token;
  if (!token) {
    return {
      configured: true,
      results: [{ ...login, ok: false, error: 'login response did not include a session token', captured: undefined }],
    };
  }
  login.captured = undefined;
  const checks = buildAuthenticatedChecks({ apiBase: api, token });
  return { configured: true, results: [login, ...await Promise.all(checks.map((check) => runCheck(check, { timeoutMs })))] };
}

async function writeSummary(report) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const lines = [
    '# Divergram production monitor',
    '',
    `Checked: ${report.checkedAt}`,
    '',
    '| Check | Status | HTTP | Latency |',
    '|---|---:|---:|---:|',
    ...report.results.map((item) => `| ${item.name} | ${item.ok ? (item.warning ? `warning: ${item.warning}` : 'OK') : `FAIL: ${item.error}`} | ${item.status} | ${item.latencyMs} ms |`),
  ];
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

async function sendFailureAlert(report) {
  const url = String(process.env.MONITOR_ALERT_WEBHOOK_URL || '').trim();
  if (!url || report.ok) return;
  const failures = report.results.filter((item) => !item.ok).map((item) => `${item.name}: ${item.error}`).join('\n');
  const message = `Divergram production monitor failed\n${failures}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: message, content: message }),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => undefined);
}

export async function runProductionMonitor(options = {}) {
  const timeoutMs = Number(options.timeoutMs || process.env.MONITOR_TIMEOUT_MS || 12_000);
  const results = await Promise.all(buildChecks(options).map((check) => runCheck(check, { timeoutMs })));
  const authenticated = await runAuthenticatedChecks(options, timeoutMs);
  results.push(...authenticated.results);
  const latestGuide = results.find((item) => item.captured?.key === 'latestGuide')?.captured?.value?.data?.[0];
  const latestFeed = results.find((item) => item.captured?.key === 'latestFeed')?.captured?.value?.data?.[0];
  const latestReel = results.find((item) => item.captured?.key === 'latestReel')?.captured?.value?.data?.[0];
  const latestResort = results.find((item) => item.captured?.key === 'latestResort')?.captured?.value?.data?.[0];
  const api = String(options.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  const web = String(options.webBase || DEFAULT_WEB_BASE).replace(/\/+$/, '');
  const dynamicChecks = [];
  if (latestGuide?.id) {
    dynamicChecks.push(
      { name: 'Latest guide detail API', url: `${api}/api/dive-guides/${encodeURIComponent(latestGuide.id)}?locale=ko`, expect: 200, json: true },
      { name: 'Latest guide deep-link page', url: `${web}/guides/${encodeURIComponent(latestGuide.id)}`, expect: 200, contains: 'Divergram' },
      { name: 'Latest guide cover', url: latestGuide.coverImageUrl, expect: [200, 206], headers: { range: 'bytes=0-1023' }, readBody: false },
    );
  }
  if (latestFeed?.id) {
    dynamicChecks.push({ name: 'Latest feed deep-link page', url: `${web}/post/${encodeURIComponent(latestFeed.id)}`, expect: 200, contains: 'Divergram' });
    const mediaUrl = latestFeed.video_url || latestFeed.image_url;
    if (mediaUrl) dynamicChecks.push({ name: 'Latest feed media', url: mediaUrl, expect: [200, 206], headers: { range: 'bytes=0-1023' }, readBody: false });
  }
  if (latestReel?.id) {
    dynamicChecks.push(
      { name: 'Latest reel deep-link page', url: `${web}/reel/${encodeURIComponent(latestReel.id)}`, expect: 200, contains: 'Divergram' },
      { name: 'Latest reel video', url: latestReel.video_url, expect: [200, 206], headers: { range: 'bytes=0-1023' }, readBody: false },
    );
  }
  if (latestResort?.id) dynamicChecks.push({ name: 'Latest resort deep-link page', url: `${web}/resorts/${encodeURIComponent(latestResort.id)}`, expect: 200, contains: 'Divergram' });
  results.push(...await Promise.all(dynamicChecks.map((check) => runCheck(check, { timeoutMs }))));
  const failed = results.filter((result) => !result.ok);
  const warnings = results.filter((result) => result.warning);
  const report = {
    checkedAt: new Date().toISOString(),
    ok: failed.length === 0,
    warningCount: warnings.length,
    authenticatedMonitoringConfigured: authenticated.configured,
    results: results.map(({ captured, ...item }) => item),
  };
  await writeSummary(report);
  await sendFailureAlert(report);
  return report;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const report = await runProductionMonitor();
  console.log(JSON.stringify(report, null, 2));
  const failOnWarnings = String(process.env.MONITOR_FAIL_ON_WARNINGS || '').toLowerCase() === 'true';
  process.exitCode = report.ok && (!failOnWarnings || report.warningCount === 0) ? 0 : 1;
}
