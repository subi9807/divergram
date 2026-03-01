import dotenv from 'dotenv';
import pg from 'pg';

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
const FCM_SERVER_KEY = String(process.env.FCM_SERVER_KEY || '').trim();

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

async function sendFcmToToken(token, title, body, data = {}) {
  if (!FCM_SERVER_KEY) return { ok: false, reason: 'missing_fcm_server_key' };

  const resp = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body },
      data,
      priority: 'high',
    }),
  });

  let json = null;
  try { json = await resp.json(); } catch {}
  if (!resp.ok) {
    return { ok: false, reason: `http_${resp.status}`, detail: json };
  }

  const success = Number(json?.success || 0);
  if (success > 0) return { ok: true };

  const err = json?.results?.[0]?.error || 'fcm_send_failed';
  return { ok: false, reason: err, detail: json };
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
