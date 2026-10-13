import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthenticatedChecks, buildChecks, runCheck, validateJson } from './monitor-production.mjs';

test('production monitor covers every launch-critical service family', () => {
  const names = buildChecks().map((item) => item.name);
  for (const expected of ['OAuth providers', 'Public feed data', 'Public reels data', 'Public resort data', 'Feed advertising data', 'Media upload guard', 'Private dive log guard', 'Booking history guard', 'Resort payment config', 'Apple universal links', 'Android app links']) {
    assert.ok(names.includes(expected), `missing ${expected}`);
  }
});

test('public content validators reject empty or incomplete launch data', () => {
  assert.equal(validateJson({ validator: 'feed-list' }, { data: [{ id: 'post-1', user_id: 'user-1', caption: 'Dive' }] }), '');
  assert.match(validateJson({ validator: 'feed-list' }, { data: [] }), /empty/);
  assert.equal(validateJson({ validator: 'reel-list' }, { data: [{ id: 'reel-1', publish_to_reels: true, video_url: 'https://media.example/reel.mp4' }] }), '');
  assert.match(validateJson({ validator: 'reel-list' }, { data: [{ id: 'reel-1', publish_to_reels: true }] }), /video/);
  assert.equal(validateJson({ validator: 'resort-list' }, { data: [{ id: 'resort-1', account_type: 'resort', full_name: 'Dive Resort' }] }), '');
  assert.match(validateJson({ validator: 'resort-list' }, { data: [{ id: 'member-1', account_type: 'personal', full_name: 'Member' }] }), /incomplete/);
  assert.equal(validateJson({ validator: 'ads-list' }, { ads: [] }), '');
});

test('authenticated monitor covers private read paths without mutating production', () => {
  const checks = buildAuthenticatedChecks({ token: 'test-token' });
  const names = checks.map((item) => item.name);
  for (const expected of ['Authenticated session', 'Authenticated dive logs', 'Authenticated booking history', 'Authenticated annual membership', 'Authenticated notification inbox']) {
    assert.ok(names.includes(expected), `missing ${expected}`);
  }
  assert.ok(checks.every((item) => !item.method || item.method === 'GET'));
  assert.ok(checks.every((item) => item.headers.authorization === 'Bearer test-token'));
});

test('OAuth validation requires both store login providers and production callbacks', () => {
  const check = { validator: 'oauth' };
  assert.equal(validateJson(check, { providers: { google: { enabled: true, redirectUri: 'https://api.divergram.com/google' }, apple: { enabled: true, redirectUri: 'https://api.divergram.com/apple' } } }), '');
  assert.match(validateJson(check, { providers: { google: { enabled: false }, apple: { enabled: true } } }), /Google OAuth/);
});

test('association validators reject missing app identities and signing fingerprints', () => {
  assert.equal(validateJson({ validator: 'aasa' }, { applinks: { details: [{ appID: 'TEAM.com.divergram.app.ios', components: [{ '/': '/posts/*' }] }] } }), '');
  assert.equal(validateJson({ validator: 'aasa' }, { applinks: { details: [{ appIDs: ['TEAM.com.divergram.app.ios'], components: [{ '/': '/guide*' }] }] } }), '');
  assert.match(validateJson({ validator: 'aasa' }, { applinks: { details: [] } }), /missing/);
  assert.equal(validateJson({ validator: 'assetlinks' }, [{ target: { package_name: 'com.divergram.app', sha256_cert_fingerprints: ['AA:BB'] } }]), '');
  assert.match(validateJson({ validator: 'assetlinks' }, [{ target: { package_name: 'com.divergram.app', sha256_cert_fingerprints: [] } }]), /fingerprint/);
});

test('payment validation permits sandbox as a warning but requires PayPal checkout', () => {
  const check = { validator: 'payment-config' };
  assert.equal(validateJson(check, { ok: true, enabled: true, provider: 'paypal', paypal: { enabled: true } }), '');
  assert.match(validateJson(check, { ok: true, enabled: true, provider: 'none', paypal: { enabled: false } }), /PayPal/);
});

test('binary probes accept ranged responses without downloading the response body', { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  let requestHeaders;
  globalThis.fetch = async (_url, init) => {
    requestHeaders = init.headers;
    return new Response('partial-media', { status: 206 });
  };
  try {
    const result = await runCheck({
      name: 'Media probe',
      url: 'https://media.example/reel.mp4',
      expect: [200, 206],
      headers: { range: 'bytes=0-1023' },
      readBody: false,
    });
    assert.equal(result.ok, true);
    assert.equal(requestHeaders.range, 'bytes=0-1023');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
