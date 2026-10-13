import { chromium } from '../app/node_modules/playwright-core/index.mjs';
import { mkdir } from 'node:fs/promises';
const out = new URL('../artifacts/launch-review-20260923/app/', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await context.addInitScript(() => {
  window.__DIVERGRAM_LAYOUT_PREVIEW__ = { tutorialDone: true, locale: 'ko', route: location.pathname.includes('notifications') ? '/(tabs)/notifications' : '/(tabs)/feed', auth: { user: { id: 'fixture', email: 'fixture@example.invalid', name: '테스트 다이버' } } };
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/**', async route => {
  const path = new URL(route.request().url()).pathname;
  let data = { data: [], count: 0, ok: true };
  if (path.endsWith('/data/notifications')) data.data = [
    { id: 'n1', type: 'follow', actor_id: 'buddy', title: '새로운 다이빙 버디', body: 'Ocean Diver님이 회원님을 팔로우하기 시작했어요.', is_read: false, created_at: new Date().toISOString() },
    { id: 'n2', type: 'system', title: '다음 다이빙을 준비해 보세요', body: '기록을 모으고 새로운 다이빙 포인트를 발견하세요.', is_read: true, created_at: new Date().toISOString() },
  ];
  if (path.endsWith('/data/profiles')) data.data = [{ id: 'buddy', full_name: 'Ocean Diver' }];
  await route.fulfill({ json: data });
});
try {
  await page.goto('http://localhost:8085/feed', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByText('Divergram', { exact: true }).first().waitFor({ timeout: 90000 });
  await page.getByText('바다에서 만나는 이야기', { exact: true }).waitFor();
  await page.waitForFunction(() => Array.from(document.images).filter(img => img.src).every(img => img.complete), { timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(700); // Finish Expo image transitions before visual evidence.
  await page.screenshot({ path: `${out}/feed-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: '전체 메뉴 열기' }).click();
  await page.getByRole('button', { name: '알림', exact: true }).click();
  await page.getByText('새로운 다이빙 버디', { exact: true }).waitFor({ timeout: 45000 });
  await page.getByText('메뉴를 길게 누른 뒤 원하는 위치로 이동하세요.', { exact: true }).waitFor({ state: 'hidden' });
  await page.waitForTimeout(500); // Native modal slide-out is still visible briefly on web.
  await page.screenshot({ path: `${out}/notifications-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: '읽지 않음', exact: true }).click();
  if (await page.getByText('다음 다이빙을 준비해 보세요', { exact: true }).count()) errors.push('Unread filter retained a read notification');
  await page.screenshot({ path: `${out}/notifications-unread-mobile.png`, fullPage: true });
  console.log(JSON.stringify({ out, errors, fixtures: true, nativeDevice: false }));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true });
  console.log(JSON.stringify({ error: error.message, url: page.url(), errors, text: (await page.locator('body').innerText()).slice(0, 2400) }));
  process.exitCode = 1;
} finally { await browser.close(); }
