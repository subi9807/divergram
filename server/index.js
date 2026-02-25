import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config({ path: '.env.server' });

const app = express();

const isProd = process.env.NODE_ENV === 'production';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (CORS_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: false,
}));
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

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

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be set and at least 32 characters.');
  process.exit(1);
}

const authRateLimitStore = new Map();
function authRateLimit(max = 10, windowMs = 60_000) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const hit = authRateLimitStore.get(key) || { count: 0, start: now };
    if (now - hit.start > windowMs) {
      hit.count = 0;
      hit.start = now;
    }
    hit.count += 1;
    authRateLimitStore.set(key, hit);
    if (hit.count > max) {
      return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
    }
    return next();
  };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateSignupInput(email, password, username) {
  if (!email || !password || !username) return 'email/password/username required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '유효한 이메일을 입력해주세요.';
  if (password.length < 8 || password.length > 128) return '비밀번호는 8~128자여야 합니다.';
  if (username.length < 2 || username.length > 32) return '사용자명은 2~32자여야 합니다.';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return '사용자명은 영문/숫자/언더스코어만 가능합니다.';
  return null;
}

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
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_uniq ON app_users ((lower(email)));`);
}

app.get('/api/health', async (_req, res) => {
  try {
    const r = await pool.query('select now() as now');
    res.json({ ok: true, now: r.rows[0].now });
  } catch {
    res.status(500).json({ ok: false, error: 'db_unavailable' });
  }
});

app.post('/api/auth/signup', authRateLimit(), async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const username = String(req.body?.username || '').trim();

  const validationError = validateSignupInput(email, password, username);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const hash = await bcrypt.hash(password, 12);
    const sha = crypto.createHash('sha256').update(password).digest('hex');
    const q = await pool.query(
      'INSERT INTO app_users(email, password_hash, password_sha256, username) VALUES ($1,$2,$3,$4) RETURNING id,email,username',
      [email, hash, sha, username]
    );
    const user = { id: String(q.rows[0].id), email: q.rows[0].email };
    const profile = { id: String(q.rows[0].id), username: q.rows[0].username, full_name: q.rows[0].username, bio: '', avatar_url: '' };
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ user, profile, token });
  } catch (e) {
    if (String(e.message).toLowerCase().includes('duplicate key')) {
      return res.status(409).json({ error: '이미 존재하는 이메일입니다.' });
    }
    return res.status(500).json({ error: 'signup_failed' });
  }
});

app.post('/api/auth/login', authRateLimit(), async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'email/password required' });

  try {
    const q = await pool.query('SELECT id,email,username,password_hash,password_sha256 FROM app_users WHERE lower(email)=lower($1)', [email]);
    if (!q.rows.length) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const row = q.rows[0];
    let ok = false;
    if (row.password_hash) {
      ok = await bcrypt.compare(password, row.password_hash);
    } else if (row.password_sha256) {
      const sha = crypto.createHash('sha256').update(password).digest('hex');
      ok = sha === row.password_sha256;
      if (ok) {
        const upgraded = await bcrypt.hash(password, 12);
        await pool.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [upgraded, row.id]);
      }
    }

    if (!ok) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const user = { id: String(row.id), email: row.email };
    const profile = { id: String(row.id), username: row.username, full_name: row.username, bio: '', avatar_url: '' };
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ user, profile, token });
  } catch {
    return res.status(500).json({ error: 'login_failed' });
  }
});

app.get('/api/auth/session', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.json({ session: null });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = String(payload.sub || '');
    if (!userId) return res.json({ session: null });

    const q = await pool.query('SELECT id,email,username FROM app_users WHERE id=$1', [userId]);
    if (!q.rows.length) return res.json({ session: null });

    const row = q.rows[0];
    return res.json({
      session: {
        user: { id: String(row.id), email: row.email },
        profile: { id: String(row.id), username: row.username, full_name: row.username, bio: '', avatar_url: '' },
      },
    });
  } catch {
    return res.json({ session: null });
  }
});

const port = Number(process.env.API_PORT || 4000);
ensureSchema().then(() => {
  app.listen(port, () => console.log(`API listening on http://127.0.0.1:${port}`));
});
