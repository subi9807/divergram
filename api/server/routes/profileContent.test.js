import test from 'node:test';
import assert from 'node:assert/strict';
import { registerProfileContentRoutes } from './profileContent.js';

function setup() {
  const handlers = new Map();
  const app = Object.fromEntries(['get', 'patch'].map(method => [
    method,
    (path, ...callbacks) => handlers.set(`${method}:${path}`, callbacks.at(-1)),
  ]));
  const settings = {
    profile_content_visibility: 'public',
    feed_content_visibility: 'public',
    reels_content_visibility: 'followers',
    dive_log_content_visibility: 'followers',
    marine_life_content_visibility: 'private',
  };
  const pool = {
    async query(sql, params = []) {
      if (sql.includes('FROM app_profiles p') && sql.includes('JOIN app_users')) return { rows: [settings] };
      if (sql.startsWith('SELECT 1 FROM app_follows')) return { rows: params[0] === 'follower' ? [{}] : [] };
      if (sql.includes('FROM app_posts p WHERE')) return { rows: [
        { id: 'post-public', user_id: 'owner', caption: 'public', publish_to_feed: true, visibility_type: 'public', media: [] },
        { id: 'post-followers', user_id: 'owner', caption: 'followers', publish_to_feed: true, publish_to_reels: true, visibility_type: 'followers', media: [] },
        { id: 'post-private', user_id: 'owner', caption: 'private', publish_to_feed: true, visibility_type: 'private', media: [] },
      ] };
      if (sql.startsWith('SELECT id,data')) return { rows: [
        { id: 'dive-followers', data: { visibilityType: 'followers', divePointName: 'Blue Reef', media: [] } },
      ] };
      if (sql.startsWith('SELECT * FROM app_marine_life_sightings')) return { rows: [
        { id: '11111111-1111-1111-1111-111111111111', user_id: 'owner', species_name: 'Manta ray', image_url: 'https://example.test/manta.jpg', visibility_type: 'private' },
      ] };
      throw new Error(`unexpected query: ${sql}`);
    },
  };
  registerProfileContentRoutes(app, {
    pool,
    getAuthUserId: req => req.user || null,
    authRateLimit: () => (_req, _res, next) => next(),
  });
  return async (user = null) => {
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await handlers.get('get:/api/profiles/:userId/content')({ user, params: { userId: 'owner' } }, response);
    return response;
  };
}

test('public profile content enforces category and item visibility', async () => {
  const call = setup();
  const anonymous = await call();
  assert.deepEqual(anonymous.body.data.posts.map(row => row.id), ['post-public']);
  assert.deepEqual(anonymous.body.data.reels, []);
  assert.deepEqual(anonymous.body.data.diveLogs, []);
  assert.deepEqual(anonymous.body.data.marineLife, []);

  const follower = await call('follower');
  assert.deepEqual(follower.body.data.posts.map(row => row.id), ['post-public', 'post-followers']);
  assert.deepEqual(follower.body.data.reels.map(row => row.id), ['post-followers']);
  assert.deepEqual(follower.body.data.diveLogs.map(row => row.id), ['dive-followers']);
  assert.deepEqual(follower.body.data.marineLife, []);

  const owner = await call('owner');
  assert.equal(owner.body.data.posts.length, 3);
  assert.equal(owner.body.data.marineLife.length, 1);
});
