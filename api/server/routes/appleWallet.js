import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PKPass } from 'passkit-generator';
import { normalizeLicenses } from './divingLicenses.js';

const routeDir = path.dirname(fileURLToPath(import.meta.url));
const walletAssetDir = path.resolve(routeDir, '../assets/apple-wallet');

function text(value, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

function walletConfig() {
  return {
    passTypeIdentifier: text(process.env.APPLE_WALLET_PASS_TYPE_ID, 200),
    teamIdentifier: text(process.env.APPLE_WALLET_TEAM_ID, 100),
    wwdrPath: text(process.env.APPLE_WALLET_WWDR_CERT_PATH, 1000),
    signerCertPath: text(process.env.APPLE_WALLET_SIGNER_CERT_PATH, 1000),
    signerKeyPath: text(process.env.APPLE_WALLET_SIGNER_KEY_PATH, 1000),
    signerKeyPassphrase: String(process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE || ''),
  };
}

export function getAppleWalletReadiness() {
  const config = walletConfig();
  const missing = [];
  if (!config.passTypeIdentifier) missing.push('APPLE_WALLET_PASS_TYPE_ID');
  if (!config.teamIdentifier) missing.push('APPLE_WALLET_TEAM_ID');
  if (!config.wwdrPath) missing.push('APPLE_WALLET_WWDR_CERT_PATH');
  if (!config.signerCertPath) missing.push('APPLE_WALLET_SIGNER_CERT_PATH');
  if (!config.signerKeyPath) missing.push('APPLE_WALLET_SIGNER_KEY_PATH');
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
    discipline: ['scuba', 'freediving'].includes(source.discipline) ? source.discipline : 'scuba',
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
  if (result.rows[0] && JSON.stringify(result.rows[0].data?.items || []) !== JSON.stringify(items)) {
    await pool.query(
      "UPDATE app_records SET data=$1::jsonb,updated_at=now() WHERE table_name='diving_licenses' AND record_id=$2",
      [JSON.stringify({ items }), String(userId)]
    );
  }
  const found = items.find((item) => text(item?.id, 120) === licenseId);
  return found ? normalizeLicense(found, userId) : null;
}

async function loadCertificates(config) {
  const [wwdr, signerCert, signerKey] = await Promise.all([
    fs.readFile(path.resolve(config.wwdrPath)),
    fs.readFile(path.resolve(config.signerCertPath)),
    fs.readFile(path.resolve(config.signerKeyPath)),
  ]);
  return { wwdr, signerCert, signerKey, signerKeyPassphrase: config.signerKeyPassphrase || undefined };
}

async function loadPassAssets() {
  const names = ['icon.png', 'icon@2x.png', 'icon@3x.png', 'logo.png', 'logo@2x.png'];
  const entries = await Promise.all(names.map(async (name) => [name, await fs.readFile(path.join(walletAssetDir, name))]));
  return Object.fromEntries(entries);
}

async function buildLicensePass(license, checkinCredential) {
  const config = walletConfig();
  const certificates = await loadCertificates(config);
  const verificationUrl = `https://api.divergram.com/api/diving-licenses/verify/${encodeURIComponent(license.licenseNumber)}`;
  const checkinUrl = `https://divergram.com/check-in?credential=${encodeURIComponent(checkinCredential)}`;
  const serialNumber = crypto.createHash('sha256').update(`${license.userId}:${license.id}`).digest('hex').slice(0, 32);
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeIdentifier,
    teamIdentifier: config.teamIdentifier,
    organizationName: 'METAbyTREE',
    description: 'Divergram Diving License',
    serialNumber,
    logoText: 'Divergram',
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(13, 95, 168)',
    labelColor: 'rgb(191, 219, 254)',
    generic: {
      primaryFields: [{ key: 'level', label: 'CERTIFICATION', value: license.certificationLevel || 'DIVING LICENSE' }],
      secondaryFields: [
        { key: 'holder', label: 'DIVER', value: license.holderName },
        { key: 'agency', label: 'AGENCY', value: license.trainingAgency || '-' },
      ],
      auxiliaryFields: [
        { key: 'number', label: 'LICENSE NO.', value: license.licenseNumber },
        { key: 'discipline', label: 'DISCIPLINE', value: license.discipline === 'freediving' ? 'FREEDIVING' : 'SCUBA' },
        { key: 'member', label: 'MEMBER NO.', value: license.memberNumber || '-' },
      ],
      backFields: [
        { key: 'issued', label: 'ISSUED', value: license.issueDate || '-' },
        { key: 'expires', label: 'EXPIRES', value: license.expirationDate || 'NO EXPIRATION' },
        { key: 'verification', label: 'VERIFY', value: verificationUrl },
        { key: 'notice', label: 'NOTICE', value: 'This digital card displays information registered with Divergram. Verify the issuing agency independently when official proof is required.' },
      ],
    },
    barcodes: [{ format: 'PKBarcodeFormatQR', message: checkinUrl, messageEncoding: 'iso-8859-1', altText: license.memberNumber || license.licenseNumber }],
  };
  const pass = new PKPass(
    { ...(await loadPassAssets()), 'pass.json': Buffer.from(JSON.stringify(passJson)) },
    certificates
  );
  return pass.getAsBuffer();
}

export function registerAppleWalletRoutes(app, { pool, getAuthUserId, authRateLimit, jwt, jwtSecret }) {
  app.get('/api/wallet/apple-pass/status', authRateLimit(30, 60_000), (req, res) => {
    if (!getAuthUserId(req)) return res.status(401).json({ error: 'unauthorized' });
    const readiness = getAppleWalletReadiness();
    return res.json({
      ok: true,
      ready: readiness.ready,
      message: readiness.ready
        ? 'Apple Wallet에 추가할 수 있습니다.'
        : 'Apple Wallet 발급 인증서 설정이 필요합니다.',
    });
  });

  app.post('/api/wallet/apple-pass', authRateLimit(12, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const licenseId = text(req.body?.licenseId, 120);
    if (!licenseId) return res.status(400).json({ error: 'license_id_required' });
    const readiness = getAppleWalletReadiness();
    if (!readiness.ready) {
      return res.status(503).json({ error: 'apple_wallet_not_configured', message: 'Apple Wallet 인증서 설정이 필요합니다.' });
    }
    try {
      const license = await findLicense(pool, userId, licenseId);
      if (!license) return res.status(404).json({ error: 'license_not_found' });
      if (license.status !== 'active') {
        return res.status(409).json({ error: 'license_not_active', message: '활성 상태의 라이선스만 Wallet에 추가할 수 있습니다.' });
      }
      const token = jwt.sign({ scope: 'apple_wallet_pass', licenseId }, jwtSecret, { subject: String(userId), expiresIn: '5m' });
      const configuredBase = text(process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL, 1000) || `${req.protocol}://${req.get('host')}`;
      return res.json({
        ok: true,
        ready: true,
        message: 'Apple Wallet 패스가 준비되었습니다.',
        passUrl: `${configuredBase.replace(/\/$/, '')}/api/wallet/apple-pass/${encodeURIComponent(licenseId)}?token=${encodeURIComponent(token)}`,
      });
    } catch (error) {
      console.error('apple_wallet_prepare_failed', error?.message || error);
      return res.status(500).json({ error: 'apple_wallet_prepare_failed' });
    }
  });

  app.get('/api/wallet/apple-pass/:licenseId', authRateLimit(20, 60_000), async (req, res) => {
    const licenseId = text(req.params.licenseId, 120);
    try {
      const payload = jwt.verify(String(req.query.token || ''), jwtSecret);
      if (payload.scope !== 'apple_wallet_pass' || text(payload.licenseId, 120) !== licenseId) {
        return res.status(403).json({ error: 'invalid_wallet_token' });
      }
      const license = await findLicense(pool, String(payload.sub || ''), licenseId);
      if (!license || license.status !== 'active') return res.status(404).json({ error: 'license_not_found' });
      const checkinCredential = jwt.sign(
        { scope: 'resort_checkin_credential', memberNumber: license.memberNumber, licenseId: license.id },
        jwtSecret,
        { subject: String(payload.sub || ''), issuer: 'divergram' }
      );
      const buffer = await buildLicensePass(license, checkinCredential);
      res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
      res.setHeader('Content-Disposition', `inline; filename="divergram-${licenseId.replace(/[^a-zA-Z0-9_-]/g, '')}.pkpass"`);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.send(buffer);
    } catch (error) {
      const status = ['TokenExpiredError', 'JsonWebTokenError'].includes(error?.name) ? 401 : 500;
      if (status === 500) console.error('apple_wallet_pass_failed', error?.message || error);
      return res.status(status).json({ error: status === 401 ? 'wallet_token_invalid' : 'apple_wallet_pass_failed' });
    }
  });
}
