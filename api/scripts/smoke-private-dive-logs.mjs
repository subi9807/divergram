import 'dotenv/config';
import process from 'node:process';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const baseUrl = String(process.env.DIVERGRAM_API_BASE || 'https://api.divergram.com').replace(/\/+$/, '');
const jwtSecret = String(process.env.JWT_SECRET || '');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET is required');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : process.env.PGHOST,
  port: process.env.DATABASE_URL ? undefined : Number(process.env.PGPORT || 5432),
  database: process.env.DATABASE_URL ? undefined : process.env.PGDATABASE,
  user: process.env.DATABASE_URL ? undefined : process.env.PGUSER,
  password: process.env.DATABASE_URL ? undefined : process.env.PGPASSWORD,
});

let userId = '';
const logId = `production-smoke-${Date.now()}`;
const draftId = `production-smoke-draft-${Date.now()}`;
const smokeSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
const smokeUsername = `dive-log-smoke-${smokeSuffix}`;

async function request(pathname, token, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`request_failed:${response.status}:${body?.error || 'invalid_json'}`);
  return { status: response.status, body };
}

try {
  const owner = await pool.query(
    `INSERT INTO app_users(email, username, role, is_blocked, email_verified)
     VALUES($1, $2, 'user', false, true)
     RETURNING id::text`,
    [`${smokeUsername}@example.invalid`, smokeUsername],
  );
  userId = owner.rows[0].id;
  await pool.query(
    `INSERT INTO app_profiles(id, username, full_name, is_synthetic, managed_by, content_language)
     VALUES($1, $2, $3, true, 'system-smoke-test', 'en')`,
    [userId, smokeUsername, 'Divergram API Smoke Test'],
  );
  const token = jwt.sign({ sub: userId, tokenType: 'session' }, jwtSecret, { expiresIn: '5m' });
  const data = {
    id: logId,
    sourceType: 'manual',
    diveDate: '2026-09-06',
    maxDepth: 0,
    totalDiveTime: 1,
    memo: 'production smoke test',
    visibilityType: 'private',
    media: [],
    tags: ['smoke-test'],
  };

  const created = await request('/api/dive-logs', token, { method: 'POST', body: JSON.stringify({ data }) });
  if (created.status !== 201 || created.body?.data?.revision !== 1) throw new Error('create_contract_failed');
  const fetched = await request(`/api/dive-logs/${encodeURIComponent(logId)}`, token);
  if (fetched.body?.data?.maxDepth !== 0) throw new Error('get_contract_failed');
  const source = await request(`/api/dive-logs/${encodeURIComponent(logId)}/source`, token);
  if (source.body?.data?.source_kind !== 'USER') throw new Error('source_contract_failed');
  const updated = await request(`/api/dive-logs/${encodeURIComponent(logId)}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ baseRevision: 1, patch: { memo: 'production smoke test updated' } }),
  });
  if (updated.body?.data?.revision !== 2) throw new Error('patch_contract_failed');
  const concurrent = await Promise.allSettled([
    request(`/api/dive-logs/${encodeURIComponent(logId)}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ baseRevision: 2, patch: { memo: 'concurrent writer a' } }),
    }),
    request(`/api/dive-logs/${encodeURIComponent(logId)}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ baseRevision: 2, patch: { memo: 'concurrent writer b' } }),
    }),
  ]);
  const concurrencySuccesses = concurrent.filter(
    (result) => result.status === 'fulfilled' && result.value.body?.data?.revision === 3,
  );
  const concurrencyConflicts = concurrent.filter(
    (result) => result.status === 'rejected' && String(result.reason?.message || '').includes('request_failed:409:dive_revision_conflict'),
  );
  if (concurrencySuccesses.length !== 1 || concurrencyConflicts.length !== 1) {
    throw new Error('concurrency_contract_failed');
  }
  const duplicate = await request('/api/dive-logs', token, { method: 'POST', body: JSON.stringify({ data }) });
  if (duplicate.status !== 200 || duplicate.body?.duplicate !== true) throw new Error('idempotency_contract_failed');
  const listed = await request(`/api/dive-logs?after=&limit=100`, token);
  if (!listed.body?.data?.some((item) => item.id === logId)) throw new Error('list_contract_failed');

  const draft = { updatedAt: new Date().toISOString(), form: { title: 'Cross-device smoke draft' }, selectedMedia: [] };
  const savedDraft = await request(`/api/dive-log-drafts/${encodeURIComponent(draftId)}`, token, {
    method: 'PUT',
    body: JSON.stringify({ data: draft }),
  });
  if (!savedDraft.body?.exists || savedDraft.body?.data?.form?.title !== draft.form.title) throw new Error('draft_save_contract_failed');
  const restoredDraft = await request(`/api/dive-log-drafts/${encodeURIComponent(draftId)}`, token);
  if (!restoredDraft.body?.exists || restoredDraft.body?.data?.updatedAt !== draft.updatedAt) throw new Error('draft_restore_contract_failed');
  await request(`/api/dive-log-drafts/${encodeURIComponent(draftId)}`, token, { method: 'DELETE' });
  const removedDraft = await request(`/api/dive-log-drafts/${encodeURIComponent(draftId)}`, token);
  if (removedDraft.body?.exists || removedDraft.body?.data !== null) throw new Error('draft_delete_contract_failed');

  console.log(JSON.stringify({
    ok: true,
    create: 201,
    get: 200,
    source: 200,
    patch: 200,
    concurrency: 'one_success_one_conflict',
    retry: 200,
    list: 200,
    draft: 'save_restore_delete',
  }));
} finally {
  if (userId) {
    await pool.query(
      "DELETE FROM app_records WHERE table_name = 'dive_log_drafts' AND record_id = $1",
      [`${userId}:${draftId}`],
    );
    await pool.query('DELETE FROM app_dive_logs WHERE user_id = $1 AND id = $2', [userId, logId]);
    await pool.query('DELETE FROM app_profiles WHERE id = $1 AND username = $2', [userId, smokeUsername]);
    await pool.query('DELETE FROM app_users WHERE id::text = $1 AND username = $2', [userId, smokeUsername]);
  }
  await pool.end();
}
