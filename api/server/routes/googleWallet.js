import crypto from 'crypto';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { normalizeLicenses } from './divingLicenses.js';

function text(value, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

function walletConfig() {
  const issuerId = text(process.env.GOOGLE_WALLET_ISSUER_ID, 80);
  const inlineJson = String(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON || '').trim();
  const keyPath = text(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PATH, 1000);
  let credentials = null;
  try {
    const raw = inlineJson || (keyPath ? fs.readFileSync(keyPath, 'utf8') : '');
    credentials = raw ? JSON.parse(raw) : null;
  } catch {
    credentials = null;
  }
  return { issuerId, credentials };
}

export function getGoogleWalletReadiness() {
  const { issuerId, credentials } = walletConfig();
  const missing = [];
  if (!issuerId) missing.push('GOOGLE_WALLET_ISSUER_ID');
  if (!credentials?.client_email || !credentials?.private_key) missing.push('GOOGLE_WALLET_SERVICE_ACCOUNT');
  return { ready: missing.length === 0, missing };
}

function normalizeLicense(row, userId) {
  const source = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
  const id = text(source.id, 120);
  if (!id) return null;
  return {
    id,
    userId: String(userId),
    memberNumber: text(source.memberNumber ?? source.member_number, 40),
    licenseNumber: text(source.licenseNumber ?? source.license_number, 120),
    holderName: text(source.holderName ?? source.holder_name, 160),
    discipline: source.discipline === 'freediving' ? 'freediving' : 'scuba',
    certificationLevel: text(source.certificationLevel ?? source.certification_level, 160),
    issueDate: text(source.issueDate ?? source.issue_date, 40),
    expirationDate: text(source.expirationDate ?? source.expiration_date, 40),
    trainingAgency: text(source.trainingAgency ?? source.training_agency, 160),
    verificationUrl: text(source.verificationUrl ?? source.verification_url, 1000),
    status: text(source.status, 40) || 'draft',
  };
}

async function findLicense(pool, userId, licenseId) {
  const result = await pool.query("SELECT data FROM app_records WHERE table_name='diving_licenses' AND record_id=$1 LIMIT 1", [String(userId)]);
  const items = normalizeLicenses(result.rows[0]?.data?.items, userId);
  const found = items.find((item) => text(item?.id, 120) === licenseId);
  return found ? normalizeLicense(found, userId) : null;
}

function safeSuffix(value) {
  return text(value, 120).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function localized(value) {
  return { defaultValue: { language: 'en-US', value } };
}

function createSaveUrl(license, checkinCredential) {
  const { issuerId, credentials } = walletConfig();
  const digest = crypto.createHash('sha256').update(`${license.userId}:${license.id}`).digest('hex').slice(0, 24);
  const classId = `${issuerId}.divergram_diving_license`;
  const objectId = `${issuerId}.license_${safeSuffix(digest)}`;
  const verificationUrl = `https://api.divergram.com/api/diving-licenses/verify/${encodeURIComponent(license.licenseNumber)}`;
  const checkinUrl = `https://divergram.com/check-in?credential=${encodeURIComponent(checkinCredential)}`;
  const genericClass = { id: classId };
  const genericObject = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    cardTitle: localized('Divergram'),
    header: localized(license.certificationLevel || 'Diving License'),
    subheader: localized(license.holderName || 'Divergram Member'),
    hexBackgroundColor: '#0D5FA8',
    barcode: {
      type: 'QR_CODE',
      value: checkinUrl,
      alternateText: license.memberNumber || license.licenseNumber,
    },
    textModulesData: [
      { id: 'member', header: 'MEMBER NO.', body: license.memberNumber || '-' },
      { id: 'license', header: 'LICENSE NO.', body: license.licenseNumber || '-' },
      { id: 'agency', header: 'AGENCY', body: license.trainingAgency || '-' },
      { id: 'discipline', header: 'DISCIPLINE', body: license.discipline === 'freediving' ? 'FREEDIVING' : 'SCUBA' },
      { id: 'issued', header: 'ISSUED', body: license.issueDate || '-' },
      { id: 'expires', header: 'EXPIRES', body: license.expirationDate || 'NO EXPIRATION' },
    ],
    linksModuleData: { uris: [{ id: 'verify', uri: verificationUrl, description: 'Verify License' }] },
  };
  const token = jwt.sign(
    {
      iss: credentials.client_email,
      aud: 'google',
      typ: 'savetowallet',
      origins: [],
      payload: { genericClasses: [genericClass], genericObjects: [genericObject] },
    },
    credentials.private_key,
    { algorithm: 'RS256' }
  );
  return `https://pay.google.com/gp/v/save/${token}`;
}

export function registerGoogleWalletRoutes(app, { pool, getAuthUserId, authRateLimit, jwt: appJwt, jwtSecret }) {
  app.get('/api/wallet/google-pass/status', authRateLimit(30, 60_000), (req, res) => {
    if (!getAuthUserId(req)) return res.status(401).json({ error: 'unauthorized' });
    const readiness = getGoogleWalletReadiness();
    return res.json({ ok: true, ready: readiness.ready });
  });

  app.post('/api/wallet/google-pass', authRateLimit(12, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const licenseId = text(req.body?.licenseId, 120);
    if (!licenseId) return res.status(400).json({ error: 'license_id_required' });
    const readiness = getGoogleWalletReadiness();
    if (!readiness.ready) {
      return res.status(503).json({
        error: 'google_wallet_not_configured',
        message: 'Google Wallet issuer setup is required before adding this pass.',
      });
    }
    try {
      const license = await findLicense(pool, userId, licenseId);
      if (!license) return res.status(404).json({ error: 'license_not_found' });
      if (license.status !== 'active') {
        return res.status(409).json({ error: 'license_not_active', message: 'Only active licenses can be added to Wallet.' });
      }
      const checkinCredential = appJwt.sign(
        { scope: 'resort_checkin_credential', memberNumber: license.memberNumber, licenseId: license.id },
        jwtSecret,
        { subject: String(userId), issuer: 'divergram' }
      );
      return res.json({
        ok: true,
        ready: true,
        message: 'Google Wallet pass is ready.',
        passUrl: createSaveUrl(license, checkinCredential),
      });
    } catch (error) {
      console.error('google_wallet_pass_failed', error?.message || error);
      return res.status(500).json({ error: 'google_wallet_pass_failed' });
    }
  });
}
