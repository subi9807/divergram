import test from 'node:test';
import assert from 'node:assert/strict';
import { registerMarineWeatherRoutes } from './marineWeather.js';

function setup(fetchImpl) {
  let handler;
  registerMarineWeatherRoutes({ get(_path, ...handlers) { handler = handlers.at(-1); } }, { getAuthUserId: req => req.user, authRateLimit: () => () => {}, fetchImpl });
  return async (query = { lat: '0', lng: '0' }, user = 'test') => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ query, user }, res);
    return res;
  };
}
test('marine weather rejects anonymous, invalid coordinates and missing configuration without provider calls', async () => {
  delete process.env.STORMGLASS_API_KEY;
  const call = setup(() => { throw new Error('must not call'); });
  assert.equal((await call(undefined, null)).statusCode, 401);
  assert.equal((await call({ lat: '', lng: '0' })).statusCode, 400);
  assert.equal((await call({ lat: '91', lng: '0' })).statusCode, 400);
  assert.equal((await call()).statusCode, 503);
});
test('marine weather uses fixed provider hosts, caches results and never returns credentials', async () => {
  process.env.STORMGLASS_API_KEY = 'secret-not-in-response';
  let calls = 0;
  const call = setup(async (url, options) => {
    assert.equal(new URL(url).hostname, 'api.stormglass.io');
    assert.equal(options.headers.Authorization, 'secret-not-in-response');
    assert.ok(options.signal);
    calls++;
    return { ok: true, json: async () => url.includes('/weather/') ? { hours: [{ time: '2026-09-23T00:00:00Z', waveHeight: { sg: 0.5 } }] } : { data: [] } };
  });
  const first = await call();
  assert.equal(first.statusCode, 200);
  assert.equal((await call()).body.cached, true);
  assert.equal(calls, 2);
  assert.ok(!JSON.stringify(first.body).includes('secret-not-in-response'));
  delete process.env.STORMGLASS_API_KEY;
  assert.equal((await call()).statusCode, 503);
});
test('marine weather provider failure is explicit and sanitized', async () => {
  process.env.STORMGLASS_API_KEY = 'test-key';
  const call = setup(async () => { throw new Error('sensitive-provider-body'); });
  const result = await call();
  assert.equal(result.statusCode, 502);
  assert.deepEqual(result.body, { error: 'marine_weather_unavailable' });
  delete process.env.STORMGLASS_API_KEY;
});
