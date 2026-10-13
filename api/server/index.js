import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { requireAdminFactory } from './middleware/requireAdmin.js';
import { verifySessionToken } from './lib/sessionToken.js';
import { registerAdminCoreRoutes } from './routes/adminCore.js';
import { registerAdminGrowthMapRoutes } from './routes/adminGrowthMap.js';
import { registerAdminJobsRoutes } from './routes/adminJobs.js';
import { registerAdminModerationRoutes } from './routes/adminModeration.js';
import { registerAdminAdsRoutes } from './routes/adminAds.js';
import { registerAdminPricingRoutes } from './routes/adminPricing.js';
import { registerAdminPushRoutes } from './routes/adminPush.js';
import { registerAdminCommunicationSettingsRoutes } from './routes/adminCommunicationSettings.js';
import { registerAdminOperationsRoutes } from './routes/adminOperations.js';
import { registerAdminDataRoutes } from './routes/adminData.js';
import { registerAdminResortImportRoutes } from './routes/adminResortImports.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerDataRoutes } from './routes/data.js';
import { registerDocsRoutes } from './routes/docs.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerPushRoutes } from './routes/push.js';
import { registerLegalRoutes } from './routes/legal.js';
import { registerIntegrationRoutes } from './routes/integrations.js';
import { registerNotificationSettingsRoutes } from './routes/notificationSettings.js';
import { registerAiSettingsRoutes } from './routes/aiSettings.js';
import { registerAiGenerationRoutes } from './routes/aiGeneration.js';
import { registerTranslationRoutes } from './routes/translations.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerProfileRoutes } from './routes/profiles.js';
import { registerProfileContentRoutes } from './routes/profileContent.js';
import { registerUserPreferencesRoutes } from './routes/userPreferences.js';
import { registerDivingLicenseRoutes } from './routes/divingLicenses.js';
import { registerAppleWalletRoutes } from './routes/appleWallet.js';
import { registerGoogleWalletRoutes } from './routes/googleWallet.js';
import { registerResortCheckinRoutes } from './routes/resortCheckins.js';
import { registerDiveLogDraftRoutes } from './routes/diveLogDrafts.js';
import { registerPrivateDiveLogRoutes } from './routes/privateDiveLogs.js';
import { registerDivePhotoAiRoutes } from './routes/divePhotoAi.js';
import { registerMarineLifeRoutes } from './routes/marineLife.js';
import { registerDiveVoiceMemoRoutes } from './routes/diveVoiceMemos.js';
import { registerEducationApplicationRoutes } from './routes/educationApplications.js';
import { registerPresenceRoutes } from './routes/presence.js';
import { registerWebsiteInquiryRoutes } from './routes/websiteInquiries.js';
import { registerResortBookingRoutes } from './routes/resortBookings.js';
import { registerStoreSubscriptionRoutes } from './routes/storeSubscriptions.js';
import { ensureResortPartnerSchema, registerResortPartnerRoutes } from './routes/resortPartners.js';
import { registerAdminMessagingUsageRoutes } from './routes/adminMessagingUsage.js';
import { registerAdminExternalIntegrationRoutes } from './routes/adminExternalIntegrations.js';
import { registerAdminApiSettingsRoutes } from './routes/adminApiSettings.js';
import { registerMarineWeatherRoutes } from './routes/marineWeather.js';
import { ensurePasswordResetSchema, registerPasswordResetRoutes } from './routes/passwordReset.js';
import { ensureApiSettingsSchema, loadApiSettingsIntoEnvironment } from './lib/apiSettings.js';
import { ensureDiveGuideSchema, registerDiveGuideRoutes } from './routes/diveGuides.js';
import { processAdminPushJob } from './lib/adminPushDelivery.js';
import { encryptSensitiveText } from './lib/dataEncryption.js';

dotenv.config({ path: process.env.DIVERGRAM_ENV_FILE || path.resolve(process.cwd(), '.env') });

const app = express();

const isProd = process.env.NODE_ENV === 'production';
const CORS_ORIGINS = Array.from(new Set([
  ...(process.env.CORS_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5175,http://localhost:5175,capacitor://localhost,ionic://localhost')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  'https://adm.divergram.com',
  'https://mns.divergram.com',
  'https://partner.divergram.com',
  'https://divergram.com',
  'https://www.divergram.com',
]));

app.disable('x-powered-by');
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (CORS_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'x-admin-key', 'X-Admin-Key', 'x-resort-api-key', 'X-Resort-Api-Key'],
  credentials: true,
}));
app.use(express.json({
  limit: '15mb',
  verify(req, _res, buffer) {
    if (req.originalUrl === '/api/resort-payments/webhooks/gateway' || req.originalUrl === '/api/resort-payments/webhooks/airwallex' || req.originalUrl === '/api/resort-payments/webhooks/paypal') req.rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true }));
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
const connectionString = String(process.env.DATABASE_URL || '').trim();

const pool = new pg.Pool({
  ...(connectionString
    ? { connectionString }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'divergram',
        user: process.env.PGUSER || 'seowoo',
        password: (process.env.PGPASSWORD ?? ''),
      }),
  ssl: process.env.PGSSL === 'true' || !!connectionString ? { rejectUnauthorized: false } : undefined,
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
const ADMIN_EMAILS = Array.from(new Set((process.env.ADMIN_EMAILS || 'subi9807@gmail.com').split(',').map((v) => String(v || '').trim().toLowerCase()).filter(Boolean)));

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


async function ensureDefaultAdminAccounts() {
  const adminEmails = ADMIN_EMAILS.length ? ADMIN_EMAILS : ['subi9807@gmail.com'];
  for (const email of adminEmails) {
    const username = String(email.split('@')[0] || 'divergram_admin').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32) || 'divergram_admin';
    const existing = await pool.query('SELECT id FROM app_users WHERE lower(email)=lower($1) AND account_scope=$2 LIMIT 1', [email, 'admin']);
    if (existing.rows.length) {
      await pool.query(
        `UPDATE app_users SET username=$1, role='admin', account_scope='admin', email_verified=true, is_blocked=false WHERE id=$2`,
        [username, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO app_users(email, username, role, account_scope, email_verified)
         VALUES ($1,$2,'admin','admin',true)`,
        [email, username]
      );
    }
    const userQ = await pool.query('SELECT id, username FROM app_users WHERE lower(email)=lower($1) AND account_scope=$2 LIMIT 1', [email, 'admin']);
    if (!userQ.rows.length) continue;
    const userId = String(userQ.rows[0].id);
    await pool.query(
      `INSERT INTO app_profiles(id, username, full_name, bio, avatar_url, account_type)
       VALUES ($1,$2,$3,'','', 'personal')
       ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, full_name=EXCLUDED.full_name`,
      [userId, username, username]
    );
  }
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
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS contact_phone TEXT;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone_pending TEXT;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone_verify_code_hash TEXT;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone_verify_expires TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS oauth_provider TEXT;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS oauth_sub TEXT;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_completion_required BOOLEAN NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS account_scope TEXT NOT NULL DEFAULT 'personal';`);
  // Email addresses may be reused across the three isolated account spaces.
  // Keep uniqueness within a scope instead of globally across all accounts.
  await pool.query(`ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_email_key;`);
  await pool.query(`DROP INDEX IF EXISTS app_users_email_lower_uniq;`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_users_oauth_uniq ON app_users(oauth_provider, oauth_sub) WHERE oauth_provider IS NOT NULL AND oauth_sub IS NOT NULL;`);
  await pool.query(`UPDATE app_users SET email_verified=true WHERE email_verified IS NULL;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_translation_cache (
      id BIGSERIAL PRIMARY KEY,
      content_hash TEXT NOT NULL,
      source_language TEXT,
      target_language TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (content_hash, target_language)
    );
  `);
  await pool.query(`
    WITH duplicate_names AS (
      SELECT lower(username) AS normalized
      FROM app_users
      GROUP BY lower(username)
      HAVING COUNT(*) > 1
    )
    UPDATE app_users AS users
       SET username = left(
         COALESCE(NULLIF(regexp_replace(split_part(users.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'), ''), 'diver'),
         20
       ) || '_' || users.id::text
     WHERE btrim(users.username) = ''
        OR users.username ~ '^_+$'
        OR lower(users.username) IN (SELECT normalized FROM duplicate_names)
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_users_username_lower_uniq ON app_users ((lower(username)));`);
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
  await pool.query(`CREATE INDEX IF NOT EXISTS app_user_oauth_identities_user_idx ON app_user_oauth_identities(user_id);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_user_consents (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      consent_key TEXT NOT NULL,
      policy_type TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      agreed BOOLEAN NOT NULL,
      agreed_at TIMESTAMPTZ,
      source TEXT NOT NULL,
      locale TEXT NOT NULL DEFAULT 'ko',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_user_consents_user_idx ON app_user_consents(user_id, created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_user_consents_policy_idx ON app_user_consents(user_id, consent_key, policy_version);`);

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
    CREATE TABLE IF NOT EXISTS admin_push_templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      target_role TEXT NOT NULL DEFAULT 'all',
      data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE admin_push_templates ADD COLUMN IF NOT EXISTS target_role TEXT NOT NULL DEFAULT 'all';`);
  await pool.query(`ALTER TABLE admin_push_templates ADD COLUMN IF NOT EXISTS data_json JSONB NOT NULL DEFAULT '{}'::jsonb;`);
  await pool.query(`ALTER TABLE admin_push_templates ADD COLUMN IF NOT EXISTS created_by TEXT;`);
  await pool.query(`ALTER TABLE admin_push_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`);

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
      contact_phone TEXT,
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      website TEXT,
      account_type TEXT NOT NULL DEFAULT 'personal',
      resort_cover_url TEXT,
      resort_photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      resort_amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
      resort_record_key TEXT,
      resort_source TEXT,
      resort_source_record_id TEXT,
      resort_source_url TEXT,
      resort_instagram_url TEXT,
      resort_facebook_url TEXT,
      resort_youtube_url TEXT,
      resort_tiktok_url TEXT,
      resort_country TEXT,
      resort_country_code TEXT,
      resort_city TEXT,
      resort_phones JSONB NOT NULL DEFAULT '[]'::jsonb,
      resort_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
      resort_certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
      resort_source_raw JSONB NOT NULL DEFAULT '{}'::jsonb,
      resort_collected_at TIMESTAMPTZ,
      resort_coordinate_source TEXT,
      resort_geocoded_at TIMESTAMPTZ,
      resort_reverse_geocode_source TEXT,
      resort_nearest_city_distance_km DOUBLE PRECISION,
      diving_level TEXT,
      scuba_level TEXT,
      freediving_level TEXT,
      license_type TEXT,
      license_number TEXT,
      license_agency TEXT,
      license_issued_at TEXT,
      license_image_url TEXT,
      license_image_path TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS website TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'personal';`);
  await pool.query(`
    UPDATE app_users u
       SET account_scope = CASE
         WHEN lower(COALESCE(u.role, 'user')) = 'admin' THEN 'admin'
         WHEN lower(COALESCE(p.account_type, 'personal')) = 'resort' THEN 'resort'
         ELSE 'personal'
       END
      FROM app_profiles p
     WHERE p.id = u.id::text;
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_scope_uniq ON app_users ((lower(email)), account_scope);`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS contact_phone TEXT;`);
  const phoneRows = await pool.query(`
    SELECT users.id, users.contact_phone, users.phone_pending, profiles.contact_phone AS profile_phone
      FROM app_users users
      LEFT JOIN app_profiles profiles ON profiles.id=users.id::text
     WHERE COALESCE(users.contact_phone, users.phone_pending, profiles.contact_phone) IS NOT NULL
  `);
  for (const row of phoneRows.rows) {
    const contactPhone = String(row.contact_phone || row.profile_phone || '');
    const phonePending = String(row.phone_pending || '');
    await pool.query(
      `UPDATE app_users SET contact_phone=$1,phone_pending=$2 WHERE id=$3`,
      [encryptSensitiveText(contactPhone) || null, encryptSensitiveText(phonePending) || null, row.id]
    );
  }
  await pool.query(`UPDATE app_profiles SET contact_phone=NULL WHERE contact_phone IS NOT NULL;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_cover_url TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_amenities JSONB NOT NULL DEFAULT '[]'::jsonb;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_record_key TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_source TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_source_record_id TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_source_url TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_instagram_url TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_facebook_url TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_youtube_url TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_tiktok_url TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_country TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_country_code TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_city TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_phones JSONB NOT NULL DEFAULT '[]'::jsonb;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_emails JSONB NOT NULL DEFAULT '[]'::jsonb;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_certifications JSONB NOT NULL DEFAULT '[]'::jsonb;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_source_raw JSONB NOT NULL DEFAULT '{}'::jsonb;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_collected_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_coordinate_source TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_geocoded_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_reverse_geocode_source TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_nearest_city_distance_km DOUBLE PRECISION;`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_profiles_resort_record_key_uniq ON app_profiles(resort_record_key) WHERE resort_record_key IS NOT NULL;`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_profiles_resort_source_record_uniq ON app_profiles(resort_source, resort_source_record_id) WHERE resort_source IS NOT NULL AND resort_source_record_id IS NOT NULL;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_owner_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_owner_verified_at TIMESTAMPTZ;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_resort_managers (
      id BIGSERIAL PRIMARY KEY,
      resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      is_primary BOOLEAN NOT NULL DEFAULT false,
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (resort_id, user_id)
    );
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_resort_managers_primary_uniq ON app_resort_managers(resort_id) WHERE is_primary=true;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_resort_checkins (
      id BIGSERIAL PRIMARY KEY,
      resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE RESTRICT,
      member_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
      checked_in_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
      license_id TEXT NOT NULL,
      member_number TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'wallet_qr' CHECK (method IN ('wallet_qr','app_qr','manual')),
      checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `);
  await pool.query(`ALTER TABLE app_resort_checkins ADD COLUMN IF NOT EXISTS license_id TEXT;`);
  await pool.query(`ALTER TABLE app_resort_checkins ADD COLUMN IF NOT EXISTS member_number TEXT;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_resort_checkins_resort_time_idx ON app_resort_checkins(resort_id,checked_in_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_resort_checkins_member_time_idx ON app_resort_checkins(member_user_id,checked_in_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_resort_checkins_member_number_idx ON app_resort_checkins(member_number,checked_in_at DESC);`);
  await pool.query(`
    INSERT INTO app_resort_managers(resort_id,user_id,is_primary,permissions)
    SELECT id,resort_owner_user_id,true,'{}'::jsonb FROM app_profiles
    WHERE resort_owner_user_id IS NOT NULL
    ON CONFLICT(resort_id,user_id) DO NOTHING;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_resort_import_staging (
      id BIGSERIAL PRIMARY KEY,
      record_key TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      source_record_id TEXT,
      source_url TEXT NOT NULL,
      website_url TEXT,
      instagram_url TEXT,
      facebook_url TEXT,
      youtube_url TEXT,
      tiktok_url TEXT,
      name TEXT NOT NULL,
      address TEXT,
      country TEXT,
      country_code TEXT,
      region TEXT,
      city TEXT,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      phones JSONB NOT NULL DEFAULT '[]'::jsonb,
      emails JSONB NOT NULL DEFAULT '[]'::jsonb,
      certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
      source_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      mirrored_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      image_rights_status TEXT NOT NULL DEFAULT 'unverified',
      raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      review_note TEXT,
      approved_resort_id TEXT REFERENCES app_profiles(id) ON DELETE SET NULL,
      collected_at TIMESTAMPTZ,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT app_resort_import_status_check CHECK (status IN ('pending','approved','rejected')),
      CONSTRAINT app_resort_image_rights_check CHECK (image_rights_status IN ('unverified','licensed','owner_provided','rejected')),
      CONSTRAINT app_resort_import_lat_check CHECK (latitude BETWEEN -90 AND 90),
      CONSTRAINT app_resort_import_lng_check CHECK (longitude BETWEEN -180 AND 180)
    );
  `);
  await pool.query(`ALTER TABLE app_resort_import_staging ADD COLUMN IF NOT EXISTS website_url TEXT;`);
  await pool.query(`ALTER TABLE app_resort_import_staging ADD COLUMN IF NOT EXISTS instagram_url TEXT;`);
  await pool.query(`ALTER TABLE app_resort_import_staging ADD COLUMN IF NOT EXISTS facebook_url TEXT;`);
  await pool.query(`ALTER TABLE app_resort_import_staging ADD COLUMN IF NOT EXISTS youtube_url TEXT;`);
  await pool.query(`ALTER TABLE app_resort_import_staging ADD COLUMN IF NOT EXISTS tiktok_url TEXT;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_resort_import_staging_status_idx ON app_resort_import_staging(status, created_at DESC);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_resort_owner_claims (
      id BIGSERIAL PRIMARY KEY,
      resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
      claimant_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
      review_note TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT app_resort_owner_claim_status_check CHECK (status IN ('pending','approved','rejected')),
      UNIQUE (resort_id, claimant_user_id)
    );
  `);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS diving_level TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS scuba_level TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS freediving_level TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS license_type TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS license_number TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS license_agency TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS license_issued_at TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS license_image_url TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS license_image_path TEXT;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS avatar_image_path TEXT;`);
  await pool.query(`
    UPDATE app_profiles AS profiles
       SET username = users.username
      FROM app_users AS users
     WHERE profiles.id = users.id::text
       AND profiles.username IS DISTINCT FROM users.username
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_resort_prices (
      id TEXT PRIMARY KEY,
      resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
      price_type TEXT NOT NULL DEFAULT 'dive_package',
      title TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      duration_text TEXT NOT NULL DEFAULT '',
      unit_label TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'KRW',
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      included_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS resort_id TEXT;`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS price_type TEXT NOT NULL DEFAULT 'dive_package';`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS duration_text TEXT NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS unit_label TEXT NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'KRW';`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS included_items JSONB NOT NULL DEFAULT '[]'::jsonb;`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE app_resort_prices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_booking_enabled BOOLEAN NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_booking_deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 100;`);
  await pool.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS resort_booking_deposit_currency TEXT NOT NULL DEFAULT 'USD';`);
  await pool.query(`CREATE TABLE IF NOT EXISTS app_resort_bookings (id TEXT PRIMARY KEY,resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE RESTRICT,user_id TEXT NOT NULL,price_id TEXT REFERENCES app_resort_prices(id) ON DELETE SET NULL,booking_date DATE NOT NULL,booking_end_date DATE NOT NULL,participants INTEGER NOT NULL DEFAULT 1 CHECK(participants BETWEEN 1 AND 50),dive_type TEXT NOT NULL DEFAULT 'fun_diving',applicant_name TEXT NOT NULL,contact_phone TEXT NOT NULL DEFAULT '',contact_email TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',admin_note TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected','cancelled','completed','no_show')),confirmed_at TIMESTAMPTZ,cancelled_at TIMESTAMPTZ,no_show_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD COLUMN IF NOT EXISTS booking_end_date DATE;`);
  await pool.query(`UPDATE app_resort_bookings SET booking_end_date=booking_date WHERE booking_end_date IS NULL;`);
  await pool.query(`ALTER TABLE app_resort_bookings ALTER COLUMN booking_end_date SET NOT NULL,ALTER COLUMN booking_end_date DROP DEFAULT;`);
  await pool.query(`ALTER TABLE app_resort_bookings DROP CONSTRAINT IF EXISTS app_resort_bookings_date_range_check;`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD CONSTRAINT app_resort_bookings_date_range_check CHECK(booking_end_date>=booking_date AND booking_end_date<=booking_date+30);`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD COLUMN IF NOT EXISTS booking_number TEXT;`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD COLUMN IF NOT EXISTS deposit_currency TEXT NOT NULL DEFAULT 'USD';`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD COLUMN IF NOT EXISTS deposit_status TEXT NOT NULL DEFAULT 'pending';`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD COLUMN IF NOT EXISTS payment_reference TEXT NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD COLUMN IF NOT EXISTS booking_terms_accepted BOOLEAN NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD COLUMN IF NOT EXISTS booking_policy_accepted_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE app_resort_bookings ADD COLUMN IF NOT EXISTS cancellation_type TEXT NOT NULL DEFAULT '';`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_resort_bookings_number_uniq ON app_resort_bookings(booking_number) WHERE booking_number IS NOT NULL;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_resort_bookings_user_idx ON app_resort_bookings(user_id,created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_resort_bookings_resort_idx ON app_resort_bookings(resort_id,booking_date DESC);`);
  await pool.query(`CREATE TABLE IF NOT EXISTS app_resort_booking_history(id BIGSERIAL PRIMARY KEY,booking_id TEXT NOT NULL REFERENCES app_resort_bookings(id) ON DELETE CASCADE,actor_user_id TEXT,action TEXT NOT NULL,from_status TEXT,to_status TEXT,note TEXT NOT NULL DEFAULT '',snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);

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
      location_lat DOUBLE PRECISION,
      location_lng DOUBLE PRECISION,
      visibility DOUBLE PRECISION,
      gas_type TEXT,
      gas_percent DOUBLE PRECISION,
      buddy TEXT,
      buddy_name TEXT,
      publish_to_feed BOOLEAN NOT NULL DEFAULT true,
      publish_to_reels BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;`);
  await pool.query(`ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;`);
  await pool.query(`ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS gas_type TEXT;`);
  await pool.query(`ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS gas_percent DOUBLE PRECISION;`);
  await pool.query(`ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS publish_to_feed BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS publish_to_reels BOOLEAN NOT NULL DEFAULT false;`);

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
    CREATE TABLE IF NOT EXISTS app_saved_resorts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, resort_id)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_saved_resorts_user_created ON app_saved_resorts(user_id, created_at DESC);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      actor_id TEXT,
      type TEXT NOT NULL,
      post_id TEXT,
      title TEXT,
      body TEXT,
      image_url TEXT,
      deep_link TEXT,
      source TEXT,
      event_key TEXT,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      delivery_status TEXT NOT NULL DEFAULT 'stored',
      is_read BOOLEAN NOT NULL DEFAULT false,
      read_at TIMESTAMPTZ,
      opened_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS title TEXT;`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS body TEXT;`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS image_url TEXT;`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS deep_link TEXT;`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS source TEXT;`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS event_key TEXT;`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'stored';`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_notifications_user_created_idx ON app_notifications(user_id, created_at DESC);`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_notifications_user_event_idx ON app_notifications(user_id, event_key) WHERE event_key IS NOT NULL AND event_key <> '';`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_rooms (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      direct_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE app_rooms ADD COLUMN IF NOT EXISTS direct_key TEXT;`);
  await pool.query(`ALTER TABLE app_rooms ADD COLUMN IF NOT EXISTS name TEXT;`);
  await pool.query(`ALTER TABLE app_rooms ADD COLUMN IF NOT EXISTS created_by TEXT;`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_rooms_direct_key_idx ON app_rooms(direct_key) WHERE direct_key IS NOT NULL;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_participants (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    DELETE FROM app_participants duplicate
    USING app_participants keep
    WHERE duplicate.room_id=keep.room_id
      AND duplicate.user_id=keep.user_id
      AND duplicate.id > keep.id;
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_participants_room_user_idx ON app_participants(room_id, user_id);`);

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
      device_id TEXT,
      push_token TEXT NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE app_device_tokens ADD COLUMN IF NOT EXISTS device_id TEXT;`);
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
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_message_deliveries_message_user_idx ON app_message_deliveries(message_id, user_id);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_jobs_status_idx ON app_jobs(status, created_at);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      target_type TEXT NOT NULL DEFAULT 'post',
      target_id TEXT,
      detail JSONB NOT NULL DEFAULT '{}'::jsonb,
      resolution_note TEXT NOT NULL DEFAULT '',
      handled_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE app_reports ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'post';`);
  await pool.query(`ALTER TABLE app_reports ADD COLUMN IF NOT EXISTS target_id TEXT;`);
  await pool.query(`ALTER TABLE app_reports ADD COLUMN IF NOT EXISTS detail JSONB NOT NULL DEFAULT '{}'::jsonb;`);
  await pool.query(`ALTER TABLE app_reports ADD COLUMN IF NOT EXISTS resolution_note TEXT NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE app_reports ADD COLUMN IF NOT EXISTS handled_by TEXT;`);
  await pool.query(`ALTER TABLE app_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_moderation_actions (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      actor_user_id TEXT,
      target_type TEXT NOT NULL DEFAULT 'report',
      target_id TEXT,
      action TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status_after TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_moderation_actions_report_idx ON app_moderation_actions(report_id, created_at DESC);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_ad_slots (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      placement TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      note TEXT NOT NULL DEFAULT '',
      action_label TEXT NOT NULL DEFAULT '운영',
      target_url TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      start_at TIMESTAMPTZ,
      end_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_ad_slots_status_idx ON app_ad_slots(status, sort_order, updated_at DESC);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_certifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      discipline TEXT NOT NULL DEFAULT 'scuba',
      agency TEXT NOT NULL,
      certification_number TEXT,
      level TEXT,
      issued_at TEXT,
      expires_at TEXT,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'reviewing',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE app_certifications ADD COLUMN IF NOT EXISTS discipline TEXT NOT NULL DEFAULT 'scuba';`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_certifications_user_idx ON app_certifications(user_id, created_at DESC);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_education_applications (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, track TEXT NOT NULL, course_id TEXT NOT NULL,
      course_level TEXT NOT NULL DEFAULT '', course_title TEXT NOT NULL, applicant_name TEXT NOT NULL,
      contact TEXT NOT NULL, preferred_region TEXT NOT NULL DEFAULT '', preferred_schedule TEXT NOT NULL DEFAULT '',
      preferred_date DATE, privacy_consent BOOLEAN NOT NULL DEFAULT false,
      third_party_consent BOOLEAN NOT NULL DEFAULT false, consented_at TIMESTAMPTZ, consent_version TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'received', assigned_resort_id TEXT, assigned_instructor_user_id TEXT,
      assigned_admin_user_id TEXT, admin_note TEXT NOT NULL DEFAULT '', assigned_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE app_education_applications ADD COLUMN IF NOT EXISTS preferred_date DATE;`);
  await pool.query(`ALTER TABLE app_education_applications ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE app_education_applications ADD COLUMN IF NOT EXISTS third_party_consent BOOLEAN NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE app_education_applications ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE app_education_applications ADD COLUMN IF NOT EXISTS consent_version TEXT NOT NULL DEFAULT '';`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_education_applications_user_idx ON app_education_applications(user_id,created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_education_applications_status_idx ON app_education_applications(status,created_at DESC);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_education_application_history (
      id BIGSERIAL PRIMARY KEY, application_id TEXT NOT NULL REFERENCES app_education_applications(id) ON DELETE CASCADE,
      actor_user_id TEXT, action TEXT NOT NULL, from_status TEXT, to_status TEXT, note TEXT NOT NULL DEFAULT '',
      snapshot JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_education_application_history_application_idx ON app_education_application_history(application_id,created_at DESC);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_user_presence (
      user_id TEXT NOT NULL, device_id TEXT NOT NULL DEFAULT 'default', platform TEXT NOT NULL DEFAULT 'unknown',
      app_version TEXT NOT NULL DEFAULT '', build_number TEXT NOT NULL DEFAULT '', current_route TEXT NOT NULL DEFAULT '',
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(user_id,device_id)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_user_presence_last_seen_idx ON app_user_presence(last_seen_at DESC);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_infobip_billing_usage (
      id BIGSERIAL PRIMARY KEY, request_id TEXT UNIQUE, sent_since DATE NOT NULL, sent_until DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      failure_message TEXT NOT NULL DEFAULT '', requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      received_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_infobip_billing_usage_period_idx ON app_infobip_billing_usage(sent_since DESC,sent_until DESC,requested_at DESC);`);
  await ensureApiSettingsSchema(pool);
  await ensureResortPartnerSchema(pool);
  await ensureDiveGuideSchema(pool);
  await ensurePasswordResetSchema(pool);
}

registerHealthRoutes(app, pool);
registerAuthRoutes(app, {
  pool,
  authRateLimit,
  normalizeEmail,
  validateSignupInput,
  isStrongPassword,
  bcrypt,
  crypto,
  jwt,
  JWT_SECRET,
  adminEmails: ADMIN_EMAILS,
});
const requireAdmin = requireAdminFactory({ adminApiKey: ADMIN_API_KEY, jwtSecret: JWT_SECRET, pool, adminEmails: ADMIN_EMAILS });
registerResortBookingRoutes(app, { pool, getAuthUserId, authRateLimit, requireAdmin });
registerStoreSubscriptionRoutes(app, { pool, getAuthUserId, authRateLimit, storeSecret: JWT_SECRET });
registerResortPartnerRoutes(app, { pool, getAuthUserId, authRateLimit, requireAdmin });
registerAdminCoreRoutes(app, { pool, requireAdmin });
registerAdminGrowthMapRoutes(app, { pool, requireAdmin });
registerAdminJobsRoutes(app, { pool, requireAdmin, processQueuedJobs });
registerAdminAdsRoutes(app, { pool, requireAdmin, crypto });
registerAdminPricingRoutes(app, { pool, requireAdmin, crypto });
registerAdminPushRoutes(app, { pool, requireAdmin, crypto });
registerAdminCommunicationSettingsRoutes(app, { pool, requireAdmin });
registerAdminOperationsRoutes(app, { pool, requireAdmin });
registerAdminDataRoutes(app, { pool, requireAdmin, bcrypt, crypto });
registerAdminResortImportRoutes(app, { pool, requireAdmin, getAuthUserId });
registerAdminModerationRoutes(app, { pool, requireAdmin, adminEmails: ADMIN_EMAILS });
registerPasswordResetRoutes(app, { pool, requireAdmin, authRateLimit, bcrypt, crypto, isStrongPassword });
registerDataRoutes(app, { pool, crypto, getAuthUserId, requireAdmin });
registerPushRoutes(app, { pool, authRateLimit, getAuthUserId, crypto });
registerChatRoutes(app, { pool, authRateLimit, getAuthUserId, crypto, enqueueMessageCreated });
registerLegalRoutes(app, { pool, requireAdmin });
registerIntegrationRoutes(app, { pool, getAuthUserId, authRateLimit });
registerNotificationSettingsRoutes(app, { pool, getAuthUserId, authRateLimit });
registerAiSettingsRoutes(app, { pool, getAuthUserId, authRateLimit });
registerAiGenerationRoutes(app, { pool, getAuthUserId, authRateLimit });
registerTranslationRoutes(app, { pool, getAuthUserId, authRateLimit });
registerMediaRoutes(app, { getAuthUserId, authRateLimit });
registerProfileRoutes(app, { pool, getAuthUserId, authRateLimit });
registerProfileContentRoutes(app, { pool, getAuthUserId, authRateLimit });
registerUserPreferencesRoutes(app, { pool, getAuthUserId, authRateLimit });
registerDivingLicenseRoutes(app, { pool, getAuthUserId, authRateLimit });
registerAppleWalletRoutes(app, { pool, getAuthUserId, authRateLimit, jwt, jwtSecret: JWT_SECRET });
registerGoogleWalletRoutes(app, { pool, getAuthUserId, authRateLimit, jwt, jwtSecret: JWT_SECRET });
registerResortCheckinRoutes(app, { pool, getAuthUserId, authRateLimit, jwt, jwtSecret: JWT_SECRET });
registerDiveLogDraftRoutes(app, { pool, getAuthUserId, authRateLimit });
registerPrivateDiveLogRoutes(app, { pool, getAuthUserId, authRateLimit });
registerDivePhotoAiRoutes(app, { pool, getAuthUserId, authRateLimit });
registerMarineLifeRoutes(app, { pool, getAuthUserId, authRateLimit });
registerDiveVoiceMemoRoutes(app, { getAuthUserId, authRateLimit });
registerEducationApplicationRoutes(app, { pool, getAuthUserId, authRateLimit, requireAdmin });
registerPresenceRoutes(app, { pool, getAuthUserId, requireAdmin });
registerWebsiteInquiryRoutes(app, { pool, authRateLimit, requireAdmin });
registerAdminMessagingUsageRoutes(app, { pool, requireAdmin });
registerAdminExternalIntegrationRoutes(app, { pool, requireAdmin });
registerAdminApiSettingsRoutes(app, { pool, requireAdmin });
registerMarineWeatherRoutes(app, { getAuthUserId, authRateLimit });
registerDiveGuideRoutes(app, { pool, requireAdmin });
registerDocsRoutes(app);

function getAuthUserId(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = verifySessionToken(jwt, token, JWT_SECRET);
    const userId = String(payload.sub || '');
    return userId || null;
  } catch {
    return null;
  }
}


const LICENSE_UPLOAD_DIR = process.env.LICENSE_UPLOAD_DIR || '/home/divergram/private/license-images';

function parseDataImage(dataUrl) {
  const raw = String(dataUrl || '');
  const m = raw.match(/^data:(image\/(png|jpe?g|webp));base64,(.+)$/i);
  if (!m) return null;
  const buffer = Buffer.from(m[3], 'base64');
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) return null;
  return { ext: m[2].toLowerCase().replace('jpeg', 'jpg'), buffer, dataUrl: raw };
}
function normalizeLicenseDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const ymd = text.match(/(20\d{2}|19\d{2})[-/.년\s]+(0?[1-9]|1[0-2])[-/.월\s]+(0?[1-9]|[12]\d|3[01])/);
  if (ymd) return `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}`;

  const mdy = text.match(/\b(0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])[-/.](20\d{2}|19\d{2})\b/);
  if (mdy) return `${mdy[3]}-${String(mdy[1]).padStart(2, '0')}-${String(mdy[2]).padStart(2, '0')}`;

  const dmy = text.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2}|19\d{2})\b/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;

  return '';
}
function fallbackParseLicenseText(text) {
  const t = String(text || '');
  const agencies = ['PADI', 'SSI', 'NAUI', 'SDI', 'TDI', 'CMAS', 'RAID', 'BSAC', 'IANTD'];
  const agency = agencies.find((a) => new RegExp(`\\b${a}\\b`, 'i').test(t)) || '';
  const typeMatch = t.match(/(Advanced\s+Open\s+Water|Open\s+Water|Rescue\s+Diver|Dive\s*Master|Divemaster|Instructor|Freediv(?:er|ing)|Technical\s+Diver)/i);
  const numberMatch = t.match(/(?:No\.?|Number|ID|Member\s*ID|Certification\s*#?|Cert\.?\s*No\.?)\s*[:#]?\s*([A-Z0-9-]{5,})/i) || t.match(/\b([A-Z0-9]{6,}[-A-Z0-9]*)\b/);
  const nameMatch = t.match(/(?:Name|Diver|Holder)\s*[:#]?\s*([A-Z][A-Z .'-]{3,})/i);
  return {
    holder_name: nameMatch ? nameMatch[1].trim() : '',
    agency,
    type: typeMatch ? typeMatch[1].replace(/\s+/g, ' ').trim() : '',
    number: numberMatch ? numberMatch[1].trim() : '',
    issued_at: normalizeLicenseDate(t),
    expires_at: '',
    discipline: /free\s*div/i.test(t) ? 'freediving' : /scuba|open water|divemaster/i.test(t) ? 'scuba' : '',
    max_depth: '',
    instructor_name: '',
    instructor_number: '',
    verification_url: '',
    raw_text: t.slice(0, 4000),
  };
}
async function runLicenseOcr(dataUrl) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OCR_OPENAI_API_KEY;
  if (!apiKey) return { configured: false, result: {} };
  const body = { model: process.env.OCR_OPENAI_MODEL || 'gpt-4o-mini', temperature: 0, response_format: { type: 'json_object' }, messages: [
    { role: 'system', content: 'You extract scuba/freediving certification card data. Return strict JSON only.' },
    { role: 'user', content: [{ type: 'text', text: 'Read this diving license/certification image. Return JSON with keys: holder_name, agency, type, number, discipline (scuba or freediving), issued_at (YYYY-MM-DD), expires_at (YYYY-MM-DD), max_depth (number only, meters), instructor_name, instructor_number, verification_url, raw_text. Carefully read labels such as Name, Diver, Cert Date, Issue Date, Expiry, Instructor and Max Depth. If unsure use an empty string. Never invent values.' }, { type: 'image_url', image_url: { url: dataUrl } }] }
  ] };
  const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`ocr_failed_${r.status}`);
  const j = await r.json();
  const content = j.choices?.[0]?.message?.content || '{}';
  let parsed = {};
  try { parsed = JSON.parse(content); } catch { parsed = fallbackParseLicenseText(content); }
  return {
    configured: true,
    result: {
      ...parsed,
      issued_at: normalizeLicenseDate(parsed.issued_at) || normalizeLicenseDate(parsed.raw_text),
      expires_at: normalizeLicenseDate(parsed.expires_at),
    },
  };
}
app.get('/api/license-image/me', authRateLimit(60, 60_000), async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  try {
    const q = await pool.query('SELECT license_image_path FROM app_profiles WHERE id=$1', [userId]);
    const imagePath = q.rows[0]?.license_image_path;
    if (!imagePath) return res.status(404).json({ error: 'not_found' });
    const safePath = path.resolve(imagePath);
    const safeRoot = path.resolve(LICENSE_UPLOAD_DIR);
    if (!safePath.startsWith(safeRoot)) return res.status(403).json({ error: 'forbidden' });
    res.sendFile(safePath);
  } catch { res.status(500).json({ error: 'license_image_failed' }); }
});
app.get('/api/license-image/:userId', authRateLimit(120, 60_000), async (req, res) => {
  try {
    const q = await pool.query('SELECT license_image_path FROM app_profiles WHERE id=$1', [String(req.params.userId)]);
    const imagePath = q.rows[0]?.license_image_path;
    if (!imagePath) return res.status(404).json({ error: 'not_found' });
    const safePath = path.resolve(imagePath);
    const safeRoot = path.resolve(LICENSE_UPLOAD_DIR);
    if (!safePath.startsWith(`${safeRoot}${path.sep}`)) return res.status(403).json({ error: 'forbidden' });
    return res.sendFile(safePath);
  } catch {
    return res.status(500).json({ error: 'license_image_failed' });
  }
});
app.post('/api/license-image/ocr', authRateLimit(12, 60_000), async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const image = parseDataImage(req.body?.imageData);
  if (!image) return res.status(400).json({ error: 'invalid_image' });
  try {
    await fs.mkdir(LICENSE_UPLOAD_DIR, { recursive: true, mode: 0o700 });
    const imagePath = path.join(LICENSE_UPLOAD_DIR, `${userId}-${Date.now()}-${crypto.randomUUID()}.${image.ext}`);
    await fs.writeFile(imagePath, image.buffer, { mode: 0o600 });
    const old = await pool.query('SELECT license_image_path FROM app_profiles WHERE id=$1', [userId]);
    const configuredBase = String(process.env.PUBLIC_API_BASE_URL || 'https://api.divergram.com').replace(/\/+$/, '');
    const imageUrl = `${configuredBase}/api/license-image/${encodeURIComponent(String(userId))}`;
    await pool.query('UPDATE app_profiles SET license_image_path=$1, license_image_url=$2 WHERE id=$3', [imagePath, imageUrl, userId]);
    const oldPath = old.rows[0]?.license_image_path;
    if (oldPath && oldPath !== imagePath) fs.unlink(oldPath).catch(() => undefined);
    let ocr = { configured: false, result: {} };
    try { ocr = await runLicenseOcr(image.dataUrl); } catch (e) { ocr = { configured: true, result: {}, error: e?.message || 'ocr_failed' }; }
    res.json({ ok: true, has_image: true, image_url: imageUrl, license_image_url: imageUrl, ocr_configured: ocr.configured, ocr_error: ocr.error || null, ocr: ocr.result || {} });
  } catch { res.status(500).json({ error: 'license_upload_failed' }); }
});

async function enqueueMessageCreated(message) {
  const jobId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO app_jobs(id, type, payload, status, attempts, created_at, updated_at)
     VALUES ($1,'message.created',$2::jsonb,'queued',0,now(),now())`,
    [jobId, JSON.stringify({ messageId: message.id, roomId: message.room_id, senderId: message.sender_id })]
  );
  return { queued: true, jobId, messageId: message.id };
}

async function processQueuedJobs(limit = 50) {
  const jobs = await pool.query(
    `SELECT *
     FROM app_jobs
     WHERE status='queued'
       AND COALESCE(NULLIF(payload->>'scheduledAt', '')::timestamptz, created_at) <= now()
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );

  let processed = 0;
  for (const job of jobs.rows) {
    const jobId = String(job.id);
    try {
      await pool.query(`UPDATE app_jobs SET status='processing', attempts=attempts+1, updated_at=now() WHERE id=$1`, [jobId]);

      if (job.type === 'message.created') {
        const messageId = String(job.payload?.messageId || '');
        if (messageId) {
          await pool.query(
            `UPDATE app_message_deliveries SET status='sent', updated_at=now() WHERE message_id=$1 AND status='queued'`,
            [messageId]
          );
        }
      } else if (job.type === 'admin.push.send' || job.type === 'admin.push.retry') {
        await processAdminPushJob(pool, job.payload || {}, { actorUserId: job.payload?.actorUserId || null });
      }

      await pool.query(`UPDATE app_jobs SET status='done', updated_at=now() WHERE id=$1`, [jobId]);
      processed += 1;
    } catch (e) {
      await pool.query(
        `UPDATE app_jobs SET status='failed', last_error=$2, updated_at=now() WHERE id=$1`,
        [jobId, String(e?.message || e)]
      );
    }
  }

  return { processed, queued: jobs.rows.length };
}

app.use((error, _req, res, next) => {
  if (error?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'origin_not_allowed' });
  }
  return next(error);
});


const port = Number(process.env.PORT || process.env.API_PORT || 4000);
ensureSchema().then(async () => {
  await loadApiSettingsIntoEnvironment(pool);
  await ensureDefaultAdminAccounts();
  app.listen(port, () => console.log(`API listening on port ${port}`));
});
