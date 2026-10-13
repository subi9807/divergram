import test from 'node:test';
import assert from 'node:assert/strict';

test('API settings never return a secret value', async () => {
  process.env.OPENAI_API_KEY = 'sk-test-secret-value';
  const { API_SERVICE_CATALOG, publicApiService } = await import('./apiSettings.js');
  const service = API_SERVICE_CATALOG.find((row) => row.id === 'openai');
  const output = publicApiService(service, null);
  const key = output.fields.find((field) => field.envName === 'OPENAI_API_KEY');
  assert.equal(key.configured, true);
  assert.equal(key.value, '');
  assert.equal(key.maskedValue, '••••••••');
  assert.equal(JSON.stringify(output).includes('sk-test-secret-value'), false);
});

test('API settings reject malformed credentials and unsafe provider URLs without exposing values', async () => {
  const { API_SERVICE_CATALOG, validateApiSettingInput, publicApiService } = await import('./apiSettings.js');
  const service = id => API_SERVICE_CATALOG.find(row => row.id === id);
  assert.throws(() => validateApiSettingInput(service('smtp'), { values: { SMTP_PORT: '70000' } }), { status: 400 });
  assert.throws(() => validateApiSettingInput(service('fcm'), { values: { FCM_SERVICE_ACCOUNT_JSON: '{private' } }), { status: 400 });
  assert.throws(() => validateApiSettingInput(service('infobip'), { values: { INFOBIP_BASE_URL: 'https://localhost/private' } }), { status: 400 });
  assert.throws(() => validateApiSettingInput(service('openai'), { values: { JWT_SECRET: 'do-not-accept' } }), { status: 400 });
  assert.throws(() => validateApiSettingInput(service('smtp'), { enabled: 'false' }), { status: 400 });
  assert.doesNotThrow(() => validateApiSettingInput(service('infobip'), { values: { INFOBIP_BASE_URL: 'https://example.api.infobip.com' } }));
  assert.doesNotThrow(() => validateApiSettingInput(service('smtp'), { values: { SMTP_PORT: '587', SMTP_PASS: '' } }));
  const field = publicApiService(service('openai'), { config: { OPENAI_API_KEY: 'abc' } }).fields[0];
  assert.equal(field.value, '');
  assert.equal(field.maskedValue.includes('abc'), false);
});

test('PayPal admin settings separate Sandbox and Live secrets without legacy donation fields', async () => {
  const { API_SERVICE_CATALOG, publicApiService } = await import('./apiSettings.js');
  const service = API_SERVICE_CATALOG.find(row => row.id === 'paypal');
  const names = service.fields.map(field => field[0]);
  assert.deepEqual(names, [
    'PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET', 'PAYPAL_SANDBOX_WEBHOOK_ID',
    'PAYPAL_LIVE_CLIENT_ID', 'PAYPAL_LIVE_CLIENT_SECRET', 'PAYPAL_LIVE_WEBHOOK_ID',
  ]);
  const output = publicApiService(service, { config: { PAYPAL_SANDBOX_CLIENT_SECRET: 'never-return-this-secret' } });
  const secret = output.fields.find(field => field.envName === 'PAYPAL_SANDBOX_CLIENT_SECRET');
  assert.equal(secret.configured, true);
  assert.equal(secret.value, '');
  assert.equal(JSON.stringify(output).includes('never-return-this-secret'), false);
});

test('API settings expose registerable callback URLs without callback secrets', async () => {
  process.env.PUBLIC_API_BASE_URL = 'https://api.divergram.com';
  process.env.OAUTH_CALLBACK_BASE_URL = 'https://divergram.com';
  process.env.INFOBIP_BILLING_CALLBACK_TOKEN = 'do-not-expose-this-token';
  const { API_SERVICE_CATALOG, publicApiService } = await import('./apiSettings.js');
  const service = id => API_SERVICE_CATALOG.find(row => row.id === id);

  assert.equal(publicApiService(service('google-login'), null).callbacks[0].url, 'https://divergram.com/api/auth/oauth/google/callback');
  assert.equal(publicApiService(service('paypal'), null).callbacks[0].url, 'https://api.divergram.com/api/resort-payments/webhooks/paypal');
  const infobip = publicApiService(service('infobip'), null);
  assert.equal(infobip.callbacks[0].url, 'https://api.divergram.com/api/integrations/infobip/billing/callback');
  assert.equal(JSON.stringify(infobip).includes('do-not-expose-this-token'), false);
});
