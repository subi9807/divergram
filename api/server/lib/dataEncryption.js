import crypto from 'crypto';

const ENVELOPE_PREFIX = 'enc:v1:';

function encryptionKey() {
  const raw = String(process.env.DATA_ENCRYPTION_KEY || '').trim();
  if (!raw) {
    if (process.env.NODE_ENV === 'production') throw new Error('data_encryption_key_missing');
    return null;
  }
  const decoded = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (decoded.length !== 32) throw new Error('data_encryption_key_invalid');
  return decoded;
}

export function encryptSensitiveJson(value) {
  const key = encryptionKey();
  if (!key || value == null) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const envelope = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
  return `${ENVELOPE_PREFIX}${envelope}`;
}

export function decryptSensitiveJson(value, fallback) {
  if (typeof value !== 'string' || !value.startsWith(ENVELOPE_PREFIX)) return value ?? fallback;
  const key = encryptionKey();
  if (!key) throw new Error('data_encryption_key_missing');
  const envelope = Buffer.from(value.slice(ENVELOPE_PREFIX.length), 'base64');
  if (envelope.length < 29) throw new Error('encrypted_data_invalid');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, envelope.subarray(0, 12));
  decipher.setAuthTag(envelope.subarray(12, 28));
  const plaintext = Buffer.concat([decipher.update(envelope.subarray(28)), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

export function redactIntegrationTokens(data) {
  if (!data || typeof data !== 'object') return data;
  const { accessToken: _accessToken, refreshToken: _refreshToken, authCode: _authCode, ...safe } = data;
  return safe;
}
