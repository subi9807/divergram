import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.server' });

const connectionString = String(process.env.DATABASE_URL || '').trim();
const pool = new pg.Pool(
  connectionString
    ? { connectionString }
    : {
        host: process.env.PGHOST || '127.0.0.1',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'divergram',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
      }
);

async function run() {
  await pool.query(`
    INSERT INTO app_users(email, username, password_hash, password_sha256, role)
    VALUES
      ('admin@local.dev', 'admin_local', '$2b$12$abcdefghijklmnopqrstuv', 'localdev', 'admin'),
      ('user@local.dev', 'user_local', '$2b$12$abcdefghijklmnopqrstuv', 'localdev', 'user')
    ON CONFLICT (email) DO NOTHING
  `);

  await pool.query(`
    INSERT INTO app_profiles(id, username, full_name, bio, avatar_url, account_type)
    VALUES
      ('local-admin', 'admin_local', 'Local Admin', 'Local admin account', '', 'personal'),
      ('local-user', 'user_local', 'Local User', 'Local test user', '', 'personal')
    ON CONFLICT (id) DO NOTHING
  `);

  await pool.query(`
    INSERT INTO app_posts(id, user_id, caption, location, dive_type, dive_site)
    VALUES
      ('post-local-1', 'local-user', 'Local dev seed post', 'Jeju', 'scuba', 'Munseom')
    ON CONFLICT (id) DO NOTHING
  `);

  console.log('Local seed complete');
  await pool.end();
}

run().catch(async (err) => {
  console.error(err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
