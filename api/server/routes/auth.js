import { loadSignupConsentConfig, saveSignupConsents, validateSignupConsents } from '../legal-consents.js';
import { allocateUniqueOAuthUsername } from '../lib/oauthProfileDefaults.js';
import { decryptSensitiveText, encryptSensitiveText } from '../lib/dataEncryption.js';

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
  const OAUTH_PLACEHOLDER_EMAIL_DOMAIN = 'oauth.divergram.local';
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

  const getAuthenticatedUserId = (req) => {
    const token = getRequestToken(req);
    if (!token) return '';
    try {
      return String(verifySessionToken(jwt, token, JWT_SECRET)?.sub || '');
    } catch {
      return '';
    }
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

  const readSignupConsents = async (req) => validateSignupConsents(req.body?.consents, await loadSignupConsentConfig(pool));

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

  const buildAuthResultFromUserId = async (userId, sessionDays) => {
    const q = await pool.query(
      'SELECT id,email,username,is_blocked,contact_phone,profile_completion_required FROM app_users WHERE id=$1 LIMIT 1',
      [String(userId)]
    );
    if (!q.rows.length) throw new Error('user_not_found');

    const row = q.rows[0];
    if (row.is_blocked) throw new Error('user_blocked');

    const user = { id: String(row.id), email: row.email };
    const pq = await pool.query(`SELECT ${PROFILE_SELECT_COLUMNS} FROM app_profiles WHERE id=$1`, [user.id]);
    const profile = buildProfileFromRow({ ...(pq.rows[0] || {}), contact_phone: decryptSensitiveText(row.contact_phone) }, row.id, row.username);
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: `${sessionDays}d` });
    return {
      user,
      profile,
      token,
      profileCompletionRequired: Boolean(row.profile_completion_required) || String(user.email || '').toLowerCase().endsWith(`@${OAUTH_PLACEHOLDER_EMAIL_DOMAIN}`),
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
        display_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(provider, provider_sub),
        UNIQUE(user_id, provider)
      );
    `);
    await pool.query('ALTER TABLE app_user_oauth_identities ADD COLUMN IF NOT EXISTS display_name TEXT');
  };

  const buildPlaceholderOAuthEmail = (provider, providerSub) => {
    const safeProvider = String(provider || 'oauth').toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'oauth';
    const safeSub = String(providerSub || crypto.randomBytes(8).toString('hex')).replace(/[^a-zA-Z0-9_-]+/g, '_') || crypto.randomBytes(8).toString('hex');
    return `${safeProvider}_${safeSub}@${OAUTH_PLACEHOLDER_EMAIL_DOMAIN}`;
  };

  const upsertOAuthUser = async ({ provider, providerSub, email, name, avatar, sessionDays, accountScope = 'personal' }) => {
    if (accountScope === 'resort') throw new Error('resort_social_login_disabled');
    await ensureOAuthIdentityTable();
    const normalizedEmail = normalizeEmail(email || '');
    const resolvedEmail = normalizedEmail || buildPlaceholderOAuthEmail(provider, providerSub);
    const emailVerified = Boolean(normalizedEmail);

    let userRow = null;
    let createdUser = false;
    let q = await pool.query(
      `SELECT u.id,u.email,u.username,u.profile_completion_required,u.account_scope
         FROM app_user_oauth_identities i
         JOIN app_users u ON u.id=i.user_id
        WHERE i.provider=$1 AND i.provider_sub=$2
        LIMIT 1`,
      [provider, providerSub]
    );
    if (q.rows.length) {
      if (String(q.rows[0].account_scope || '').toLowerCase() === 'resort') throw new Error('resort_social_login_disabled');
      userRow = q.rows[0];
    }

    if (!userRow) {
      const resortAccount = normalizedEmail
        ? await pool.query("SELECT id FROM app_users WHERE lower(email)=lower($1) AND account_scope='resort' LIMIT 1", [normalizedEmail])
        : { rows: [] };
      if (resortAccount.rows.length) throw new Error('resort_social_login_disabled');
      q = await pool.query('SELECT id,email,username,profile_completion_required FROM app_users WHERE lower(email)=lower($1) AND account_scope=$2 LIMIT 1', [normalizedEmail, accountScope]);
      if (q.rows.length) userRow = q.rows[0];
    }

    if (!userRow) {
      const tempPassword = crypto.randomBytes(20).toString('hex') + '!Aa1';
      const hash = await bcrypt.hash(tempPassword, 12);
      for (let attempt = 0; attempt < 5 && !userRow; attempt += 1) {
        const username = await allocateUniqueOAuthUsername(pool, crypto, {
          email: normalizedEmail,
          provider,
          providerSub,
        });
        try {
          const uq = await pool.query(
            `INSERT INTO app_users(email,password_hash,password_sha256,username,role,email_verified,oauth_provider,oauth_sub,profile_completion_required,account_scope)
             VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,true,$8)
             RETURNING id,email,username,profile_completion_required`,
            [
              resolvedEmail,
              hash,
              username,
              isAdminEmail(normalizedEmail) ? 'admin' : 'user',
              emailVerified,
              provider,
              providerSub,
              accountScope,
            ]
          );
          userRow = uq.rows[0];
          createdUser = true;
        } catch (error) {
          if (error?.code !== '23505' || !String(error?.constraint || '').includes('username')) throw error;
        }
      }
      if (!userRow) throw new Error('oauth_username_allocation_failed');
    }

    if (isAdminEmail(normalizedEmail)) {
      await pool.query('UPDATE app_users SET role=$1, account_scope=$2, email_verified=true WHERE id=$3', ['admin', 'admin', userRow.id]);
    } else {
      await pool.query('UPDATE app_users SET email_verified=$1 WHERE id=$2', [emailVerified, userRow.id]);
    }

    await pool.query(
      `INSERT INTO app_user_oauth_identities(user_id, provider, provider_sub, email_at_link)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (provider, provider_sub) DO UPDATE SET user_id=EXCLUDED.user_id, email_at_link=EXCLUDED.email_at_link`,
      [userRow.id, provider, providerSub, normalizedEmail || resolvedEmail]
    );

    const initialAvatar = createdUser ? String(avatar || '').trim() : '';
    await pool.query(
      `INSERT INTO app_profiles(id,username,full_name,bio,avatar_url,account_type)
       VALUES ($1,$2,$3,'',$4, 'personal')
       ON CONFLICT (id) DO UPDATE SET
         full_name=COALESCE(NULLIF(app_profiles.full_name, ''), EXCLUDED.full_name),
         avatar_url=COALESCE(NULLIF(app_profiles.avatar_url, ''), EXCLUDED.avatar_url)`,
      [String(userRow.id), userRow.username, name || userRow.username, initialAvatar]
    );

    const pq = await pool.query(`SELECT ${PROFILE_SELECT_COLUMNS} FROM app_profiles WHERE id=$1`, [String(userRow.id)]);
    const user = { id: String(userRow.id), email: userRow.email };
    const profile = buildProfileFromRow(pq.rows[0], userRow.id, userRow.username);
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: `${sessionDays}d` });
    return {
      user,
      profile,
      token,
      profileCompletionRequired: createdUser || Boolean(userRow.profile_completion_required) || String(user.email || '').toLowerCase().endsWith(`@${OAUTH_PLACEHOLDER_EMAIL_DOMAIN}`),
    };
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
      avatar: String(info.picture || '').trim(),
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
            avatar: String(info.picture || '').trim(),
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
      avatar: String(userInfo.avatar || userInfo.picture || userInfo.photoURL || '').trim(),
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
    url.searchParams.set('fields', 'id,username,profile_picture_url');
    url.searchParams.set('access_token', accessToken);
    const infoResp = await fetch(url);
    if (!infoResp.ok) throw new Error(`instagram_userinfo_failed_${infoResp.status}`);
    const info = await infoResp.json();
    const sub = String(info.id || '').trim();
    return {
      sub,
      email: '',
      name: String(info.username || '').trim(),
      avatar: String(info.profile_picture_url || '').trim(),
    };
  };

  const normalizeMobileUserInfo = (userInfo = {}, idToken = '') => {
    const providerSub = String(userInfo?.providerUserId || userInfo?.provider_user_id || userInfo?.sub || userInfo?.id || '').trim();
    const email = normalizeEmail(userInfo?.email || '');
    const name = String(userInfo?.name || userInfo?.nickname || userInfo?.full_name || userInfo?.username || '').trim();
    const avatar = String(userInfo?.avatar || userInfo?.picture || userInfo?.photoURL || userInfo?.profile_image || '').trim();
    const normalizedIdToken = String(idToken || userInfo?.idToken || userInfo?.id_token || '').trim();
    return { sub: providerSub, email, name, avatar, idToken: normalizedIdToken };
  };

  const fetchMobileOAuthProfile = async (provider, accessToken, userInfo = {}, idToken = '') => {
    if (provider === 'google') {
      const fallback = normalizeMobileUserInfo(userInfo, idToken);
      try {
        const profile = await fetchGoogleProfileByAnyToken(accessToken);
        if (profile?.sub && profile?.email) return profile;
      } catch (error) {
        if (fallback.idToken) {
          try {
            const profile = await fetchGoogleProfileByAnyToken(fallback.idToken);
            if (profile?.sub && profile?.email) return profile;
          } catch {
            // fall through to normalized fallback below
          }
        }
        if (fallback.sub && fallback.email) return fallback;
        throw error;
      }
      if (fallback.idToken) {
        try {
          const profile = await fetchGoogleProfileByAnyToken(fallback.idToken);
          if (profile?.sub && profile?.email) return profile;
        } catch {
          // ignore and use direct fallback below
        }
      }
      if (fallback.sub && fallback.email) return fallback;
      return fetchGoogleProfileByAnyToken(accessToken);
    }
    if (provider === 'apple') return fetchAppleProfileByIdentityToken(accessToken, userInfo);
    if (provider === 'kakao') return fetchKakaoProfileByAccessToken(accessToken);
    if (provider === 'naver') return fetchNaverProfileByAccessToken(accessToken);
    if (provider === 'facebook') return fetchFacebookProfileByAccessToken(accessToken);
    if (provider === 'instagram') return fetchInstagramProfileByAccessToken(accessToken);
    throw new Error('unsupported_provider_for_mobile');
  };

  const linkOAuthIdentityToUser = async ({ userId, provider, providerSub, email, displayName = '', sessionDays, verifyEmail = false }) => {
    await ensureOAuthIdentityTable();
    const conflict = await pool.query(
      'SELECT user_id FROM app_user_oauth_identities WHERE provider=$1 AND provider_sub=$2 LIMIT 1',
      [provider, providerSub]
    );
    if (conflict.rows.length && String(conflict.rows[0].user_id) !== String(userId)) {
      throw new Error('oauth_already_linked');
    }

    await pool.query(
      `INSERT INTO app_user_oauth_identities(user_id, provider, provider_sub, email_at_link, display_name)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, provider) DO UPDATE SET provider_sub=EXCLUDED.provider_sub, email_at_link=EXCLUDED.email_at_link, display_name=EXCLUDED.display_name`,
      [String(userId), provider, providerSub, email, String(displayName || '').trim() || null]
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
    const infobipBaseUrl = String(process.env.INFOBIP_BASE_URL || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const infobipApiKey = String(process.env.INFOBIP_API_KEY || '').trim();
    const infobipEmailSender = String(process.env.INFOBIP_EMAIL_SENDER || '').trim();
    if (infobipBaseUrl && infobipApiKey && infobipEmailSender) {
      const response = await fetch(`https://${infobipBaseUrl}/email/4/messages`, {
        method: 'POST',
        headers: {
          authorization: `App ${infobipApiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            destinations: [{ to: [{ destination: email }] }],
            sender: infobipEmailSender,
            content: {
              subject: '[Divergram] 이메일 인증을 완료해 주세요',
              text: `Divergram 이메일 인증\n\n인증코드: ${code}\n인증링크: ${verifyLink}\n\n인증코드는 10분 동안 유효합니다.`,
              html: `<h2>Divergram 이메일 인증</h2><p>인증코드: <b>${code}</b></p><p><a href="${verifyLink}">이메일 인증 완료하기</a></p><p>인증코드는 10분 동안 유효합니다.</p>`,
            },
          }],
        }),
      });
      if (!response.ok) throw new Error(`email_infobip_failed:${response.status}`);
      return;
    }

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

  const normalizePhone = (value) => String(value || '').trim().replace(/[^+\d]/g, '');
  const hashPhoneVerifyCode = (userId, phone, code) =>
    crypto.createHmac('sha256', JWT_SECRET).update(`${userId}:${phone}:${code}`).digest('hex');
  const safeHashEqual = (left, right) => {
    const a = Buffer.from(String(left || ''), 'hex');
    const b = Buffer.from(String(right || ''), 'hex');
    return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  };
  const sendSmsVerifyCode = async ({ userId, phone, code }) => {
    const infobipBaseUrl = String(process.env.INFOBIP_BASE_URL || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const infobipApiKey = String(process.env.INFOBIP_API_KEY || '').trim();
    const infobipSmsSender = String(process.env.INFOBIP_SMS_SENDER || '').trim();
    if (infobipBaseUrl && infobipApiKey && infobipSmsSender) {
      const response = await fetch(`https://${infobipBaseUrl}/sms/3/messages`, {
        method: 'POST',
        headers: {
          authorization: `App ${infobipApiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            destinations: [{ to: phone }],
            sender: infobipSmsSender,
            content: { text: `[Divergram] 인증번호는 ${code}입니다. 5분 안에 입력해 주세요.` },
          }],
        }),
      });
      if (!response.ok) throw new Error(`sms_infobip_failed:${response.status}`);
      return;
    }

    const webhook = String(process.env.SMS_VERIFY_WEBHOOK_URL || '').trim();
    if (!webhook) throw new Error('sms_provider_not_configured');
    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.SMS_VERIFY_WEBHOOK_TOKEN
          ? { authorization: `Bearer ${process.env.SMS_VERIFY_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        type: 'phone_verify',
        userId,
        phone,
        code,
        message: `[Divergram] 인증번호는 ${code}입니다. 5분 안에 입력해 주세요.`,
      }),
    });
    if (!response.ok) throw new Error(`sms_webhook_failed:${response.status}`);
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
  const instagramMobileStateStore = new Map();
  const instagramMobileTicketStore = new Map();
  const oauthStateTtlMs = 10 * 60 * 1000;
  const instagramMobileTicketTtlMs = 5 * 60 * 1000;

  const getOAuthProviders = () => {
    const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const appleEnabled = !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
    const facebookEnabled = !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
    const threadsEnabled = !!(process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET);
    return {
      google: { enabled: googleEnabled, redirectUri: `${OAUTH_CALLBACK_BASE}/api/auth/oauth/google/callback` },
      apple: { enabled: appleEnabled, redirectUri: `${OAUTH_CALLBACK_BASE}/api/auth/oauth/apple/callback` },
      facebook: { enabled: facebookEnabled, redirectUri: `${OAUTH_CALLBACK_BASE}/api/auth/oauth/facebook/callback` },
      threads: { enabled: threadsEnabled, redirectUri: process.env.THREADS_REDIRECT_URI || `${OAUTH_CALLBACK_BASE}/api/auth/oauth/threads/callback` },
    };
  };

  const createOAuthState = (provider, sessionDays, mode = 'login', userId = null, returnTo = '', consents = null, accountScope = 'personal') => {
    const state = crypto.randomBytes(24).toString('hex');
    oauthStateStore.set(state, { provider, sessionDays, mode, userId, returnTo, consents, accountScope, expiresAt: Date.now() + oauthStateTtlMs });
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

  const cleanupInstagramMobileOAuth = () => {
    const now = Date.now();
    for (const [key, value] of instagramMobileStateStore.entries()) {
      if (!value || value.expiresAt < now) instagramMobileStateStore.delete(key);
    }
    for (const [key, value] of instagramMobileTicketStore.entries()) {
      if (!value || value.expiresAt < now) instagramMobileTicketStore.delete(key);
    }
  };

  app.get('/api/auth/oauth/instagram/mobile/start', authRateLimit(20, 60_000), (req, res) => {
    cleanupInstagramMobileOAuth();
    const clientId = String(process.env.INSTAGRAM_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.INSTAGRAM_CLIENT_SECRET || '').trim();
    if (!clientId || !clientSecret) {
      return res.status(503).json({ error: 'instagram_config_missing' });
    }

    const callbackUri = String(
      process.env.INSTAGRAM_REDIRECT_URI || `${API_PUBLIC_BASE_URL}/api/auth/oauth/instagram/mobile/callback`
    ).trim();
    const appReturnUri = String(process.env.INSTAGRAM_APP_RETURN_URI || 'divergram://auth/instagram').trim();
    const state = crypto.randomBytes(24).toString('hex');
    instagramMobileStateStore.set(state, {
      callbackUri,
      appReturnUri,
      expiresAt: Date.now() + oauthStateTtlMs,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUri,
      response_type: 'code',
      scope: String(process.env.INSTAGRAM_OAUTH_SCOPES || 'instagram_business_basic').trim(),
      state,
    });
    const authorizationEndpoint = String(
      process.env.INSTAGRAM_AUTHORIZATION_ENDPOINT || 'https://www.instagram.com/oauth/authorize'
    ).trim();
    return res.json({ url: `${authorizationEndpoint}?${params.toString()}`, returnUrl: appReturnUri });
  });

  app.get('/api/auth/oauth/instagram/mobile/callback', async (req, res) => {
    cleanupInstagramMobileOAuth();
    const state = String(req.query?.state || '').trim();
    const code = String(req.query?.code || '').trim();
    const pending = instagramMobileStateStore.get(state);
    instagramMobileStateStore.delete(state);
    if (!pending || !code) {
      return res.status(400).send('Instagram login request is invalid or expired.');
    }

    try {
      const tokenResp = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: String(process.env.INSTAGRAM_CLIENT_ID || '').trim(),
          client_secret: String(process.env.INSTAGRAM_CLIENT_SECRET || '').trim(),
          grant_type: 'authorization_code',
          redirect_uri: pending.callbackUri,
          code,
        }),
      });
      const tokenBody = await tokenResp.json().catch(() => ({}));
      if (!tokenResp.ok || !tokenBody.access_token) {
        throw new Error(`instagram_token_exchange_failed_${tokenResp.status}`);
      }

      const profile = await fetchInstagramProfileByAccessToken(String(tokenBody.access_token));
      const ticket = crypto.randomBytes(32).toString('hex');
      instagramMobileTicketStore.set(ticket, {
        accessToken: String(tokenBody.access_token),
        userInfo: { id: profile.sub, username: profile.name, email: profile.email, avatar: profile.avatar },
        expiresAt: Date.now() + instagramMobileTicketTtlMs,
      });
      return res.redirect(appendQuery(pending.appReturnUri, { ticket }));
    } catch (error) {
      console.error('[oauth/instagram/mobile/callback] failed', String(error?.message || error));
      return res.redirect(appendQuery(pending.appReturnUri, { error: 'instagram_token_exchange_failed' }));
    }
  });

  app.post('/api/auth/oauth/instagram/mobile/complete', authRateLimit(20, 60_000), (req, res) => {
    cleanupInstagramMobileOAuth();
    const ticket = String(req.body?.ticket || '').trim();
    const result = instagramMobileTicketStore.get(ticket);
    instagramMobileTicketStore.delete(ticket);
    if (!result) return res.status(400).json({ error: 'instagram_ticket_invalid_or_expired' });
    return res.json({ accessToken: result.accessToken, userInfo: result.userInfo });
  });

  app.get('/api/auth/oauth/providers', (_req, res) => {
    return res.json({ providers: getOAuthProviders() });
  });

  app.post('/api/auth/oauth/mobile', authRateLimit(20, 60_000), async (req, res) => {
    const provider = String(req.body?.provider || '').toLowerCase();
    const accessToken = String(req.body?.accessToken || '').trim();
    const idToken = String(req.body?.idToken || '').trim();
    const sessionDays = parseSessionDays(req.body?.sessionDays);
    const rawAutoCreate = req.body?.autoCreate ?? req.body?.createUser ?? req.body?.signup;
    const shouldAutoCreate = rawAutoCreate === true || String(rawAutoCreate || '').toLowerCase() === 'true';
    const userInfo = req.body?.userInfo && typeof req.body.userInfo === 'object' ? req.body.userInfo : {};

    if (!['google', 'apple', 'instagram'].includes(provider)) return res.status(400).json({ error: 'unsupported_provider_for_mobile' });
    if (!accessToken) return res.status(400).json({ error: 'access_token_required' });

    try {
      const oauthProfile = await fetchMobileOAuthProfile(provider, accessToken, userInfo, idToken);
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
        const scope = await pool.query('SELECT account_scope FROM app_users WHERE id=$1 LIMIT 1', [linked.rows[0].id]);
        if (String(scope.rows[0]?.account_scope || '').toLowerCase() === 'resort') {
          return res.status(403).json({ error: 'resort_social_login_disabled' });
        }
        const authResult = await buildAuthResultFromUserId(linked.rows[0].id, sessionDays);
        setSessionCookie(res, authResult.token, sessionDays);
        return res.json({ ...authResult, provider, linked: true });
      }

      const existingEmail = oauthProfile.email
        ? await pool.query("SELECT id FROM app_users WHERE lower(email)=lower($1) AND account_scope='resort' LIMIT 1", [oauthProfile.email])
        : { rows: [] };
      if (existingEmail.rows.length) {
        return res.status(403).json({ error: 'resort_social_login_disabled' });
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

      const consentResult = await readSignupConsents(req);
      if (!consentResult.ok) return res.status(400).json({ error: consentResult.error });

      const authResult = await upsertOAuthUser({
        provider,
        providerSub: oauthProfile.sub,
        email: oauthProfile.email,
        name: oauthProfile.name,
        avatar: oauthProfile.avatar || userInfo.avatar || userInfo.picture || userInfo.photoURL,
        sessionDays,
      });
      await saveSignupConsents(pool, authResult.user.id, consentResult.receipts, {
        source: `oauth:${provider}`,
        locale: req.body?.locale,
      });
      setSessionCookie(res, authResult.token, sessionDays);
      return res.json({ ...authResult, provider, linked: true });
    } catch (e) {
      const message = String(e?.message || '');
      console.error('[oauth/mobile] failed', {
        provider,
        message,
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken,
        hasUserInfo: !!(userInfo && Object.keys(userInfo).length),
      });
      if (message === 'user_not_found') return res.status(404).json({ error: 'user_not_found' });
      if (message === 'user_blocked') return res.status(403).json({ error: 'user_blocked' });
      if (message === 'unsupported_provider_for_mobile') return res.status(400).json({ error: message });
      if (message.startsWith('apple_identity_') || message.startsWith('apple_keys_failed_')) return res.status(400).json({ error: message });
      if (/_userinfo_failed_/.test(message) || /_tokeninfo_failed_/.test(message) || message.startsWith('google_userinfo_failed_')) {
        return res.status(400).json({ error: message });
      }
      if (/fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|network/i.test(message)) {
        return res.status(502).json({ error: 'google_profile_fetch_failed' });
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
      authPayload = verifySessionToken(jwt, authToken, JWT_SECRET);
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

    if (!['google', 'apple', 'instagram'].includes(provider)) return res.status(400).json({ error: 'unsupported_provider_for_mobile' });
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

  app.post('/api/auth/oauth/mobile/link/provider', authRateLimit(20, 60_000), async (req, res) => {
    const authToken = getRequestToken(req);
    const provider = String(req.body?.provider || '').trim().toLowerCase();
    const accessToken = String(req.body?.accessToken || '').trim();
    const idToken = String(req.body?.idToken || '').trim();
    const userInfo = req.body?.userInfo && typeof req.body.userInfo === 'object' ? req.body.userInfo : {};
    const sessionDays = parseSessionDays(req.body?.sessionDays);

    if (!authToken) return res.status(401).json({ error: 'unauthorized' });
    if (!['google', 'apple', 'instagram', 'facebook'].includes(provider)) {
      return res.status(400).json({ error: 'unsupported_provider_for_mobile' });
    }
    if (!accessToken) return res.status(400).json({ error: 'access_token_required' });

    let authPayload = null;
    try {
      authPayload = verifySessionToken(jwt, authToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const userId = String(authPayload?.sub || '').trim();
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    try {
      const userQ = await pool.query('SELECT email FROM app_users WHERE id=$1 LIMIT 1', [userId]);
      if (!userQ.rows.length) return res.status(404).json({ error: 'user_not_found' });

      const oauthProfile = await fetchMobileOAuthProfile(provider, accessToken, userInfo, idToken);
      if (!oauthProfile.sub) return res.status(400).json({ error: 'profile_missing_fields' });

      const email = normalizeEmail(userQ.rows[0].email || authPayload?.email || '');
      const authResult = await linkOAuthIdentityToUser({
        userId,
        provider,
        providerSub: oauthProfile.sub,
        email,
        displayName: oauthProfile.name,
        sessionDays,
      });
      setSessionCookie(res, authResult.token, sessionDays);
      return res.json({ ok: true, linked: true, provider, ...authResult });
    } catch (e) {
      const message = String(e?.message || '');
      if (message === 'oauth_already_linked') return res.status(409).json({ error: message });
      if (message === 'user_not_found') return res.status(404).json({ error: message });
      if (/_userinfo_failed_/.test(message) || /_tokeninfo_failed_/.test(message)) {
        return res.status(400).json({ error: message });
      }
      console.error('[oauth/mobile/link/provider] failed', { provider, message });
      return res.status(500).json({ error: 'oauth_provider_link_failed' });
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

    if (!['google', 'apple', 'instagram'].includes(provider)) return res.status(400).json({ error: 'unsupported_provider_for_mobile' });
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

    if (!['google', 'apple', 'facebook', 'threads'].includes(provider)) {
      return res.status(400).json({ error: 'unsupported_provider' });
    }

    const target = providers[provider];
    if (!target?.enabled) {
      return res.status(400).json({ error: 'provider_not_configured' });
    }

    const sessionDays = parseSessionDays(req.query?.sessionDays);
    const requestedScope = String(req.query?.accountScope || '').trim().toLowerCase();
    const accountScope = requestedScope === 'admin' ? 'admin' : requestedScope === 'resort' ? 'resort' : 'personal';
    const mode = String(req.query?.mode || 'login').toLowerCase();
    const fallbackReturnTo = mode === 'link' ? `${WEB_APP_BASE_URL}/account` : WEB_APP_BASE_URL;
    const returnTo = resolveReturnTo(req.query?.returnTo, fallbackReturnTo);
    let stateUserId = null;
    if (mode === 'link') {
      const token = getRequestToken(req);
      if (!token) return res.status(401).json({ error: 'unauthorized' });
      try {
        const p = verifySessionToken(jwt, token, JWT_SECRET);
        stateUserId = String(p.sub || '');
      } catch {
        return res.status(401).json({ error: 'unauthorized' });
      }
      if (!stateUserId) return res.status(401).json({ error: 'unauthorized' });
    }

    let signupConsents = null;
    if (mode === 'signup') {
      const booleanParam = (name) => String(req.query?.[name] || '').toLowerCase() === 'true';
      const version = String(req.query?.consentVersion || '');
      signupConsents = [
        { key: 'terms_required', policyType: 'terms', version: String(req.query?.termsVersion || version), agreed: booleanParam('terms') },
        { key: 'privacy_required', policyType: 'privacy', version: String(req.query?.privacyVersion || version), agreed: booleanParam('privacy') },
        { key: 'age14_required', policyType: 'age14_notice', version: String(req.query?.age14Version || version), agreed: booleanParam('age14') },
        { key: 'marketing_optional', policyType: 'marketing_consent', version: String(req.query?.marketingVersion || version), agreed: booleanParam('marketing') },
        { key: 'push_optional', policyType: 'push_consent', version: String(req.query?.pushVersion || version), agreed: booleanParam('push') },
      ];
      const consentResult = validateSignupConsents(signupConsents, await loadSignupConsentConfig(pool));
      if (!consentResult.ok) return res.status(400).json({ error: consentResult.error });
      signupConsents = consentResult.receipts;
    }

    const state = createOAuthState(provider, sessionDays, mode, stateUserId, returnTo, signupConsents, accountScope);
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

    if (provider === 'threads') {
      const qp = new URLSearchParams({
        client_id: process.env.THREADS_APP_ID,
        redirect_uri: target.redirectUri,
        response_type: 'code',
        scope: 'threads_basic,threads_content_publish',
        state,
      });
      url = `https://threads.net/oauth/authorize?${qp.toString()}`;
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
    const consentResult = await readSignupConsents(req);
    if (!consentResult.ok) return res.status(400).json({ error: consentResult.error });

    try {
      const hash = await bcrypt.hash(password, 12);
      const q = await pool.query(
        'INSERT INTO app_users(email, password_hash, password_sha256, username, role, profile_completion_required) VALUES ($1,$2,NULL,$3,$4,true) RETURNING id,email,username',
        [email, hash, username, isAdminEmail(email) ? 'admin' : 'user']
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
      await saveSignupConsents(pool, user.id, consentResult.receipts, {
        source: 'email',
        locale: req.body?.locale,
      });
      const profile = buildProfileFromRow(null, q.rows[0].id, q.rows[0].username);
      const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: `${sessionDays}d` });
      setSessionCookie(res, token, sessionDays);
      return res.json({ user, profile, token, emailVerificationRequired: true, profileCompletionRequired: true });
    } catch (e) {
      if (String(e.message).toLowerCase().includes('duplicate key')) {
        return res.status(409).json({ error: '이미 존재하는 이메일입니다.' });
      }
      return res.status(500).json({ error: 'signup_failed' });
    }
  });

  app.get('/api/auth/consents', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const q = await pool.query(
      `SELECT DISTINCT ON (consent_key)
         consent_key AS key, policy_type AS "policyType", policy_version AS version,
         agreed, agreed_at AS "agreedAt", source, locale, created_at AS "createdAt"
       FROM app_user_consents
       WHERE user_id=$1
       ORDER BY consent_key, created_at DESC`,
      [userId]
    );
    return res.json({ consents: q.rows });
  });

  app.post('/api/auth/consents', authRateLimit(20, 60_000), async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const consentResult = await readSignupConsents(req);
    if (!consentResult.ok) return res.status(400).json({ error: consentResult.error });
    await saveSignupConsents(pool, userId, consentResult.receipts, {
      source: 'reconsent',
      locale: req.body?.locale,
    });
    return res.json({ ok: true });
  });

  app.post('/api/auth/login', authRateLimit(), async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const requestedScope = String(req.body?.accountScope || req.body?.account_scope || '').trim().toLowerCase();
    const accountScope = requestedScope === 'admin' ? 'admin' : requestedScope === 'resort' ? 'resort' : requestedScope === 'personal' || requestedScope === 'general' ? 'personal' : '';
    const sessionDays = parseSessionDays(req.body?.sessionDays);
    if (!email || !password) return res.status(400).json({ error: 'email/password required' });

    try {
      const q = accountScope
        ? await pool.query('SELECT id,email,username,role,password_hash,password_sha256,is_blocked,email_verified,profile_completion_required,account_scope FROM app_users WHERE lower(email)=lower($1) AND account_scope=$2 LIMIT 1', [email, accountScope])
        : await pool.query('SELECT id,email,username,role,password_hash,password_sha256,is_blocked,email_verified,profile_completion_required,account_scope FROM app_users WHERE lower(email)=lower($1) ORDER BY CASE WHEN role=\'admin\' THEN 0 ELSE 1 END, id LIMIT 1', [email]);
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
          await pool.query('UPDATE app_users SET password_hash=$1, password_sha256=NULL WHERE id=$2', [upgraded, row.id]);
        }
      }

      if (!ok) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

      const user = { id: String(row.id), email: row.email };
      const pq = await pool.query(`SELECT ${PROFILE_SELECT_COLUMNS} FROM app_profiles WHERE id=$1`, [String(row.id)]);
      const profile = buildProfileFromRow(pq.rows[0], row.id, row.username);
      const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: `${sessionDays}d` });
      setSessionCookie(res, token, sessionDays);
      return res.json({ user, profile, token, profileCompletionRequired: Boolean(row.profile_completion_required) });
    } catch {
      return res.status(500).json({ error: 'login_failed' });
    }
  });

  app.get('/api/auth/session', async (req, res) => {
    const token = getRequestToken(req);
    if (!token) return res.json({ session: null });

    try {
      const payload = verifySessionToken(jwt, token, JWT_SECRET);
      const userId = String(payload.sub || '');
      if (!userId) return res.json({ session: null });

      const q = await pool.query(
        'SELECT id,email,username,role,email_verified,email_pending,contact_phone,phone_pending,phone_verified,profile_completion_required FROM app_users WHERE id=$1',
        [userId]
      );
      if (!q.rows.length) return res.json({ session: null });

      const row = q.rows[0];
      const pq = await pool.query(`SELECT ${PROFILE_SELECT_COLUMNS} FROM app_profiles WHERE id=$1`, [String(row.id)]);
      return res.json({
        session: {
          user: {
            id: String(row.id),
            email: row.email,
            role: String(row.role || 'user'),
            emailVerified: Boolean(row.email_verified),
            emailPending: String(row.email_pending || ''),
            phoneVerified: Boolean(row.phone_verified),
            phonePending: decryptSensitiveText(row.phone_pending),
          },
          profile: buildProfileFromRow({ ...(pq.rows[0] || {}), contact_phone: decryptSensitiveText(row.contact_phone) }, row.id, row.username),
          profileCompletionRequired: Boolean(row.profile_completion_required),
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
      const payload = verifySessionToken(jwt, token, JWT_SECRET);
      const userId = String(payload.sub || '');
      await ensureOAuthIdentityTable();
      const q = await pool.query(
        'SELECT provider, provider_sub, display_name, created_at FROM app_user_oauth_identities WHERE user_id=$1 ORDER BY created_at DESC',
        [userId]
      );
      return res.json({ links: q.rows.map((r) => ({ provider: r.provider, accountName: r.display_name || r.provider_sub, linkedAt: r.created_at })) });
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }
  });

  app.delete('/api/auth/oauth/links/:provider', authRateLimit(20, 60_000), async (req, res) => {
    const token = getRequestToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    const provider = String(req.params.provider || '').toLowerCase();
    if (!['google', 'apple', 'instagram', 'facebook', 'threads'].includes(provider)) {
      return res.status(400).json({ error: 'unsupported_provider' });
    }
    try {
      const payload = verifySessionToken(jwt, token, JWT_SECRET);
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
      const payload = verifySessionToken(jwt, token, JWT_SECRET);
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
      if (contactPhone !== undefined) return res.status(400).json({ error: 'phone_verification_required' });
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
            await pool.query('UPDATE app_users SET password_hash=$1, password_sha256=NULL WHERE id=$2', [upgraded, userId]);
          }
        }
        if (!currentPasswordOk) return res.status(403).json({ error: 'invalid_current_password' });
      }

      const fields = [];
      const vals = [];

      if (username !== undefined) {
        const existingUsername = await pool.query(
          'SELECT id FROM app_users WHERE lower(username)=lower($1) AND id::text <> $2 LIMIT 1',
          [username, userId]
        );
        if (existingUsername.rows.length) return res.status(409).json({ error: 'username_already_exists' });
        vals.push(username);
        fields.push(`username=$${vals.length}`);
      }
      if (fullName !== undefined) { vals.push(String(fullName).trim()); fields.push(`full_name=$${vals.length}`); }
      if (password !== undefined) {
        const hash = await bcrypt.hash(password, 12);
        vals.push(hash); fields.push(`password_hash=$${vals.length}`);
        fields.push('password_sha256=NULL');
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
      const payload = verifySessionToken(jwt, token, JWT_SECRET);
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

  app.post('/api/auth/email/verify/request', authRateLimit(5, 10 * 60_000), async (req, res) => {
    const token = getRequestToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    try {
      const payload = verifySessionToken(jwt, token, JWT_SECRET);
      const userId = String(payload.sub || '');
      const q = await pool.query('SELECT email,email_pending,email_verified FROM app_users WHERE id=$1', [userId]);
      if (!q.rows.length) return res.status(404).json({ error: 'user_not_found' });
      const targetEmail = normalizeEmail(q.rows[0].email_pending || q.rows[0].email || '');
      if (!targetEmail) return res.status(400).json({ error: 'email_required' });
      if (q.rows[0].email_verified && !q.rows[0].email_pending) return res.json({ ok: true, alreadyVerified: true });

      const code = String(crypto.randomInt(100000, 1000000));
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await pool.query(
        'UPDATE app_users SET email_pending=$1,email_verify_code=$2,email_verify_expires=$3,email_verified=false WHERE id=$4',
        [targetEmail, code, expires, userId]
      );
      const verifyToken = jwt.sign({ purpose: 'email_verify', sub: userId, email: targetEmail }, JWT_SECRET, { expiresIn: '24h' });
      const verifyLink = `${API_PUBLIC_BASE_URL}/api/auth/email/verify?token=${encodeURIComponent(verifyToken)}`;
      await sendEmailVerifyCode({ userId, email: targetEmail, code, verifyLink });
      return res.json({ ok: true, expiresIn: 600 });
    } catch (error) {
      console.error('[EMAIL_VERIFY_REQUEST]', error);
      return res.status(500).json({ error: 'email_verify_request_failed' });
    }
  });

  app.post('/api/auth/phone/verify/request', authRateLimit(5, 10 * 60_000), async (req, res) => {
    const token = getRequestToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    const phone = normalizePhone(req.body?.phone);
    if (!/^\+?\d{8,15}$/.test(phone)) return res.status(400).json({ error: 'invalid_contact_phone' });
    try {
      const payload = verifySessionToken(jwt, token, JWT_SECRET);
      const userId = String(payload.sub || '');
      const code = String(crypto.randomInt(100000, 1000000));
      const codeHash = hashPhoneVerifyCode(userId, phone, code);
      const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await pool.query(
        'UPDATE app_users SET phone_pending=$1,phone_verify_code_hash=$2,phone_verify_expires=$3 WHERE id=$4',
        [encryptSensitiveText(phone), codeHash, expires, userId]
      );
      try {
        await sendSmsVerifyCode({ userId, phone, code });
      } catch (error) {
        await pool.query(
          'UPDATE app_users SET phone_pending=NULL,phone_verify_code_hash=NULL,phone_verify_expires=NULL WHERE id=$1 AND phone_verify_code_hash=$2',
          [userId, codeHash]
        );
        throw error;
      }
      return res.json({ ok: true, expiresIn: 300 });
    } catch (error) {
      const message = String(error?.message || '');
      console.error('[PHONE_VERIFY_REQUEST]', message);
      if (message === 'sms_provider_not_configured') return res.status(503).json({ error: message });
      return res.status(500).json({ error: 'phone_verify_request_failed' });
    }
  });

  app.post('/api/auth/phone/verify/confirm', authRateLimit(20, 60_000), async (req, res) => {
    const token = getRequestToken(req);
    const code = String(req.body?.code || '').trim();
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'invalid_code' });
    try {
      const payload = verifySessionToken(jwt, token, JWT_SECRET);
      const userId = String(payload.sub || '');
      const q = await pool.query(
        'SELECT phone_pending,phone_verify_code_hash,phone_verify_expires FROM app_users WHERE id=$1',
        [userId]
      );
      if (!q.rows.length) return res.status(404).json({ error: 'user_not_found' });
      const row = q.rows[0];
      if (!row.phone_pending || !row.phone_verify_code_hash) return res.status(400).json({ error: 'no_pending_phone' });
      if (!row.phone_verify_expires || new Date(row.phone_verify_expires).getTime() < Date.now()) {
        return res.status(400).json({ error: 'code_expired' });
      }
      const pendingPhone = decryptSensitiveText(row.phone_pending);
      const candidateHash = hashPhoneVerifyCode(userId, pendingPhone, code);
      if (!safeHashEqual(row.phone_verify_code_hash, candidateHash)) return res.status(400).json({ error: 'invalid_code' });

      await pool.query(
        `WITH verified_user AS (
           UPDATE app_users
              SET contact_phone=$1,phone_verified=true,phone_verified_at=now(),phone_pending=NULL,
                  phone_verify_code_hash=NULL,phone_verify_expires=NULL
            WHERE id=$2
            RETURNING id
         )
         UPDATE app_profiles SET contact_phone=NULL WHERE id IN (SELECT id::text FROM verified_user)`,
        [encryptSensitiveText(pendingPhone), userId]
      );
      return res.json({ ok: true, phone: pendingPhone, phoneVerified: true });
    } catch (error) {
      console.error('[PHONE_VERIFY_CONFIRM]', error);
      return res.status(500).json({ error: 'phone_verify_failed' });
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

    if (!['google', 'apple', 'facebook', 'threads'].includes(provider)) {
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
        oauthProfile = {
          sub: String(info.sub || ''),
          email: normalizeEmail(info.email || ''),
          name: info.name || info.given_name || '',
          avatar: String(info.picture || '').trim(),
        };
      }

      if (provider === 'facebook') {
        const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
        tokenUrl.searchParams.set('client_id', process.env.FACEBOOK_CLIENT_ID);
        tokenUrl.searchParams.set('client_secret', process.env.FACEBOOK_CLIENT_SECRET);
        tokenUrl.searchParams.set('redirect_uri', redirectUri);
        tokenUrl.searchParams.set('code', code);
        const tokenResp = await fetch(tokenUrl.toString());
        const tokenJson = await tokenResp.json();
        const infoResp = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(tokenJson.access_token)}`);
        const info = await infoResp.json();
        oauthProfile = {
          sub: String(info.id || ''),
          email: normalizeEmail(info.email || ''),
          name: info.name || '',
          avatar: String(info.picture?.data?.url || '').trim(),
        };
      }

      if (provider === 'threads') {
        const tokenResp = await fetch('https://graph.threads.net/oauth/access_token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.THREADS_APP_ID,
            client_secret: process.env.THREADS_APP_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code,
          }),
        });
        const tokenJson = await tokenResp.json();
        if (!tokenResp.ok || !tokenJson.access_token) throw new Error(`threads_token_failed_${tokenResp.status}`);
        const infoUrl = new URL('https://graph.threads.net/v1.0/me');
        infoUrl.searchParams.set('fields', 'id,username,threads_profile_picture_url');
        infoUrl.searchParams.set('access_token', tokenJson.access_token);
        const infoResp = await fetch(infoUrl);
        const info = await infoResp.json();
        if (!infoResp.ok) throw new Error(`threads_userinfo_failed_${infoResp.status}`);
        oauthProfile = {
          sub: String(info.id || ''),
          email: '',
          name: String(info.username || ''),
          avatar: String(info.threads_profile_picture_url || ''),
        };
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

      if (!oauthProfile?.sub) {
        return res.redirect(redirectTo({ oauth: 'failed', reason: 'profile_missing_fields' }));
      }

      if (stateData.mode === 'link' && stateData.userId) {
        const linkUser = await pool.query('SELECT account_scope FROM app_users WHERE id=$1 LIMIT 1', [stateData.userId]);
        if (String(linkUser.rows[0]?.account_scope || '').toLowerCase() === 'resort') {
          return res.redirect(redirectTo({ oauth_link: 'failed', reason: 'resort_social_login_disabled' }));
        }
        await ensureOAuthIdentityTable();
        const conflict = await pool.query(
          'SELECT user_id FROM app_user_oauth_identities WHERE provider=$1 AND provider_sub=$2 LIMIT 1',
          [provider, oauthProfile.sub]
        );
        if (conflict.rows.length && String(conflict.rows[0].user_id) !== String(stateData.userId)) {
          return res.redirect(redirectTo({ oauth_link: 'failed', reason: 'already_linked' }));
        }
        await pool.query(
          `INSERT INTO app_user_oauth_identities(user_id, provider, provider_sub, email_at_link, display_name)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (provider, provider_sub) DO UPDATE SET user_id=EXCLUDED.user_id, email_at_link=EXCLUDED.email_at_link, display_name=EXCLUDED.display_name`,
          [stateData.userId, provider, oauthProfile.sub, oauthProfile.email, String(oauthProfile.name || '').trim() || null]
        );
        return res.redirect(redirectTo({ oauth_link: 'success', provider }));
      }

      await ensureOAuthIdentityTable();
      const linked = await pool.query(
        `SELECT u.id,u.email,u.username,u.account_scope
           FROM app_user_oauth_identities i
           JOIN app_users u ON u.id=i.user_id
          WHERE i.provider=$1 AND i.provider_sub=$2
          LIMIT 1`,
        [provider, oauthProfile.sub]
      );

      if (linked.rows.length && String(linked.rows[0].account_scope || '').toLowerCase() === 'resort') {
        return res.redirect(redirectTo({ oauth: 'failed', reason: 'resort_social_login_disabled' }));
      }

      if (!linked.rows.length) {
        const resortEmail = oauthProfile.email
          ? await pool.query("SELECT id FROM app_users WHERE lower(email)=lower($1) AND account_scope='resort' LIMIT 1", [oauthProfile.email])
          : { rows: [] };
        if (resortEmail.rows.length) {
          return res.redirect(redirectTo({ oauth: 'failed', reason: 'resort_social_login_disabled' }));
        }
        const existingEmail = oauthProfile.email
          ? await pool.query('SELECT id,email,username FROM app_users WHERE lower(email)=lower($1) AND account_scope=$2 LIMIT 1', [oauthProfile.email, stateData.accountScope || 'personal'])
          : { rows: [] };
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
        if (stateData.mode !== 'signup') {
          return res.redirect(redirectTo({ oauth: 'signup_required', provider }));
        }
      }

      const authResult = await upsertOAuthUser({
        provider,
        providerSub: oauthProfile.sub,
        email: oauthProfile.email,
        name: oauthProfile.name,
        avatar: oauthProfile.avatar,
        sessionDays,
        accountScope: stateData.accountScope || 'personal',
      });
      if (!linked.rows.length) {
        const consentResult = validateSignupConsents(stateData.consents, await loadSignupConsentConfig(pool));
        if (!consentResult.ok) return res.redirect(redirectTo({ oauth: 'failed', reason: consentResult.error }));
        await saveSignupConsents(pool, authResult.user.id, consentResult.receipts, {
          source: `oauth-web:${provider}`,
          locale: 'ko',
        });
      }

      setSessionCookie(res, authResult.token, sessionDays);
      return res.redirect(
        redirectTo(
          shouldExposeToken
            ? { oauth: 'success', oauthToken: authResult.token, profile_completion: authResult.profileCompletionRequired ? '1' : '0' }
            : { oauth: 'success', profile_completion: authResult.profileCompletionRequired ? '1' : '0' }
        )
      );
    } catch (e) {
      const reason = String(e?.message || 'oauth_callback_error').slice(0, 120);
      return res.redirect(redirectTo({ oauth: 'failed', reason }));
    }
  });
}
import { verifySessionToken } from '../lib/sessionToken.js';
