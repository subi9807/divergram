export function registerAuthRoutes(app, deps) {
  const {
    pool,
    authRateLimit,
    normalizeEmail,
    validateSignupInput,
    isStrongPassword,
    bcrypt,
    crypto,
    jwt,
    JWT_SECRET,
  } = deps;

  const API_PUBLIC_BASE_URL = String(process.env.API_PUBLIC_BASE_URL || 'https://api.divergram.com').replace(/\/$/, '');
  const WEB_APP_BASE_URL = String(process.env.WEB_APP_BASE_URL || 'https://divergram.com').replace(/\/$/, '');
  const SESSION_COOKIE_NAME = 'dg_session';
  const SESSION_COOKIE_DOMAIN = String(process.env.SESSION_COOKIE_DOMAIN || '.divergram.com').trim();
  const ADMIN_EMAILS = new Set(
    String(process.env.ADMIN_EMAILS || 'subi9807@gmail.com')
      .split(',')
      .map((value) => normalizeEmail(value))
      .filter(Boolean)
  );

  const isAdminEmail = (email) => ADMIN_EMAILS.has(normalizeEmail(email));
  const isTrustedReturnTo = (value) => {
    try {
      const url = new URL(String(value || '').trim());
      const host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
      if (host === 'localhost' || host === '127.0.0.1') return true;
      return host === 'divergram.com' || host.endsWith('.divergram.com');
    } catch {
      return false;
    }
  };
  const resolveReturnTo = (value, fallback) => {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (raw.startsWith('/')) {
      try {
        const base = new URL(fallback || WEB_APP_BASE_URL);
        const url = new URL(raw, base.origin);
        return isTrustedReturnTo(url.toString()) ? url.toString() : fallback;
      } catch {
        return fallback;
      }
    }
    return isTrustedReturnTo(raw) ? raw : fallback;
  };
  const appendQuery = (target, params = {}) => {
    const url = new URL(target);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, value);
    }
    return url.toString();
  };

  const getCookieValue = (cookieHeader, name) => {
    if (!cookieHeader) return null;
    const parts = String(cookieHeader).split(';').map((v) => v.trim());
    for (const part of parts) {
      if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
    }
    return null;
  };

  const getRequestToken = (req) => {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) return auth.slice(7);
    return getCookieValue(req.headers.cookie, SESSION_COOKIE_NAME);
  };

  const setSessionCookie = (res, token, sessionDays) => {
    const maxAge = sessionDays * 24 * 60 * 60;
    const cookie = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      'Path=/',
      `Max-Age=${maxAge}`,
      `Domain=${SESSION_COOKIE_DOMAIN}`,
      'HttpOnly',
      'SameSite=Lax',
      'Secure',
    ].join('; ');
    res.setHeader('Set-Cookie', cookie);
  };

  const clearSessionCookie = (res) => {
    const cookie = [
      `${SESSION_COOKIE_NAME}=`,
      'Path=/',
      'Max-Age=0',
      `Domain=${SESSION_COOKIE_DOMAIN}`,
      'HttpOnly',
      'SameSite=Lax',
      'Secure',
    ].join('; ');
    res.setHeader('Set-Cookie', cookie);
  };

  const PROFILE_SELECT_COLUMNS =
    'username,full_name,contact_phone,bio,avatar_url,resort_cover_url,resort_photo_urls,resort_amenities,website,account_type,diving_level,scuba_level,freediving_level,license_image_url,license_type,license_number,license_agency,license_issued_at';

  const buildProfileFromRow = (row, fallbackId, fallbackUsername = '') => {
    const source = row || {};
    return {
      id: String(source.id || fallbackId || ''),
      username: String(source.username || fallbackUsername || ''),
      full_name: String(source.full_name || fallbackUsername || ''),
      contact_phone: String(source.contact_phone || ''),
      bio: String(source.bio || ''),
      avatar_url: String(source.avatar_url || ''),
      resort_cover_url: String(source.resort_cover_url || ''),
      resort_photo_urls: Array.isArray(source.resort_photo_urls) ? source.resort_photo_urls : [],
      resort_amenities: Array.isArray(source.resort_amenities) ? source.resort_amenities : [],
      website: String(source.website || ''),
      account_type: String(source.account_type || 'personal'),
      diving_level: String(source.diving_level || ''),
      scuba_level: String(source.scuba_level || ''),
      freediving_level: String(source.freediving_level || ''),
      license_image_url: String(source.license_image_url || ''),
      license_type: String(source.license_type || ''),
      license_number: String(source.license_number || ''),
      license_agency: String(source.license_agency || ''),
      license_issued_at: String(source.license_issued_at || ''),
    };
  };

  const ensureOAuthIdentityTable = async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_user_oauth_identities (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        provider TEXT NOT NULL,
        provider_sub TEXT NOT NULL,
        email_at_link TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(provider, provider_sub),
        UNIQUE(user_id, provider)
      );
    `);
  };

  const upsertOAuthUser = async ({ provider, providerSub, email, name, sessionDays }) => {
    await ensureOAuthIdentityTable();
    const normalizedEmail = normalizeEmail(email || '');
    if (!normalizedEmail) throw new Error('oauth_email_required');
    const usernameBase = String(name || normalizedEmail.split('@')[0] || 'diver').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 24) || 'diver_user';

    let userRow = null;
    let q = await pool.query(
      `SELECT u.id,u.email,u.username
         FROM app_user_oauth_identities i
         JOIN app_users u ON u.id=i.user_id
        WHERE i.provider=$1 AND i.provider_sub=$2
        LIMIT 1`,
      [provider, providerSub]
    );
    if (q.rows.length) userRow = q.rows[0];

    if (!userRow) {
      q = await pool.query('SELECT id,email,username FROM app_users WHERE lower(email)=lower($1) LIMIT 1', [normalizedEmail]);
      if (q.rows.length) userRow = q.rows[0];
    }

    if (!userRow) {
      const tempPassword = crypto.randomBytes(20).toString('hex') + '!Aa1';
      const hash = await bcrypt.hash(tempPassword, 12);
      const sha = crypto.createHash('sha256').update(tempPassword).digest('hex');
      const uq = await pool.query(
        `INSERT INTO app_users(email,password_hash,password_sha256,username,role,email_verified)
         VALUES ($1,$2,$3,$4,$5,true)
         RETURNING id,email,username`,
        [normalizedEmail, hash, sha, usernameBase, isAdminEmail(normalizedEmail) ? 'admin' : 'user']
      );
      userRow = uq.rows[0];
    }

    if (isAdminEmail(normalizedEmail)) {
      await pool.query('UPDATE app_users SET role=$1, email_verified=true WHERE id=$2', ['admin', userRow.id]);
    } else {
      await pool.query('UPDATE app_users SET email_verified=true WHERE id=$1', [userRow.id]);
    }

    await pool.query(
      `INSERT INTO app_user_oauth_identities(user_id, provider, provider_sub, email_at_link)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (provider, provider_sub) DO UPDATE SET user_id=EXCLUDED.user_id, email_at_link=EXCLUDED.email_at_link`,
      [userRow.id, provider, providerSub, normalizedEmail]
    );

    await pool.query(
      `INSERT INTO app_profiles(id,username,full_name,bio,avatar_url,account_type)
       VALUES ($1,$2,$3,'','', 'personal')
       ON CONFLICT (id) DO NOTHING`,
      [String(userRow.id), userRow.username, name || userRow.username]
    );

    const pq = await pool.query(`SELECT ${PROFILE_SELECT_COLUMNS} FROM app_profiles WHERE id=$1`, [String(userRow.id)]);
    const user = { id: String(userRow.id), email: userRow.email };
    const profile = buildProfileFromRow(pq.rows[0], userRow.id, userRow.username);
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: `${sessionDays}d` });
    return { user, profile, token };
  };

  const fetchGoogleProfileByAccessToken = async (accessToken) => {
    const infoResp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!infoResp.ok) throw new Error(`google_userinfo_failed_${infoResp.status}`);
    const info = await infoResp.json();
    return {
      sub: String(info.sub || '').trim(),
      email: normalizeEmail(info.email || ''),
      name: String(info.name || info.given_name || '').trim(),
    };
  };

  const fetchGoogleProfileByAnyToken = async (token) => {
    try {
      return await fetchGoogleProfileByAccessToken(token);
    } catch (error) {
      const attempts = [
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`,
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
      ];
      let lastError = error;
      for (const url of attempts) {
        try {
          const infoResp = await fetch(url);
          if (!infoResp.ok) {
            lastError = new Error(`google_tokeninfo_failed_${infoResp.status}`);
            continue;
          }
          const info = await infoResp.json();
          return {
            sub: String(info.sub || info.user_id || '').trim(),
            email: normalizeEmail(info.email || ''),
            name: String(info.name || info.given_name || '').trim(),
          };
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError;
    }
  };

  let appleJwkCache = { keys: [], expiresAt: 0 };

  const getAppleSigningKeys = async () => {
    if (appleJwkCache.expiresAt > Date.now() && appleJwkCache.keys.length) return appleJwkCache.keys;
    const keyResp = await fetch('https://appleid.apple.com/auth/keys');
    if (!keyResp.ok) throw new Error(`apple_keys_failed_${keyResp.status}`);
    const body = await keyResp.json();
    appleJwkCache = { keys: Array.isArray(body.keys) ? body.keys : [], expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
    return appleJwkCache.keys;
  };

  const verifyAppleIdentityToken = async (identityToken) => {
    const decodedHeader = jwt.decode(identityToken, { complete: true })?.header || {};
    const kid = String(decodedHeader.kid || '').trim();
    if (!kid) throw new Error('apple_identity_invalid_header');
    const keys = await getAppleSigningKeys();
    const jwk = keys.find((item) => String(item.kid || '') === kid);
    if (!jwk) throw new Error('apple_identity_key_not_found');
    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const pem = publicKey.export({ type: 'spki', format: 'pem' });
    const audiences = [
      process.env.APPLE_CLIENT_ID,
      process.env.APPLE_BUNDLE_ID,
      process.env.IOS_BUNDLE_ID,
      'com.divergram.app.ios',
      'com.divergram.app',
    ].map((value) => String(value || '').trim()).filter(Boolean);
    const verifyOptions = { algorithms: ['RS256'], issuer: 'https://appleid.apple.com' };
    if (audiences.length) verifyOptions.audience = audiences;
    return jwt.verify(identityToken, pem, verifyOptions);
  };

  const fetchAppleProfileByIdentityToken = async (identityToken, userInfo = {}) => {
    let decoded = null;
    try {
      decoded = await verifyAppleIdentityToken(identityToken);
    } catch (error) {
      throw new Error(`apple_identity_verify_failed_${String(error?.message || 'unknown').replace(/\s+/g, '_')}`);
    }
    const sub = String(decoded.sub || '').trim();
    return {
      sub,
      email: normalizeEmail(decoded.email || (sub ? userInfo.email : '') || ''),
      name: String(userInfo.name || userInfo.fullName || '').trim(),
    };
  };

  const fetchKakaoProfileByAccessToken = async (accessToken) => {
    const infoResp = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!infoResp.ok) throw new Error(`kakao_userinfo_failed_${infoResp.status}`);
    const info = await infoResp.json();
    return {
      sub: String(info.id || '').trim(),
      email: normalizeEmail(info.kakao_account?.email || ''),
      name: String(info.properties?.nickname || info.kakao_account?.profile?.nickname || '').trim(),
    };
  };

  const fetchNaverProfileByAccessToken = async (accessToken) => {
    const infoResp = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!infoResp.ok) throw new Error(`naver_userinfo_failed_${infoResp.status}`);
    const info = await infoResp.json();
    const profile = info.response || {};
    return {
      sub: String(profile.id || '').trim(),
      email: normalizeEmail(profile.email || ''),
      name: String(profile.name || profile.nickname || '').trim(),
    };
  };

  const fetchFacebookProfileByAccessToken = async (accessToken) => {
    const url = new URL('https://graph.facebook.com/me');
    url.searchParams.set('fields', 'id,name,email');
    url.searchParams.set('access_token', accessToken);
    const infoResp = await fetch(url);
    if (!infoResp.ok) throw new Error(`facebook_userinfo_failed_${infoResp.status}`);
    const info = await infoResp.json();
    return {
      sub: String(info.id || '').trim(),
      email: normalizeEmail(info.email || ''),
      name: String(info.name || '').trim(),
    };
  };

  const fetchInstagramProfileByAccessToken = async (accessToken) => {
    const url = new URL('https://graph.instagram.com/me');
    url.searchParams.set('fields', 'id,username');
    url.searchParams.set('access_token', accessToken);
    const infoResp = await fetch(url);
    if (!infoResp.ok) throw new Error(`instagram_userinfo_failed_${infoResp.status}`);
    const info = await infoResp.json();
    const sub = String(info.id || '').trim();
    return {
      sub,
      email: sub ? `instagram_${sub}@oauth.divergram.local` : '',
      name: String(info.username || '').trim(),
    };
  };

  const fetchMobileOAuthProfile = async (provider, accessToken, userInfo = {}) => {
    if (provider === 'google') return fetchGoogleProfileByAnyToken(accessToken);
    if (provider === 'apple') return fetchAppleProfileByIdentityToken(accessToken, userInfo);
    if (provider === 'kakao') return fetchKakaoProfileByAccessToken(accessToken);
    if (provider === 'naver') return fetchNaverProfileByAccessToken(accessToken);
    if (provider === 'facebook') return fetchFacebookProfileByAccessToken(accessToken);
    if (provider === 'instagram') return fetchInstagramProfileByAccessToken(accessToken);
    throw new Error('unsupported_provider_for_mobile');
  };

  const linkOAuthIdentityToUser = async ({ userId, provider, providerSub, email, sessionDays, verifyEmail = false }) => {
    await ensureOAuthIdentityTable();
    const conflict = await pool.query(
      'SELECT user_id FROM app_user_oauth_identities WHERE provider=$1 AND provider_sub=$2 LIMIT 1',
      [provider, providerSub]
    );
    if (conflict.rows.length && String(conflict.rows[0].user_id) !== String(userId)) {
      throw new Error('oauth_already_linked');
    }

    await pool.query(
      `INSERT INTO app_user_oauth_identities(user_id, provider, provider_sub, email_at_link)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, provider) DO UPDATE SET provider_sub=EXCLUDED.provider_sub, email_at_link=EXCLUDED.email_at_link`,
      [String(userId), provider, providerSub, email]
    );

    if (verifyEmail) {
      await pool.query(
        'UPDATE app_users SET email_verified=true WHERE id=$1 AND lower(email)=lower($2)',
        [String(userId), email]
      );
    }

    const authResult = await buildAuthResultFromUserId(userId, sessionDays);
    return authResult;
  };

  const sendEmailVerifyCode = async ({ userId, email, code, verifyLink }) => {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: email,
        subject: '[Divergram] 이메일 인증을 완료해 주세요',
        text: `Divergram 이메일 인증\n\n인증코드: ${code}\n인증링크: ${verifyLink}\n\n링크는 24시간 동안 유효합니다.`,
        html: `<h2>Divergram 이메일 인증</h2><p>인증코드: <b>${code}</b></p><p><a href="${verifyLink}">이메일 인증 완료하기</a></p><p>링크는 24시간 동안 유효합니다.</p>`,
      });
      return;
    }

    const webhook = process.env.EMAIL_VERIFY_WEBHOOK_URL;
    if (!webhook) {
      console.log(`[EMAIL_VERIFY] user=${userId} target=${email} code=${code} link=${verifyLink}`);
      return;
    }

    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'email_verify', userId, email, code, verifyLink }),
    });

    if (!r.ok) throw new Error(`email_webhook_failed:${r.status}`);
  };

  const parseSessionDays = (raw) => {
    const allowed = new Set([1, 7, 30, 90]);
    const n = Number(raw);
    return allowed.has(n) ? n : 7;
  };

  const OAUTH_CALLBACK_BASE = String(process.env.OAUTH_CALLBACK_BASE_URL || 'https://divergram.com').replace(/\/$/, '');
  const OAUTH_LINK_PENDING_TTL_MS = 30 * 60 * 1000;
  const oauthStateStore = new Map();
  const oauthLinkPendingStore = new Map();
  const oauthStateTtlMs = 10 * 60 * 1000;

  const getOAuthProviders = () => {
    const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const appleEnabled = !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
    const facebookEnabled = !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
    return {
      google: { enabled: googleEnabled, redirectUri: `${OAUTH_CALLBACK_BASE}/api/auth/oauth/google/callback` },
      apple: { enabled: appleEnabled, redirectUri: `${OAUTH_CALLBACK_BASE}/api/auth/oauth/apple/callback` },
      facebook: { enabled: facebookEnabled, redirectUri: `${OAUTH_CALLBACK_BASE}/api/auth/oauth/facebook/callback` },
    };
  };

  const createOAuthState = (provider, sessionDays, mode = 'login', userId = null, returnTo = '') => {
    const state = crypto.randomBytes(24).toString('hex');
    oauthStateStore.set(state, { provider, sessionDays, mode, userId, returnTo, expiresAt: Date.now() + oauthStateTtlMs });
    return state;
  };

  const cleanupOAuthState = () => {
    const now = Date.now();
    for (const [key, value] of oauthStateStore.entries()) {
      if (!value || value.expiresAt < now) oauthStateStore.delete(key);
    }
  };

  const cleanupOAuthPending = () => {
    const now = Date.now();
    for (const [key, value] of oauthLinkPendingStore.entries()) {
      if (!value || value.expiresAt < now) oauthLinkPendingStore.delete(key);
    }
  };

  app.get('/api/auth/oauth/providers', (_req, res) => {
    return res.json({ providers: getOAuthProviders() });
  });

  app.post('/api/auth/oauth/mobile', authRateLimit(20, 60_000), async (req, res) => {
    const provider = String(req.body?.provider || '').toLowerCase();
    const accessToken = String(req.body?.accessToken || '').trim();
    const sessionDays = parseSessionDays(req.body?.sessionDays);
    const rawAutoCreate = req.body?.autoCreate ?? req.body?.createUser ?? req.body?.signup;
    const shouldAutoCreate = rawAutoCreate === true || String(rawAutoCreate || '').toLowerCase() === 'true';
    const userInfo = req.body?.userInfo && typeof req.body.userInfo === 'object' ? req.body.userInfo : {};

    if (!['google', 'apple', 'facebook', 'kakao', 'naver', 'instagram'].includes(provider)) return res.status(400).json({ error: 'unsupported_provider_for_mobile' });
    if (!accessToken) return res.status(400).json({ error: 'access_token_required' });

    try {
      const oauthProfile = await fetchMobileOAuthProfile(provider, accessToken, userInfo);
      if (!oauthProfile.sub) {
        return res.status(400).json({ error: 'profile_missing_fields' });
      }

      await ensureOAuthIdentityTable();
      const linked = await pool.query(
        `SELECT u.id
           FROM app_user_oauth_identities i
           JOIN app_users u ON u.id=i.user_id
          WHERE i.provider=$1 AND i.provider_sub=$2
          LIMIT 1`,
        [provider, oauthProfile.sub]
      );

      if (linked.rows.length) {
        const authResult = await buildAuthResultFromUserId(linked.rows[0].id, sessionDays);
        setSessionCookie(res, authResult.token, sessionDays);
        return res.json({ ...authResult, provider, linked: true });
      }

      if (!oauthProfile.email) {
        return res.status(400).json({ error: 'profile_missing_fields' });
      }

      const existingEmail = await pool.query('SELECT id FROM app_users WHERE lower(email)=lower($1) LIMIT 1', [oauthProfile.email]);
      if (existingEmail.rows.length) {
        const linkToken = jwt.sign(
          {
            purpose: 'oauth_mobile_link',
            provider,
            providerSub: oauthProfile.sub,
            email: oauthProfile.email,
            sessionDays,
          },
          JWT_SECRET,
          { expiresIn: '30m' }
        );
        return res.status(409).json({
          error: 'sso_email_exists',
          linkRequired: true,
          provider,
          providerUserId: oauthProfile.sub,
          email: oauthProfile.email,
          linkToken,
        });
      }

      if (!shouldAutoCreate) {
        return res.status(404).json({
          error: 'sso_signup_required',
          signupRequired: true,
          provider,
          providerUserId: oauthProfile.sub,
          email: oauthProfile.email,
          name: oauthProfile.name,
        });
      }

      const authResult = await upsertOAuthUser({
        provider,
        providerSub: oauthProfile.sub,
        email: oauthProfile.email,
        name: oauthProfile.name,
        sessionDays,
      });
      setSessionCookie(res, authResult.token, sessionDays);
      return res.json({ ...authResult, provider, linked: true });
    } catch (e) {
      const message = String(e?.message || '');
      if (message === 'user_not_found') return res.status(404).json({ error: 'user_not_found' });
      if (message === 'user_blocked') return res.status(403).json({ error: 'user_blocked' });
      if (message === 'unsupported_provider_for_mobile') return res.status(400).json({ error: message });
      if (message.startsWith('apple_identity_') || message.startsWith('apple_keys_failed_')) return res.status(400).json({ error: message });
      if (/_userinfo_failed_/.test(message) || /_tokeninfo_failed_/.test(message) || message.startsWith('google_userinfo_failed_')) {
        return res.status(400).json({ error: message });
      }
      return res.status(500).json({ error: 'oauth_mobile_failed' });
    }
  });

  app.post('/api/auth/oauth/mobile/link', authRateLimit(20, 60_000), async (req, res) => {
    const authToken = getRequestToken(req);
    const linkToken = String(req.body?.linkToken || '').trim();
    if (!authToken) return res.status(401).json({ error: 'unauthorized' });
    if (!linkToken) return res.status(400).json({ error: 'link_token_required' });

    let authPayload = null;
    let linkPayload = null;
    try {
      authPayload = jwt.verify(authToken, JWT_SECRET);
      linkPayload = jwt.verify(linkToken, JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'invalid_or_expired_link_token' });
    }

    const userId = String(authPayload?.sub || '');
    const userEmail = normalizeEmail(authPayload?.email || '');
    if (!userId || !userEmail) return res.status(401).json({ error: 'unauthorized' });
    if (linkPayload?.purpose !== 'oauth_mobile_link') return res.status(400).json({ error: 'invalid_link_token' });

    const provider = String(linkPayload.provider || '').toLowerCase();
    const providerSub = String(linkPayload.providerSub || '').trim();
    const email = normalizeEmail(linkPayload.email || '');
    const sessionDays = parseSessionDays(linkPayload.sessionDays);

    if (!['google', 'apple', 'facebook', 'kakao', 'naver', 'instagram'].includes(provider)) return res.status(400).json({ error: 'unsupported_provider_for_mobile' });
    if (!providerSub || !email) return res.status(400).json({ error: 'invalid_link_payload' });
    if (email !== userEmail) return res.status(409).json({ error: 'oauth_email_mismatch' });

    try {
      const authResult = await linkOAuthIdentityToUser({
        userId,
        provider,
        providerSub,
        email,
        sessionDays,
        verifyEmail: true,
      });
      setSessionCookie(res, authResult.token, sessionDays);
      return res.json({ ok: true, linked: true, ...authResult });
    } catch (e) {
      if (String(e?.message || '') === 'oauth_already_linked') {
        return res.status(409).json({ error: 'oauth_already_linked' });
      }
      return res.status(500).json({ error: 'oauth_link_failed' });
    }
  });

  app.post('/api/auth/oauth/mobile/link/confirm', authRateLimit(20, 60_000), async (req, res) => {
    const linkToken = String(req.body?.linkToken || '').trim();
    const action = String(req.body?.action || 'approve').toLowerCase();
    if (!linkToken) return res.status(400).json({ error: 'link_token_required' });
    if (action !== 'approve') return res.json({ ok: true, linked: false });

    let linkPayload = null;
    try {
      linkPayload = jwt.verify(linkToken, JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'invalid_or_expired_link_token' });
    }
    if (linkPayload?.purpose !== 'oauth_mobile_link') return res.status(400).json({ error: 'invalid_link_token' });

    const provider = String(linkPayload.provider || '').toLowerCase();
    const providerSub = String(linkPayload.providerSub || '').trim();
    const email = normalizeEmail(linkPayload.email || '');
    const sessionDays = parseSessionDays(linkPayload.sessionDays);

    if (!['google', 'apple', 'facebook', 'kakao', 'naver', 'instagram'].includes(provider)) return res.status(400).json({ error: 'unsupported_provider_for_mobile' });
    if (!providerSub || !email) return res.status(400).json({ error: 'invalid_link_payload' });

    try {
      const userQ = await pool.query('SELECT id FROM app_users WHERE lower(email)=lower($1) LIMIT 1', [email]);
      if (!userQ.rows.length) return res.status(404).json({ error: 'oauth_link_email_not_found' });
      const userId = String(userQ.rows[0].id);
      const authResult = await linkOAuthIdentityToUser({
        userId,
        provider,
        providerSub,
        email,
        sessionDays,
        verifyEmail: true,
      });
      setSessionCookie(res, authResult.token, sessionDays);
      return res.json({ ok: true, linked: true, ...authResult });
    } catch (e) {
      if (String(e?.message || '') === 'oauth_already_linked') {
        return res.status(409).json({ error: 'oauth_already_linked' });
      }
      return res.status(500).json({ error: 'oauth_link_confirm_failed' });
    }
  });

  app.get('/api/auth/oauth/:provider/start', authRateLimit(30, 60_000), async (req, res) => {
    cleanupOAuthState();
    const provider = String(req.params.provider || '').toLowerCase();
    const providers = getOAuthProviders();

    if (!['google', 'apple', 'facebook'].includes(provider)) {
      return res.status(400).json({ error: 'unsupported_provider' });
    }

    const target = providers[provider];
    if (!target?.enabled) {
      return res.status(400).json({ error: 'provider_not_configured' });
    }

    const sessionDays = parseSessionDays(req.query?.sessionDays);
    const mode = String(req.query?.mode || 'login').toLowerCase();
    const fallbackReturnTo = mode === 'link' ? `${WEB_APP_BASE_URL}/account` : WEB_APP_BASE_URL;
    const returnTo = resolveReturnTo(req.query?.returnTo, fallbackReturnTo);
    let stateUserId = null;
    if (mode === 'link') {
      const token = getRequestToken(req);
      if (!token) return res.status(401).json({ error: 'unauthorized' });
      try {
        const p = jwt.verify(token, JWT_SECRET);
        stateUserId = String(p.sub || '');
      } catch {
        return res.status(401).json({ error: 'unauthorized' });
      }
      if (!stateUserId) return res.status(401).json({ error: 'unauthorized' });
    }

    const state = createOAuthState(provider, sessionDays, mode, stateUserId, returnTo);
    let url = '';

    if (provider === 'google') {
      const qp = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: target.redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'offline',
        prompt: 'consent',
      });
      url = `https://accounts.google.com/o/oauth2/v2/auth?${qp.toString()}`;
    }

    if (provider === 'facebook') {
      const qp = new URLSearchParams({
        client_id: process.env.FACEBOOK_CLIENT_ID,
        redirect_uri: target.redirectUri,
        response_type: 'code',
        scope: 'email,public_profile',
        state,
      });
      url = `https://www.facebook.com/v19.0/dialog/oauth?${qp.toString()}`;
    }

    if (provider === 'apple') {
      const qp = new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID,
        redirect_uri: target.redirectUri,
        response_type: 'code',
        response_mode: 'form_post',
        scope: 'name email',
        state,
      });
      url = `https://appleid.apple.com/auth/authorize?${qp.toString()}`;
    }

    const accept = String(req.headers?.accept || '');
    const wantsRedirect = String(req.query?.redirect || '') === '1' || accept.includes('text/html');
    if (wantsRedirect) return res.redirect(url);
    return res.json({ provider, url, state, expiresInMs: oauthStateTtlMs });
  });

  app.post('/api/auth/signup', authRateLimit(), async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const username = String(req.body?.username || '').trim();
    const sessionDays = parseSessionDays(req.body?.sessionDays);

    const validationError = validateSignupInput(email, password, username);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
      const hash = await bcrypt.hash(password, 12);
      const sha = crypto.createHash('sha256').update(password).digest('hex');
      const q = await pool.query(
        'INSERT INTO app_users(email, password_hash, password_sha256, username, role) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,username',
        [email, hash, sha, username, isAdminEmail(email) ? 'admin' : 'user']
      );
      const verifyCode = String(Math.floor(100000 + Math.random() * 900000));
      const verifyToken = jwt.sign({ purpose: 'email_verify', sub: String(q.rows[0].id), email }, JWT_SECRET, { expiresIn: '24h' });
      const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await pool.query(
        'UPDATE app_users SET email_pending=$1, email_verify_code=$2, email_verify_expires=$3, email_verified=false WHERE id=$4',
        [email, verifyCode, verifyExpires, String(q.rows[0].id)]
      );
      const verifyLink = `${API_PUBLIC_BASE_URL}/api/auth/email/verify?token=${encodeURIComponent(verifyToken)}`;
      await sendEmailVerifyCode({ userId: String(q.rows[0].id), email, code: verifyCode, verifyLink });
      await pool.query(
        `INSERT INTO app_profiles(id,username,full_name,bio,avatar_url,account_type)
         VALUES ($1,$2,$3,'','', 'personal')
         ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, full_name=EXCLUDED.full_name, account_type='personal'`,
        [String(q.rows[0].id), q.rows[0].username, q.rows[0].username]
      );
      const user = { id: String(q.rows[0].id), email: q.rows[0].email };
      const profile = buildProfileFromRow(null, q.rows[0].id, q.rows[0].username);
      const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: `${sessionDays}d` });
      setSessionCookie(res, token, sessionDays);
      return res.json({ user, profile, token, emailVerificationRequired: true });
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
    const sessionDays = parseSessionDays(req.body?.sessionDays);
    if (!email || !password) return res.status(400).json({ error: 'email/password required' });

    try {
      const q = await pool.query('SELECT id,email,username,role,password_hash,password_sha256,is_blocked,email_verified FROM app_users WHERE email ILIKE $1', [email]);
      if (!q.rows.length) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

      const row = q.rows[0];
      if (row.is_blocked) return res.status(403).json({ error: '차단된 계정입니다. 관리자에게 문의하세요.' });
      if (row.email_verified === false) return res.status(403).json({ error: 'email_not_verified' });
      if (isAdminEmail(row.email) && String(row.role || '').toLowerCase() !== 'admin') {
        await pool.query('UPDATE app_users SET role=$1 WHERE id=$2', ['admin', row.id]);
      }

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
      const pq = await pool.query(`SELECT ${PROFILE_SELECT_COLUMNS} FROM app_profiles WHERE id=$1`, [String(row.id)]);
      const profile = buildProfileFromRow(pq.rows[0], row.id, row.username);
      const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: `${sessionDays}d` });
      setSessionCookie(res, token, sessionDays);
      return res.json({ user, profile, token });
    } catch {
      return res.status(500).json({ error: 'login_failed' });
    }
  });

  app.get('/api/auth/session', async (req, res) => {
    const token = getRequestToken(req);
    if (!token) return res.json({ session: null });

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const userId = String(payload.sub || '');
      if (!userId) return res.json({ session: null });

      const q = await pool.query('SELECT id,email,username,role FROM app_users WHERE id=$1', [userId]);
      if (!q.rows.length) return res.json({ session: null });

      const row = q.rows[0];
      const pq = await pool.query(`SELECT ${PROFILE_SELECT_COLUMNS} FROM app_profiles WHERE id=$1`, [String(row.id)]);
      return res.json({
        session: {
          user: { id: String(row.id), email: row.email, role: String(row.role || 'user') },
          profile: buildProfileFromRow(pq.rows[0], row.id, row.username),
        },
      });
    } catch {
      return res.json({ session: null });
    }
  });

  app.get('/api/auth/oauth/links', async (req, res) => {
    const token = getRequestToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const userId = String(payload.sub || '');
      const q = await pool.query(
        'SELECT provider, provider_sub, created_at FROM app_user_oauth_identities WHERE user_id=$1 ORDER BY created_at DESC',
        [userId]
      );
      return res.json({ links: q.rows.map((r) => ({ provider: r.provider, linkedAt: r.created_at })) });
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }
  });

  app.delete('/api/auth/oauth/links/:provider', authRateLimit(20, 60_000), async (req, res) => {
    const token = getRequestToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    const provider = String(req.params.provider || '').toLowerCase();
    if (!['google', 'apple', 'facebook', 'kakao', 'naver', 'instagram'].includes(provider)) {
      return res.status(400).json({ error: 'unsupported_provider' });
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const userId = String(payload.sub || '');
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      const result = await pool.query(
        'DELETE FROM app_user_oauth_identities WHERE user_id=$1 AND provider=$2 RETURNING provider',
        [userId, provider]
      );
      return res.json({ ok: true, provider, unlinked: result.rowCount > 0 });
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }
  });

  app.all('/api/auth/oauth/link/confirm', authRateLimit(20, 60_000), async (req, res) => {
    cleanupOAuthPending();
    const source = req.method === 'GET' ? req.query : req.body;
    const token = String(source?.token || '');
    const action = String(source?.action || '').toLowerCase();
    const redirectMode = String(source?.redirect || '') === '1' || req.method === 'GET';
    const pending = oauthLinkPendingStore.get(token);
    if (!pending || pending.expiresAt < Date.now()) {
      if (redirectMode) return res.redirect(`${WEB_APP_BASE_URL}/?oauth=failed&reason=pending_link_expired`);
      return res.status(400).json({ error: 'pending_link_expired' });
    }
    oauthLinkPendingStore.delete(token);
    if (action !== 'approve') {
      if (redirectMode) return res.redirect(`${WEB_APP_BASE_URL}/?oauth=cancelled`);
      return res.json({ ok: true, linked: false });
    }

    try {
      await ensureOAuthIdentityTable();
      await pool.query(
        `INSERT INTO app_user_oauth_identities(user_id, provider, provider_sub, email_at_link)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (provider, provider_sub) DO UPDATE SET user_id=EXCLUDED.user_id, email_at_link=EXCLUDED.email_at_link`,
        [pending.userId, pending.provider, pending.providerSub, pending.email]
      );

      const q = await pool.query('SELECT id,email,username FROM app_users WHERE id=$1 LIMIT 1', [pending.userId]);
      if (!q.rows.length) {
        if (redirectMode) return res.redirect(`${WEB_APP_BASE_URL}/?oauth=failed&reason=user_not_found`);
        return res.status(404).json({ error: 'user_not_found' });
      }
      const row = q.rows[0];
      const pq = await pool.query(`SELECT ${PROFILE_SELECT_COLUMNS} FROM app_profiles WHERE id=$1`, [String(row.id)]);
      const user = { id: String(row.id), email: row.email };
      const profile = buildProfileFromRow(pq.rows[0], row.id, row.username);
      const sessionDays = parseSessionDays(pending.sessionDays);
      const authToken = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: `${sessionDays}d` });
      setSessionCookie(res, authToken, sessionDays);
      if (redirectMode) return res.redirect(`${WEB_APP_BASE_URL}/?oauth=success&linked=1`);
      return res.json({ ok: true, linked: true, user, profile, token: authToken });
    } catch {
      if (redirectMode) return res.redirect(`${WEB_APP_BASE_URL}/?oauth=failed&reason=link_confirm_failed`);
      return res.status(500).json({ error: 'link_confirm_failed' });
    }
  });

  app.patch('/api/auth/me', authRateLimit(20, 60_000), async (req, res) => {
    const token = getRequestToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const userId = String(payload.sub || '');
      if (!userId) return res.status(401).json({ error: 'unauthorized' });

      const email = req.body?.email ? normalizeEmail(req.body.email) : undefined;
      const username = req.body?.username ? String(req.body.username).trim() : undefined;
      const fullName = req.body?.full_name ?? req.body?.fullName;
      const contactPhone = req.body?.contact_phone ?? req.body?.contactPhone;
      const currentPassword = req.body?.currentPassword ? String(req.body.currentPassword) : undefined;
      const password = req.body?.password ? String(req.body.password) : undefined;

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'invalid_email' });
      if (username && (username.length < 4 || username.length > 32 || !/^[a-zA-Z0-9_]+$/.test(username))) return res.status(400).json({ error: 'invalid_username' });
      if (contactPhone !== undefined && String(contactPhone).trim() && String(contactPhone).trim().length < 6) return res.status(400).json({ error: 'invalid_contact_phone' });
      if (password && !isStrongPassword(password)) return res.status(400).json({ error: 'invalid_password' });

      const needsPasswordCheck = password !== undefined;
      let currentPasswordOk = !needsPasswordCheck;
      if (needsPasswordCheck) {
        if (!currentPassword) return res.status(400).json({ error: 'current_password_required' });
        const currentUser = await pool.query('SELECT password_hash,password_sha256 FROM app_users WHERE id=$1', [userId]);
        const row = currentUser.rows[0] || {};
        if (!row.password_hash && !row.password_sha256) return res.status(400).json({ error: 'password_change_not_supported' });
        if (row.password_hash) {
          currentPasswordOk = await bcrypt.compare(currentPassword, row.password_hash);
        } else if (row.password_sha256) {
          const sha = crypto.createHash('sha256').update(currentPassword).digest('hex');
          currentPasswordOk = sha === row.password_sha256;
          if (currentPasswordOk) {
            const upgraded = await bcrypt.hash(currentPassword, 12);
            await pool.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [upgraded, userId]);
          }
        }
        if (!currentPasswordOk) return res.status(403).json({ error: 'invalid_current_password' });
      }

      const fields = [];
      const vals = [];

      if (username !== undefined) { vals.push(username); fields.push(`username=$${vals.length}`); }
      if (fullName !== undefined) { vals.push(String(fullName).trim()); fields.push(`full_name=$${vals.length}`); }
      if (contactPhone !== undefined) { vals.push(String(contactPhone).trim()); fields.push(`contact_phone=$${vals.length}`); }
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
        const verifyToken = jwt.sign({ purpose: 'email_verify', sub: String(userId), email }, JWT_SECRET, { expiresIn: '24h' });
        const verifyLink = `${API_PUBLIC_BASE_URL}/api/auth/email/verify?token=${encodeURIComponent(verifyToken)}`;
        await sendEmailVerifyCode({ userId, email, code, verifyLink });
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

        const profileUpdates = [];
        const profileValues = [];
        if (username !== undefined) {
          profileValues.push(username);
          profileUpdates.push(`username=$${profileValues.length}`);
        }
        if (fullName !== undefined) {
          profileValues.push(String(fullName).trim());
          profileUpdates.push(`full_name=$${profileValues.length}`);
        }
        if (contactPhone !== undefined) {
          profileValues.push(String(contactPhone).trim());
          profileUpdates.push(`contact_phone=$${profileValues.length}`);
        }
        if (profileUpdates.length) {
          profileValues.push(userId);
          await pool.query(`UPDATE app_profiles SET ${profileUpdates.join(', ')} WHERE id=$${profileValues.length}`, profileValues);
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
    const token = getRequestToken(req);
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
        'UPDATE app_users SET email=$1, email_verified=true, email_pending=NULL, email_verify_code=NULL, email_verify_expires=NULL WHERE id=$2',
        [normalizeEmail(row.email_pending), userId]
      );

      return res.json({ ok: true, email: normalizeEmail(row.email_pending) });
    } catch {
      return res.status(500).json({ error: 'email_verify_failed' });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    return res.json({ ok: true });
  });

  app.get('/api/auth/email/verify', authRateLimit(30, 60_000), async (req, res) => {
    const token = String(req.query?.token || '');
    if (!token) return res.status(400).send('missing token');

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload?.purpose !== 'email_verify') return res.status(400).send('invalid token purpose');

      const userId = String(payload.sub || '');
      const email = normalizeEmail(payload.email || '');
      const q = await pool.query('SELECT id,email_pending,email_verify_expires FROM app_users WHERE id=$1', [userId]);
      if (!q.rows.length) return res.status(404).send('user not found');

      const row = q.rows[0];
      if (!row.email_pending || normalizeEmail(row.email_pending) !== email) return res.status(400).send('no pending email');
      if (row.email_verify_expires && new Date(row.email_verify_expires).getTime() < Date.now()) return res.status(400).send('expired');

      await pool.query(
        'UPDATE app_users SET email=$1, email_verified=true, email_pending=NULL, email_verify_code=NULL, email_verify_expires=NULL WHERE id=$2',
        [email, userId]
      );
      return res.send('Divergram email verification completed. You can close this page and log in.');
    } catch {
      return res.status(400).send('invalid or expired token');
    }
  });

  app.all('/api/auth/oauth/:provider/callback', async (req, res) => {
    const provider = String(req.params.provider || '').toLowerCase();
    const state = String((req.query && req.query.state) || (req.body && req.body.state) || '');
    const stateData = oauthStateStore.get(state);
    const sessionDays = parseSessionDays(stateData?.sessionDays);
    const defaultReturnTo = stateData?.returnTo || WEB_APP_BASE_URL;
    const redirectTo = (params) => appendQuery(defaultReturnTo, params);
    const returnToHost = (() => {
      try {
        return new URL(defaultReturnTo).hostname;
      } catch {
        return '';
      }
    })();
    const shouldExposeToken = ['localhost', '127.0.0.1', '::1'].includes(returnToHost);

    if (!['google', 'apple', 'facebook'].includes(provider)) {
      return res.redirect(redirectTo({ oauth: 'failed', reason: 'unsupported_provider' }));
    }

    if (!stateData || stateData.provider !== provider || stateData.expiresAt < Date.now()) {
      return res.redirect(redirectTo({ oauth: 'failed', reason: 'invalid_state' }));
    }

    oauthStateStore.delete(state);
    try {
      const code = String((req.query && req.query.code) || (req.body && req.body.code) || '');
      if (!code) return res.redirect(redirectTo({ oauth: 'failed', reason: 'missing_code' }));

      const providers = getOAuthProviders();
      const redirectUri = providers[provider]?.redirectUri;
      let oauthProfile = null;

      if (provider === 'google') {
        const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });
        const tokenJson = await tokenResp.json();
        const infoResp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        });
        const info = await infoResp.json();
        oauthProfile = { sub: String(info.sub || ''), email: normalizeEmail(info.email || ''), name: info.name || info.given_name || '' };
      }

      if (provider === 'facebook') {
        const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
        tokenUrl.searchParams.set('client_id', process.env.FACEBOOK_CLIENT_ID);
        tokenUrl.searchParams.set('client_secret', process.env.FACEBOOK_CLIENT_SECRET);
        tokenUrl.searchParams.set('redirect_uri', redirectUri);
        tokenUrl.searchParams.set('code', code);
        const tokenResp = await fetch(tokenUrl.toString());
        const tokenJson = await tokenResp.json();
        const infoResp = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tokenJson.access_token)}`);
        const info = await infoResp.json();
        oauthProfile = { sub: String(info.id || ''), email: normalizeEmail(info.email || ''), name: info.name || '' };
      }

      if (provider === 'apple') {
        const privateKey = String(process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
        const clientSecret = jwt.sign({}, privateKey, {
          algorithm: 'ES256',
          issuer: process.env.APPLE_TEAM_ID,
          audience: 'https://appleid.apple.com',
          subject: process.env.APPLE_CLIENT_ID,
          keyid: process.env.APPLE_KEY_ID,
          expiresIn: '5m',
          notBefore: 0,
          header: { kid: process.env.APPLE_KEY_ID },
        });

        const tokenResp = await fetch('https://appleid.apple.com/auth/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: process.env.APPLE_CLIENT_ID,
            client_secret: clientSecret,
          }),
        });
        const tokenJson = await tokenResp.json();
        const idToken = tokenJson.id_token;
        const decoded = jwt.decode(idToken) || {};
        oauthProfile = { sub: String(decoded.sub || ''), email: normalizeEmail(decoded.email || ''), name: '' };
      }

      if (!oauthProfile?.sub || !oauthProfile?.email) {
        return res.redirect(redirectTo({ oauth: 'failed', reason: 'profile_missing_fields' }));
      }

      if (stateData.mode === 'link' && stateData.userId) {
        await ensureOAuthIdentityTable();
        const conflict = await pool.query(
          'SELECT user_id FROM app_user_oauth_identities WHERE provider=$1 AND provider_sub=$2 LIMIT 1',
          [provider, oauthProfile.sub]
        );
        if (conflict.rows.length && String(conflict.rows[0].user_id) !== String(stateData.userId)) {
          return res.redirect(redirectTo({ oauth_link: 'failed', reason: 'already_linked' }));
        }
        await pool.query(
          `INSERT INTO app_user_oauth_identities(user_id, provider, provider_sub, email_at_link)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (provider, provider_sub) DO UPDATE SET user_id=EXCLUDED.user_id, email_at_link=EXCLUDED.email_at_link`,
          [stateData.userId, provider, oauthProfile.sub, oauthProfile.email]
        );
        return res.redirect(redirectTo({ oauth_link: 'success', provider }));
      }

      await ensureOAuthIdentityTable();
      const linked = await pool.query(
        `SELECT u.id,u.email,u.username
           FROM app_user_oauth_identities i
           JOIN app_users u ON u.id=i.user_id
          WHERE i.provider=$1 AND i.provider_sub=$2
          LIMIT 1`,
        [provider, oauthProfile.sub]
      );

      if (!linked.rows.length) {
        const existingEmail = await pool.query('SELECT id,email,username FROM app_users WHERE lower(email)=lower($1) LIMIT 1', [oauthProfile.email]);
        if (existingEmail.rows.length) {
          const existingUserId = String(existingEmail.rows[0].id);
          const pendingToken = crypto.randomBytes(24).toString('hex');
          oauthLinkPendingStore.set(pendingToken, {
            userId: existingUserId,
            provider,
            providerSub: oauthProfile.sub,
            email: oauthProfile.email,
            sessionDays,
            returnTo: defaultReturnTo,
            expiresAt: Date.now() + OAUTH_LINK_PENDING_TTL_MS,
          });
          return res.redirect(redirectTo({ oauth_link: 'pending', token: pendingToken, provider, email: oauthProfile.email }));
        }
      }

      const authResult = await upsertOAuthUser({
        provider,
        providerSub: oauthProfile.sub,
        email: oauthProfile.email,
        name: oauthProfile.name,
        sessionDays,
      });

      setSessionCookie(res, authResult.token, sessionDays);
      return res.redirect(redirectTo(shouldExposeToken ? { oauth: 'success', oauthToken: authResult.token } : { oauth: 'success' }));
    } catch (e) {
      const reason = String(e?.message || 'oauth_callback_error').slice(0, 120);
      return res.redirect(redirectTo({ oauth: 'failed', reason }));
    }
  });
}
