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
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

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
      buddy TEXT,
      buddy_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

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
    const totalUsers = await pool.query('SELECT COUNT(*)::int AS count FROM app_users');
    const blockedUsers = await pool.query('SELECT COUNT(*)::int AS count FROM app_users WHERE is_blocked = true');
    const adminUsers = await pool.query("SELECT COUNT(*)::int AS count FROM app_users WHERE role = 'admin'");
    const latest = await pool.query('SELECT id, email, username, role, is_blocked, created_at FROM app_users ORDER BY created_at DESC LIMIT 5');
    res.json({
      ok: true,
      stats: {
        users: totalUsers.rows[0]?.count || 0,
        blockedUsers: blockedUsers.rows[0]?.count || 0,
        adminUsers: adminUsers.rows[0]?.count || 0,
        uptimeSec: Math.round(process.uptime()),
      },
      latestUsers: latest.rows,
    });
  } catch {
    res.status(500).json({ ok: false, error: 'admin_stats_failed' });
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
      `SELECT id, email, username, role, is_blocked, created_at
       FROM app_users
       ${where}
       ORDER BY created_at DESC
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
        if (op === 'ilike') {
          const p = raw.toLowerCase().replace(/%/g, '');
          return String(rowVal ?? '').toLowerCase().includes(p);
        }
        return false;
      });
    }
    return true;
  }));
}

app.get('/api/data/:table', async (req, res) => {
  const table = String(req.params.table || '').trim();
  if (!table) return res.status(400).json({ error: 'invalid_table' });

  try {
    const raw = await pool.query('SELECT data FROM app_records WHERE table_name=$1', [table]);
    let rows = raw.rows.map((r) => r.data);

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

    if (req.query.limit) {
      rows = rows.slice(0, Number(req.query.limit));
    }

    res.json({ data: rows, error: null, count: rows.length });
  } catch {
    res.status(500).json({ error: 'data_read_failed' });
  }
});

app.post('/api/data/:table', async (req, res) => {
  const table = String(req.params.table || '').trim();
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!table) return res.status(400).json({ error: 'invalid_table' });

  try {
    for (const row of rows) {
      const id = String(row.id || row.record_id || crypto.randomUUID());
      const payload = { ...row, id };
      await pool.query(
        `INSERT INTO app_records(table_name, record_id, data)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (table_name, record_id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [table, id, JSON.stringify(payload)]
      );
    }
    res.json({ data: rows, error: null });
  } catch {
    res.status(500).json({ error: 'data_insert_failed' });
  }
});

app.patch('/api/data/:table', async (req, res) => {
  const table = String(req.params.table || '').trim();
  const filters = Array.isArray(req.body?.filters) ? req.body.filters : [];
  const patch = req.body?.patch || {};
  if (!table) return res.status(400).json({ error: 'invalid_table' });

  try {
    const raw = await pool.query('SELECT record_id, data FROM app_records WHERE table_name=$1', [table]);
    const matched = applyJsonFilters(raw.rows.map((r) => ({ ...r.data, __id: r.record_id })), filters);

    for (const row of matched) {
      const next = { ...row, ...patch };
      delete next.__id;
      await pool.query(
        'UPDATE app_records SET data=$1::jsonb, updated_at=now() WHERE table_name=$2 AND record_id=$3',
        [JSON.stringify(next), table, row.__id]
      );
    }

    res.json({ data: null, error: null, updated: matched.length });
  } catch {
    res.status(500).json({ error: 'data_update_failed' });
  }
});

app.delete('/api/data/:table', async (req, res) => {
  const table = String(req.params.table || '').trim();
  const filters = Array.isArray(req.body?.filters) ? req.body.filters : [];
  if (!table) return res.status(400).json({ error: 'invalid_table' });

  try {
    const raw = await pool.query('SELECT record_id, data FROM app_records WHERE table_name=$1', [table]);
    const matched = applyJsonFilters(raw.rows.map((r) => ({ ...r.data, __id: r.record_id })), filters);
    for (const row of matched) {
      await pool.query('DELETE FROM app_records WHERE table_name=$1 AND record_id=$2', [table, row.__id]);
    }
    res.json({ data: null, error: null, deleted: matched.length });
  } catch {
    res.status(500).json({ error: 'data_delete_failed' });
  }
});

app.post('/api/data/seed/default', async (_req, res) => {
  const now = new Date().toISOString();
  const samples = {
    profiles: [
      { id: 'u_demo', username: 'demo', full_name: 'Demo User', bio: 'Diver', avatar_url: '' },
      { id: 'u_ocean', username: 'ocean_lee', full_name: 'Ocean Lee', bio: 'Ocean lover', avatar_url: '' },
      { id: 'u_blue', username: 'blue_fin', full_name: 'Blue Fin', bio: 'Freediver', avatar_url: '' }
    ],
    posts: [
      { id: 'p1', user_id: 'u_ocean', image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200', caption: '야간다이빙 기록 #Jeju', created_at: now, location: 'Jeju' },
      { id: 'p2', user_id: 'u_blue', image_url: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=1200', caption: '프리다이빙 세션 #Bali', created_at: now, location: 'Bali', video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
    ],
    likes: [], comments: [], follows: [], saved_posts: [], notifications: [], post_media: [], rooms: [], participants: [], messages: [], reports: []
  };

  try {
    const exists = await pool.query("SELECT COUNT(*)::int AS count FROM app_records WHERE table_name='profiles'");
    if ((exists.rows[0]?.count || 0) > 0) {
      return res.json({ ok: true, seeded: false, reason: 'already_seeded' });
    }

    for (const [table, rows] of Object.entries(samples)) {
      for (const row of rows) {
        const id = String(row.id || crypto.randomUUID());
        await pool.query(
          `INSERT INTO app_records(table_name, record_id, data)
           VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (table_name, record_id)
           DO NOTHING`,
          [table, id, JSON.stringify({ ...row, id })]
        );
      }
    }

    res.json({ ok: true, seeded: true });
  } catch {
    res.status(500).json({ ok: false, error: 'seed_failed' });
  }
});

app.post('/api/admin/migrate-normalized', requireAdmin, async (_req, res) => {
  try {
    const mapping = [
      ['profiles', 'app_profiles', ['id','username','full_name','bio','avatar_url','website','created_at']],
      ['posts', 'app_posts', ['id','user_id','image_url','video_url','caption','location','dive_type','dive_date','max_depth','water_temperature','dive_duration','dive_site','visibility','buddy','buddy_name','created_at']],
      ['post_media', 'app_post_media', ['id','post_id','media_url','media_type','order_index','created_at']],
      ['likes', 'app_likes', ['id','post_id','user_id','created_at']],
      ['comments', 'app_comments', ['id','post_id','user_id','content','created_at']],
      ['follows', 'app_follows', ['id','follower_id','following_id','created_at']],
      ['saved_posts', 'app_saved_posts', ['id','user_id','post_id','created_at']],
      ['notifications', 'app_notifications', ['id','user_id','actor_id','type','post_id','is_read','created_at']],
    ];

    const result = {};

    for (const [srcTable, dstTable, cols] of mapping) {
      const raw = await pool.query('SELECT data FROM app_records WHERE table_name=$1', [srcTable]);
      let count = 0;
      for (const row of raw.rows) {
        const d = row.data || {};
        const values = cols.map((c) => {
          if (c === 'created_at') return d[c] || new Date().toISOString();
          return d[c] ?? null;
        });
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const updates = cols.filter((c) => c !== 'id').map((c, i) => `${c}=EXCLUDED.${c}`).join(', ');
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
  } catch {
    res.status(500).json({ ok: false, error: 'normalized_migration_failed' });
  }
});

const port = Number(process.env.API_PORT || 4000);
ensureSchema().then(() => {
  app.listen(port, () => console.log(`API listening on http://127.0.0.1:${port}`));
});
