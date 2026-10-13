import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAdminOperationsRoutes } from './adminOperations.js';

function fixture(query) {
  const routes = new Map();
  const requireAdmin = () => {};
  const app = Object.fromEntries(['get', 'post', 'patch', 'put', 'delete'].map(method => [method, (path, ...handlers) => routes.set(`${method} ${path}`, handlers)]));
  registerAdminOperationsRoutes(app, { pool: { query }, requireAdmin });
  const handlers = routes.get('get /api/admin/store-subscriptions');
  assert.equal(handlers[0], requireAdmin);
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  return { handler: handlers.at(-1), response };
}

test('admin subscriptions paginate verified records without raw purchase credentials', async () => {
  const queries = [];
  const { handler, response } = fixture(async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('GROUP BY')) return { rows: [{ status: 'active', count: 2 }] };
    if (sql.includes('LIMIT 51')) return { rows: Array.from({ length: 51 }, (_, index) => ({ id: String(index) })) };
    return { rows: [] };
  });
  await handler({ query: { page: '2', q: 'fixture@example.invalid' } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.memberships.length, 50);
  assert.equal(response.body.hasMore, true);
  assert.deepEqual(queries[1].params, ['fixture@example.invalid', 50]);
  assert.match(queries[1].sql, /expires_at<=now\(\)/);
  for (const { sql } of queries) assert.doesNotMatch(sql, /\b(metadata|payload|store_transaction_id|purchase_token)\b|SELECT \*/);
});

test('admin subscriptions reject invalid pages and return sanitized read errors', async () => {
  const { handler, response } = fixture(async () => { throw new Error('credential-must-not-leak'); });
  await handler({ query: { page: '-1' } }, response);
  assert.equal(response.statusCode, 400);
  await handler({ query: {} }, response);
  assert.equal(response.statusCode, 500);
  assert.equal(JSON.stringify(response.body).includes('credential-must-not-leak'), false);
});
