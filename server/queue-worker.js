import dotenv from 'dotenv';
import pg from 'pg';
import crypto from 'node:crypto';
import fs from 'node:fs';

dotenv.config({ path: '.env.server' });

const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'divergram',
  user: process.env.PGUSER || 'seowoo',
  password: process.env.PGPASSWORD || undefined,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.PGPOOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_MS || 10000),
});

const POLL_MS = Math.max(500, Number(process.env.JOB_WORKER_POLL_MS || 2000));
const BATCH_SIZE = Math.min(200, Math.max(1, Number(process.env.JOB_WORKER_BATCH || 25)));
const MAX_ATTEMPTS = Math.min(20, Math.max(1, Number(process.env.JOB_WORKER_MAX_ATTEMPTS || 5)));
const FCM_SERVICE_ACCOUNT_JSON = String(process.env.FCM_SERVICE_ACCOUNT_JSON || '').trim();
const FCM_SERVICE_ACCOUNT_PATH = String(process.env.FCM_SERVICE_ACCOUNT_PATH || '').trim();
let fcmAccessTokenCache = { token: '', exp: 0 };

async function claimJobs(limit = BATCH_SIZE) {
  const q = await pool.query(
    `WITH picked AS (
       SELECT id
       FROM app_jobs
       WHERE status='queued'
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE app_jobs j
     SET status='processing', attempts=j.attempts+1, updated_at=now()
     FROM picked
     WHERE j.id = picked.id
     RETURNING j.*`,
    [limit]
  );
  return q.rows || [];
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function readServiceAccount() {
  let raw = '';
  if (FCM_SERVICE_ACCOUNT_JSON) {
    raw = FCM_SERVICE_ACCOUNT_JSON;
  } else if (FCM_SERVICE_ACCOUNT_PATH) {
    raw = fs.readFileSync(FCM_SERVICE_ACCOUNT_PATH, 'utf8');
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
  const iat = now;
  const exp = now + 3600;
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp,
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
  const json = await resp.json();
  if (!resp.ok || !json.access_token) {
    throw new Error(`oauth_token_failed:${json.error || resp.status}`);
  }

  fcmAccessTokenCache = { token: json.access_token, exp: now + Number(json.expires_in || 3600) };
  return json.access_token;
}

async function sendFcmToToken(token, title, body, data = {}) {
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
          token,
          notification: { title, body },
          data,
          android: { priority: 'high' },
          apns: { headers: { 'apns-priority': '10' } },
        },
      }),
    });

    let json = null;
    try { json = await resp.json(); } catch {}
    if (!resp.ok) {
      const msg = String(json?.error?.message || `http_${resp.status}`);
      return { ok: false, reason: msg, detail: json };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

async function processJob(job) {
  if (job.type === 'message.created') {
    const messageId = String(job.payload?.messageId || '');
    if (!messageId) throw new Error('missing_message_id');

    const messageQ = await pool.query('SELECT id, room_id, sender_id, content FROM app_messages WHERE id=$1 LIMIT 1', [messageId]);
    if (!messageQ.rows.length) throw new Error('message_not_found');
    const message = messageQ.rows[0];

    const recipients = await pool.query(
      `SELECT user_id FROM app_participants WHERE room_id=$1 AND user_id<>$2`,
      [message.room_id, message.sender_id]
    );

    for (const r of recipients.rows) {
      const userId = String(r.user_id);
      const tokens = await pool.query(
        `SELECT push_token FROM app_device_tokens WHERE user_id=$1 AND is_active=true`,
        [userId]
      );

      let sentAny = false;
      for (const tk of tokens.rows) {
        const token = String(tk.push_token || '');
        if (!token) continue;

        const result = await sendFcmToToken(
          token,
          '새 메시지',
          String(message.content || '').slice(0, 120),
          { type: 'dm', room_id: String(message.room_id), message_id: String(message.id), sender_id: String(message.sender_id) }
        );

        if (result.ok) {
          sentAny = true;
        } else if (['InvalidRegistration', 'NotRegistered'].includes(String(result.reason))) {
          await pool.query('UPDATE app_device_tokens SET is_active=false WHERE push_token=$1', [token]);
        }
      }

      await pool.query(
        `UPDATE app_message_deliveries SET status=$3, updated_at=now() WHERE message_id=$1 AND user_id=$2`,
        [messageId, userId, sentAny ? 'sent' : 'failed']
      );
    }

    return;
  }

  // Unknown job type: mark done to avoid poison-loop
}

async function settleJobDone(id) {
  await pool.query(`UPDATE app_jobs SET status='done', updated_at=now() WHERE id=$1`, [id]);
}

async function settleJobFail(id, attempts, err) {
  const terminal = attempts >= MAX_ATTEMPTS;
  await pool.query(
    `UPDATE app_jobs
     SET status=$2, last_error=$3, updated_at=now()
     WHERE id=$1`,
    [id, terminal ? 'failed' : 'queued', String(err?.message || err)]
  );
}

async function tick() {
  const jobs = await claimJobs(BATCH_SIZE);
  if (!jobs.length) return { picked: 0, done: 0, failed: 0 };

  let done = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await processJob(job);
      await settleJobDone(job.id);
      done += 1;
    } catch (e) {
      await settleJobFail(job.id, Number(job.attempts || 0), e);
      failed += 1;
    }
  }

  return { picked: jobs.length, done, failed };
}

async function main() {
  console.log(`[queue-worker] start poll=${POLL_MS}ms batch=${BATCH_SIZE} maxAttempts=${MAX_ATTEMPTS}`);

  let stop = false;
  const onStop = () => { stop = true; };
  process.on('SIGINT', onStop);
  process.on('SIGTERM', onStop);

  while (!stop) {
    try {
      const r = await tick();
      if (r.picked > 0) {
        console.log(`[queue-worker] picked=${r.picked} done=${r.done} failed=${r.failed}`);
      }
    } catch (e) {
      console.error('[queue-worker] tick_error', e?.message || e);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  await pool.end();
  console.log('[queue-worker] stopped');
}

main().catch(async (e) => {
  console.error('[queue-worker] fatal', e?.message || e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
