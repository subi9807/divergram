import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const migrationRoot = path.resolve(process.cwd(), 'db/migrations');
const requestedPath = String(process.argv[2] || '').trim();

if (!requestedPath) {
  console.error('Usage: node scripts/apply-migration.mjs db/migrations/<migration>.sql');
  process.exit(2);
}

const migrationPath = path.resolve(process.cwd(), requestedPath);
const relativePath = path.relative(migrationRoot, migrationPath);
if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !/^\d{14}_[a-z0-9_]+\.sql$/.test(relativePath)) {
  throw new Error('migration_path_not_allowed');
}

const rawSql = await fs.readFile(migrationPath, 'utf8');
const migrationSql = rawSql
  .replace(/^\s*BEGIN\s*;\s*/i, '')
  .replace(/\s*COMMIT\s*;\s*$/i, '');
const checksum = crypto.createHash('sha256').update(rawSql).digest('hex');

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
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('divergram_schema_migrations'))");
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_schema_migrations (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const applied = await client.query(
    'SELECT checksum, applied_at FROM app_schema_migrations WHERE name = $1',
    [relativePath],
  );
  if (applied.rowCount) {
    if (applied.rows[0].checksum !== checksum) throw new Error('migration_checksum_mismatch');
    await client.query('ROLLBACK');
    console.log(JSON.stringify({ migration: relativePath, status: 'already_applied' }));
  } else {
    await client.query(migrationSql);
    await client.query(
      'INSERT INTO app_schema_migrations(name, checksum) VALUES($1, $2)',
      [relativePath, checksum],
    );
    await client.query('COMMIT');
    console.log(JSON.stringify({ migration: relativePath, status: 'applied' }));
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
