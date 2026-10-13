// Isolated UI fixtures: no production account, write, or customer data.
import { chromium } from '../app/node_modules/playwright-core/index.mjs';
import { mkdir } from 'node:fs/promises';
import { API_SERVICE_CATALOG, publicApiService } from '../api/server/lib/apiSettings.js';
const phase = process.argv[2] || 'after';
const directory = new URL(`../artifacts/launch-review-20260923/${phase}/`, import.meta.url).pathname;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let settings = API_SERVICE_CATALOG.map(service => publicApiService(service));
let failHealth = false;
const integrations = settings.map((s, i) => ({ id: s.id === 'infobip' ? 'infobip-sms' : s.id, name: s.name, category: 'messaging', status: i < 7 ? 'operational' : i < 13 ? 'configured' : 'not_configured', detail: i < 7 ? '인증 응답 확인 완료' : i < 13 ? '설정됨 · 실제 이용 확인 필요' : '연결 설정이 필요합니다.', checkType: i < 7 ? 'live' : 'configuration', latencyMs: i < 7 ? 123 : undefined }));
await page.route('**/api/**', async route => {
  const url = new URL(route.request().url());
  let data = { ok: true };
  if (url.pathname.endsWith('/auth/session')) data.session = { user: { id: 'ui-fixture', email: 'admin-fixture@example.invalid', name: '운영 관리자', role: 'admin' } };
  if (url.pathname.endsWith('/stats')) data.stats = { users: 128, feedCount: 342, reelsCount: 26, reports: 4, system: { cpuUsagePct: 12, memoryUsagePct: 34, disk: { usedPct: 28 }, network: { inMb: 8, outMb: 24 } } };
  if (url.pathname.endsWith('/external-integrations')) {
    if (failHealth) return route.fulfill({ status: 503, json: { error: 'check_unavailable' } });
    data = { ok: true, checkedAt: new Date().toISOString(), counts: { operational: 7, configured: 6, not_configured: 6 }, integrations };
  }
  if (url.pathname.endsWith('/api-settings')) data.services = settings;
  if (url.pathname.includes('/api-settings/')) {
    const id = url.pathname.split('/').pop();
    const body = route.request().postDataJSON();
    settings = settings.map(s => s.id !== id ? s : { ...s, enabled: body.enabled, fields: s.fields.map(f => ({ ...f, value: f.sensitive ? '' : body.values[f.envName] || f.value })) });
    data.service = settings.find(s => s.id === id);
  }
  if (url.pathname.endsWith('/operations-overview')) data = { ...data, jobs: [{ status: 'failed', count: 2 }, { status: 'pending', count: 3 }], tokens: [{ platform: 'ios', is_active: true, count: 12 }], notifications: [{ delivery_status: 'sent', count: 24 }], reports: [{ status: 'received', count: 4 }] };
  if (url.pathname.endsWith('/store-subscriptions')) data = { ok: true, checkedAt: new Date().toISOString(), summary: [{ status: 'active', count: 1 }], memberships: [{ id: 'test-subscription', user_id: 'fixture', email: 'member@example.invalid', platform: 'ios', store_product_id: 'fixture-product', effective_status: 'active', expires_at: '2026-10-01T00:00:00Z', updated_at: new Date().toISOString(), auto_renews: true }], events: [], page: 1, hasMore: false };
  return route.fulfill({ json: data });
});
try {
  for (const path of ['dashboard', 'api-management', 'operations']) {
    await page.goto(`http://127.0.0.1:5175/${path}`);
    await page.locator('.admin-workspace').waitFor();
    await page.getByText(path === 'dashboard' ? '오늘의 운영을 한눈에.' : path === 'api-management' ? 'Firebase Cloud Messaging' : '운영 상태 센터', { exact: true }).last().waitFor();
    await page.screenshot({ path: `${directory}/${path}-desktop.png`, fullPage: true });
  }
  const routeSmoke = ['users', 'certifications', 'devices', 'consents', 'comments', 'reported-chats', 'notification-history', 'communication', 'messaging-usage', 'admin-access', 'jobs', 'dive-logs', 'media', 'stamps', 'app-version', 'analytics', 'donations', 'engagement', 'reports', 'feeds', 'reels', 'settings', 'subscriptions'];
  for (const path of routeSmoke) {
    await page.goto(`http://127.0.0.1:5175/${path}`);
    await page.locator('.admin-workspace').waitFor();
    await page.getByText('화면을 준비하고 있습니다…', { exact: true }).waitFor({ state: 'hidden' });
    if ((await page.locator('.content').innerText()).trim().length < 15) errors.push(`empty screen: ${path}`);
    if (path === 'subscriptions') { await page.getByText('member@example.invalid', { exact: true }).waitFor(); await page.screenshot({ path: `${directory}/subscriptions-desktop.png`, fullPage: true }); }
  }
  await page.goto('http://127.0.0.1:5175/api-management');
  const field = page.locator('.api-fields input').last();
  await field.fill('launch-test-topic');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: /^Infobip/ }).click();
  if (await field.inputValue() !== 'launch-test-topic') errors.push('discard guard lost draft');
  await page.getByRole('button', { name: '변경사항 저장' }).click();
  await page.locator('.api-save-message').waitFor();
  if (await page.getByRole('button', { name: '변경사항 저장' }).isEnabled()) errors.push('saved draft still dirty');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5175/dashboard');
  await page.locator('.admin-workspace').waitFor();
  await page.getByText('오늘의 운영을 한눈에.', { exact: true }).waitFor();
  await page.screenshot({ path: `${directory}/dashboard-mobile.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  if (overflow) errors.push('mobile horizontal overflow');
  if (phase !== 'before') {
    await page.getByRole('button', { name: '관리 메뉴 열기' }).click();
    await page.getByRole('searchbox', { name: '관리 메뉴 검색' }).fill('API');
    await page.getByRole('button', { name: 'API 관리', exact: true }).click();
    await page.locator('.api-setting-panel').waitFor();
    failHealth = true;
    await page.reload();
    await page.getByText('Firebase Cloud Messaging', { exact: true }).last().waitFor();
    if (await page.locator('.api-fields input, .api-fields textarea').count() === 0) errors.push('settings unavailable after health failure');
    await page.screenshot({ path: `${directory}/api-mobile-health-failure.png`, fullPage: true });
  }
  console.log(JSON.stringify({ directory, errors, fixtures: true, routeSmokeCount: routeSmoke.length + 3, savedOnlyFixtures: true }));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
