import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config({ path: '.env.server' });

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'divergram',
  user: process.env.PGUSER || 'seowoo',
  password: process.env.PGPASSWORD || undefined,
});

const JWT_SECRET = process.env.JWT_SECRET || 'divergram-dev-secret';

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      password_sha256 TEXT,
      username TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_sha256 TEXT;`);
  await pool.query(`ALTER TABLE app_users ALTER COLUMN password_sha256 DROP NOT NULL;`);
  await pool.query(`ALTER TABLE app_users ALTER COLUMN password_hash DROP NOT NULL;`);
}

app.get('/api/health', async (_req, res) => {
  try {
    const r = await pool.query('select now() as now');
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, username } = req.body || {};
  if (!email || !password || !username) return res.status(400).json({ error: 'email/password/username required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const sha = crypto.createHash('sha256').update(password).digest('hex');
    const q = await pool.query(
      'INSERT INTO app_users(email, password_hash, password_sha256, username) VALUES ($1,$2,$3,$4) RETURNING id,email,username',
      [email, hash, sha, username]
    );
    const user = { id: String(q.rows[0].id), email: q.rows[0].email };
    const profile = { id: String(q.rows[0].id), username: q.rows[0].username, full_name: q.rows[0].username, bio: '', avatar_url: '' };
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, profile, token });
  } catch (e) {
    if (String(e.message).includes('duplicate key')) return res.status(409).json({ error: '이미 존재하는 이메일입니다.' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email/password required' });
  try {
    const q = await pool.query('SELECT id,email,username,password_hash,password_sha256 FROM app_users WHERE email=$1', [email]);
    if (!q.rows.length) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    const row = q.rows[0];
    let ok = false;
    if (row.password_hash) {
      ok = await bcrypt.compare(password, row.password_hash);
    } else if (row.password_sha256) {
      const sha = crypto.createHash('sha256').update(password).digest('hex');
      ok = sha === row.password_sha256;
      if (ok) {
        const upgraded = await bcrypt.hash(password, 10);
        await pool.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [upgraded, row.id]);
      }
    }
    if (!ok) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    const user = { id: String(row.id), email: row.email };
    const profile = { id: String(row.id), username: row.username, full_name: row.username, bio: '', avatar_url: '' };
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, profile, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/session', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.json({ session: null });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = String(payload.sub);
    const q = await pool.query('SELECT id,email,username FROM app_users WHERE id=$1', [userId]);
    if (!q.rows.length) return res.json({ session: null });
    const row = q.rows[0];
    res.json({ session: { user: { id: String(row.id), email: row.email }, profile: { id: String(row.id), username: row.username, full_name: row.username, bio: '', avatar_url: '' } } });
  } catch {
    res.json({ session: null });
  }
});

const port = Number(process.env.API_PORT || 4000);
ensureSchema().then(() => {
  app.listen(port, () => console.log(`API listening on http://127.0.0.1:${port}`));
});
