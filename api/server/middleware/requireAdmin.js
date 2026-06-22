import jwt from 'jsonwebtoken';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const parts = String(cookieHeader).split(';').map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
  }
  return null;
}

function getRequestToken(req) {
  const auth = String(req.headers.authorization || '');
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return getCookieValue(req.headers.cookie, 'dg_session');
}

export function requireAdminFactory({ adminApiKey, jwtSecret, pool, adminEmails = [] }) {
  const adminEmailSet = new Set((adminEmails || []).map(normalizeEmail).filter(Boolean));

  return async function requireAdmin(req, res, next) {
    const key = req.headers['x-admin-key'];
    if (adminApiKey && key && key === adminApiKey) {
      req.adminAuth = { method: 'admin-key', email: '', userId: '', role: 'admin' };
      return next();
    }

    const token = getRequestToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    if (!jwtSecret) return res.status(500).json({ error: 'admin_auth_not_configured' });

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const userId = String(payload?.sub || '').trim();
    const email = normalizeEmail(payload?.email || '');
    if (!userId || !email) return res.status(401).json({ error: 'unauthorized' });
    if (adminEmailSet.has(email)) {
      req.adminAuth = { method: 'jwt', email, userId, role: 'admin' };
      return next();
    }

    try {
      const q = await pool.query('SELECT email, role, is_blocked FROM app_users WHERE id=$1 LIMIT 1', [userId]);
      if (!q.rows.length) return res.status(403).json({ error: 'forbidden' });
      const row = q.rows[0];
      if (row.is_blocked) return res.status(403).json({ error: 'forbidden' });
      if (String(row.role || '').toLowerCase() === 'admin' || adminEmailSet.has(normalizeEmail(row.email))) {
        req.adminAuth = { method: 'jwt', email, userId, role: String(row.role || 'admin') };
        return next();
      }
      return res.status(403).json({ error: 'forbidden' });
    } catch {
      return res.status(500).json({ error: 'admin_auth_failed' });
    }
  };
}
