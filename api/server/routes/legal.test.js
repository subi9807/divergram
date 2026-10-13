import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegalRoutes } from './legal.js';

function setup() {
  const handlers = new Map();
  const records = new Map();
  const app = Object.fromEntries(['get', 'put'].map((method) => [
    method,
    (path, ...callbacks) => handlers.set(`${method}:${path}`, callbacks.at(-1)),
  ]));
  const pool = {
    async query(sql, params = []) {
      if (sql.includes("table_name='legal_policies'") && sql.includes('record_id=$1')) {
        const data = records.get(params[0]);
        return { rows: data?.published ? [{ data }] : [] };
      }
      if (sql.includes("table_name='legal_policies'")) {
        return { rows: [...records.entries()].map(([record_id, data]) => ({ record_id, data, updated_at: data.updatedAt })) };
      }
      if (sql.startsWith('INSERT INTO app_records')) {
        records.set(params[0], JSON.parse(params[1]));
        return { rows: [] };
      }
      if (sql.includes("table_name='signup_consent_settings'")) return { rows: [] };
      if (sql.includes('FROM app_records WHERE table_name=$1')) return { rows: [] };
      return { rows: [] };
    },
  };
  registerLegalRoutes(app, { pool, requireAdmin: (_req, _res, next) => next() });

  return async function call(method, path, { body = {}, params = {} } = {}) {
    const response = {
      statusCode: 200,
      setHeader() {},
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
    };
    await handlers.get(`${method}:${path}`)({ body, params }, response);
    return response;
  };
}

test('admin policy catalog exposes every complete app policy', async () => {
  const call = setup();
  const response = await call('get', '/api/admin/legal/policies');
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.policies.length, 25);
  assert.ok(response.body.policies.every((policy) => policy.title && policy.version && policy.effectiveFrom));
  assert.ok(response.body.policies.every((policy) => policy.content.length >= 80));
  assert.deepEqual(
    response.body.policies.filter((policy) => policy.requiredForSignup).map((policy) => policy.type).sort(),
    ['age14_notice', 'privacy', 'terms'],
  );
});

test('each managed policy has a public detail fallback', async () => {
  const call = setup();
  for (const slug of ['terms', 'privacy', 'location_terms', 'community', 'ai_notice', 'account_deletion']) {
    const response = await call('get', '/api/legal/:slug', { params: { slug } });
    assert.equal(response.statusCode, 200, slug);
    assert.equal(response.body.slug, slug);
    assert.ok(response.body.title, slug);
    assert.ok(response.body.content.length >= 80, slug);
    assert.equal(response.body.source, 'default');
  }
});

test('admin can publish a policy and public list returns it', async () => {
  const call = setup();
  const saved = await call('put', '/api/admin/legal/policies/:type', {
    params: { type: 'community' },
    body: {
      title: '커뮤니티 운영정책',
      content: '## 운영 원칙\n안전하고 존중받는 다이빙 커뮤니티를 운영합니다. 신고와 제재 절차를 투명하게 적용합니다.',
      version: '2026.09.24',
      effectiveFrom: '2026-09-24T00:00:00.000Z',
      published: true,
    },
  });
  assert.equal(saved.statusCode, 200);
  const listed = await call('get', '/api/legal/policies');
  assert.equal(listed.body.policies.length, 25);
  assert.equal(listed.body.policies.find((policy) => policy.type === 'community')?.title, '커뮤니티 운영정책');
});
