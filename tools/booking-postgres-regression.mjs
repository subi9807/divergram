import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { reserveCapacity } = await import(process.env.TEST_CAPACITY_MODULE || '../api/server/lib/bookingCapacity.js');

// The database name is explicitly restricted, even when using existing DB credentials.
const database = process.env.TEST_DATABASE_NAME;
if (!/^dg_codex_test_[a-z0-9_]+$/.test(database || '')) throw new Error('isolated_test_database_required');
const require = createRequire(process.env.TEST_API_PACKAGE);
const { Pool } = require('pg');
if (process.env.TEST_API_ENV_FILE) require('dotenv').config({ path: process.env.TEST_API_ENV_FILE, quiet: true });
const connection = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const pool = new Pool({
  host: connection?.hostname || process.env.PGHOST || '/var/run/postgresql',
  port: Number(connection?.port || process.env.PGPORT || 5432),
  user: connection ? decodeURIComponent(connection.username) : process.env.PGUSER || 'postgres',
  password: connection ? decodeURIComponent(connection.password) : process.env.PGPASSWORD,
  database,
});
const a = await pool.connect();
const b = await pool.connect();
try {
  await a.query(`CREATE TABLE app_profiles(id text primary key,account_type text,resort_booking_enabled boolean,resort_booking_deposit_amount numeric,resort_booking_default_capacity integer,resort_booking_min_notice_days integer,resort_booking_timezone text);
    CREATE TABLE app_resort_booking_availability(resort_id text,booking_date date,capacity integer,is_open boolean);
    CREATE TABLE app_resort_bookings(id text primary key,resort_id text,booking_date date,participants integer,status text);
    INSERT INTO app_profiles VALUES('r','resort',true,100,1,0,'UTC');`);
  await a.query('BEGIN');
  await reserveCapacity(a, 'r', '2099-01-01', 1);
  await b.query('BEGIN');
  let settled = false;
  const competing = reserveCapacity(b, 'r', '2099-01-01', 1).then(
    () => { settled = true; return null; },
    error => { settled = true; return error; }
  );
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(settled, false, 'second connection must wait on the resort lock');
  await a.query("INSERT INTO app_resort_bookings VALUES('first','r','2099-01-01',1,'pending')");
  await a.query('COMMIT');
  const error = await competing;
  assert.match(error?.message || '', /capacity_exceeded/);
  await b.query('ROLLBACK');
  const count = await a.query('SELECT count(*)::int total FROM app_resort_bookings');
  assert.equal(count.rows[0].total, 1);
  console.log('PASS: two concurrent connections cannot exceed default capacity without an availability row');

  await a.query('CREATE TABLE app_posts(id text primary key,user_id text,caption text)');
  await a.query("INSERT INTO app_posts VALUES('victim','other','original')");
  const overwrite = await a.query("INSERT INTO app_posts(id,user_id,caption) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET caption=EXCLUDED.caption WHERE app_posts.user_id=EXCLUDED.user_id RETURNING *", ['victim','attacker','changed']);
  assert.equal(overwrite.rowCount, 0);
  const victim = await a.query("SELECT * FROM app_posts WHERE id='victim'");
  assert.equal(victim.rows[0].caption, 'original');
  console.log('PASS: PostgreSQL rejects cross-owner upsert without changing the existing row');
} finally {
  await a.query('ROLLBACK'); await b.query('ROLLBACK');
  a.release(); b.release(); await pool.end();
}
