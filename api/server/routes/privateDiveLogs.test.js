import test from 'node:test';
import assert from 'node:assert/strict';
import { registerPrivateDiveLogRoutes } from './privateDiveLogs.js';

// Transaction-aware fake tests route contracts, not PostgreSQL SQL/locking behavior.
function setup() {
  let db = { logs: {}, sources: {}, revisions: {} };
  let failRevision = false;
  let missingTables = false;
  const handlers = new Map();
  const app = Object.fromEntries(['get', 'post', 'patch'].map(method => [method, (path, ...callbacks) => handlers.set(`${method} ${path}`, callbacks.at(-1))]));
  const key = p => `${p[0]}/${p[1]}`;
  async function execute(state, sql, p) {
    if (sql.startsWith('SELECT id FROM app_users')) return { rows: p[0] === 'blocked' ? [] : [{ id: p[0] }] };
    if (missingTables) throw Object.assign(new Error('missing table'), { code: '42P01' });
    if (sql.startsWith('INSERT INTO app_dive_logs(')) {
      if (state.logs[key(p)]) return { rows: [] };
      const row = { id: p[1], user_id: p[0], data: JSON.parse(p[2]), revision: 1 };
      state.logs[key(p)] = row; return { rows: [structuredClone(row)] };
    }
    if (sql.startsWith('INSERT INTO app_dive_log_sources')) { state.sources[key(p)] = { original_data: JSON.parse(p[2]), source_kind: p[3] }; return { rows: [] }; }
    if (sql.startsWith('INSERT INTO app_dive_log_revisions')) {
      if (failRevision) throw new Error('write failed');
      const revision = p.length === 3 ? 1 : p[2];
      state.revisions[`${key(p)}/${revision}`] = JSON.parse(p.at(-1)); return { rows: [] };
    }
    if (sql.startsWith('SELECT data FROM app_dive_log_revisions')) return { rows: [{ data: state.revisions[`${key(p)}/1`] }] };
    if (sql.startsWith('SELECT original_data')) return { rows: state.sources[key(p)] ? [structuredClone(state.sources[key(p)])] : [] };
    if (sql.startsWith('UPDATE app_dive_logs')) {
      const row = state.logs[key(p)]; row.data = JSON.parse(p[2]); row.revision++;
      return { rows: [structuredClone(row)] };
    }
    if (sql.includes('id>$2')) return { rows: Object.values(state.logs).filter(row => row.user_id === p[0] && row.id > p[1]).sort((a, b) => a.id.localeCompare(b.id)).slice(0, p[2]).map(row => structuredClone(row)) };
    if (sql.startsWith('SELECT * FROM app_dive_logs')) return { rows: state.logs[key(p)] ? [structuredClone(state.logs[key(p)])] : [] };
    throw new Error(`Unexpected SQL: ${sql}`);
  }
  const pool = {
    query: (sql, p) => execute(db, sql, p),
    async connect() {
      let transaction;
      return { release() {}, async query(sql, p) {
        if (sql === 'BEGIN') { transaction = structuredClone(db); return; }
        if (sql === 'COMMIT') { db = transaction; return; }
        if (sql === 'ROLLBACK') return;
        return execute(transaction, sql, p);
      } };
    },
  };
  registerPrivateDiveLogRoutes(app, { pool, getAuthUserId: req => req.user, authRateLimit: () => (_req, _res, next) => next() });
  return {
    get db() { return db; },
    failRevisions() { failRevision = true; },
    missingTables() { missingTables = true; },
    async call(method, path, body, user = 'owner', id = 'log-1', query = {}) {
      const res = { statusCode: 200, headers: {}, set(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
      await handlers.get(`${method} ${path}`)({ body, user, params: { id }, query }, res);
      return res;
    },
  };
}

const data = { id: 'log-1', sourceType: 'bluetooth', maxDepth: 24, totalDiveTime: 45 };

test('authentication, blocked accounts and owner isolation apply to every read/write', async () => {
  const h = setup();
  assert.equal((await h.call('get', '/api/dive-logs', {}, null)).statusCode, 401);
  assert.equal((await h.call('get', '/api/dive-logs', {}, 'blocked')).statusCode, 403);
  assert.equal((await h.call('post', '/api/dive-logs', { data })).statusCode, 201);
  for (const path of ['/api/dive-logs/:id', '/api/dive-logs/:id/source']) assert.equal((await h.call('get', path, {}, 'other')).statusCode, 404);
  assert.equal((await h.call('patch', '/api/dive-logs/:id', { baseRevision: 1, patch: { memo: 'attack' } }, 'other')).statusCode, 404);
  assert.deepEqual((await h.call('get', '/api/dive-logs', {}, 'other')).body.data, []);
});

test('create retries are idempotent and changed payloads cannot overwrite prior saves', async () => {
  const h = setup();
  await h.call('post', '/api/dive-logs', { data });
  const retry = await h.call('post', '/api/dive-logs', { data });
  assert.equal(retry.statusCode, 200); assert.equal(retry.body.duplicate, true);
  assert.equal(retry.headers['Cache-Control'], 'no-store');
  assert.equal(Object.keys(h.db.revisions).length, 1);
  assert.equal((await h.call('post', '/api/dive-logs', { data: { ...data, maxDepth: 3 } })).statusCode, 409);
  assert.equal(h.db.logs['owner/log-1'].data.maxDepth, 24);
});

test('revision conflicts are rejected and source remains unchanged after corrections', async () => {
  const h = setup();
  await h.call('post', '/api/dive-logs', { data });
  const edited = await h.call('patch', '/api/dive-logs/:id', { baseRevision: 1, patch: { maxDepth: 20 } });
  assert.equal(edited.body.data.revision, 2);
  assert.equal(edited.body.data.fieldSources.maxDepth, 'USER');
  assert.equal((await h.call('get', '/api/dive-logs/:id/source')).body.data.original_data.maxDepth, 24);
  assert.equal((await h.call('patch', '/api/dive-logs/:id', { baseRevision: 1, patch: { maxDepth: 1 } })).statusCode, 409);
  assert.equal(Object.keys(h.db.revisions).length, 2);
});

test('failed history write rolls back effective data and source', async () => {
  const h = setup(); h.failRevisions();
  assert.equal((await h.call('post', '/api/dive-logs', { data })).statusCode, 500);
  assert.deepEqual(h.db.logs, {}); assert.deepEqual(h.db.sources, {});
});

test('owner pagination and missing-migration responses are explicit', async () => {
  const h = setup();
  for (const id of ['a', 'b', 'c']) await h.call('post', '/api/dive-logs', { data: { ...data, id } });
  const first = await h.call('get', '/api/dive-logs', {}, 'owner', '', { limit: '2' });
  assert.deepEqual(first.body.data.map(row => row.id), ['a', 'b']); assert.equal(first.body.nextCursor, 'b');
  const second = await h.call('get', '/api/dive-logs', {}, 'owner', '', { after: 'b', limit: '2' });
  assert.deepEqual(second.body.data.map(row => row.id), ['c']); assert.equal(second.body.nextCursor, null);
  h.missingTables();
  assert.equal((await h.call('get', '/api/dive-logs')).statusCode, 503);
});
