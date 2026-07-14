import assert from 'node:assert/strict';

const base = String(process.env.DIVERGRAM_API_BASE || 'https://api.divergram.com').replace(/\/+$/, '');
const request = (path, init) => fetch(`${base}${path}`, { signal: AbortSignal.timeout(15000), ...init });

const health = await request('/api/health');
assert.equal(health.status, 200);
assert.equal((await health.json()).ok, true);

for (const path of ['/api/preferences/me', '/api/integrations/garmin/logs', '/api/ai/generate']) {
  const response = await request(path, path.endsWith('/generate') ? { method: 'POST' } : undefined);
  assert.equal(response.status, 401, `${path} must reject unauthenticated requests`);
}

const seed = await request('/api/data/seed/default', { method: 'POST' });
assert.ok([401, 403].includes(seed.status), 'seed endpoint must be admin-only');
console.log('Production smoke checks passed');
