// Historical pre-fix reproduction probes. For current regressions run npm --prefix api test.
// Do not overwrite the saved pre-fix evidence with results from the fixed tree.
// Read-only source inventory and isolated route probes; no production connection.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { requireAdminFactory } from '../api/server/middleware/requireAdmin.js';
import { registerDataRoutes } from '../api/server/routes/data.js';
import { registerMediaRoutes } from '../api/server/routes/media.js';
import { calculateRefund } from '../api/server/routes/resortPartners.js';

const root = process.cwd();
const out = path.join(root, 'artifacts/system-audit-20260905');
fs.mkdirSync(out, { recursive: true });
const excluded = new Set(['node_modules', 'dist', 'build', 'Pods', '.git', '.next']);
const inventory = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(js|jsx|ts|tsx|mjs|sql|json|css)$/.test(entry.name) && !/lock/.test(entry.name)) {
      const source = fs.readFileSync(file, 'utf8');
      inventory.push({ file: path.relative(root, file), lines: source.split('\n').length,
        sha256: crypto.createHash('sha256').update(source).digest('hex'),
        koreanLines: source.split('\n').filter(line => /[가-힣]/.test(line)).length,
        review: 'inventory/static coverage; not a claim of manual line-by-line review' });
    }
  }
}
for (const dir of ['api/server', 'api/db', 'adm/src', 'app/src', 'app/app', 'web/src', 'deploy', 'api/deploy']) walk(path.join(root, dir));
fs.writeFileSync(path.join(out, 'file-inventory.json'), JSON.stringify(inventory, null, 2));
const routes = new Map();
const app = Object.fromEntries(['get', 'post', 'patch', 'delete'].map(method => [method, (url, ...handlers) => routes.set(`${method} ${url}`, handlers.at(-1))]));
function response() { return { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } }; }
const queries = [];
const pool = { async query(sql, values = []) {
  queries.push({ sql, values });
  if (sql.startsWith('SELECT role')) return { rows: [{ role: 'user', is_blocked: false }] };
  if (sql === 'SELECT * FROM app_profiles') return { rows: [{ id: 'victim', account_type: 'personal', license_number: 'TEST-LICENSE', internal_test_field: 'not-public' }] };
  return { rows: [], rowCount: 1 };
} };
registerDataRoutes(app, { pool, crypto, getAuthUserId: req => req.testUser || null, requireAdmin() {} });
const results = [];
const require = createRequire(new URL('../api/package.json', import.meta.url));
const jwt = require('jsonwebtoken');
const pg = require('pg');
async function probe(name, route, req, check) {
  queries.length = 0;
  const res = response();
  await routes.get(route)(req, res);
  results.push({ name, reproduced: check(res, queries), status: res.statusCode });
}
await probe('Anonymous profiles expose columns outside write allowlist', 'get /api/data/:table', { params: { table: 'profiles' }, query: {} }, res => res.body.data[0].internal_test_field === 'not-public');
await probe('POST accepts victim post ID with caller as new owner', 'post /api/data/:table', { testUser: 'attacker', params: { table: 'posts' }, body: { rows: [{ id: 'victim-post', user_id: 'attacker', caption: 'changed' }] } }, (res, q) => res.statusCode === 200 && q.some(v => v.sql.includes('ON CONFLICT (id) DO UPDATE') && v.sql.includes('user_id=EXCLUDED.user_id')));
await probe('Caller can insert own membership into arbitrary room', 'post /api/data/:table', { testUser: 'attacker', params: { table: 'participants' }, body: { rows: [{ id: 'test-member', room_id: 'victim-room', user_id: 'attacker' }] } }, (res, q) => res.statusCode === 200 && q.some(v => v.sql.startsWith('INSERT INTO app_participants')) && !q.some(v => v.sql.startsWith('SELECT 1 FROM app_participants')));
await probe('Caller can self-approve certification status', 'post /api/data/:table', { testUser: 'attacker', params: { table: 'certifications' }, body: { rows: [{ id: 'test-cert', user_id: 'attacker', discipline: 'scuba', agency: 'TEST', image_url: 'https://example.invalid/test.jpg', status: 'approved' }] } }, (res, q) => res.statusCode === 200 && q.some(v => v.values.includes('approved')));
const originalFetch = globalThis.fetch;
const env = { ...process.env };
let destroyed = '';
try {
  process.env.CLOUDINARY_CLOUD_NAME = 'audit-test';
  process.env.CLOUDINARY_API_KEY = 'audit-test';
  process.env.CLOUDINARY_API_SECRET = 'audit-test';
  globalThis.fetch = async (_url, init) => { destroyed = new URLSearchParams(init.body).get('public_id'); return { ok: true, text: async () => '{"result":"ok"}' }; };
  registerMediaRoutes(app, { getAuthUserId: () => 'attacker', authRateLimit: () => (_req, _res, next) => next() });
  await probe('Media delete reaches provider for another user asset', 'post /api/media/cloudinary/delete', { body: { publicId: 'divergram/victim/photo' } }, res => res.statusCode === 200 && destroyed === 'divergram/victim/photo');
} finally {
  globalThis.fetch = originalFetch;
  for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key];
  }
}
const refund = calculateRefund(100, new Date('2026-10-20T00:00:00Z'), new Date('2026-10-01T00:00:00Z'));
results.push({ name: 'Date object booking date produces NaN and zero refund', reproduced: Number.isNaN(refund.daysBefore) && refund.refundAmount === 0 });
const parsedDate = pg.types.getTypeParser(1082)('2026-10-20');
results.push({ name: 'Installed pg DATE parser supplies a Date object', reproduced: parsedDate instanceof Date });
let bypassed = false;
let adminQueries = 0;
const secret = 'isolated-audit-secret-at-least-32-chars';
const admin = requireAdminFactory({ jwtSecret: secret, adminEmails: ['test-admin@example.invalid'], pool: { async query() { adminQueries++; return { rows: [{ is_blocked: true, role: 'user' }] }; } } });
await admin({ headers: { authorization: `Bearer ${jwt.sign({ sub: 'test-admin', email: 'test-admin@example.invalid', purpose: 'email_verify' }, secret)}` } }, response(), () => { bypassed = true; });
results.push({ name: 'Non-session email verification JWT accepted as admin; block lookup skipped', reproduced: bypassed && adminQueries === 0 });
function flatten(obj, prefix = '', rows = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, full, rows);
    else rows[full] = value;
  }
  return rows;
}
const locales = Object.fromEntries(['ko', 'en', 'ja', 'zh'].map(lang => [lang, flatten(JSON.parse(fs.readFileSync(`app/src/locales/${lang}.json`, 'utf8')))]));
const localeAudit = Object.fromEntries(Object.entries(locales).map(([lang, rows]) => [lang, { keys: Object.keys(rows).length, missing: Object.keys(locales.ko).filter(key => !(key in rows)), koreanValues: lang === 'ko' ? [] : Object.entries(rows).filter(([, val]) => /[가-힣]/.test(String(val))).map(([key]) => key) }]));
fs.writeFileSync(path.join(out, 'route-probes.json'), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(out, 'locale-audit.json'), JSON.stringify(localeAudit, null, 2));
console.log(JSON.stringify({ files: inventory.length, lines: inventory.reduce((n, row) => n + row.lines, 0), results, localeAudit }, null, 2));
