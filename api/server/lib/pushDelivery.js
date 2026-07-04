import crypto from 'node:crypto';
import fs from 'node:fs';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_CHUNK_SIZE = 50;
export const ALL_USERS_TOPIC = String(process.env.FCM_ALL_USERS_TOPIC || 'all_users').trim() || 'all_users';

let fcmAccessTokenCache = { token: '', exp: 0 };

export function isExpoPushToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return false;
  return /^ExponentPushToken\[[^\]]+\]$/.test(raw) || /^ExpoPushToken\[[^\]]+\]$/.test(raw);
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function readServiceAccount() {
  const rawJson = String(process.env.FCM_SERVICE_ACCOUNT_JSON || '').trim();
  const rawPath = String(process.env.FCM_SERVICE_ACCOUNT_PATH || '').trim();
  let raw = '';
  if (rawJson) {
    raw = rawJson;
  } else if (rawPath) {
    raw = fs.readFileSync(rawPath, 'utf8');
  } else {
    throw new Error('missing_fcm_service_account');
  }

  const sa = JSON.parse(raw);
  if (!sa.client_email || !sa.private_key || !sa.project_id) {
    throw new Error('invalid_service_account_json');
  }
  return sa;
}

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (fcmAccessTokenCache.token && fcmAccessTokenCache.exp - 60 > now) {
    return fcmAccessTokenCache.token;
  }

  const sa = readServiceAccount();
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(sa.private_key).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${unsigned}.${signature}`;

  const form = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const json = await resp.json().catch(() => null);
  if (!resp.ok || !json?.access_token) {
    throw new Error(`oauth_token_failed:${json?.error || resp.status}`);
  }

  fcmAccessTokenCache = { token: json.access_token, exp: now + Number(json.expires_in || 3600) };
  return json.access_token;
}

export async function sendExpoPushMessages(messages) {
  const tickets = [];
  const errors = [];
  if (!messages.length) return { tickets, errors };

  for (let i = 0; i < messages.length; i += EXPO_PUSH_CHUNK_SIZE) {
    const batch = messages.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        errors.push({ type: 'http_error', status: response.status, payload });
        continue;
      }
      if (!payload || !Array.isArray(payload.data)) {
        errors.push({ type: 'invalid_response', payload });
        continue;
      }

      tickets.push(...payload.data);
    } catch (error) {
      errors.push({ type: 'network_error', message: String(error?.message || error) });
    }
  }

  return { tickets, errors };
}

export async function sendFcmPushToToken(token, title, body, data = {}) {
  const cleanToken = String(token || '').trim();
  if (!cleanToken) return { ok: false, reason: 'missing_token' };

  try {
    const sa = readServiceAccount();
    const accessToken = await getGoogleAccessToken();

    const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token: cleanToken,
          notification: { title, body },
          data,
          android: { priority: 'high' },
          apns: { headers: { 'apns-priority': '10' } },
        },
      }),
    });

    let json = null;
    try {
      json = await resp.json();
    } catch {}

    if (!resp.ok) {
      const msg = String(json?.error?.message || `http_${resp.status}`);
      return { ok: false, reason: msg, detail: json };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: String(error?.message || error) };
  }
}

export async function sendFcmPushToTopic(topic, title, body, data = {}) {
  const cleanTopic = String(topic || '').trim();
  if (!cleanTopic) return { ok: false, reason: 'missing_topic' };

  try {
    const sa = readServiceAccount();
    const accessToken = await getGoogleAccessToken();

    const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          topic: cleanTopic,
          notification: { title, body },
          data,
          android: { priority: 'high' },
          apns: { headers: { 'apns-priority': '10' } },
        },
      }),
    });

    let json = null;
    try {
      json = await resp.json();
    } catch {}

    if (!resp.ok) {
      const msg = String(json?.error?.message || `http_${resp.status}`);
      return { ok: false, reason: msg, detail: json };
    }
    return { ok: true, provider: 'fcm-topic', topic: cleanTopic };
  } catch (error) {
    return { ok: false, reason: String(error?.message || error) };
  }
}

export async function sendPushToToken(token, title, body, data = {}) {
  if (isExpoPushToken(token)) {
    const result = await sendExpoPushMessages([
      {
        to: token,
        title,
        body,
        sound: 'default',
        priority: 'high',
        data,
      },
    ]);
    const ticket = result.tickets[0];
    if (ticket?.status === 'ok') return { ok: true, provider: 'expo' };
    return { ok: false, provider: 'expo', reason: ticket?.details?.error || result.errors[0]?.type || 'expo_push_failed' };
  }

  const result = await sendFcmPushToToken(token, title, body, data);
  return { ...result, provider: 'fcm' };
}
