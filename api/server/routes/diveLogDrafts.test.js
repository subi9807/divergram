import test from 'node:test';
import assert from 'node:assert/strict';
import { registerDiveLogDraftRoutes } from './diveLogDrafts.js';

// Contract harness only: it does not replace a real PostgreSQL integration test.
function setup() {
  const handlers = new Map();
  const records = new Map();
  let fail = false;
  const app = Object.fromEntries(['get', 'put', 'delete'].map(method => [method, (path, ...callbacks) => handlers.set(method, callbacks.at(-1))]));
  const pool = { async query(sql, params) {
    if (fail) throw new Error('database unavailable');
    if (sql.includes('INSERT INTO')) {
      records.set(params[0], { data: JSON.parse(params[1]), updated_at: '2026-09-06T00:00:00Z' });
      return { rows: [records.get(params[0])] };
    }
    if (sql.startsWith('DELETE')) { records.delete(params[0]); return { rows: [] }; }
    return { rows: records.has(params[0]) ? [structuredClone(records.get(params[0]))] : [] };
  } };
  registerDiveLogDraftRoutes(app, { pool, getAuthUserId: req => req.user, authRateLimit: () => (_req, _res, next) => next() });
  return { fail() { fail = true; }, async call(method, data, user = 'owner') {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handlers.get(method)({ user, params: { logId: 'qa-draft' }, body: { data } }, res);
    return res;
  } };
}

test('draft round trip retains zero, unconfirmed story flag and EXIF/source snapshots', async () => {
  const h = setup();
  const data = { entryLatInput: '0', entryLngInput: '0', storyAccepted: false,
    originalSource: { kind: 'UNVERIFIED_IMPORT', payload: { maxDepth: 24 } },
    fieldSources: { memo: 'USER', maxDepth: 'UNVERIFIED_IMPORT' },
    media: [{ id: 'photo', photoMetadata: { source: 'PHOTO_EXIF', capturedLocal: '2026-09-06T10:00:00', capturedAt: null, utcOffset: null } }] };
  assert.equal((await h.call('put', data)).statusCode, 200);
  assert.deepEqual((await h.call('get')).body.data, data);
});
test('draft read and write remain owner scoped', async () => {
  const h = setup();
  assert.equal((await h.call('put', {}, null)).statusCode, 401);
  await h.call('put', { memo: 'owner' });
  assert.equal((await h.call('get', undefined, 'other')).body.exists, false);
  await h.call('put', { memo: 'other' }, 'other');
  assert.equal((await h.call('get')).body.data.memo, 'owner');
});
test('database failure never returns a successful save response', async () => {
  const h = setup();
  h.fail();
  const result = await h.call('put', { memo: 'retry me' });
  assert.equal(result.statusCode, 500);
  assert.equal(result.body.error, 'dive_log_draft_update_failed');
});
test('oversized and invalid draft payloads are rejected', async () => {
  const h = setup();
  for (const data of [null, [], { memo: 'x'.repeat(500001) }]) assert.equal((await h.call('put', data)).statusCode, 400);
});
