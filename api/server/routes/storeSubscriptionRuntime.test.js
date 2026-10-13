import test from 'node:test';
import assert from 'node:assert/strict';
import { registerStoreSubscriptionRoutes } from './storeSubscriptions.js';
import { API_SERVICE_CATALOG } from '../lib/apiSettings.js';

test('store config follows changed admin runtime settings without restarting routes', async () => {
  const routes = new Map();
  const app = { get: (path, ...callbacks) => routes.set(path, callbacks.at(-1)), post() {} };
  const pool = { query: async () => ({ rows: [] }) };
  registerStoreSubscriptionRoutes(app, { pool, getAuthUserId: () => 'test-member', authRateLimit: () => () => {}, storeSecret: 'test' });
  const read = async () => {
    let body;
    await routes.get('/api/memberships/annual/config')({}, { json(value) { body = value; } });
    return body.data;
  };
  process.env.GOOGLE_PLAY_ANNUAL_PRODUCT_ID = 'annual-before';
  assert.equal((await read()).android.productId, 'annual-before');
  process.env.GOOGLE_PLAY_ANNUAL_PRODUCT_ID = 'annual-after';
  assert.equal((await read()).android.productId, 'annual-after');
  assert.ok(API_SERVICE_CATALOG.find(service => service.id === 'google-iap').fields.some(field => field[0] === 'GOOGLE_PLAY_ANNUAL_PRODUCT_ID'));
  delete process.env.GOOGLE_PLAY_ANNUAL_PRODUCT_ID;
});
