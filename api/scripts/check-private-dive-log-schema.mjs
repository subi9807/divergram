import 'dotenv/config';
import process from 'node:process';
import pg from 'pg';

const requiredRelations = [
  'app_dive_logs',
  'app_dive_log_sources',
  'app_dive_log_revisions',
  'app_dive_logs_owner_page_idx',
];

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : process.env.PGHOST,
  port: process.env.DATABASE_URL ? undefined : Number(process.env.PGPORT || 5432),
  database: process.env.DATABASE_URL ? undefined : process.env.PGDATABASE,
  user: process.env.DATABASE_URL ? undefined : process.env.PGUSER,
  password: process.env.DATABASE_URL ? undefined : process.env.PGPASSWORD,
});

const client = await pool.connect();
try {
  const relationRows = await client.query(
    `SELECT requested.name, to_regclass($1 || requested.name)::text AS relation
       FROM unnest($2::text[]) AS requested(name)`,
    ['public.', requiredRelations],
  );
  const missing = relationRows.rows.filter((row) => !row.relation).map((row) => row.name);
  if (missing.length) throw new Error(`private_dive_log_schema_missing:${missing.join(',')}`);

  await client.query('BEGIN');
  const owner = await client.query('SELECT id::text FROM app_profiles ORDER BY id LIMIT 1');
  if (!owner.rowCount) throw new Error('private_dive_log_smoke_requires_profile');

  const userId = owner.rows[0].id;
  const logId = `migration-smoke-${Date.now()}`;
  const data = { id: logId, date: '2026-09-06', maxDepth: 0 };
  await client.query(
    'INSERT INTO app_dive_logs(user_id, id, data) VALUES($1, $2, $3::jsonb)',
    [userId, logId, JSON.stringify(data)],
  );
  await client.query(
    'INSERT INTO app_dive_log_sources(user_id, log_id, original_data, source_kind) VALUES($1, $2, $3::jsonb, $4)',
    [userId, logId, JSON.stringify(data), 'USER'],
  );
  await client.query(
    'INSERT INTO app_dive_log_revisions(user_id, log_id, revision, data) VALUES($1, $2, 1, $3::jsonb)',
    [userId, logId, JSON.stringify(data)],
  );
  const joined = await client.query(
    `SELECT l.revision, s.source_kind, r.revision AS history_revision
       FROM app_dive_logs l
       JOIN app_dive_log_sources s ON s.user_id = l.user_id AND s.log_id = l.id
       JOIN app_dive_log_revisions r ON r.user_id = l.user_id AND r.log_id = l.id
      WHERE l.user_id = $1 AND l.id = $2`,
    [userId, logId],
  );
  if (joined.rowCount !== 1) throw new Error('private_dive_log_rollback_smoke_failed');
  await client.query('ROLLBACK');

  console.log(JSON.stringify({ ok: true, relations: requiredRelations, rollbackSmoke: 'passed' }));
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
