import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { registerDataRoutes } from './data.js';
import { registerMediaRoutes } from './media.js';

function harness(register, dependencies) {
  const handlers = new Map();
  const app = Object.fromEntries(['get','post','patch','delete'].map(method => [method, (path, ...fn) => handlers.set(`${method} ${path}`, fn.at(-1))]));
  register(app, dependencies);
  return async (method, path, req) => {
    const response = { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handlers.get(`${method} ${path}`)(req, response);
    return response;
  };
}
function dataHarness(onQuery) {
  return harness(registerDataRoutes, { crypto, getAuthUserId: () => 'me', requireAdmin: () => {}, pool: {
    async query(sql, values) {
      if (sql.startsWith('SELECT role')) return { rows: [{ role: 'user', is_blocked: false }] };
      return onQuery(sql, values);
    },
  } });
}
test('cross-owner post id conflicts do not overwrite another author', async () => {
  const call = dataHarness(async sql => {
    assert.match(sql, /WHERE app_posts.user_id=EXCLUDED.user_id/);
    assert.doesNotMatch(sql, /SET user_id=/);
    return { rows: [], rowCount: 0 };
  });
  const res = await call('post', '/api/data/:table', { params: { table: 'posts' }, body: { rows: [{ id: 'victim-post', user_id: 'me', caption: 'attack' }] } });
  assert.equal(res.code, 409);
});
test('ordinary users cannot create arbitrary chat membership', async () => {
  const call = dataHarness(() => assert.fail('must not insert membership'));
  const res = await call('post', '/api/data/:table', { params: { table: 'participants' }, body: { rows: [{ id: 'x', user_id: 'me', room_id: 'private-room' }] } });
  assert.equal(res.code, 403);
});
test('member cannot edit another sender message', async () => {
  const call = dataHarness(async sql => {
    assert.match(sql, /^SELECT \* FROM app_messages WHERE/);
    return { rows: [{ id: 'message', room_id: 'room', sender_id: 'other' }] };
  });
  const res = await call('patch', '/api/data/:table', { params: { table: 'messages' }, body: { filters: [{ column: 'id', op: 'eq', value: 'message' }], patch: { content: 'attack' } } });
  assert.equal(res.code, 403);
});
test('certification creation forces pending even with forged approval', async () => {
  const call = dataHarness(async (sql, values) => {
    assert.match(sql, /^INSERT INTO app_certifications/);
    assert.ok(values.includes('pending'));
    assert.ok(!values.includes('approved'));
    return { rowCount: 1, rows: [{ id: 'license', status: 'pending' }] };
  });
  const res = await call('post', '/api/data/:table', { params: { table: 'certifications' }, body: { rows: [{ user_id: 'me', discipline: 'scuba', agency: 'PADI', image_url: 'https://example.invalid/license', status: 'approved' }] } });
  assert.equal(res.code, 200);
  assert.equal(res.body.data[0].status, 'pending');
});
test('Cloudinary deletion rejects another owner without any network call', async t => {
  for (const name of ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET']) {
    const old = process.env[name]; process.env[name] = 'regression-test';
    t.after(() => { if (old === undefined) delete process.env[name]; else process.env[name] = old; });
  }
  t.mock.method(globalThis, 'fetch', () => assert.fail('foreign asset must never reach Cloudinary'));
  const call = harness(registerMediaRoutes, { getAuthUserId: () => 'me', authRateLimit: () => (_req, _res, next) => next() });
  for (const publicId of ['divergram/victim/file', 'divergram/me/../victim/file']) {
    const res = await call('post', '/api/media/cloudinary/delete', { body: { publicId } });
    assert.equal(res.code, 403);
  }
});

test('generic feed reads hide private posts and allow follower-only posts to followers', async () => {
  const posts = [
    { id: 'public', user_id: 'author', publish_to_feed: true, visibility_type: 'public' },
    { id: 'followers', user_id: 'author', publish_to_feed: true, visibility_type: 'followers' },
    { id: 'private', user_id: 'author', publish_to_feed: true, visibility_type: 'private' },
  ];
  const call = harness(registerDataRoutes, {
    crypto,
    getAuthUserId: () => 'viewer',
    requireAdmin: () => {},
    pool: {
      async query(sql) {
        if (sql.startsWith('SELECT role')) return { rows: [{ role: 'user', is_blocked: false }] };
        if (sql.startsWith('SELECT "id","user_id"')) return { rows: posts };
        if (sql.includes('FROM app_profiles WHERE id = ANY')) return { rows: [{ id: 'author', profile_content_visibility: 'public', feed_content_visibility: 'public', reels_content_visibility: 'public' }] };
        if (sql.startsWith('SELECT following_id')) return { rows: [{ following_id: 'author' }] };
        throw new Error(`unexpected query: ${sql}`);
      },
    },
  });
  const response = await call('get', '/api/data/:table', { params: { table: 'posts' }, query: { channel: 'feed' } });
  assert.equal(response.code, 200);
  assert.deepEqual(response.body.data.map(row => row.id), ['public', 'followers']);
  assert.deepEqual(response.body.data.map(row => row.effective_visibility), ['public', 'followers']);
});
