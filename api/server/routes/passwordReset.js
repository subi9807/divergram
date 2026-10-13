const RESET_TTL_MINUTES = 30;

const normalizeBaseUrl = (value) => String(value || 'https://adm.divergram.com').trim().replace(/\/+$/, '');
const hashToken = (crypto, token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');

const accountLabel = (scope) => {
  if (scope === 'admin') return '관리자 회원';
  if (scope === 'resort') return '리조트 회원';
  return '일반 회원';
};

async function sendPasswordResetEmail({ email, resetLink, scope }) {
  const subject = '[Divergram] 비밀번호를 재설정해 주세요';
  const label = accountLabel(scope);
  const text = `Divergram ${label} 비밀번호 재설정\n\n아래 링크에서 새 비밀번호를 설정해 주세요.\n${resetLink}\n\n이 링크는 ${RESET_TTL_MINUTES}분 동안 한 번만 사용할 수 있습니다. 요청하지 않았다면 이 메일을 무시해 주세요.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#17343e"><p style="color:#087f79;font-weight:700">DIVERGRAM</p><h2>비밀번호 재설정</h2><p>${label} 계정의 새 비밀번호를 설정하려면 아래 버튼을 눌러 주세요.</p><p style="margin:28px 0"><a href="${resetLink}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#087f79;color:#fff;text-decoration:none;font-weight:700">새 비밀번호 설정</a></p><p style="font-size:13px;color:#677b80">이 링크는 ${RESET_TTL_MINUTES}분 동안 한 번만 사용할 수 있습니다.<br>요청하지 않았다면 이 메일을 무시해 주세요.</p></div>`;

  const smtpHost = String(process.env.SMTP_HOST || '').trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || '').trim();
  let smtpError = null;
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      const fromAddress = String(process.env.SMTP_FROM || smtpUser).trim();
      const from = fromAddress.includes('<') ? fromAddress : `Divergram <${fromAddress}>`;
      await transporter.sendMail({ from, to: email, subject, text, html });
      return 'smtp';
    } catch (error) {
      smtpError = error;
    }
  }

  const infobipBaseUrl = String(process.env.INFOBIP_BASE_URL || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const infobipApiKey = String(process.env.INFOBIP_API_KEY || '').trim();
  const infobipEmailSender = String(process.env.INFOBIP_EMAIL_SENDER || '').trim();
  if (infobipBaseUrl && infobipApiKey && infobipEmailSender) {
    const response = await fetch(`https://${infobipBaseUrl}/email/4/messages`, {
      method: 'POST',
      headers: { authorization: `App ${infobipApiKey}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ messages: [{ destinations: [{ to: [{ destination: email }] }], sender: infobipEmailSender, content: { subject, text, html } }] }),
    });
    if (!response.ok) throw new Error(`password_reset_email_failed:${response.status}`);
    return 'infobip';
  }

  if (smtpError) throw smtpError;
  throw new Error('password_reset_email_not_configured');
}

export async function ensurePasswordResetSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      requested_by_admin_id TEXT,
      delivery_channel TEXT NOT NULL DEFAULT '',
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS app_password_reset_tokens_user_idx ON app_password_reset_tokens(user_id, created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS app_password_reset_tokens_expiry_idx ON app_password_reset_tokens(expires_at)');
}

export function registerPasswordResetRoutes(app, { pool, requireAdmin, authRateLimit, bcrypt, crypto, isStrongPassword }) {
  app.post('/api/admin/users/:userId/password-reset-email', requireAdmin, async (req, res) => {
    const userId = String(req.params.userId || '').trim();
    if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });

    let tokenHash = '';
    try {
      const userQ = await pool.query(
        `SELECT id::text AS id, email, username, role, account_scope, is_blocked
         FROM app_users WHERE id=$1 LIMIT 1`,
        [userId]
      );
      if (!userQ.rows.length) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const user = userQ.rows[0];
      if (!String(user.email || '').trim()) return res.status(400).json({ ok: false, error: 'user_email_missing' });

      const token = crypto.randomBytes(32).toString('base64url');
      tokenHash = hashToken(crypto, token);
      const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
      await pool.query('UPDATE app_password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [userId]);
      await pool.query(
        `INSERT INTO app_password_reset_tokens(user_id, token_hash, requested_by_admin_id, expires_at)
         VALUES ($1,$2,$3,$4)`,
        [userId, tokenHash, req.adminAuth?.userId || null, expiresAt]
      );

      const baseUrl = normalizeBaseUrl(process.env.PASSWORD_RESET_BASE_URL);
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const channel = await sendPasswordResetEmail({ email: user.email, resetLink, scope: user.account_scope });
      await pool.query('UPDATE app_password_reset_tokens SET delivery_channel=$1 WHERE token_hash=$2', [channel, tokenHash]);
      await pool.query(
        `INSERT INTO admin_audit_logs(action, target_user_id, detail)
         VALUES ('password_reset_email_sent',$1,$2::jsonb)`,
        [userId, JSON.stringify({ requestedBy: req.adminAuth?.userId || null, accountScope: user.account_scope || 'personal', channel })]
      );
      return res.json({ ok: true, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      if (tokenHash) await pool.query('UPDATE app_password_reset_tokens SET used_at=now() WHERE token_hash=$1', [tokenHash]).catch(() => undefined);
      return res.status(502).json({ ok: false, error: 'password_reset_email_failed', detail: String(error?.message || error) });
    }
  });

  app.get('/api/auth/password-reset/:token', authRateLimit(20, 60_000), async (req, res) => {
    const token = String(req.params.token || '').trim();
    if (!token || token.length < 32) return res.status(400).json({ ok: false, error: 'invalid_reset_token' });
    try {
      const q = await pool.query(
        `SELECT t.expires_at, u.email, u.account_scope
         FROM app_password_reset_tokens t
         JOIN app_users u ON u.id::text=t.user_id
         WHERE t.token_hash=$1 AND t.used_at IS NULL AND t.expires_at>now()
         LIMIT 1`,
        [hashToken(crypto, token)]
      );
      if (!q.rows.length) return res.status(410).json({ ok: false, error: 'reset_token_expired' });
      const row = q.rows[0];
      const [name, domain] = String(row.email || '').split('@');
      const maskedEmail = domain ? `${String(name || '').slice(0, 2)}***@${domain}` : '***';
      return res.json({ ok: true, email: maskedEmail, accountScope: row.account_scope || 'personal', expiresAt: row.expires_at });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'password_reset_check_failed', detail: String(error?.message || error) });
    }
  });

  app.post('/api/auth/password-reset/confirm', authRateLimit(8, 60_000), async (req, res) => {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    if (!token || token.length < 32) return res.status(400).json({ ok: false, error: 'invalid_reset_token' });
    if (!isStrongPassword(password)) return res.status(400).json({ ok: false, error: 'invalid_password' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const q = await client.query(
        `SELECT id, user_id FROM app_password_reset_tokens
         WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()
         FOR UPDATE`,
        [hashToken(crypto, token)]
      );
      if (!q.rows.length) {
        await client.query('ROLLBACK');
        return res.status(410).json({ ok: false, error: 'reset_token_expired' });
      }
      const reset = q.rows[0];
      const passwordHash = await bcrypt.hash(password, 12);
      await client.query('UPDATE app_users SET password_hash=$1, password_sha256=NULL WHERE id=$2', [passwordHash, reset.user_id]);
      await client.query('UPDATE app_password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [reset.user_id]);
      await client.query(
        `INSERT INTO admin_audit_logs(action, target_user_id, detail)
         VALUES ('password_reset_completed',$1,$2::jsonb)`,
        [reset.user_id, JSON.stringify({ resetTokenId: reset.id })]
      );
      await client.query('COMMIT');
      return res.json({ ok: true });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      return res.status(500).json({ ok: false, error: 'password_reset_failed', detail: String(error?.message || error) });
    } finally {
      client.release();
    }
  });
}
