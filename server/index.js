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
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5175,http://localhost:5175')
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
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: false,
}));
app.use(express.json({ limit: '10mb' }));
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

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
if (!ADMIN_API_KEY || ADMIN_API_KEY.length < 16) {
  console.error('❌ ADMIN_API_KEY must be set and at least 16 characters.');
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

function isStrongPassword(password) {
  if (!password || password.length < 8 || password.length > 128) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasDigit && hasSpecial;
}

function validateSignupInput(email, password, username) {
  if (!email || !password || !username) return 'email/password/username required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '유효한 이메일을 입력해주세요.';
  if (!isStrongPassword(password)) return '비밀번호는 8~128자이며 대문자/소문자/숫자/특수문자를 포함해야 합니다.';
  if (username.length < 4 || username.length > 32) return '사용자명은 4~32자여야 합니다.';
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
      role TEXT NOT NULL DEFAULT 'user',
      is_blocked BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_sha256 TEXT;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE app_users ALTER COLUMN password_sha256 DROP NOT NULL;`);
  await pool.query(`ALTER TABLE app_users ALTER COLUMN password_hash DROP NOT NULL;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_pending TEXT;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verify_code TEXT;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMPTZ;`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_uniq ON app_users ((lower(email)));`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      target_user_id BIGINT,
      detail JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_records (
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (table_name, record_id)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_records_table_name_idx ON app_records(table_name);`);

  // 2nd-phase normalized tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_profiles (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      website TEXT,
      account_type TEXT NOT NULL DEFAULT 'personal',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'personal';`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      image_url TEXT,
      video_url TEXT,
      caption TEXT NOT NULL DEFAULT '',
      location TEXT,
      dive_type TEXT,
      dive_date TEXT,
      max_depth DOUBLE PRECISION,
      water_temperature DOUBLE PRECISION,
      dive_duration DOUBLE PRECISION,
      dive_site TEXT,
      visibility DOUBLE PRECISION,
      gas_type TEXT,
      gas_percent DOUBLE PRECISION,
      buddy TEXT,
      buddy_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS gas_type TEXT;`);
  await pool.query(`ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS gas_percent DOUBLE PRECISION;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_post_media (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      media_url TEXT NOT NULL,
      media_type TEXT NOT NULL,
      order_index INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_likes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_saved_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      actor_id TEXT,
      type TEXT NOT NULL,
      post_id TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_rooms (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_participants (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      read_at TIMESTAMPTZ
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_device_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      push_token TEXT NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_device_tokens_user_idx ON app_device_tokens(user_id);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_message_deliveries (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_message_deliveries_msg_idx ON app_message_deliveries(message_id);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
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
    const q = await pool.query('SELECT id,email,username,password_hash,password_sha256,is_blocked FROM app_users WHERE lower(email)=lower($1)', [email]);
    if (!q.rows.length) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const row = q.rows[0];
    if (row.is_blocked) return res.status(403).json({ error: '차단된 계정입니다. 관리자에게 문의하세요.' });

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

app.patch('/api/auth/me', authRateLimit(20, 60_000), async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = String(payload.sub || '');
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const email = req.body?.email ? normalizeEmail(req.body.email) : undefined;
    const username = req.body?.username ? String(req.body.username).trim() : undefined;
    const password = req.body?.password ? String(req.body.password) : undefined;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'invalid_email' });
    if (username && (username.length < 4 || username.length > 32 || !/^[a-zA-Z0-9_]+$/.test(username))) return res.status(400).json({ error: 'invalid_username' });
    if (password && !isStrongPassword(password)) return res.status(400).json({ error: 'invalid_password' });

    const fields = [];
    const vals = [];

    if (username !== undefined) { vals.push(username); fields.push(`username=$${vals.length}`); }
    if (password !== undefined) {
      const hash = await bcrypt.hash(password, 12);
      const sha = crypto.createHash('sha256').update(password).digest('hex');
      vals.push(hash); fields.push(`password_hash=$${vals.length}`);
      vals.push(sha); fields.push(`password_sha256=$${vals.length}`);
    }

    let emailVerificationRequested = false;
    if (email !== undefined) {
      const existing = await pool.query('SELECT id FROM app_users WHERE lower(email)=lower($1) AND id::text <> $2', [email, userId]);
      if (existing.rows.length) return res.status(409).json({ error: 'email_already_exists' });

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await pool.query(
        'UPDATE app_users SET email_pending=$1, email_verify_code=$2, email_verify_expires=$3 WHERE id=$4',
        [email, code, expires, userId]
      );
      // TODO: SMTP 연동 시 실제 이메일 발송으로 교체
      console.log(`[EMAIL_VERIFY] user=${userId} target=${email} code=${code}`);
      emailVerificationRequested = true;
    }

    if (!fields.length && !emailVerificationRequested) return res.status(400).json({ error: 'no_changes' });

    let q = { rows: [] };
    if (fields.length) {
      vals.push(userId);
      q = await pool.query(
        `UPDATE app_users SET ${fields.join(', ')} WHERE id=$${vals.length} RETURNING id,email,username`,
        vals
      );
      if (!q.rows.length) return res.status(404).json({ error: 'user_not_found' });

      if (username !== undefined) {
        await pool.query('UPDATE app_profiles SET username=$1, full_name=COALESCE(NULLIF(full_name,\'\'), $1) WHERE id=$2', [username, userId]);
      }
    } else {
      const current = await pool.query('SELECT id,email,username FROM app_users WHERE id=$1', [userId]);
      q = { rows: current.rows };
    }

    return res.json({
      ok: true,
      emailVerificationRequested,
      user: { id: String(q.rows[0].id), email: q.rows[0].email, username: q.rows[0].username },
    });
  } catch {
    return res.status(500).json({ error: 'update_me_failed' });
  }
});

app.post('/api/auth/email/verify/confirm', authRateLimit(20, 60_000), async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const code = String(req.body?.code || '').trim();
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'invalid_code' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = String(payload.sub || '');
    const q = await pool.query('SELECT id,email_pending,email_verify_code,email_verify_expires FROM app_users WHERE id=$1', [userId]);
    if (!q.rows.length) return res.status(404).json({ error: 'user_not_found' });

    const row = q.rows[0];
    if (!row.email_pending || !row.email_verify_code) return res.status(400).json({ error: 'no_pending_email' });
    if (new Date(row.email_verify_expires).getTime() < Date.now()) return res.status(400).json({ error: 'code_expired' });
    if (row.email_verify_code !== code) return res.status(400).json({ error: 'invalid_code' });

    await pool.query(
      'UPDATE app_users SET email=$1, email_pending=NULL, email_verify_code=NULL, email_verify_expires=NULL WHERE id=$2',
      [normalizeEmail(row.email_pending), userId]
    );

    return res.json({ ok: true, email: normalizeEmail(row.email_pending) });
  } catch {
    return res.status(500).json({ error: 'email_verify_failed' });
  }
});

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_API_KEY) return res.status(401).json({ error: 'unauthorized' });
  return next();
}

app.get('/api/admin/health', requireAdmin, async (_req, res) => {
  res.json({ ok: true, service: 'admin-api' });
});

app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  try {
    const os = await import('node:os');
    const { execSync } = await import('node:child_process');

    const totalUsers = await pool.query('SELECT COUNT(*)::int AS count FROM app_users');
    const blockedUsers = await pool.query('SELECT COUNT(*)::int AS count FROM app_users WHERE is_blocked = true');
    const personalUsers = await pool.query("SELECT COUNT(*)::int AS count FROM app_profiles WHERE account_type = 'personal'");
    const resortUsers = await pool.query("SELECT COUNT(*)::int AS count FROM app_profiles WHERE account_type = 'resort'");
    const latest = await pool.query('SELECT id, email, username, role, is_blocked, created_at FROM app_users ORDER BY created_at DESC LIMIT 5');
    const feedCount = await pool.query('SELECT COUNT(*)::int AS count FROM app_posts WHERE video_url IS NULL');
    const reelsCount = await pool.query('SELECT COUNT(*)::int AS count FROM app_posts WHERE video_url IS NOT NULL');

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpuLoad = os.loadavg?.()[0] || 0;
    const cpuCores = os.cpus?.().length || 1;
    const cpuUsagePct = Math.min(100, Math.max(0, (cpuLoad / cpuCores) * 100));

    let disk = { usedGb: 0, totalGb: 0, usedPct: 0 };
    try {
      const df = execSync("df -k / | tail -1", { encoding: 'utf8' }).trim().split(/\s+/);
      const totalKb = Number(df[1] || 0);
      const usedKb = Number(df[2] || 0);
      disk = {
        usedGb: Number((usedKb / 1024 / 1024).toFixed(2)),
        totalGb: Number((totalKb / 1024 / 1024).toFixed(2)),
        usedPct: totalKb ? Number(((usedKb / totalKb) * 100).toFixed(1)) : 0,
      };
    } catch {}

    let network = { inMb: 0, outMb: 0 };
    try {
      const net = execSync("netstat -ib", { encoding: 'utf8' }).split('\n');
      let inBytes = 0;
      let outBytes = 0;
      for (const line of net) {
        if (!line || line.startsWith('Name')) continue;
        const parts = line.trim().split(/\s+/);
        const i = Number(parts[6]);
        const o = Number(parts[9]);
        if (Number.isFinite(i)) inBytes += i;
        if (Number.isFinite(o)) outBytes += o;
      }
      network = {
        inMb: Number((inBytes / 1024 / 1024).toFixed(1)),
        outMb: Number((outBytes / 1024 / 1024).toFixed(1)),
      };
    } catch {}

    res.json({
      ok: true,
      stats: {
        users: totalUsers.rows[0]?.count || 0,
        blockedUsers: blockedUsers.rows[0]?.count || 0,
        personalUsers: personalUsers.rows[0]?.count || 0,
        resortUsers: resortUsers.rows[0]?.count || 0,
        feedCount: feedCount.rows[0]?.count || 0,
        reelsCount: reelsCount.rows[0]?.count || 0,
        uptimeSec: Math.round(process.uptime()),
        system: {
          cpuUsagePct: Number(cpuUsagePct.toFixed(1)),
          memoryUsedGb: Number((usedMem / 1024 / 1024 / 1024).toFixed(2)),
          memoryTotalGb: Number((totalMem / 1024 / 1024 / 1024).toFixed(2)),
          memoryUsagePct: Number(((usedMem / totalMem) * 100).toFixed(1)),
          disk,
          network,
        },
      },
      latestUsers: latest.rows,
    });
  } catch {
    res.status(500).json({ ok: false, error: 'admin_stats_failed' });
  }
});

app.get('/api/admin/map-points', requireAdmin, async (_req, res) => {
  try {
    const r = await pool.query(`SELECT id, location, dive_site, created_at FROM app_posts ORDER BY created_at DESC LIMIT 1000`);
    res.json({ ok: true, points: r.rows || [] });
  } catch {
    res.status(500).json({ ok: false, error: 'admin_map_points_failed' });
  }
});

app.get('/api/admin/growth', requireAdmin, async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days || 14), 3), 90);
  try {
    const signups = await pool.query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
       FROM app_users
       WHERE created_at >= now() - ($1::text || ' days')::interval
       GROUP BY 1 ORDER BY 1`,
      [days]
    );

    const posts = await pool.query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
       FROM app_posts
       WHERE created_at >= now() - ($1::text || ' days')::interval
       GROUP BY 1 ORDER BY 1`,
      [days]
    );

    const interactions = await pool.query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
       FROM (
         SELECT created_at FROM app_likes
         UNION ALL
         SELECT created_at FROM app_comments
       ) t
       WHERE created_at >= now() - ($1::text || ' days')::interval
       GROUP BY 1 ORDER BY 1`,
      [days]
    );

    const dauApprox = await pool.query(
      `SELECT to_char(day, 'YYYY-MM-DD') AS day, COUNT(DISTINCT user_id)::int AS count
       FROM (
         SELECT date_trunc('day', created_at) AS day, user_id FROM app_posts
         UNION ALL
         SELECT date_trunc('day', created_at) AS day, user_id FROM app_likes
         UNION ALL
         SELECT date_trunc('day', created_at) AS day, user_id FROM app_comments
       ) x
       WHERE day >= now() - ($1::text || ' days')::interval
       GROUP BY 1 ORDER BY 1`,
      [days]
    );

    const totals = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS c FROM app_users'),
      pool.query('SELECT COUNT(*)::int AS c FROM app_posts'),
      pool.query('SELECT COUNT(*)::int AS c FROM app_likes'),
      pool.query('SELECT COUNT(*)::int AS c FROM app_comments'),
      pool.query('SELECT COUNT(*)::int AS c FROM app_reports'),
    ]);

    res.json({
      ok: true,
      rangeDays: days,
      totals: {
        users: totals[0].rows[0].c,
        posts: totals[1].rows[0].c,
        likes: totals[2].rows[0].c,
        comments: totals[3].rows[0].c,
        reports: totals[4].rows[0].c,
      },
      series: {
        signups: signups.rows,
        posts: posts.rows,
        interactions: interactions.rows,
        dauApprox: dauApprox.rows,
      },
    });
  } catch {
    res.status(500).json({ ok: false, error: 'admin_growth_failed' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  try {
    const params = [];
    let where = '';
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where = `WHERE lower(email) LIKE $${params.length} OR lower(username) LIKE $${params.length}`;
    }

    params.push(limit);
    params.push(offset);

    const list = await pool.query(
      `SELECT u.id, u.email, u.username, u.role, u.is_blocked, u.created_at,
              p.avatar_url, p.full_name
       FROM app_users u
       LEFT JOIN app_profiles p ON p.id = u.id::text
       ${where ? where.replace(/email/g, 'u.email').replace(/username/g, 'u.username') : ''}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ ok: true, users: list.rows, limit, offset });
  } catch {
    res.status(500).json({ ok: false, error: 'admin_users_failed' });
  }
});

app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const role = req.body?.role;
  const isBlocked = req.body?.is_blocked;
  if (!id) return res.status(400).json({ error: 'invalid_user_id' });

  const fields = [];
  const values = [];

  if (role !== undefined) {
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'invalid_role' });
    values.push(role);
    fields.push(`role = $${values.length}`);
  }

  if (isBlocked !== undefined) {
    values.push(Boolean(isBlocked));
    fields.push(`is_blocked = $${values.length}`);
  }

  if (!fields.length) return res.status(400).json({ error: 'no_changes' });

  values.push(id);

  try {
    const updated = await pool.query(
      `UPDATE app_users
       SET ${fields.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, email, username, role, is_blocked, created_at`,
      values
    );

    if (!updated.rows.length) return res.status(404).json({ error: 'user_not_found' });

    await pool.query(
      'INSERT INTO admin_audit_logs(action, target_user_id, detail) VALUES ($1, $2, $3::jsonb)',
      ['user_update', id, JSON.stringify({ role, is_blocked: isBlocked })]
    );

    res.json({ ok: true, user: updated.rows[0] });
  } catch {
    res.status(500).json({ ok: false, error: 'admin_user_update_failed' });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid_user_id' });

  try {
    const deleted = await pool.query('DELETE FROM app_users WHERE id = $1 RETURNING id, email', [id]);
    if (!deleted.rows.length) return res.status(404).json({ error: 'user_not_found' });

    await pool.query(
      'INSERT INTO admin_audit_logs(action, target_user_id, detail) VALUES ($1, $2, $3::jsonb)',
      ['user_delete', id, JSON.stringify({ email: deleted.rows[0].email })]
    );

    res.json({ ok: true, deleted: deleted.rows[0] });
  } catch {
    res.status(500).json({ ok: false, error: 'admin_user_delete_failed' });
  }
});

app.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 200);

  try {
    const logs = await pool.query(
      'SELECT id, action, target_user_id, detail, created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.json({ ok: true, logs: logs.rows });
  } catch {
    res.status(500).json({ ok: false, error: 'admin_audit_logs_failed' });
  }
});

function applyJsonFilters(rows, filters = []) {
  const get = (obj, key) => obj?.[key];
  return rows.filter((r) => filters.every((f) => {
    const value = get(r, f.column);
    if (f.op === 'eq') return value === f.value;
    if (f.op === 'neq') return value !== f.value;
    if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(value);
    if (f.op === 'is') return f.value === null ? value == null : value === f.value;
    if (f.op === 'not') {
      if (f.operator === 'is' && f.value === null) return value != null;
      if (f.operator === 'eq') return value !== f.value;
      return true;
    }
    if (f.op === 'ilike') {
      const pattern = String(f.value || '').toLowerCase().replace(/%/g, '');
      return String(value || '').toLowerCase().includes(pattern);
    }
    if (f.op === 'or') {
      const clauses = String(f.value || '').split(',').map((s) => s.trim()).filter(Boolean);
      return clauses.some((clause) => {
        const m = clause.match(/^([^\.]+)\.(eq|ilike)\.(.+)$/);
        if (!m) return false;
        const [, col, op, raw] = m;
        const rowVal = get(r, col);
        if (op === 'eq') return String(rowVal ?? '') === raw;
        if (op === 'ilike') return String(rowVal ?? '').toLowerCase().includes(raw.toLowerCase().replace(/%/g, ''));
        return false;
      });
    }
    return true;
  }));
}

const DATA_TABLES = {
  profiles: { table: 'app_profiles', columns: ['id','username','full_name','bio','avatar_url','website','account_type','created_at'] },
  posts: { table: 'app_posts', columns: ['id','user_id','image_url','video_url','caption','location','dive_type','dive_date','max_depth','water_temperature','dive_duration','dive_site','visibility','gas_type','gas_percent','buddy','buddy_name','created_at'] },
  post_media: { table: 'app_post_media', columns: ['id','post_id','media_url','media_type','order_index','created_at'] },
  likes: { table: 'app_likes', columns: ['id','post_id','user_id','created_at'] },
  comments: { table: 'app_comments', columns: ['id','post_id','user_id','content','created_at'] },
  follows: { table: 'app_follows', columns: ['id','follower_id','following_id','created_at'] },
  saved_posts: { table: 'app_saved_posts', columns: ['id','user_id','post_id','created_at'] },
  notifications: { table: 'app_notifications', columns: ['id','user_id','actor_id','type','post_id','is_read','created_at'] },
  rooms: { table: 'app_rooms', columns: ['id','type','created_at'] },
  participants: { table: 'app_participants', columns: ['id','room_id','user_id','joined_at'] },
  messages: { table: 'app_messages', columns: ['id','room_id','sender_id','content','created_at','read_at'] },
  reports: { table: 'app_reports', columns: ['id','user_id','reason','status','created_at'] },
};

function resolveDataTable(name) {
  return DATA_TABLES[name] || null;
}

app.get('/api/data/:table', async (req, res) => {
  const key = String(req.params.table || '').trim();
  const spec = resolveDataTable(key);
  if (!spec) return res.status(400).json({ error: 'invalid_table' });

  try {
    const raw = await pool.query(`SELECT * FROM ${spec.table}`);
    let rows = raw.rows;
    const filters = req.query.filters ? JSON.parse(String(req.query.filters)) : [];
    rows = applyJsonFilters(rows, filters);

    if (req.query.order) {
      const order = JSON.parse(String(req.query.order));
      const col = order.column;
      const asc = order.ascending !== false;
      rows.sort((a, b) => (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1));
    }
    if (req.query.range) {
      const [a, b] = JSON.parse(String(req.query.range));
      rows = rows.slice(Number(a), Number(b) + 1);
    }
    if (req.query.limit) rows = rows.slice(0, Number(req.query.limit));

    res.json({ data: rows, error: null, count: rows.length });
  } catch {
    res.status(500).json({ error: 'data_read_failed' });
  }
});

app.post('/api/data/:table', async (req, res) => {
  const key = String(req.params.table || '').trim();
  const spec = resolveDataTable(key);
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!spec) return res.status(400).json({ error: 'invalid_table' });

  try {
    for (const row of rows) {
      const payload = { ...row, id: String(row.id || crypto.randomUUID()) };
      const cols = spec.columns.filter((c) => payload[c] !== undefined);
      if (!cols.includes('id')) cols.unshift('id');
      const vals = cols.map((c) => payload[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const updates = cols.filter((c) => c !== 'id').map((c) => `${c}=EXCLUDED.${c}`).join(', ');
      await pool.query(
        `INSERT INTO ${spec.table}(${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updates || 'id=EXCLUDED.id'}`,
        vals
      );
    }
    res.json({ data: rows, error: null });
  } catch {
    res.status(500).json({ error: 'data_insert_failed' });
  }
});

app.patch('/api/data/:table', async (req, res) => {
  const key = String(req.params.table || '').trim();
  const spec = resolveDataTable(key);
  const filters = Array.isArray(req.body?.filters) ? req.body.filters : [];
  const patch = req.body?.patch || {};
  if (!spec) return res.status(400).json({ error: 'invalid_table' });

  try {
    const raw = await pool.query(`SELECT * FROM ${spec.table}`);
    const matched = applyJsonFilters(raw.rows, filters);
    const patchCols = spec.columns.filter((c) => c !== 'id' && patch[c] !== undefined);

    for (const row of matched) {
      if (!patchCols.length) continue;
      const assigns = patchCols.map((c, i) => `${c}=$${i + 1}`).join(', ');
      const vals = patchCols.map((c) => patch[c]);
      vals.push(row.id);
      await pool.query(`UPDATE ${spec.table} SET ${assigns} WHERE id=$${vals.length}`, vals);
    }

    res.json({ data: null, error: null, updated: matched.length });
  } catch {
    res.status(500).json({ error: 'data_update_failed' });
  }
});

app.delete('/api/data/:table', async (req, res) => {
  const key = String(req.params.table || '').trim();
  const spec = resolveDataTable(key);
  const filters = Array.isArray(req.body?.filters) ? req.body.filters : [];
  if (!spec) return res.status(400).json({ error: 'invalid_table' });

  try {
    const raw = await pool.query(`SELECT * FROM ${spec.table}`);
    const matched = applyJsonFilters(raw.rows, filters);
    for (const row of matched) {
      await pool.query(`DELETE FROM ${spec.table} WHERE id=$1`, [row.id]);
    }
    res.json({ data: null, error: null, deleted: matched.length });
  } catch {
    res.status(500).json({ error: 'data_delete_failed' });
  }
});

app.post('/api/data/seed/default', async (_req, res) => {
  const now = new Date().toISOString();
  try {
    const exists = await pool.query('SELECT COUNT(*)::int AS count FROM app_profiles');
    if ((exists.rows[0]?.count || 0) > 0) return res.json({ ok: true, seeded: false, reason: 'already_seeded' });

    await pool.query(`INSERT INTO app_profiles(id,username,full_name,bio,avatar_url,created_at) VALUES
      ('u_demo','demo','Demo User','Diver','',$1),
      ('u_ocean','ocean_lee','Ocean Lee','Ocean lover','',$1),
      ('u_blue','blue_fin','Blue Fin','Freediver','',$1)
    ON CONFLICT (id) DO NOTHING`, [now]);

    await pool.query(`INSERT INTO app_posts(id,user_id,image_url,caption,location,created_at) VALUES
      ('p1','u_ocean','https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200','야간다이빙 기록 #Jeju','Jeju',$1),
      ('p2','u_blue','https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=1200','프리다이빙 세션 #Bali','Bali',$1)
    ON CONFLICT (id) DO NOTHING`, [now]);

    await pool.query(`INSERT INTO app_post_media(id,post_id,media_url,media_type,order_index,created_at) VALUES
      ('pm1','p1','https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200','image',0,$1),
      ('pm2','p2','https://www.youtube.com/watch?v=dQw4w9WgXcQ','video',0,$1)
    ON CONFLICT (id) DO NOTHING`, [now]);

    res.json({ ok: true, seeded: true });
  } catch {
    res.status(500).json({ ok: false, error: 'seed_failed' });
  }
});

app.post('/api/admin/migrate-normalized', requireAdmin, async (_req, res) => {
  try {
    const mapping = [
      ['profiles', 'app_profiles', ['id','username','full_name','bio','avatar_url','website','account_type','created_at']],
      ['posts', 'app_posts', ['id','user_id','image_url','video_url','caption','location','dive_type','dive_date','max_depth','water_temperature','dive_duration','dive_site','visibility','buddy','buddy_name','created_at']],
      ['post_media', 'app_post_media', ['id','post_id','media_url','media_type','order_index','created_at']],
      ['likes', 'app_likes', ['id','post_id','user_id','created_at']],
      ['comments', 'app_comments', ['id','post_id','user_id','content','created_at']],
      ['follows', 'app_follows', ['id','follower_id','following_id','created_at']],
      ['saved_posts', 'app_saved_posts', ['id','user_id','post_id','created_at']],
      ['notifications', 'app_notifications', ['id','user_id','actor_id','type','post_id','is_read','created_at']],
    ];

    const result = {};

    const defaultsByTable = {
      profiles: { bio: '', avatar_url: '', account_type: 'personal' },
      posts: { caption: '' },
      post_media: { media_type: 'image', order_index: 0 },
      comments: { content: '' },
      notifications: { type: 'like', is_read: false },
    };

    for (const [srcTable, dstTable, cols] of mapping) {
      const raw = await pool.query('SELECT data FROM app_records WHERE table_name=$1', [srcTable]);
      let count = 0;
      for (const row of raw.rows) {
        const d = row.data || {};
        const tableDefaults = defaultsByTable[srcTable] || {};
        const values = cols.map((c) => {
          if (c === 'created_at') return d[c] || new Date().toISOString();
          const v = d[c];
          if (v === null || v === undefined) {
            if (Object.prototype.hasOwnProperty.call(tableDefaults, c)) return tableDefaults[c];
            return null;
          }
          return v;
        });
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const updates = cols.filter((c) => c !== 'id').map((c) => `${c}=EXCLUDED.${c}`).join(', ');
        await pool.query(
          `INSERT INTO ${dstTable}(${cols.join(',')}) VALUES (${placeholders})
           ON CONFLICT (id) DO UPDATE SET ${updates}`,
          values
        );
        count += 1;
      }
      result[srcTable] = count;
    }

    res.json({ ok: true, migrated: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'normalized_migration_failed', detail: String(e?.message || e) });
  }
});

app.post('/api/admin/seed-bulk', requireAdmin, async (req, res) => {
  const usersN = Math.min(Math.max(Number(req.body?.users || 30), 1), 300);
  const postsN = Math.min(Math.max(Number(req.body?.posts || 120), 1), 1200);
  const commentsN = Math.min(Math.max(Number(req.body?.comments || 300), 1), 3000);
  const likesN = Math.min(Math.max(Number(req.body?.likes || 600), 1), 6000);

  try {
    const pass = 'Password123!';
    const hash = await bcrypt.hash(pass, 10);
    const sha = crypto.createHash('sha256').update(pass).digest('hex');

    const firstNames = ['Minji','Jiwon','Seoyeon','Yuna','Haerin','Sujin','Jisoo','Eunji','Mina','Doyeon','Hyunwoo','Joon','Taehyun','Minho','Jiho','Seungwoo','Dongha','Yejun'];
    const lastNames = ['Kim','Lee','Park','Choi','Jung','Kang','Yoon','Lim','Han','Shin'];
    const resorts = ['BlueFinBali','JejuDiveBase','CebuOceanClub','OkinawaReefLab','SipadanDeepHub','PhuketCoralResort','AnilaoDiveHouse','MoalboalSeaCamp'];

    const profileIds = [];
    for (let i = 1; i <= usersN; i++) {
      const isResort = (i % 4 === 0);
      const baseName = isResort
        ? resorts[(i / 4) % resorts.length | 0]
        : `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
      const username = isResort
        ? `${resorts[(i / 4) % resorts.length | 0].toLowerCase()}_${i}`
        : `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}${i}`;
      const email = `${username}@divergram.local`;

      await pool.query(
        `INSERT INTO app_users(email,password_hash,password_sha256,username,role,is_blocked)
         VALUES ($1,$2,$3,$4,'user',false)
         ON CONFLICT (email) DO UPDATE SET username=EXCLUDED.username
         RETURNING id::text`,
        [email, hash, sha, username]
      );
      const id = String((await pool.query('SELECT id::text FROM app_users WHERE email=$1', [email])).rows[0].id);
      profileIds.push(id);
      await pool.query(
        `INSERT INTO app_profiles(id,username,full_name,bio,avatar_url,account_type)
         VALUES ($1,$2,$3,$4,'',$5)
         ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username,full_name=EXCLUDED.full_name,bio=EXCLUDED.bio,account_type=EXCLUDED.account_type`,
        [id, username, baseName, isResort ? 'Certified dive center' : 'Ocean lover and diver', isResort ? 'resort' : 'personal']
      );
    }

    const postIds = [];
    for (let i = 1; i <= postsN; i++) {
      const id = `bulk_post_${i}`;
      const userId = profileIds[i % profileIds.length];
      const row = {
        id,
        user_id: userId,
        image_url: `https://picsum.photos/seed/divergram-${i}/1200/900`,
        caption: `샘플 게시물 ${i}`,
        location: ['Jeju','Bali','Cebu','Okinawa'][i % 4],
        created_at: new Date(Date.now() - i * 60000).toISOString(),
      };
      postIds.push(id);
      const diveTypes = ['freediving', 'scuba', 'technical'];
      const diveType = diveTypes[i % diveTypes.length];
      const gasType = diveType === 'freediving' ? null : (i % 3 === 0 ? 'air' : (i % 2 === 0 ? 'nitrox' : 'heliox'));
      const gasPercent = gasType && gasType !== 'air' ? (gasType === 'nitrox' ? 32 : 21) : null;

      await pool.query(
        `INSERT INTO app_posts(
            id,user_id,image_url,caption,location,created_at,
            dive_type,dive_date,max_depth,water_temperature,dive_duration,dive_site,visibility,gas_type,gas_percent,buddy_name
          )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO UPDATE SET
            caption=EXCLUDED.caption,
            location=EXCLUDED.location,
            dive_type=EXCLUDED.dive_type,
            dive_date=EXCLUDED.dive_date,
            max_depth=EXCLUDED.max_depth,
            water_temperature=EXCLUDED.water_temperature,
            dive_duration=EXCLUDED.dive_duration,
            dive_site=EXCLUDED.dive_site,
            visibility=EXCLUDED.visibility,
            gas_type=EXCLUDED.gas_type,
            gas_percent=EXCLUDED.gas_percent,
            buddy_name=EXCLUDED.buddy_name`,
        [
          row.id,row.user_id,row.image_url,row.caption,row.location,row.created_at,
          diveType,
          new Date(Date.now() - i * 86400000).toISOString().slice(0,10),
          12 + (i % 24),
          18 + (i % 10),
          30 + (i % 40),
          ['Jeju Dive Base','Blue Fin Bali','Cebu Ocean Club','Okinawa Reef Lab'][i % 4],
          5 + (i % 20),
          gasType,
          gasPercent,
          ['@minji.kim1','@taehyun.yoon2','@bluefinbali_1','@jejudivebase_2'][i % 4]
        ]
      );
    }

    for (let i = 1; i <= commentsN; i++) {
      const id = `bulk_comment_${i}`;
      const row = {
        id,
        post_id: postIds[i % postIds.length],
        user_id: profileIds[(i + 3) % profileIds.length],
        content: `샘플 댓글 ${i}`,
        created_at: new Date(Date.now() - i * 30000).toISOString(),
      };
      await pool.query(
        `INSERT INTO app_comments(id,post_id,user_id,content,created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content`,
        [row.id,row.post_id,row.user_id,row.content,row.created_at]
      );
    }

    for (let i = 1; i <= likesN; i++) {
      const id = `bulk_like_${i}`;
      const row = {
        id,
        post_id: postIds[i % postIds.length],
        user_id: profileIds[(i + 7) % profileIds.length],
        created_at: new Date(Date.now() - i * 20000).toISOString(),
      };
      await pool.query(
        `INSERT INTO app_likes(id,post_id,user_id,created_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO NOTHING`,
        [row.id,row.post_id,row.user_id,row.created_at]
      );
    }

    // sample rows for remaining tables
    const sampleVideos = [
      'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
      'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
      'https://samplelib.com/lib/preview/mp4/sample-15s.mp4',
    ];

    for (let i = 1; i <= postsN; i++) {
      const postId = postIds[i % postIds.length];
      const mediaCount = 2 + (i % 4); // 2~5장
      for (let m = 0; m < mediaCount; m++) {
        const id = `bulk_media_${i}_${m}`;
        const useVideo = (m === 0 && i % 12 === 0) || (m > 0 && i % 5 === 0);
        const mediaUrl = useVideo
          ? sampleVideos[(i + m) % sampleVideos.length]
          : `https://picsum.photos/seed/media-${i}-${m}/1200/1500`;
        const mediaType = useVideo ? 'video' : 'image';

        await pool.query(
          `INSERT INTO app_post_media(id,post_id,media_url,media_type,order_index,created_at)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO NOTHING`,
          [id, postId, mediaUrl, mediaType, m, new Date().toISOString()]
        );
      }
    }

    for (let i = 1; i <= Math.min(300, usersN * 2); i++) {
      const id = `bulk_follow_${i}`;
      await pool.query(
        `INSERT INTO app_follows(id,follower_id,following_id,created_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO NOTHING`,
        [id, profileIds[i % profileIds.length], profileIds[(i + 1) % profileIds.length], new Date().toISOString()]
      );
    }

    for (let i = 1; i <= Math.min(500, postsN); i++) {
      const id = `bulk_saved_${i}`;
      await pool.query(
        `INSERT INTO app_saved_posts(id,user_id,post_id,created_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO NOTHING`,
        [id, profileIds[(i + 2) % profileIds.length], postIds[i % postIds.length], new Date().toISOString()]
      );
    }

    for (let i = 1; i <= Math.min(800, likesN); i++) {
      const id = `bulk_noti_${i}`;
      await pool.query(
        `INSERT INTO app_notifications(id,user_id,actor_id,type,post_id,is_read,created_at)
         VALUES ($1,$2,$3,'like',$4,false,$5)
         ON CONFLICT (id) DO NOTHING`,
        [id, profileIds[i % profileIds.length], profileIds[(i + 3) % profileIds.length], postIds[i % postIds.length], new Date().toISOString()]
      );
    }

    for (let i = 1; i <= 40; i++) {
      const roomId = `bulk_room_${i}`;
      await pool.query(
        `INSERT INTO app_rooms(id,type,created_at)
         VALUES ($1,'direct',$2)
         ON CONFLICT (id) DO NOTHING`,
        [roomId, new Date().toISOString()]
      );
      await pool.query(
        `INSERT INTO app_participants(id,room_id,user_id,joined_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO NOTHING`,
        [`bulk_pt_${i}_1`, roomId, profileIds[i % profileIds.length], new Date().toISOString()]
      );
      await pool.query(
        `INSERT INTO app_participants(id,room_id,user_id,joined_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO NOTHING`,
        [`bulk_pt_${i}_2`, roomId, profileIds[(i + 5) % profileIds.length], new Date().toISOString()]
      );
      await pool.query(
        `INSERT INTO app_messages(id,room_id,sender_id,content,created_at,read_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [`bulk_msg_${i}`, roomId, profileIds[i % profileIds.length], `샘플 메시지 ${i}`, new Date().toISOString(), null]
      );
    }

    for (let i = 1; i <= 80; i++) {
      await pool.query(
        `INSERT INTO app_reports(id,user_id,reason,status,created_at)
         VALUES ($1,$2,$3,'open',$4)
         ON CONFLICT (id) DO NOTHING`,
        [`bulk_report_${i}`, profileIds[i % profileIds.length], `샘플 신고 ${i}`, new Date().toISOString()]
      );
    }

    res.json({ ok: true, seeded: { users: usersN, posts: postsN, comments: commentsN, likes: likesN } });
  } catch {
    res.status(500).json({ ok: false, error: 'seed_bulk_failed' });
  }
});

app.get('/api/admin/tables', requireAdmin, async (_req, res) => {
  const tableNames = [
    'app_users','app_profiles','app_posts','app_post_media','app_likes','app_comments','app_follows','app_saved_posts','app_notifications','app_rooms','app_participants','app_messages','app_reports','admin_audit_logs'
  ];
  try {
    const out = [];
    for (const t of tableNames) {
      const c = await pool.query(`SELECT COUNT(*)::int AS count FROM ${t}`);
      out.push({ table: t, count: c.rows[0].count });
    }
    res.json({ ok: true, tables: out });
  } catch {
    res.status(500).json({ ok: false, error: 'tables_failed' });
  }
});

app.get('/api/admin/table/:name', requireAdmin, async (req, res) => {
  const name = String(req.params.name || '').trim();
  const allow = new Set(['app_users','app_profiles','app_posts','app_post_media','app_likes','app_comments','app_follows','app_saved_posts','app_notifications','app_rooms','app_participants','app_messages','app_reports','admin_audit_logs']);
  if (!allow.has(name)) return res.status(400).json({ ok: false, error: 'table_not_allowed' });
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
  try {
    const rows = await pool.query(`SELECT * FROM ${name} ORDER BY 1 DESC LIMIT $1`, [limit]);
    res.json({ ok: true, table: name, rows: rows.rows });
  } catch {
    res.status(500).json({ ok: false, error: 'table_rows_failed' });
  }
});


function getAuthUserId(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = String(payload.sub || '');
    return userId || null;
  } catch {
    return null;
  }
}

async function enqueueMessageCreated(message) {
  // TODO: Queue(Pub/Sub/Cloud Tasks) 연동 지점
  return { queued: true, messageId: message.id };
}

app.post('/api/push/tokens', authRateLimit(60, 60_000), async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  const pushToken = String(req.body?.push_token || '').trim();
  const platform = String(req.body?.platform || '').trim().toLowerCase();
  if (!pushToken) return res.status(400).json({ error: 'push_token_required' });
  if (!['ios', 'android', 'web'].includes(platform)) return res.status(400).json({ error: 'invalid_platform' });

  try {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO app_device_tokens(id, user_id, platform, push_token, is_active)
       VALUES ($1,$2,$3,$4,true)
       ON CONFLICT (push_token)
       DO UPDATE SET user_id=EXCLUDED.user_id, platform=EXCLUDED.platform, is_active=true`,
      [id, userId, platform, pushToken]
    );
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'push_token_upsert_failed' });
  }
});

app.delete('/api/push/tokens/:token', authRateLimit(60, 60_000), async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const token = String(req.params.token || '').trim();
  if (!token) return res.status(400).json({ error: 'token_required' });

  try {
    await pool.query('UPDATE app_device_tokens SET is_active=false WHERE user_id=$1 AND push_token=$2', [userId, token]);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'push_token_delete_failed' });
  }
});

app.get('/api/chat/rooms', async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  try {
    const q = await pool.query(
      `SELECT r.id, r.type, r.created_at,
              COALESCE((SELECT m.content FROM app_messages m WHERE m.room_id=r.id ORDER BY m.created_at DESC LIMIT 1), '') AS last_message,
              (SELECT m.created_at FROM app_messages m WHERE m.room_id=r.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
       FROM app_rooms r
       JOIN app_participants p ON p.room_id=r.id
       WHERE p.user_id=$1
       ORDER BY last_message_at DESC NULLS LAST, r.created_at DESC`,
      [userId]
    );
    return res.json({ rooms: q.rows });
  } catch {
    return res.status(500).json({ error: 'chat_rooms_failed' });
  }
});

app.get('/api/chat/rooms/:roomId/messages', async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const roomId = String(req.params.roomId || '');
  const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
  const before = req.query.before ? String(req.query.before) : null;

  try {
    const allowed = await pool.query('SELECT 1 FROM app_participants WHERE room_id=$1 AND user_id=$2 LIMIT 1', [roomId, userId]);
    if (!allowed.rows.length) return res.status(403).json({ error: 'forbidden' });

    let rows;
    if (before) {
      rows = await pool.query(
        `SELECT * FROM app_messages WHERE room_id=$1 AND created_at < $2 ORDER BY created_at DESC LIMIT $3`,
        [roomId, before, limit]
      );
    } else {
      rows = await pool.query(
        `SELECT * FROM app_messages WHERE room_id=$1 ORDER BY created_at DESC LIMIT $2`,
        [roomId, limit]
      );
    }
    return res.json({ messages: rows.rows.reverse() });
  } catch {
    return res.status(500).json({ error: 'chat_messages_failed' });
  }
});

app.post('/api/chat/rooms/:roomId/messages', authRateLimit(120, 60_000), async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const roomId = String(req.params.roomId || '');
  const content = String(req.body?.content || '').trim();
  if (!content) return res.status(400).json({ error: 'content_required' });

  try {
    const allowed = await pool.query('SELECT 1 FROM app_participants WHERE room_id=$1 AND user_id=$2 LIMIT 1', [roomId, userId]);
    if (!allowed.rows.length) return res.status(403).json({ error: 'forbidden' });

    const message = {
      id: crypto.randomUUID(),
      room_id: roomId,
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    };

    await pool.query(
      `INSERT INTO app_messages(id, room_id, sender_id, content, created_at, read_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [message.id, message.room_id, message.sender_id, message.content, message.created_at, message.read_at]
    );

    const participants = await pool.query('SELECT user_id FROM app_participants WHERE room_id=$1 AND user_id <> $2', [roomId, userId]);
    for (const p of participants.rows) {
      await pool.query(
        `INSERT INTO app_message_deliveries(id, message_id, user_id, status, updated_at)
         VALUES ($1,$2,$3,'queued',now())`,
        [crypto.randomUUID(), message.id, String(p.user_id)]
      );
    }

    await enqueueMessageCreated(message);

    return res.json({ ok: true, message });
  } catch {
    return res.status(500).json({ error: 'chat_send_failed' });
  }
});

app.post('/api/chat/messages/:id/read', authRateLimit(180, 60_000), async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const messageId = String(req.params.id || '');

  try {
    const msg = await pool.query('SELECT room_id FROM app_messages WHERE id=$1 LIMIT 1', [messageId]);
    if (!msg.rows.length) return res.status(404).json({ error: 'message_not_found' });

    const roomId = String(msg.rows[0].room_id);
    const allowed = await pool.query('SELECT 1 FROM app_participants WHERE room_id=$1 AND user_id=$2 LIMIT 1', [roomId, userId]);
    if (!allowed.rows.length) return res.status(403).json({ error: 'forbidden' });

    await pool.query('UPDATE app_messages SET read_at=COALESCE(read_at, now()) WHERE id=$1', [messageId]);
    await pool.query(
      `UPDATE app_message_deliveries SET status='read', updated_at=now() WHERE message_id=$1 AND user_id=$2`,
      [messageId, userId]
    );

    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'chat_read_failed' });
  }
});

const port = Number(process.env.PORT || process.env.API_PORT || 4000);
ensureSchema().then(() => {
  app.listen(port, () => console.log(`API listening on port ${port}`));
});
