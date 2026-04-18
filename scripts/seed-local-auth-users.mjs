import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

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

async function upsertUser(email, username, password, role = 'user') {
  const hash = await bcrypt.hash(password, 12);
  const sha = crypto.createHash('sha256').update(password).digest('hex');
  await pool.query(
    `INSERT INTO app_users(email, username, password_hash, password_sha256, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email)
     DO UPDATE SET username=EXCLUDED.username, password_hash=EXCLUDED.password_hash, password_sha256=EXCLUDED.password_sha256, role=EXCLUDED.role`,
    [email, username, hash, sha, role]
  );
}

async function run() {
  await upsertUser('admin@local.dev', 'admin_local', 'Admin1234!', 'admin');
  await upsertUser('user@local.dev', 'user_local', 'User1234!', 'user');
  console.log('Created local auth users:');
  console.log('- admin@local.dev / Admin1234!');
  console.log('- user@local.dev / User1234!');
  await pool.end();
}

run().catch(async (err) => {
  console.error(err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
