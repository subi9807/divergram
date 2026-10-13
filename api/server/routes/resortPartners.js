import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { decryptSensitiveText, encryptSensitiveText } from '../lib/dataEncryption.js';
import { normalizeInternationalPhone } from '../lib/internationalPhone.js';
import { bookingDateRange, dateOnly, reserveCapacity, setBookingAvailability } from '../lib/bookingCapacity.js';

const DOCUMENT_DIR = process.env.RESORT_PARTNER_DOCUMENT_DIR || '/home/divergram/private/resort-partner-documents';
const REQUIRED_DOCUMENTS = ['business_registration', 'representative_id', 'operation_authority', 'liability_insurance'];
const OPTIONAL_DOCUMENTS = ['safety_plan', 'settlement_account'];
const APPLICATION_STATUSES = new Set(['draft', 'submitted', 'reviewing', 'approved', 'rejected']);
const BOOKING_STATUSES = new Set(['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show']);
const DEPOSIT_STATUSES = new Set(['pending', 'paid', 'waived', 'refund_requested', 'partially_refunded', 'refunded']);
const API_SCOPES = new Set(['availability:read', 'availability:write', 'bookings:read', 'bookings:write']);
const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const hashApiKey = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const bookingNumber = () => `RB-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const normalizePriceItems = (value) => Array.from(new Set((Array.isArray(value) ? value : String(value || '').split('\n')).map((item) => text(item, 200)).filter(Boolean)));
const normalizePrice = (body = {}) => ({
  priceType: text(body.priceType || body.price_type, 60) || 'dive_package',
  title: text(body.title, 160),
  description: text(body.description, 1000),
  durationText: text(body.durationText || body.duration_text, 100),
  unitLabel: text(body.unitLabel || body.unit_label, 80),
  currency: text(body.currency, 8).toUpperCase() || 'USD',
  amount: Math.max(0, Math.min(100000000, Number(body.amount) || 0)),
  includedItems: normalizePriceItems(body.includedItems || body.included_items),
  sortOrder: Math.trunc(Number(body.sortOrder ?? body.sort_order) || 0),
  isActive: body.isActive === undefined && body.is_active === undefined ? true : (body.isActive ?? body.is_active) !== false,
});
const normalizePermissions = (value) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : { bookings: true, availability: true };
  return Object.fromEntries(['bookings', 'availability', 'prices', 'settlements', 'settings', 'api'].map((key) => [key, source[key] === true]));
};

export const REFUND_POLICY = Object.freeze({
  version: '2026-09-USD-v2',
  currency: 'USD',
  rules: [
    { minimumDaysBefore: 14, refundPercent: 100 },
    { minimumDaysBefore: 7, refundPercent: 50 },
    { minimumDaysBefore: 0, refundPercent: 0 },
  ],
  providerCancellationRefundPercent: 100,
  noShowRefundPercent: 0,
  noShowDefinition: 'The guest does not arrive on the booking date without an accepted cancellation.',
  repeatedNoShowReview: true,
  processingBusinessDays: '5-10',
  legalNotice: 'Mandatory consumer rights and applicable local law take precedence.',
});

export function calculateRefund(depositAmount, bookingDate, requestedAt = new Date(), providerCancelled = false) {
  const amount = Math.max(0, Number(depositAmount) || 0);
  if (providerCancelled) return { daysBefore: null, refundPercent: 100, refundAmount: amount };
  const start = new Date(`${dateOnly(bookingDate)}T00:00:00Z`);
  const requested = new Date(requestedAt);
  const requestDay = Date.UTC(requested.getUTCFullYear(), requested.getUTCMonth(), requested.getUTCDate());
  const daysBefore = Math.max(0, Math.ceil((start.getTime() - requestDay) / 86_400_000));
  const rule = REFUND_POLICY.rules.find((item) => daysBefore >= item.minimumDaysBefore) || REFUND_POLICY.rules.at(-1);
  return { daysBefore, refundPercent: rule.refundPercent, refundAmount: Math.round(amount * rule.refundPercent) / 100 };
}

export async function ensureResortPartnerSchema(pool) {
  const migrationUrl = new URL('../../db/migrations/20260904000200_add_resort_partner_operations.sql', import.meta.url);
  const noShowMigrationUrl = new URL('../../db/migrations/20260910000200_add_resort_booking_no_show_policy.sql', import.meta.url);
  await pool.query(await fs.readFile(migrationUrl, 'utf8'));
  await pool.query(await fs.readFile(noShowMigrationUrl, 'utf8'));
  await pool.query(`CREATE TABLE IF NOT EXISTS app_resort_staff_invitations (
    id TEXT PRIMARY KEY,
    resort_id TEXT NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS app_resort_staff_invitations_lookup ON app_resort_staff_invitations(resort_id,email,accepted_at)');
  await pool.query("UPDATE app_profiles SET resort_booking_deposit_currency='USD' WHERE resort_booking_enabled=true");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

function mapApplication(row, documents = []) {
  return {
    id: row.id, applicantUserId: String(row.applicant_user_id), resortId: row.resort_id || null,
    resortName: row.resort_name, legalBusinessName: row.legal_business_name,
    registrationNumber: decryptSensitiveText(row.registration_number), countryCode: row.country_code, address: row.address,
    website: row.website, representativeName: row.representative_name, contactEmail: decryptSensitiveText(row.contact_email),
    contactPhone: decryptSensitiveText(row.contact_phone), status: row.status, termsAccepted: row.terms_accepted,
    adminNote: row.admin_note, submittedAt: row.submitted_at, reviewedAt: row.reviewed_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
    requiredDocuments: REQUIRED_DOCUMENTS, optionalDocuments: OPTIONAL_DOCUMENTS,
    documents: documents.map((doc) => ({ id: doc.id, type: doc.document_type, name: doc.original_name, mimeType: doc.mime_type, size: Number(doc.size_bytes), status: doc.status, reviewNote: doc.review_note, createdAt: doc.created_at })),
  };
}

async function managerResorts(pool, userId) {
  const result = await pool.query(
    `SELECT p.id,p.full_name,p.resort_cover_url,p.resort_country,p.resort_city,p.resort_booking_enabled,
            p.resort_booking_deposit_amount,'USD'::text AS resort_booking_deposit_currency,
            p.resort_booking_timezone,p.resort_booking_default_capacity,p.resort_booking_min_notice_days,
            COALESCE(m.is_primary,p.resort_owner_user_id=$1::bigint) AS is_primary,m.permissions
       FROM app_profiles p
       LEFT JOIN app_resort_managers m ON m.resort_id=p.id AND m.user_id=$1
      WHERE p.resort_owner_user_id=$1 OR m.user_id=$1
      ORDER BY p.full_name`, [String(userId)]);
  return result.rows;
}

async function canManage(pool, userId, resortId, permission = '') {
  const values = [String(userId), resortId];
  const permissionSql = permission ? ` OR (m.user_id=$1 AND COALESCE((m.permissions->$3)::boolean,false)=true)` : '';
  if (permission) values.push(permission);
  const result = await pool.query(`SELECT 1 FROM app_profiles p LEFT JOIN app_resort_managers m ON m.resort_id=p.id AND m.user_id=$1 WHERE p.id=$2 AND (p.resort_owner_user_id=$1 OR m.user_id=$1 AND (m.is_primary=true${permissionSql})) LIMIT 1`, values);
  return result.rows.length > 0;
}

async function canManageStaff(pool, userId, resortId) {
  const result = await pool.query(`SELECT 1 FROM app_profiles p LEFT JOIN app_resort_managers m ON m.resort_id=p.id AND m.user_id=$1 WHERE p.id=$2 AND (p.resort_owner_user_id=$1 OR (m.user_id=$1 AND m.is_primary=true)) LIMIT 1`, [String(userId), resortId]);
  return result.rows.length > 0;
}

function createPartnerAuth(pool, getAuthUserId) {
  return async (req, res, next) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const user = await pool.query(`SELECT u.id,u.email,u.username,u.is_blocked,p.account_type FROM app_users u LEFT JOIN app_profiles p ON p.id=u.id::text WHERE u.id=$1`, [userId]);
    if (!user.rows.length || user.rows[0].is_blocked) return res.status(403).json({ error: 'partner_access_denied' });
    if (String(user.rows[0].account_type || '').toLowerCase() !== 'resort') return res.status(403).json({ error: 'partner_account_type_required' });
    req.partnerUser = user.rows[0];
    return next();
  };
}

function apiKeyAuth(pool, scope) {
  return async (req, res, next) => {
    const raw = text(req.headers['x-resort-api-key'], 240);
    if (!raw) return res.status(401).json({ error: 'resort_api_key_required' });
    const result = await pool.query(`SELECT * FROM app_resort_api_keys WHERE key_hash=$1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())`, [hashApiKey(raw)]);
    const key = result.rows[0];
    if (!key || !Array.isArray(key.scopes) || !key.scopes.includes(scope)) return res.status(403).json({ error: 'resort_api_scope_denied' });
    if (req.params.resortId && req.params.resortId !== key.resort_id) return res.status(403).json({ error: 'resort_api_resort_denied' });
    req.resortApiKey = key;
    pool.query('UPDATE app_resort_api_keys SET last_used_at=now() WHERE id=$1', [key.id]).catch(() => undefined);
    return next();
  };
}

export function registerResortPartnerRoutes(app, { pool, getAuthUserId, authRateLimit, requireAdmin }) {
  const requirePartner = createPartnerAuth(pool, getAuthUserId);

  app.get('/api/resort-partner/me', authRateLimit(60, 60_000), requirePartner, async (req, res) => {
    const resorts = await managerResorts(pool, req.partnerUser.id);
    const applications = await pool.query('SELECT * FROM app_resort_partner_applications WHERE applicant_user_id=$1 ORDER BY created_at DESC', [req.partnerUser.id]);
    const ids = applications.rows.map((row) => row.id);
    const documents = ids.length ? await pool.query('SELECT * FROM app_resort_partner_documents WHERE application_id=ANY($1::text[]) ORDER BY created_at DESC', [ids]) : { rows: [] };
    return res.json({ ok: true, user: { id: String(req.partnerUser.id), email: req.partnerUser.email, username: req.partnerUser.username }, resorts, applications: applications.rows.map((row) => mapApplication(row, documents.rows.filter((doc) => doc.application_id === row.id))), requiredDocuments: REQUIRED_DOCUMENTS, optionalDocuments: OPTIONAL_DOCUMENTS });
  });

  app.post('/api/resort-partner/applications', authRateLimit(15, 60_000), requirePartner, async (req, res) => {
    const body = req.body || {};
    const required = ['resortName', 'legalBusinessName', 'countryCode', 'address', 'representativeName', 'contactEmail', 'contactPhone'];
    if (required.some((key) => !text(body[key], 500))) return res.status(400).json({ error: 'partner_application_required_fields' });
    const existingId = text(body.id, 140);
    const id = existingId || `rpa_${crypto.randomUUID()}`;
    const existing = existingId ? await pool.query('SELECT * FROM app_resort_partner_applications WHERE id=$1 AND applicant_user_id=$2', [id, req.partnerUser.id]) : { rows: [] };
    if (existingId && !existing.rows.length) return res.status(404).json({ error: 'partner_application_not_found' });
    if (existing.rows[0] && !['draft', 'rejected'].includes(existing.rows[0].status)) return res.status(409).json({ error: 'partner_application_locked' });
    const values = [id, req.partnerUser.id, text(body.resortName, 200), text(body.legalBusinessName, 200), encryptSensitiveText(text(body.registrationNumber, 100)), text(body.countryCode, 2).toUpperCase(), text(body.address, 500), text(body.website, 500), text(body.representativeName, 160), encryptSensitiveText(text(body.contactEmail, 200)), encryptSensitiveText(text(body.contactPhone, 80)), body.termsAccepted === true];
    const result = await pool.query(`INSERT INTO app_resort_partner_applications(id,applicant_user_id,resort_name,legal_business_name,registration_number,country_code,address,website,representative_name,contact_email,contact_phone,terms_accepted)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT(id) DO UPDATE SET resort_name=$3,legal_business_name=$4,registration_number=$5,country_code=$6,address=$7,website=$8,representative_name=$9,contact_email=$10,contact_phone=$11,terms_accepted=$12,status='draft',updated_at=now()
      RETURNING *`, values);
    return res.status(existingId ? 200 : 201).json({ ok: true, application: mapApplication(result.rows[0]) });
  });

  app.post('/api/resort-partner/applications/:id/documents', authRateLimit(10, 60_000), requirePartner, upload.single('file'), async (req, res) => {
    const applicationId = text(req.params.id, 140); const documentType = text(req.body?.documentType, 80);
    if (!req.file || ![...REQUIRED_DOCUMENTS, ...OPTIONAL_DOCUMENTS].includes(documentType)) return res.status(400).json({ error: 'invalid_partner_document' });
    const owner = await pool.query("SELECT 1 FROM app_resort_partner_applications WHERE id=$1 AND applicant_user_id=$2 AND status IN ('draft','rejected')", [applicationId, req.partnerUser.id]);
    if (!owner.rows.length) return res.status(403).json({ error: 'partner_document_upload_denied' });
    await fs.mkdir(DOCUMENT_DIR, { recursive: true, mode: 0o700 });
    const ext = req.file.mimetype === 'application/pdf' ? 'pdf' : req.file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const id = `rpd_${crypto.randomUUID()}`; const storagePath = path.join(DOCUMENT_DIR, `${id}.${ext}`);
    await fs.writeFile(storagePath, req.file.buffer, { mode: 0o600 });
    await pool.query(`INSERT INTO app_resort_partner_documents(id,application_id,document_type,original_name,storage_path,mime_type,size_bytes) VALUES($1,$2,$3,$4,$5,$6,$7)`, [id, applicationId, documentType, text(req.file.originalname, 240), storagePath, req.file.mimetype, req.file.size]);
    return res.status(201).json({ ok: true, document: { id, type: documentType, name: req.file.originalname } });
  });

  app.post('/api/resort-partner/applications/:id/submit', authRateLimit(5, 60_000), requirePartner, async (req, res) => {
    const id = text(req.params.id, 140);
    const appRow = await pool.query("SELECT * FROM app_resort_partner_applications WHERE id=$1 AND applicant_user_id=$2 AND status IN ('draft','rejected')", [id, req.partnerUser.id]);
    if (!appRow.rows.length) return res.status(404).json({ error: 'partner_application_not_found' });
    if (!appRow.rows[0].terms_accepted) return res.status(409).json({ error: 'partner_terms_required' });
    const docs = await pool.query('SELECT DISTINCT document_type FROM app_resort_partner_documents WHERE application_id=$1', [id]);
    const missing = REQUIRED_DOCUMENTS.filter((type) => !docs.rows.some((row) => row.document_type === type));
    if (missing.length) return res.status(409).json({ error: 'partner_documents_missing', missing });
    await pool.query("UPDATE app_resort_partner_applications SET status='submitted',submitted_at=now(),updated_at=now() WHERE id=$1", [id]);
    return res.json({ ok: true });
  });

  app.get('/api/resort-partner/documents/:id/download', requirePartner, async (req, res) => {
    const result = await pool.query(`SELECT d.* FROM app_resort_partner_documents d JOIN app_resort_partner_applications a ON a.id=d.application_id WHERE d.id=$1 AND a.applicant_user_id=$2`, [text(req.params.id, 140), req.partnerUser.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'partner_document_not_found' });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.download(result.rows[0].storage_path, result.rows[0].original_name);
  });

  app.patch('/api/resort-partner/resorts/:resortId/settings', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'settings')) return res.status(403).json({ error: 'partner_resort_denied' });
    const amount = Math.max(0, Math.min(100000, Number(req.body?.depositAmount) || 0));
    const capacity = Math.max(0, Math.min(500, Number(req.body?.defaultCapacity) || 20));
    const notice = Math.max(0, Math.min(365, Number(req.body?.minNoticeDays) || 0));
    const timezone = text(req.body?.timezone, 80) || 'UTC';
    await pool.query(`UPDATE app_profiles SET resort_booking_enabled=$2,resort_booking_deposit_amount=$3,resort_booking_deposit_currency='USD',resort_booking_default_capacity=$4,resort_booking_min_notice_days=$5,resort_booking_timezone=$6 WHERE id=$1`, [resortId, req.body?.bookingEnabled === true, amount, capacity, notice, timezone]);
    return res.json({ ok: true });
  });

  app.get('/api/resort-partner/resorts/:resortId/availability', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'availability')) return res.status(403).json({ error: 'partner_resort_denied' });
    const result = await pool.query(`SELECT a.*,COALESCE(b.reserved,0)::int AS reserved FROM app_resort_booking_availability a LEFT JOIN (SELECT day::date booking_date,SUM(participants)::int reserved FROM app_resort_bookings CROSS JOIN LATERAL generate_series(booking_date,COALESCE(booking_end_date,booking_date),'1 day') day WHERE resort_id=$1 AND status IN ('pending','confirmed') GROUP BY day)b USING(booking_date) WHERE a.resort_id=$1 AND a.booking_date>=CURRENT_DATE ORDER BY a.booking_date LIMIT 180`, [resortId]);
    return res.json({ ok: true, availability: result.rows });
  });

  app.put('/api/resort-partner/resorts/:resortId/availability/:date', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140); const date = text(req.params.date, 10);
    if (!validDate(date)) return res.status(400).json({ error: 'invalid_booking_date' });
    if (!await canManage(pool, req.partnerUser.id, resortId, 'availability')) return res.status(403).json({ error: 'partner_resort_denied' });
    const capacity = Math.max(0, Math.min(500, Number(req.body?.capacity) || 0));
    try {
      const availability = await setBookingAvailability(pool, resortId, date, capacity, req.body?.isOpen !== false, text(req.body?.note, 500), req.partnerUser.id);
      return res.json({ ok: true, availability });
    } catch (error) { return res.status(error.status || 400).json({ error: error.status ? error.message : 'invalid_booking_availability' }); }
  });

  app.get('/api/resort-partner/resorts/:resortId/prices', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'prices')) return res.status(403).json({ error: 'partner_resort_denied' });
    const result = await pool.query(`SELECT id,resort_id,price_type,title,description,duration_text,unit_label,image_url,currency,amount,included_items,sort_order,is_active,created_at,updated_at FROM app_resort_prices WHERE resort_id=$1 ORDER BY sort_order ASC,amount ASC,created_at DESC`, [resortId]);
    return res.json({ ok: true, prices: result.rows });
  });

  app.post('/api/resort-partner/resorts/:resortId/prices', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140); const payload = normalizePrice(req.body);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'prices')) return res.status(403).json({ error: 'partner_resort_denied' });
    if (!payload.title) return res.status(400).json({ error: 'price_title_required' });
    const id = text(req.body?.id, 140) || `price_${crypto.randomUUID()}`;
    const result = await pool.query(`INSERT INTO app_resort_prices(id,resort_id,price_type,title,description,duration_text,unit_label,currency,amount,included_items,sort_order,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12) ON CONFLICT(id) DO UPDATE SET price_type=EXCLUDED.price_type,title=EXCLUDED.title,description=EXCLUDED.description,duration_text=EXCLUDED.duration_text,unit_label=EXCLUDED.unit_label,currency=EXCLUDED.currency,amount=EXCLUDED.amount,included_items=EXCLUDED.included_items,sort_order=EXCLUDED.sort_order,is_active=EXCLUDED.is_active,updated_at=now() WHERE app_resort_prices.resort_id=$2 RETURNING *`, [id, resortId, payload.priceType, payload.title, payload.description, payload.durationText, payload.unitLabel, payload.currency, payload.amount, JSON.stringify(payload.includedItems), payload.sortOrder, payload.isActive]);
    if (!result.rows.length) return res.status(409).json({ error: 'price_resort_mismatch' });
    return res.status(201).json({ ok: true, price: result.rows[0] });
  });

  app.delete('/api/resort-partner/resorts/:resortId/prices/:id', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'prices')) return res.status(403).json({ error: 'partner_resort_denied' });
    const result = await pool.query('DELETE FROM app_resort_prices WHERE id=$1 AND resort_id=$2 RETURNING id', [text(req.params.id, 140), resortId]);
    if (!result.rows.length) return res.status(404).json({ error: 'price_not_found' });
    return res.json({ ok: true });
  });

  app.get('/api/resort-partner/resorts/:resortId/settlements', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'settlements')) return res.status(403).json({ error: 'partner_resort_denied' });
    const rows = await pool.query(`SELECT i.id,i.booking_id,i.provider,i.status,i.amount,i.currency,i.gross_amount,i.fee_amount,i.net_amount,i.refunded_amount,i.created_at,i.processed_at,b.booking_number,b.booking_date,b.applicant_name FROM app_resort_payment_intents i JOIN app_resort_bookings b ON b.id=i.booking_id WHERE b.resort_id=$1 ORDER BY i.created_at DESC LIMIT 300`, [resortId]);
    const summary = await pool.query(`SELECT COUNT(*)::int AS transaction_count,COUNT(*) FILTER (WHERE i.status='succeeded')::int AS succeeded_count,COUNT(*) FILTER (WHERE i.status IN ('pending','processing'))::int AS pending_count,COALESCE(SUM(CASE WHEN i.status IN ('succeeded','refunded') THEN COALESCE(NULLIF(i.gross_amount,0),i.amount) ELSE 0 END),0)::numeric AS gross_sales,COALESCE(SUM(CASE WHEN i.status='refunded' THEN COALESCE(NULLIF(i.refunded_amount,0),i.amount) ELSE i.refunded_amount END),0)::numeric AS refunds,COALESCE(SUM(CASE WHEN i.status IN ('succeeded','refunded') THEN i.fee_amount ELSE 0 END),0)::numeric AS fees FROM app_resort_payment_intents i JOIN app_resort_bookings b ON b.id=i.booking_id WHERE b.resort_id=$1`, [resortId]);
    const s = summary.rows[0] || {};
    const grossSales = Number(s.gross_sales || 0); const refunds = Number(s.refunds || 0); const fees = Number(s.fees || 0);
    return res.json({ ok: true, payments: rows.rows.map((row) => ({ id: row.id, bookingId: row.booking_id, bookingNumber: row.booking_number, bookingDate: row.booking_date, applicantName: row.applicant_name, provider: row.provider, status: row.status, amount: Number(row.amount || 0), currency: row.currency, grossAmount: Number(row.gross_amount || row.amount || 0), feeAmount: Number(row.fee_amount || 0), netAmount: Number(row.net_amount || row.amount || 0), refundedAmount: Number(row.refunded_amount || 0), createdAt: row.created_at, processedAt: row.processed_at })), summary: { transactionCount: Number(s.transaction_count || 0), succeededCount: Number(s.succeeded_count || 0), pendingCount: Number(s.pending_count || 0), grossSales, refunds, fees, netSales: grossSales - refunds - fees, currency: 'USD' } });
  });

  app.get('/api/resort-partner/resorts/:resortId/managers', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'staff')) return res.status(403).json({ error: 'partner_resort_denied' });
    const result = await pool.query(`SELECT m.id,m.resort_id,m.user_id::text AS user_id,m.is_primary,m.permissions,m.created_at,u.email,u.username,COALESCE(NULLIF(p.full_name,''),u.username,u.email) AS display_name FROM app_resort_managers m JOIN app_users u ON u.id=m.user_id LEFT JOIN app_profiles p ON p.id=u.id::text WHERE m.resort_id=$1 ORDER BY m.is_primary DESC,m.created_at ASC`, [resortId]);
    const invitations = await pool.query(`SELECT id,email,permissions,expires_at,created_at FROM app_resort_staff_invitations WHERE resort_id=$1 AND accepted_at IS NULL AND expires_at>now() ORDER BY created_at DESC`, [resortId]);
    return res.json({ ok: true, managers: result.rows, invitations: invitations.rows });
  });

  app.post('/api/resort-partner/resorts/:resortId/managers', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140); const email = text(req.body?.email, 200).toLowerCase();
    if (!await canManageStaff(pool, req.partnerUser.id, resortId)) return res.status(403).json({ error: 'partner_staff_admin_denied' });
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'staff_email_required' });
    const user = await pool.query(`SELECT u.id FROM app_users u JOIN app_profiles p ON p.id=u.id::text WHERE lower(u.email)=lower($1) AND lower(p.account_type)='resort' LIMIT 1`, [email]);
    const permissions = normalizePermissions(req.body?.permissions);
    if (!user.rows.length) {
      const rawToken = crypto.randomBytes(32).toString('base64url');
      const invitationId = `rsi_${crypto.randomUUID()}`;
      await pool.query(`INSERT INTO app_resort_staff_invitations(id,resort_id,email,invited_by,permissions,token_hash,expires_at) VALUES($1,$2,$3,$4,$5::jsonb,$6,now()+interval '7 days')`, [invitationId, resortId, email, req.partnerUser.id, JSON.stringify(permissions), hashApiKey(rawToken)]);
      return res.status(201).json({ ok: true, invitation: { id: invitationId, email, expiresInDays: 7, token: rawToken, note: '초대 링크에 한 번만 사용하세요.' } });
    }
    const result = await pool.query(`INSERT INTO app_resort_managers(resort_id,user_id,is_primary,permissions) VALUES($1,$2,false,$3::jsonb) ON CONFLICT(resort_id,user_id) DO UPDATE SET permissions=EXCLUDED.permissions,updated_at=now() RETURNING *`, [resortId, user.rows[0].id, JSON.stringify(permissions)]);
    return res.status(201).json({ ok: true, manager: result.rows[0] });
  });

  app.post('/api/resort-partner/invitations/:token/accept', requirePartner, async (req, res) => {
    const tokenHash = hashApiKey(text(req.params.token, 240));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query(`SELECT * FROM app_resort_staff_invitations WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at>now() FOR UPDATE`, [tokenHash]);
      if (!found.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'staff_invitation_invalid_or_expired' }); }
      const invitation = found.rows[0];
      if (String(invitation.email).toLowerCase() !== String(req.partnerUser.email || '').toLowerCase()) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'staff_invitation_email_mismatch' }); }
      await client.query(`INSERT INTO app_resort_managers(resort_id,user_id,is_primary,permissions) VALUES($1,$2,false,$3::jsonb) ON CONFLICT(resort_id,user_id) DO UPDATE SET permissions=EXCLUDED.permissions,updated_at=now()`, [invitation.resort_id, req.partnerUser.id, JSON.stringify(invitation.permissions || {})]);
      await client.query('UPDATE app_resort_staff_invitations SET accepted_at=now() WHERE id=$1', [invitation.id]);
      await client.query('COMMIT');
      return res.json({ ok: true, resortId: invitation.resort_id });
    } catch (error) { await client.query('ROLLBACK'); return res.status(500).json({ error: 'staff_invitation_accept_failed' }); }
    finally { client.release(); }
  });

  app.delete('/api/resort-partner/resorts/:resortId/managers/:userId', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140);
    if (!await canManageStaff(pool, req.partnerUser.id, resortId)) return res.status(403).json({ error: 'partner_staff_admin_denied' });
    const result = await pool.query('DELETE FROM app_resort_managers WHERE resort_id=$1 AND user_id=$2 AND is_primary=false RETURNING user_id', [resortId, text(req.params.userId, 140)]);
    if (!result.rows.length) return res.status(404).json({ error: 'staff_member_not_found' });
    return res.json({ ok: true });
  });

  app.get('/api/resort-partner/resorts/:resortId/bookings', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'bookings')) return res.status(403).json({ error: 'partner_resort_denied' });
    const result = await pool.query(`SELECT b.*,to_char(b.booking_date,'YYYY-MM-DD') booking_date,to_char(b.booking_end_date,'YYYY-MM-DD') booking_end_date FROM app_resort_bookings b WHERE b.resort_id=$1 ORDER BY b.booking_date DESC,b.created_at DESC LIMIT 500`, [resortId]);
    return res.json({ ok: true, bookings: result.rows });
  });

  app.patch('/api/resort-partner/resorts/:resortId/bookings/:id', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140); const status = text(req.body?.status, 30); const depositStatus = text(req.body?.depositStatus, 30);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'bookings')) return res.status(403).json({ error: 'partner_resort_denied' });
    if (!BOOKING_STATUSES.has(status) || !DEPOSIT_STATUSES.has(depositStatus)) return res.status(400).json({ error: 'invalid_booking_update' });
    if (status === 'no_show' && !['paid', 'waived'].includes(depositStatus)) return res.status(409).json({ error: 'no_show_deposit_not_refundable' });
    const result = await pool.query(`UPDATE app_resort_bookings SET status=$3,deposit_status=$4,admin_note=$5,payment_reference=$6,confirmed_at=CASE WHEN $3='confirmed' THEN COALESCE(confirmed_at,now()) ELSE confirmed_at END,no_show_at=CASE WHEN $3='no_show' THEN COALESCE(no_show_at,now()) ELSE no_show_at END,updated_at=now() WHERE id=$1 AND resort_id=$2 AND ($3 NOT IN ('pending','confirmed') OR status IN ('pending','confirmed')) AND ($3<>'no_show' OR (status='confirmed' AND booking_date<=CURRENT_DATE)) RETURNING *`, [text(req.params.id, 140), resortId, status, depositStatus, text(req.body?.adminNote, 2000), text(req.body?.paymentReference, 200)]);
    if (!result.rows.length) return res.status(409).json({ error: status === 'no_show' ? 'no_show_transition_not_allowed' : 'resort_booking_missing_or_reopen_requires_new_booking' });
    return res.json({ ok: true, booking: result.rows[0] });
  });

  app.get('/api/resort-partner/resorts/:resortId/api-keys', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'api')) return res.status(403).json({ error: 'partner_resort_denied' });
    const result = await pool.query('SELECT id,label,key_prefix,scopes,last_used_at,expires_at,revoked_at,created_at FROM app_resort_api_keys WHERE resort_id=$1 ORDER BY created_at DESC', [resortId]);
    return res.json({ ok: true, apiKeys: result.rows });
  });

  app.post('/api/resort-partner/resorts/:resortId/api-keys', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'api')) return res.status(403).json({ error: 'partner_resort_denied' });
    const scopes = Array.from(new Set((Array.isArray(req.body?.scopes) ? req.body.scopes : []).filter((scope) => API_SCOPES.has(scope))));
    if (!scopes.length) return res.status(400).json({ error: 'resort_api_scope_required' });
    const rawKey = `dg_live_${crypto.randomBytes(24).toString('base64url')}`; const id = `rak_${crypto.randomUUID()}`;
    await pool.query(`INSERT INTO app_resort_api_keys(id,resort_id,label,key_prefix,key_hash,scopes,created_by) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)`, [id, resortId, text(req.body?.label, 120) || 'Integration key', rawKey.slice(0, 15), hashApiKey(rawKey), JSON.stringify(scopes), req.partnerUser.id]);
    return res.status(201).json({ ok: true, apiKey: { id, key: rawKey, prefix: rawKey.slice(0, 15), scopes }, warning: 'This key is shown only once.' });
  });

  app.delete('/api/resort-partner/resorts/:resortId/api-keys/:id', requirePartner, async (req, res) => {
    const resortId = text(req.params.resortId, 140);
    if (!await canManage(pool, req.partnerUser.id, resortId, 'api')) return res.status(403).json({ error: 'partner_resort_denied' });
    await pool.query('UPDATE app_resort_api_keys SET revoked_at=now() WHERE id=$1 AND resort_id=$2', [text(req.params.id, 140), resortId]);
    return res.json({ ok: true });
  });

  app.get('/api/admin/resort-partner-applications', requireAdmin, async (_req, res) => {
    const applications = await pool.query(`SELECT a.*,u.email AS applicant_email,p.full_name AS linked_resort_name FROM app_resort_partner_applications a JOIN app_users u ON u.id=a.applicant_user_id LEFT JOIN app_profiles p ON p.id=a.resort_id ORDER BY a.created_at DESC LIMIT 500`);
    const docs = applications.rows.length ? await pool.query('SELECT * FROM app_resort_partner_documents WHERE application_id=ANY($1::text[]) ORDER BY created_at DESC', [applications.rows.map((row) => row.id)]) : { rows: [] };
    return res.json({ ok: true, applications: applications.rows.map((row) => ({ ...mapApplication(row, docs.rows.filter((doc) => doc.application_id === row.id)), applicantEmail: row.applicant_email, linkedResortName: row.linked_resort_name })) });
  });

  app.patch('/api/admin/resort-partner-applications/:id', requireAdmin, async (req, res) => {
    const id = text(req.params.id, 140); const status = text(req.body?.status, 30); const resortId = text(req.body?.resortId, 140) || null;
    if (!APPLICATION_STATUSES.has(status) || status === 'draft') return res.status(400).json({ error: 'invalid_partner_application_status' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query('SELECT * FROM app_resort_partner_applications WHERE id=$1 FOR UPDATE', [id]);
      if (!current.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'partner_application_not_found' }); }
      if (status === 'approved' && !resortId) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'partner_resort_link_required' }); }
      await client.query(`UPDATE app_resort_partner_applications SET status=$2,resort_id=$3,admin_note=$4,reviewed_at=now(),reviewed_by=$5,updated_at=now() WHERE id=$1`, [id, status, resortId, text(req.body?.adminNote, 2000), req.adminAuth?.userId || null]);
      if (status === 'approved') {
        await client.query('UPDATE app_resort_managers SET is_primary=false,updated_at=now() WHERE resort_id=$1', [resortId]);
        await client.query(`INSERT INTO app_resort_managers(resort_id,user_id,is_primary,permissions) VALUES($1,$2,true,$3::jsonb) ON CONFLICT(resort_id,user_id) DO UPDATE SET is_primary=true,permissions=EXCLUDED.permissions,updated_at=now()`, [resortId, current.rows[0].applicant_user_id, JSON.stringify({ bookings: true, availability: true, prices: true, settlements: true, settings: true, api: true, staff: true })]);
        await client.query('UPDATE app_profiles SET resort_owner_user_id=$1,resort_owner_verified_at=now() WHERE id=$2', [current.rows[0].applicant_user_id, resortId]);
      }
      await client.query('COMMIT'); return res.json({ ok: true });
    } catch (error) { await client.query('ROLLBACK'); return res.status(500).json({ error: 'partner_application_review_failed', detail: String(error?.message || error) }); }
    finally { client.release(); }
  });

  app.get('/api/admin/resort-partner-documents/:id/download', requireAdmin, async (req, res) => {
    const result = await pool.query('SELECT * FROM app_resort_partner_documents WHERE id=$1', [text(req.params.id, 140)]);
    if (!result.rows.length) return res.status(404).json({ error: 'partner_document_not_found' });
    res.setHeader('Cache-Control', 'private, no-store'); return res.download(result.rows[0].storage_path, result.rows[0].original_name);
  });

  app.get('/api/v1/resorts/:resortId/availability', apiKeyAuth(pool, 'availability:read'), async (req, res) => {
    const result = await pool.query(`SELECT to_char(booking_date,'YYYY-MM-DD') date,capacity,is_open,note FROM app_resort_booking_availability WHERE resort_id=$1 AND booking_date>=CURRENT_DATE ORDER BY booking_date LIMIT 366`, [req.params.resortId]);
    return res.json({ data: result.rows });
  });

  app.put('/api/v1/resorts/:resortId/availability/:date', apiKeyAuth(pool, 'availability:write'), async (req, res) => {
    if (!validDate(req.params.date)) return res.status(400).json({ error: 'invalid_booking_date' });
    const capacity = Math.max(0, Math.min(500, Number(req.body?.capacity) || 0));
    try {
      const data = await setBookingAvailability(pool, req.params.resortId, req.params.date, capacity, req.body?.isOpen !== false, text(req.body?.note, 500));
      return res.json({ data });
    } catch (error) { return res.status(error.status || 400).json({ error: error.status ? error.message : 'invalid_booking_availability' }); }
  });

  app.get('/api/v1/resorts/:resortId/bookings', apiKeyAuth(pool, 'bookings:read'), async (req, res) => {
    const result = await pool.query(`SELECT id,booking_number,external_reference,to_char(booking_date,'YYYY-MM-DD') booking_date,to_char(booking_end_date,'YYYY-MM-DD') booking_end_date,participants,dive_type,applicant_name,contact_phone,contact_email,note,status,deposit_amount,deposit_currency,deposit_status,created_at,updated_at FROM app_resort_bookings WHERE resort_id=$1 ORDER BY booking_date DESC LIMIT 500`, [req.params.resortId]);
    return res.json({ data: result.rows });
  });

  app.post('/api/v1/resorts/:resortId/bookings', apiKeyAuth(pool, 'bookings:write'), async (req, res) => {
    const resortId = req.params.resortId; const body = req.body || {}; const date = text(body.bookingDate, 10); const endDate = text(body.bookingEndDate, 10) || date;
    const participants = Number(body.participants || 1); const externalReference = text(body.externalReference, 160);
    const contactPhone = normalizeInternationalPhone(text(body.contactPhone, 80));
    if (!contactPhone) return res.status(400).json({ error: 'invalid_resort_booking_phone' });
    try { bookingDateRange(date, endDate); } catch { return res.status(400).json({ error: 'invalid_resort_booking_date_range' }); }
    if (!validDate(date) || !validDate(endDate) || !Number.isInteger(participants) || participants < 1 || participants > 50 || !text(body.applicantName, 120)) return res.status(400).json({ error: 'invalid_resort_booking' });
    const client = await pool.connect();
    try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM app_profiles WHERE id=$1 FOR UPDATE', [resortId]);
    if (externalReference) {
      const duplicate = await client.query('SELECT * FROM app_resort_bookings WHERE resort_id=$1 AND external_reference=$2', [resortId, externalReference]);
      if (duplicate.rows.length) { await client.query('COMMIT'); return res.json({ data: duplicate.rows[0], idempotent: true }); }
    }
    const resort = await reserveCapacity(client, resortId, date, participants, endDate);
    const amount = Math.max(0, Number(resort.resort_booking_deposit_amount) || 0);
    const result = await client.query(`INSERT INTO app_resort_bookings(id,booking_number,resort_id,user_id,booking_date,booking_end_date,participants,dive_type,applicant_name,contact_phone,contact_email,note,deposit_amount,deposit_currency,deposit_status,booking_terms_accepted,booking_policy_accepted_at,source,external_reference,refund_policy_version,refund_policy_snapshot)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'USD',$14,true,now(),'external_api',$15,$16,$17::jsonb) RETURNING *`, [`rb_${crypto.randomUUID()}`, bookingNumber(), resortId, String(req.resortApiKey.created_by), date, endDate, participants, text(body.diveType, 60) || 'fun_diving', text(body.applicantName, 120), contactPhone, text(body.contactEmail, 200), text(body.note, 2000), amount, amount > 0 ? 'pending' : 'waived', externalReference || null, REFUND_POLICY.version, JSON.stringify(REFUND_POLICY)]);
    await client.query('COMMIT');
    return res.status(201).json({ data: result.rows[0] });
    } catch (error) { await client.query('ROLLBACK'); return res.status(error.status || 400).json({ error: error.status ? error.message : 'invalid_resort_booking' }); }
    finally { client.release(); }
  });

  app.patch('/api/v1/resorts/:resortId/bookings/:id', apiKeyAuth(pool, 'bookings:write'), async (req, res) => {
    const status = text(req.body?.status, 30); const depositStatus = text(req.body?.depositStatus, 30);
    if (!BOOKING_STATUSES.has(status) || !DEPOSIT_STATUSES.has(depositStatus)) return res.status(400).json({ error: 'invalid_booking_update' });
    if (status === 'no_show' && !['paid', 'waived'].includes(depositStatus)) return res.status(409).json({ error: 'no_show_deposit_not_refundable' });
    const result = await pool.query(`UPDATE app_resort_bookings SET status=$3,deposit_status=$4,admin_note=$5,payment_reference=$6,no_show_at=CASE WHEN $3='no_show' THEN COALESCE(no_show_at,now()) ELSE no_show_at END,updated_at=now() WHERE id=$1 AND resort_id=$2 AND ($3 NOT IN ('pending','confirmed') OR status IN ('pending','confirmed')) AND ($3<>'no_show' OR (status='confirmed' AND booking_date<=CURRENT_DATE)) RETURNING *`, [text(req.params.id, 140), req.params.resortId, status, depositStatus, text(req.body?.adminNote, 2000), text(req.body?.paymentReference, 200)]);
    if (!result.rows.length) return res.status(409).json({ error: status === 'no_show' ? 'no_show_transition_not_allowed' : 'resort_booking_missing_or_reopen_requires_new_booking' });
    return res.json({ data: result.rows[0] });
  });

  app.get('/api/v1/resort-partner/openapi.json', (_req, res) => res.json({
    openapi: '3.1.0', info: { title: 'Divergram Resort Partner API', version: '1.0.0' },
    servers: [{ url: 'https://api.divergram.com' }],
    components: { securitySchemes: { ResortApiKey: { type: 'apiKey', in: 'header', name: 'x-resort-api-key' } } },
    security: [{ ResortApiKey: [] }],
    paths: {
      '/api/v1/resorts/{resortId}/availability': { get: { summary: 'List resort availability' } },
      '/api/v1/resorts/{resortId}/availability/{date}': { put: { summary: 'Create or update availability' } },
      '/api/v1/resorts/{resortId}/bookings': {
        get: { summary: 'List resort bookings' },
        post: {
          summary: 'Create an idempotent external booking',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['bookingDate', 'applicantName', 'contactPhone'],
                  properties: {
                    bookingDate: { type: 'string', format: 'date' },
                    bookingEndDate: { type: 'string', format: 'date', description: 'Inclusive end date, maximum 31 days including the start date.' },
                    applicantName: { type: 'string' },
                    contactPhone: { type: 'string', pattern: '^\\+[1-9][0-9]{7,14}$', example: '+821012345678' },
                    contactEmail: { type: 'string', format: 'email' },
                    participants: { type: 'integer', minimum: 1, maximum: 50 },
                    externalReference: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/resorts/{resortId}/bookings/{bookingId}': { patch: { summary: 'Update booking status' } },
    },
  }));
}
