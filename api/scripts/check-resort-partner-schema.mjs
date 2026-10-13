import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: process.env.DIVERGRAM_ENV_FILE || '.env' });

const requiredTables = [
  'app_resort_api_keys',
  'app_resort_booking_availability',
  'app_resort_partner_applications',
  'app_resort_partner_documents',
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const result = await pool.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name=ANY($1::text[])
      ORDER BY table_name`,
    [requiredTables],
  );
  const found = result.rows.map((row) => row.table_name);
  const missing = requiredTables.filter((name) => !found.includes(name));
  const resortSummary = await pool.query(`SELECT COUNT(*)::int AS enabled,
    COUNT(*) FILTER (WHERE resort_booking_deposit_currency='USD')::int AS usd
    FROM app_profiles WHERE resort_booking_enabled=true`);
  const sample = await pool.query(`SELECT id,full_name,resort_booking_deposit_amount,resort_booking_deposit_currency
    FROM app_profiles WHERE resort_booking_enabled=true ORDER BY full_name LIMIT 3`);
  console.log(JSON.stringify({ ok: missing.length === 0, found, missing, bookingResorts: resortSummary.rows[0], sample: sample.rows }));
  if (missing.length) process.exitCode = 1;
} finally {
  await pool.end();
}
