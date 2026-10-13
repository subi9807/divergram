import crypto from 'node:crypto';

const PAYMENT_STATUSES = new Set(['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded']);
const FINAL_PAYMENT_STATUSES = new Set(['succeeded', 'cancelled', 'refunded']);

function clean(value, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

export function getResortPaymentConfig(env = process.env) {
  const explicitlyEnabled = clean(env.RESORT_PAYMENT_ENABLED, 10).toLowerCase() === 'true';
  const provider = clean(env.RESORT_PAYMENT_PROVIDER, 40).toLowerCase();
  const gatewayUrl = clean(env.RESORT_PAYMENT_GATEWAY_URL, 500).replace(/\/+$/, '');
  const gatewayToken = clean(env.RESORT_PAYMENT_GATEWAY_TOKEN, 2000);
  const webhookSecret = clean(env.RESORT_PAYMENT_WEBHOOK_SECRET, 2000);
  const gatewayReady = provider === 'gateway' && Boolean(gatewayUrl && gatewayToken && webhookSecret);
  const airwallexEnvironment = clean(env.AIRWALLEX_ENVIRONMENT || 'sample', 20).toLowerCase();
  const airwallexClientId = clean(env.AIRWALLEX_CLIENT_ID, 300);
  const airwallexApiKey = clean(env.AIRWALLEX_API_KEY, 1000);
  const airwallexWebhookSecret = clean(env.AIRWALLEX_WEBHOOK_SECRET, 1000);
  const airwallexCheckoutSecret = clean(env.AIRWALLEX_CHECKOUT_SECRET || env.JWT_SECRET, 1000);
  const airwallexSample = provider === 'airwallex' && airwallexEnvironment === 'sample' && Boolean(airwallexCheckoutSecret);
  const airwallexLiveReady = provider === 'airwallex'
    && ['demo', 'production'].includes(airwallexEnvironment)
    && Boolean(airwallexClientId && airwallexApiKey && airwallexWebhookSecret && airwallexCheckoutSecret);
  const paypalEnvironment = clean(env.PAYPAL_ENVIRONMENT || 'sandbox', 20).toLowerCase();
  const paypalPrefix = paypalEnvironment === 'production' ? 'PAYPAL_LIVE' : 'PAYPAL_SANDBOX';
  const paypalClientId = clean(env[`${paypalPrefix}_CLIENT_ID`] || env.PAYPAL_CLIENT_ID, 500);
  const paypalClientSecret = clean(env[`${paypalPrefix}_CLIENT_SECRET`] || env.PAYPAL_CLIENT_SECRET, 2000);
  const paypalWebhookId = clean(env[`${paypalPrefix}_WEBHOOK_ID`] || env.PAYPAL_WEBHOOK_ID, 500);
  const paypalCheckoutSecret = clean(env.PAYPAL_CHECKOUT_SECRET || env.JWT_SECRET, 1000);
  const paypalReady = provider === 'paypal'
    && ['sandbox', 'production'].includes(paypalEnvironment)
    && Boolean(paypalClientId && paypalClientSecret && paypalWebhookId && paypalCheckoutSecret);
  const paymentReady = explicitlyEnabled && (gatewayReady || airwallexSample || airwallexLiveReady || paypalReady);
  const merchantIdentifier = clean(env.APPLE_PAY_MERCHANT_ID || 'merchant.com.divergram.app', 200);
  const countryCode = clean(env.APPLE_PAY_COUNTRY_CODE || 'US', 2).toUpperCase();
  const supportedNetworks = clean(env.APPLE_PAY_SUPPORTED_NETWORKS || 'visa,masterCard,amex', 200)
    .split(',')
    .map((value) => clean(value, 30))
    .filter(Boolean);
  const googlePayEnvironment = clean(env.GOOGLE_PAY_ENVIRONMENT || 'TEST', 10).toUpperCase();
  const googlePayGateway = clean(env.GOOGLE_PAY_GATEWAY, 100);
  const googlePayGatewayMerchantId = clean(env.GOOGLE_PAY_GATEWAY_MERCHANT_ID, 200);
  const googlePayMerchantId = clean(env.GOOGLE_PAY_MERCHANT_ID, 200);
  const googlePayCountryCode = clean(env.GOOGLE_PAY_COUNTRY_CODE || 'US', 2).toUpperCase();
  const googlePayNetworks = clean(env.GOOGLE_PAY_SUPPORTED_NETWORKS || 'VISA,MASTERCARD,AMEX,JCB', 200)
    .split(',')
    .map((value) => clean(value, 30).toUpperCase())
    .filter(Boolean);
  const googlePayEnabled = gatewayReady
    && ['TEST', 'PRODUCTION'].includes(googlePayEnvironment)
    && Boolean(googlePayGateway && googlePayGatewayMerchantId)
    && (googlePayEnvironment === 'TEST' || Boolean(googlePayMerchantId));
  return {
    enabled: paymentReady,
    provider: paymentReady ? provider : 'disabled',
    sampleMode: airwallexSample || (paypalReady && paypalEnvironment === 'sandbox'),
    applePay: {
      enabled: gatewayReady && Boolean(merchantIdentifier),
      merchantIdentifier,
      countryCode,
      supportedNetworks,
    },
    googlePay: {
      enabled: googlePayEnabled,
      environment: googlePayEnvironment,
      merchantName: clean(env.GOOGLE_PAY_MERCHANT_NAME || 'Divergram', 100),
      merchantId: googlePayMerchantId,
      countryCode: googlePayCountryCode,
      supportedNetworks: googlePayNetworks,
      gateway: googlePayGateway,
      gatewayMerchantId: googlePayGatewayMerchantId,
    },
    card: {
      enabled: explicitlyEnabled && (airwallexSample || airwallexLiveReady || paypalReady),
      mode: provider === 'airwallex' ? 'airwallex_hpp' : provider === 'paypal' ? 'paypal_checkout' : 'gateway_checkout',
      sample: airwallexSample || (paypalReady && paypalEnvironment === 'sandbox'),
    },
    gatewayUrl,
    gatewayToken,
    webhookSecret,
    airwallex: {
      environment: airwallexEnvironment,
      apiBaseUrl: airwallexEnvironment === 'production'
        ? 'https://api.airwallex.com/api/v1'
        : 'https://api-demo.airwallex.com/api/v1',
      clientId: airwallexClientId,
      apiKey: airwallexApiKey,
      webhookSecret: airwallexWebhookSecret,
      checkoutSecret: airwallexCheckoutSecret,
      liveReady: airwallexLiveReady,
    },
    paypal: {
      environment: paypalEnvironment,
      apiBaseUrl: paypalEnvironment === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
      sdkBaseUrl: paypalEnvironment === 'production' ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com',
      clientId: paypalClientId,
      clientSecret: paypalClientSecret,
      webhookId: paypalWebhookId,
      checkoutSecret: paypalCheckoutSecret,
      ready: paypalReady,
    },
  };
}

export function publicResortPaymentConfig(config) {
  return {
    enabled: config.enabled,
    provider: config.provider,
    sampleMode: config.enabled && config.sampleMode,
    currency: 'USD',
    applePay: config.applePay,
    googlePay: config.googlePay,
    card: config.enabled
      ? config.card
      : { enabled: false, mode: 'gateway_checkout', sample: false },
    paypal: {
      enabled: Boolean(config.enabled && config.provider === 'paypal' && config.paypal?.ready),
      environment: config.paypal?.environment === 'production' ? 'production' : 'sandbox',
    },
  };
}

export function createCheckoutToken(payload, secret, now = Date.now()) {
  if (!secret) throw new Error('airwallex_checkout_secret_missing');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: now + 15 * 60_000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyCheckoutToken(token, secret, now = Date.now()) {
  const [body = '', supplied = ''] = clean(token, 5000).split('.');
  if (!body || !supplied || !secret) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return Number(payload.exp) >= now ? payload : null;
  } catch {
    return null;
  }
}

export function verifyAirwallexSignature(rawBody, timestamp, signature, secret, now = Date.now()) {
  if (!rawBody || !timestamp || !signature || !secret) return false;
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(now - timestampNumber) > 5 * 60_000) return false;
  const expected = crypto.createHmac('sha256', secret)
    .update(String(timestamp))
    .update(rawBody)
    .digest('hex');
  const supplied = clean(signature, 256).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'));
}

export function parseAirwallexWebhookEvent(body) {
  const eventId = clean(body?.id, 200);
  const eventType = clean(body?.name || body?.type, 120).toLowerCase();
  const object = body?.data?.object || {};
  const isRefund = eventType === 'refund.succeeded' || eventType.endsWith('.refunded');
  const providerIntentId = clean(isRefund ? object?.payment_intent_id : object?.id || object?.payment_intent_id, 200);
  const nextStatus = isRefund
    ? 'refunded'
    : eventType.endsWith('.succeeded')
      ? 'succeeded'
      : eventType.endsWith('.cancelled')
        ? 'cancelled'
        : eventType.endsWith('.failed')
          ? 'failed'
          : '';
  return {
    eventId,
    eventType,
    providerIntentId,
    nextStatus,
    providerPaymentId: clean(isRefund ? object?.id : object?.latest_payment_attempt?.id || object?.payment_attempt_id, 200),
    providerStatus: clean(object?.status, 80),
  };
}

async function airwallexRequest(config, path, options, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetchImpl(`${config.airwallex.apiBaseUrl}${path}`, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(clean(body?.message || body?.code || 'airwallex_request_failed', 200));
      error.status = response.status >= 500 ? 502 : 400;
      error.gatewayCode = clean(body?.code || '', 100);
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createAirwallexPaymentIntent(config, payload, fetchImpl = fetch) {
  if (!config.airwallex?.liveReady) {
    const error = new Error('airwallex_credentials_not_configured');
    error.status = 503;
    throw error;
  }
  const login = await airwallexRequest(config, '/authentication/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-client-id': config.airwallex.clientId, 'x-api-key': config.airwallex.apiKey },
  }, fetchImpl);
  const accessToken = clean(login?.token, 5000);
  if (!accessToken) throw new Error('airwallex_access_token_missing');
  const intent = await airwallexRequest(config, '/pa/payment_intents/create', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      request_id: payload.requestId,
      merchant_order_id: payload.merchantOrderId,
      amount: Number(payload.amount),
      currency: payload.currency,
      descriptor: 'Divergram Resort',
      return_url: payload.returnUrl,
      metadata: payload.metadata,
    }),
  }, fetchImpl);
  if (!clean(intent?.id, 200) || !clean(intent?.client_secret, 5000)) throw new Error('airwallex_payment_intent_invalid');
  return intent;
}

async function paypalRequest(config, path, options = {}, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetchImpl(`${config.paypal.apiBaseUrl}${path}`, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = body?.details?.[0];
      const error = new Error(clean(detail?.issue || body?.name || body?.message || 'paypal_request_failed', 200));
      error.status = response.status >= 500 ? 502 : response.status === 401 ? 503 : 400;
      error.gatewayCode = clean(detail?.issue || body?.name || '', 100);
      error.debugId = clean(body?.debug_id || '', 100);
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getPayPalAccessToken(config, fetchImpl = fetch) {
  if (!config.paypal?.ready) {
    const error = new Error('paypal_credentials_not_configured');
    error.status = 503;
    throw error;
  }
  const credentials = Buffer.from(`${config.paypal.clientId}:${config.paypal.clientSecret}`).toString('base64');
  const body = await paypalRequest(config, '/v1/oauth2/token', {
    method: 'POST',
    headers: { authorization: `Basic ${credentials}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  }, fetchImpl);
  const accessToken = clean(body?.access_token, 5000);
  if (!accessToken) throw new Error('paypal_access_token_missing');
  return accessToken;
}

export async function createPayPalOrder(config, payload, fetchImpl = fetch) {
  const accessToken = await getPayPalAccessToken(config, fetchImpl);
  const body = await paypalRequest(config, '/v2/checkout/orders', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'paypal-request-id': payload.requestId,
      prefer: 'return=representation',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: payload.paymentIntentId,
        custom_id: payload.bookingId,
        invoice_id: payload.invoiceId,
        description: clean(payload.description || 'Divergram resort booking deposit', 127),
        amount: { currency_code: payload.currency, value: Number(payload.amount).toFixed(2) },
      }],
    }),
  }, fetchImpl);
  if (!clean(body?.id, 200) || clean(body?.status, 40) !== 'CREATED') throw new Error('paypal_order_invalid');
  return body;
}

export async function capturePayPalOrder(config, orderId, requestId, fetchImpl = fetch) {
  const accessToken = await getPayPalAccessToken(config, fetchImpl);
  return paypalRequest(config, `/v2/checkout/orders/${encodeURIComponent(clean(orderId, 200))}/capture`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'paypal-request-id': requestId,
      prefer: 'return=representation',
    },
    body: '{}',
  }, fetchImpl);
}

export function extractPayPalPaymentDetails(order) {
  const unit = order?.purchase_units?.[0] || {};
  const capture = unit?.payments?.captures?.[0] || {};
  const breakdown = capture?.seller_receivable_breakdown || {};
  const source = Object.keys(order?.payment_source || {})[0] || 'paypal';
  const payerName = [order?.payer?.name?.given_name, order?.payer?.name?.surname].map((value) => clean(value, 100)).filter(Boolean).join(' ');
  return {
    orderId: clean(order?.id, 200),
    orderStatus: clean(order?.status, 40),
    captureId: clean(capture?.id, 200),
    captureStatus: clean(capture?.status, 40),
    amount: Number(capture?.amount?.value || unit?.amount?.value || 0),
    currency: clean(capture?.amount?.currency_code || unit?.amount?.currency_code, 3).toUpperCase(),
    payerId: clean(order?.payer?.payer_id, 200),
    payerEmail: clean(order?.payer?.email_address, 320),
    payerName,
    paymentSource: clean(source, 80),
    grossAmount: Number(breakdown?.gross_amount?.value || capture?.amount?.value || 0),
    feeAmount: Number(breakdown?.paypal_fee?.value || 0),
    netAmount: Number(breakdown?.net_amount?.value || capture?.amount?.value || 0),
    settlementCurrency: clean(breakdown?.net_amount?.currency_code || capture?.amount?.currency_code, 3).toUpperCase(),
  };
}

export async function verifyPayPalWebhookSignature(config, headers, event, fetchImpl = fetch) {
  if (!config.paypal?.ready || !config.paypal.webhookId) return false;
  const accessToken = await getPayPalAccessToken(config, fetchImpl);
  const result = await paypalRequest(config, '/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      auth_algo: clean(headers?.['paypal-auth-algo'], 100),
      cert_url: clean(headers?.['paypal-cert-url'], 1000),
      transmission_id: clean(headers?.['paypal-transmission-id'], 200),
      transmission_sig: clean(headers?.['paypal-transmission-sig'], 1000),
      transmission_time: clean(headers?.['paypal-transmission-time'], 100),
      webhook_id: config.paypal.webhookId,
      webhook_event: event,
    }),
  }, fetchImpl);
  return clean(result?.verification_status, 40).toUpperCase() === 'SUCCESS';
}

export function parsePayPalWebhookEvent(body) {
  const eventType = clean(body?.event_type, 120).toUpperCase();
  const resource = body?.resource || {};
  const related = resource?.supplementary_data?.related_ids || {};
  const nextStatus = eventType === 'PAYMENT.CAPTURE.COMPLETED'
    ? 'succeeded'
    : ['PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.DECLINED'].includes(eventType)
      ? 'failed'
      : ['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'].includes(eventType)
        ? 'refunded'
        : '';
  return {
    eventId: clean(body?.id, 200),
    eventType,
    nextStatus,
    orderId: clean(related?.order_id || resource?.id, 200),
    captureId: clean(related?.capture_id || (eventType.startsWith('PAYMENT.CAPTURE.') ? resource?.id : ''), 200),
    refundId: eventType.includes('REFUND') ? clean(resource?.id, 200) : '',
    refundAmount: Number(resource?.amount?.value || 0),
    currency: clean(resource?.amount?.currency_code, 3).toUpperCase(),
  };
}

export function validateIdempotencyKey(value) {
  const key = clean(value, 100);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,99}$/.test(key)) {
    const error = new Error('invalid_payment_idempotency_key');
    error.status = 400;
    throw error;
  }
  return key;
}

export function validateApplePayToken(value) {
  const raw = String(value ?? '').trim();
  const token = raw.slice(0, 250_000);
  if (raw.length > 250_000 || token.length < 32 || !/^[A-Za-z0-9+/=_-]+$/.test(token)) {
    const error = new Error('invalid_apple_pay_token');
    error.status = 400;
    throw error;
  }
  return token;
}

export function validateGooglePayToken(value) {
  const raw = String(value ?? '').trim();
  if (raw.length < 16 || raw.length > 250_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(raw)) {
    const error = new Error('invalid_google_pay_token');
    error.status = 400;
    throw error;
  }
  return raw;
}

export function paymentTokenFingerprint(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyGatewaySignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const supplied = clean(signature, 256).replace(/^sha256=/i, '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'));
}

export function canTransitionPayment(from, to) {
  if (!PAYMENT_STATUSES.has(from) || !PAYMENT_STATUSES.has(to)) return false;
  if (from === to) return true;
  if (FINAL_PAYMENT_STATUSES.has(from)) return from === 'succeeded' && to === 'refunded';
  if (from === 'pending') return ['processing', 'failed', 'cancelled'].includes(to);
  if (from === 'processing') return ['succeeded', 'failed', 'cancelled'].includes(to);
  // A provider-authenticated webhook can arrive after a local timeout marked
  // the attempt failed. It is authoritative and may reconcile the payment.
  if (from === 'failed') return ['processing', 'succeeded', 'cancelled'].includes(to);
  return false;
}

export async function authorizeWalletWithGateway(config, paymentMethod, payload, fetchImpl = fetch) {
  if (!config.enabled) {
    const error = new Error('resort_payment_provider_not_configured');
    error.status = 503;
    throw error;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    if (!['apple_pay', 'google_pay'].includes(paymentMethod)) {
      const error = new Error('unsupported_payment_method');
      error.status = 400;
      throw error;
    }
    const response = await fetchImpl(`${config.gatewayUrl}/${paymentMethod.replace('_', '-')}/authorize`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.gatewayToken}`,
        'idempotency-key': payload.idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(clean(body?.error || 'payment_gateway_rejected', 100));
      error.status = response.status >= 500 ? 502 : 402;
      error.gatewayCode = clean(body?.code || '', 100);
      throw error;
    }
    if (body?.status !== 'succeeded') {
      const error = new Error('payment_gateway_unconfirmed');
      error.status = 502;
      throw error;
    }
    return {
      status: 'succeeded',
      providerIntentId: clean(body.providerIntentId, 200),
      providerPaymentId: clean(body.providerPaymentId, 200),
      receiptUrl: clean(body.receiptUrl, 1000),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function authorizeApplePayWithGateway(config, payload, fetchImpl = fetch) {
  return authorizeWalletWithGateway(config, 'apple_pay', payload, fetchImpl);
}
