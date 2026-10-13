import 'dotenv/config';
import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';
import { sendPushToToken } from '../server/lib/pushDelivery.js';

function readArg(name) {
  const prefix = `--${name}=`;
  return String(process.argv.find((value) => value.startsWith(prefix)) || '').slice(prefix.length).trim();
}

function maskEmail(value) {
  const [local = '', domain = ''] = String(value || '').split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

const email = readArg('email').toLowerCase();
const title = readArg('title');
const body = readArg('body');
const eventKey = readArg('event-key');
const shouldSend = process.argv.includes('--send');

if (!email) throw new Error('email_required');
if (shouldSend && (!title || !body || !eventKey)) {
  throw new Error('title_body_and_event_key_required_for_send');
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : process.env.PGHOST,
  port: process.env.DATABASE_URL ? undefined : Number(process.env.PGPORT || 5432),
  database: process.env.DATABASE_URL ? undefined : process.env.PGDATABASE,
  user: process.env.DATABASE_URL ? undefined : process.env.PGUSER,
  password: process.env.DATABASE_URL ? undefined : process.env.PGPASSWORD,
});

try {
  const target = await pool.query(
    `SELECT u.id::text AS user_id, u.email, t.id::text AS token_id, t.platform, t.push_token, t.created_at
     FROM app_users u
     LEFT JOIN LATERAL (
       SELECT id, platform, push_token, created_at
       FROM app_device_tokens
       WHERE user_id::text=u.id::text AND is_active=true
       ORDER BY created_at DESC
       LIMIT 1
     ) t ON true
     WHERE lower(u.email)=$1
     ORDER BY u.created_at DESC`,
    [email],
  );

  if (target.rows.length !== 1) {
    throw new Error(target.rows.length ? 'email_not_unique' : 'user_not_found');
  }

  const row = target.rows[0];
  const summary = {
    email: maskEmail(row.email),
    userId: row.user_id,
    activeDevice: Boolean(row.push_token),
    platform: row.platform || null,
    latestTokenAt: row.created_at || null,
  };

  if (!shouldSend) {
    console.log(JSON.stringify({ ok: true, mode: 'dry-run', ...summary }));
    process.exit(0);
  }
  if (!row.push_token) throw new Error('active_device_not_found');

  const notificationId = crypto.randomUUID();
  const inserted = await pool.query(
    `INSERT INTO app_notifications(
       id,user_id,type,title,body,deep_link,source,event_key,data,delivery_status,updated_at
     ) VALUES($1,$2,'system',$3,$4,'divergram://notifications','admin',$5,$6::jsonb,'sending',now())
     ON CONFLICT (user_id,event_key) WHERE event_key IS NOT NULL AND event_key <> '' DO NOTHING
     RETURNING id`,
    [notificationId, row.user_id, title, body, eventKey, JSON.stringify({ type: 'system', deepLink: 'divergram://notifications', eventKey })],
  );

  if (!inserted.rows.length) {
    console.log(JSON.stringify({ ok: true, mode: 'send', sent: false, reason: 'duplicate_event', ...summary }));
    process.exit(0);
  }

  let delivery;
  try {
    delivery = await sendPushToToken(row.push_token, title, body, {
      type: 'system',
      deepLink: 'divergram://notifications',
      eventKey,
    });
  } catch (error) {
    delivery = { ok: false, provider: 'unknown', reason: String(error?.message || error) };
  }

  await pool.query(
    `UPDATE app_notifications
     SET delivery_status=$1, sent_at=CASE WHEN $2 THEN now() ELSE sent_at END, updated_at=now()
     WHERE id=$3`,
    [delivery?.ok ? 'sent' : 'failed', Boolean(delivery?.ok), notificationId],
  );
  await pool.query(
    `INSERT INTO admin_audit_logs(action,target_user_id,detail)
     VALUES('push_test',$1,$2::jsonb)`,
    [Number(row.user_id) || null, JSON.stringify({
      script: 'send-single-test-push',
      eventKey,
      platform: row.platform || '',
      provider: delivery?.provider || '',
      ok: Boolean(delivery?.ok),
      reason: delivery?.reason || '',
      tokenHash: crypto.createHash('sha256').update(row.push_token).digest('hex'),
    })],
  );

  console.log(JSON.stringify({
    ok: Boolean(delivery?.ok),
    mode: 'send',
    sent: Boolean(delivery?.ok),
    provider: delivery?.provider || null,
    reason: delivery?.reason || null,
    ...summary,
  }));
} finally {
  await pool.end();
}
