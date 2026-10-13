import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import {
  authorizeApplePayWithGateway,
  authorizeWalletWithGateway,
  canTransitionPayment,
  capturePayPalOrder,
  createAirwallexPaymentIntent,
  createCheckoutToken,
  createPayPalOrder,
  extractPayPalPaymentDetails,
  getResortPaymentConfig,
  paymentTokenFingerprint,
  parseAirwallexWebhookEvent,
  parsePayPalWebhookEvent,
  publicResortPaymentConfig,
  validateApplePayToken,
  validateGooglePayToken,
  validateIdempotencyKey,
  verifyAirwallexSignature,
  verifyCheckoutToken,
  verifyGatewaySignature,
  verifyPayPalWebhookSignature,
} from './resortPayments.js';

test('payment stays disabled until every server-side gateway secret exists', () => {
  const partial = getResortPaymentConfig({ RESORT_PAYMENT_PROVIDER: 'gateway', RESORT_PAYMENT_GATEWAY_URL: 'https://pay.example' });
  assert.equal(partial.enabled, false);
  assert.equal(publicResortPaymentConfig(partial).provider, 'disabled');
  const ready = getResortPaymentConfig({
    RESORT_PAYMENT_ENABLED: 'true',
    RESORT_PAYMENT_PROVIDER: 'gateway', RESORT_PAYMENT_GATEWAY_URL: 'https://pay.example/',
    RESORT_PAYMENT_GATEWAY_TOKEN: 'secret', RESORT_PAYMENT_WEBHOOK_SECRET: 'webhook',
  });
  assert.equal(ready.enabled, true);
  assert.equal(ready.gatewayUrl, 'https://pay.example');
  assert.equal('gatewayToken' in publicResortPaymentConfig(ready), false);
});

test('payment stays disabled unless the explicit production gate is enabled', () => {
  const config = getResortPaymentConfig({
    RESORT_PAYMENT_PROVIDER: 'airwallex', AIRWALLEX_ENVIRONMENT: 'sample', JWT_SECRET: 'sample-checkout-secret',
  });
  assert.equal(config.enabled, false);
  assert.equal(config.card.enabled, false);
  assert.deepEqual(publicResortPaymentConfig(config), {
    enabled: false,
    provider: 'disabled',
    sampleMode: false,
    currency: 'USD',
    applePay: config.applePay,
    googlePay: config.googlePay,
    card: { enabled: false, mode: 'gateway_checkout', sample: false },
    paypal: { enabled: false, environment: 'sandbox' },
  });
});

test('PayPal requires complete server credentials and exposes only safe checkout state', () => {
  const partial = getResortPaymentConfig({ RESORT_PAYMENT_ENABLED: 'true', RESORT_PAYMENT_PROVIDER: 'paypal', PAYPAL_CLIENT_ID: 'client' });
  assert.equal(partial.enabled, false);
  const ready = getResortPaymentConfig({
    RESORT_PAYMENT_ENABLED: 'true', RESORT_PAYMENT_PROVIDER: 'paypal', PAYPAL_ENVIRONMENT: 'sandbox',
    PAYPAL_CLIENT_ID: 'client', PAYPAL_CLIENT_SECRET: 'secret', PAYPAL_WEBHOOK_ID: 'webhook', PAYPAL_CHECKOUT_SECRET: 'checkout',
  });
  const publicConfig = publicResortPaymentConfig(ready);
  assert.equal(ready.enabled, true);
  assert.equal(publicConfig.provider, 'paypal');
  assert.deepEqual(publicConfig.card, { enabled: true, mode: 'paypal_checkout', sample: true });
  assert.deepEqual(publicConfig.paypal, { enabled: true, environment: 'sandbox' });
  assert.equal(JSON.stringify(publicConfig).includes('secret'), false);
});

test('PayPal environment switch selects isolated Sandbox and Live credentials', () => {
  const shared = {
    RESORT_PAYMENT_ENABLED: 'true', RESORT_PAYMENT_PROVIDER: 'paypal', PAYPAL_CHECKOUT_SECRET: 'checkout',
    PAYPAL_SANDBOX_CLIENT_ID: 'sandbox-client', PAYPAL_SANDBOX_CLIENT_SECRET: 'sandbox-secret', PAYPAL_SANDBOX_WEBHOOK_ID: 'sandbox-webhook',
    PAYPAL_LIVE_CLIENT_ID: 'live-client', PAYPAL_LIVE_CLIENT_SECRET: 'live-secret', PAYPAL_LIVE_WEBHOOK_ID: 'live-webhook',
  };
  const sandbox = getResortPaymentConfig({ ...shared, PAYPAL_ENVIRONMENT: 'sandbox' });
  const production = getResortPaymentConfig({ ...shared, PAYPAL_ENVIRONMENT: 'production' });
  assert.equal(sandbox.paypal.clientId, 'sandbox-client');
  assert.equal(sandbox.paypal.webhookId, 'sandbox-webhook');
  assert.equal(sandbox.sampleMode, true);
  assert.equal(production.paypal.clientId, 'live-client');
  assert.equal(production.paypal.webhookId, 'live-webhook');
  assert.equal(production.sampleMode, false);
  assert.equal(publicResortPaymentConfig(production).paypal.environment, 'production');
});

test('Airwallex sample checkout is exposed without enabling wallet authorization', () => {
  const config = getResortPaymentConfig({ RESORT_PAYMENT_ENABLED: 'true', RESORT_PAYMENT_PROVIDER: 'airwallex', AIRWALLEX_ENVIRONMENT: 'sample', JWT_SECRET: 'sample-checkout-secret' });
  const publicConfig = publicResortPaymentConfig(config);
  assert.equal(config.enabled, true);
  assert.equal(publicConfig.provider, 'airwallex');
  assert.equal(publicConfig.sampleMode, true);
  assert.deepEqual(publicConfig.card, { enabled: true, mode: 'airwallex_hpp', sample: true });
  assert.equal(publicConfig.applePay.enabled, false);
  assert.equal('airwallex' in publicConfig, false);
});

test('Airwallex checkout tokens are signed and expire', () => {
  const now = 1_700_000_000_000;
  const token = createCheckoutToken({ intentId: 'rpi_1', bookingId: 'rb_1' }, 'secret', now);
  assert.equal(verifyCheckoutToken(token, 'secret', now + 1_000)?.intentId, 'rpi_1');
  assert.equal(verifyCheckoutToken(`${token}tampered`, 'secret', now), null);
  assert.equal(verifyCheckoutToken(token, 'secret', now + 16 * 60_000), null);
});

test('Airwallex signatures require the raw payload and a recent timestamp', () => {
  const now = 1_700_000_000_000;
  const timestamp = String(now - 2_000);
  const body = Buffer.from('{"id":"evt_1"}');
  const signature = crypto.createHmac('sha256', 'webhook-secret').update(timestamp).update(body).digest('hex');
  assert.equal(verifyAirwallexSignature(body, timestamp, signature, 'webhook-secret', now), true);
  assert.equal(verifyAirwallexSignature(Buffer.from('{}'), timestamp, signature, 'webhook-secret', now), false);
  assert.equal(verifyAirwallexSignature(body, String(now - 10 * 60_000), signature, 'webhook-secret', now), false);
});

test('Airwallex payment and refund webhooks map to the local payment intent', () => {
  assert.deepEqual(parseAirwallexWebhookEvent({ id: 'evt_pay', name: 'payment_intent.succeeded', data: { object: { id: 'int_1', status: 'SUCCEEDED', latest_payment_attempt: { id: 'att_1' } } } }), {
    eventId: 'evt_pay', eventType: 'payment_intent.succeeded', providerIntentId: 'int_1', nextStatus: 'succeeded', providerPaymentId: 'att_1', providerStatus: 'SUCCEEDED',
  });
  assert.deepEqual(parseAirwallexWebhookEvent({ id: 'evt_refund', name: 'refund.succeeded', data: { object: { id: 'rfd_1', payment_intent_id: 'int_1', status: 'SUCCEEDED' } } }), {
    eventId: 'evt_refund', eventType: 'refund.succeeded', providerIntentId: 'int_1', nextStatus: 'refunded', providerPaymentId: 'rfd_1', providerStatus: 'SUCCEEDED',
  });
});

test('Airwallex adapter follows login and PaymentIntent API contracts', async () => {
  const config = getResortPaymentConfig({
    RESORT_PAYMENT_ENABLED: 'true',
    RESORT_PAYMENT_PROVIDER: 'airwallex', AIRWALLEX_ENVIRONMENT: 'demo',
    AIRWALLEX_CLIENT_ID: 'client-id', AIRWALLEX_API_KEY: 'api-key',
    AIRWALLEX_WEBHOOK_SECRET: 'webhook-secret', AIRWALLEX_CHECKOUT_SECRET: 'checkout-secret',
  });
  const requests = [];
  const result = await createAirwallexPaymentIntent(config, {
    requestId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', merchantOrderId: 'rpi_1',
    amount: '50.00', currency: 'USD', returnUrl: 'https://api.divergram.com/return', metadata: { booking_id: 'rb_1' },
  }, async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/authentication/login')) return { ok: true, async json() { return { token: 'access-token' }; } };
    return { ok: true, async json() { return { id: 'int_1', client_secret: 'client-secret', status: 'REQUIRES_PAYMENT_METHOD' }; } };
  });
  assert.equal(requests[0].options.headers['x-client-id'], 'client-id');
  assert.equal(requests[1].url, 'https://api-demo.airwallex.com/api/v1/pa/payment_intents/create');
  assert.equal(requests[1].options.headers.authorization, 'Bearer access-token');
  assert.equal(JSON.parse(requests[1].options.body).merchant_order_id, 'rpi_1');
  assert.equal(result.id, 'int_1');
});

test('PayPal adapter creates and captures a server-owned USD order', async () => {
  const config = getResortPaymentConfig({
    RESORT_PAYMENT_ENABLED: 'true', RESORT_PAYMENT_PROVIDER: 'paypal', PAYPAL_ENVIRONMENT: 'sandbox',
    PAYPAL_CLIENT_ID: 'client', PAYPAL_CLIENT_SECRET: 'secret', PAYPAL_WEBHOOK_ID: 'webhook', PAYPAL_CHECKOUT_SECRET: 'checkout',
  });
  const requests = [];
  const responses = [
    { access_token: 'access-1' },
    { id: 'ORDER-1', status: 'CREATED' },
    { access_token: 'access-2' },
    { id: 'ORDER-1', status: 'COMPLETED', payer: { payer_id: 'PAYER-1', email_address: 'buyer@example.com', name: { given_name: 'Dive', surname: 'User' } }, payment_source: { paypal: {} }, purchase_units: [{ amount: { currency_code: 'USD', value: '50.00' }, payments: { captures: [{ id: 'CAPTURE-1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '50.00' }, seller_receivable_breakdown: { gross_amount: { currency_code: 'USD', value: '50.00' }, paypal_fee: { currency_code: 'USD', value: '2.00' }, net_amount: { currency_code: 'USD', value: '48.00' } } }] } }] },
  ];
  const fetchImpl = async (url, options) => { requests.push({ url, options }); const body = responses.shift(); return { ok: true, async json() { return body; } }; };
  const order = await createPayPalOrder(config, { requestId: 'rpi_1', paymentIntentId: 'rpi_1', bookingId: 'rb_1', invoiceId: 'RB-1', amount: '50.00', currency: 'USD' }, fetchImpl);
  assert.equal(order.id, 'ORDER-1');
  assert.equal(requests[1].url, 'https://api-m.sandbox.paypal.com/v2/checkout/orders');
  const createOrderBody = JSON.parse(requests[1].options.body);
  assert.equal(createOrderBody.purchase_units[0].custom_id, 'rb_1');
  assert.equal(createOrderBody.payment_source, undefined);
  const captured = await capturePayPalOrder(config, order.id, 'capture:rpi_1', fetchImpl);
  const details = extractPayPalPaymentDetails(captured);
  assert.deepEqual(details, { orderId: 'ORDER-1', orderStatus: 'COMPLETED', captureId: 'CAPTURE-1', captureStatus: 'COMPLETED', amount: 50, currency: 'USD', payerId: 'PAYER-1', payerEmail: 'buyer@example.com', payerName: 'Dive User', paymentSource: 'paypal', grossAmount: 50, feeAmount: 2, netAmount: 48, settlementCurrency: 'USD' });
  assert.equal(requests[3].options.headers['paypal-request-id'], 'capture:rpi_1');
});

test('PayPal webhooks are remotely verified and mapped without trusting client state', async () => {
  const config = getResortPaymentConfig({
    RESORT_PAYMENT_ENABLED: 'true', RESORT_PAYMENT_PROVIDER: 'paypal', PAYPAL_ENVIRONMENT: 'sandbox',
    PAYPAL_CLIENT_ID: 'client', PAYPAL_CLIENT_SECRET: 'secret', PAYPAL_WEBHOOK_ID: 'WH-1', PAYPAL_CHECKOUT_SECRET: 'checkout',
  });
  const responses = [{ access_token: 'access' }, { verification_status: 'SUCCESS' }];
  const requests = [];
  const verified = await verifyPayPalWebhookSignature(config, {
    'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.paypal.com/cert', 'paypal-transmission-id': 'tx-1', 'paypal-transmission-sig': 'sig', 'paypal-transmission-time': '2026-09-23T00:00:00Z',
  }, { id: 'evt-1', event_type: 'PAYMENT.CAPTURE.COMPLETED' }, async (url, options) => { requests.push({ url, options }); return { ok: true, async json() { return responses.shift(); } }; });
  assert.equal(verified, true);
  assert.equal(JSON.parse(requests[1].options.body).webhook_id, 'WH-1');
  assert.deepEqual(parsePayPalWebhookEvent({ id: 'evt-1', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAPTURE-1', amount: { value: '50.00', currency_code: 'USD' }, supplementary_data: { related_ids: { order_id: 'ORDER-1' } } } }), { eventId: 'evt-1', eventType: 'PAYMENT.CAPTURE.COMPLETED', nextStatus: 'succeeded', orderId: 'ORDER-1', captureId: 'CAPTURE-1', refundId: '', refundAmount: 50, currency: 'USD' });
});

test('idempotency keys and Apple Pay tokens are validated and fingerprinted', () => {
  assert.equal(validateIdempotencyKey('booking:1234567890'), 'booking:1234567890');
  assert.throws(() => validateIdempotencyKey('short'), /invalid_payment_idempotency_key/);
  const token = Buffer.from('{"paymentData":"safe-test-value"}').toString('base64');
  assert.equal(validateApplePayToken(token), token);
  assert.equal(paymentTokenFingerprint(token).length, 64);
});

test('Google Pay gateway tokens are accepted as opaque values and never normalized', () => {
  const token = JSON.stringify({ signature: 'test', protocolVersion: 'ECv2', signedMessage: 'sample' });
  assert.equal(validateGooglePayToken(token), token);
  assert.equal(validateGooglePayToken('gateway-opaque-token-value'), 'gateway-opaque-token-value');
  assert.throws(() => validateGooglePayToken('short'), /invalid_google_pay_token/);
});

test('gateway webhook signatures are timing-safe and exact', () => {
  const body = Buffer.from('{"eventId":"evt_1"}');
  const signature = crypto.createHmac('sha256', 'secret').update(body).digest('hex');
  assert.equal(verifyGatewaySignature(body, `sha256=${signature}`, 'secret'), true);
  assert.equal(verifyGatewaySignature(body, '0'.repeat(64), 'secret'), false);
});

test('final payment states cannot be reopened', () => {
  assert.equal(canTransitionPayment('pending', 'processing'), true);
  assert.equal(canTransitionPayment('processing', 'succeeded'), true);
  assert.equal(canTransitionPayment('failed', 'succeeded'), true);
  assert.equal(canTransitionPayment('succeeded', 'processing'), false);
  assert.equal(canTransitionPayment('succeeded', 'refunded'), true);
});

test('gateway authorization forwards canonical amount and idempotency key', async () => {
  const config = getResortPaymentConfig({
    RESORT_PAYMENT_ENABLED: 'true',
    RESORT_PAYMENT_PROVIDER: 'gateway', RESORT_PAYMENT_GATEWAY_URL: 'https://pay.example',
    RESORT_PAYMENT_GATEWAY_TOKEN: 'secret', RESORT_PAYMENT_WEBHOOK_SECRET: 'webhook',
  });
  let request;
  const result = await authorizeApplePayWithGateway(config, {
    paymentIntentId: 'rpi_1', bookingId: 'rb_1', amount: '25.00', currency: 'USD',
    applePayToken: 'not-stored', idempotencyKey: 'booking:1234567890',
  }, async (url, options) => {
    request = { url, options };
    return { ok: true, async json() { return { status: 'succeeded', providerPaymentId: 'pay_1' }; } };
  });
  assert.equal(request.url, 'https://pay.example/apple-pay/authorize');
  assert.equal(request.options.headers['idempotency-key'], 'booking:1234567890');
  assert.equal(JSON.parse(request.options.body).amount, '25.00');
  assert.equal(result.providerPaymentId, 'pay_1');
});

test('Google Pay authorization uses the shared gateway contract', async () => {
  const config = getResortPaymentConfig({
    RESORT_PAYMENT_ENABLED: 'true',
    RESORT_PAYMENT_PROVIDER: 'gateway', RESORT_PAYMENT_GATEWAY_URL: 'https://pay.example',
    RESORT_PAYMENT_GATEWAY_TOKEN: 'secret', RESORT_PAYMENT_WEBHOOK_SECRET: 'webhook',
  });
  let request;
  await authorizeWalletWithGateway(config, 'google_pay', {
    paymentIntentId: 'rpi_2', bookingId: 'rb_2', amount: '18.00', currency: 'USD',
    googlePayToken: '{"sample":true}', idempotencyKey: 'googlepay:1234567890',
  }, async (url, options) => {
    request = { url, options };
    return { ok: true, async json() { return { status: 'succeeded', providerPaymentId: 'pay_2' }; } };
  });
  assert.equal(request.url, 'https://pay.example/google-pay/authorize');
  assert.equal(JSON.parse(request.options.body).currency, 'USD');
});

test('wallet authorization completes against an HTTP sandbox gateway', async (t) => {
  const server = http.createServer((req, res) => {
    assert.equal(req.url, '/google-pay/authorize');
    assert.equal(req.headers.authorization, 'Bearer sandbox-secret');
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      const payload = JSON.parse(raw);
      assert.equal(payload.amount, '12.50');
      assert.equal(payload.currency, 'USD');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'succeeded', providerPaymentId: 'sandbox_pay_1' }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const config = getResortPaymentConfig({
    RESORT_PAYMENT_ENABLED: 'true',
    RESORT_PAYMENT_PROVIDER: 'gateway', RESORT_PAYMENT_GATEWAY_URL: `http://127.0.0.1:${address.port}`,
    RESORT_PAYMENT_GATEWAY_TOKEN: 'sandbox-secret', RESORT_PAYMENT_WEBHOOK_SECRET: 'webhook-secret',
  });
  const result = await authorizeWalletWithGateway(config, 'google_pay', {
    paymentIntentId: 'rpi_sandbox', bookingId: 'rb_sandbox', amount: '12.50', currency: 'USD',
    googlePayToken: 'opaque-sandbox-token', idempotencyKey: 'googlepay:sandbox:123456',
  });
  assert.equal(result.status, 'succeeded');
  assert.equal(result.providerPaymentId, 'sandbox_pay_1');
});
