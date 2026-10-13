function sanitizeUsernamePart(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function buildOAuthUsernameBase({ email, provider, providerSub }) {
  const emailLocalPart = String(email || '').split('@')[0];
  const fallback = `${provider || 'diver'}_${String(providerSub || '').slice(-10)}`;
  let base = sanitizeUsernamePart(emailLocalPart) || sanitizeUsernamePart(fallback) || 'diver_user';
  if (base.length < 4) base = `${base}_user`;
  return base.slice(0, 24);
}

export async function allocateUniqueOAuthUsername(pool, crypto, identity) {
  const base = buildOAuthUsernameBase(identity);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = attempt === 0 ? '' : `_${crypto.randomBytes(3).toString('hex')}`;
    const candidate = `${base.slice(0, 32 - suffix.length)}${suffix}`;
    const existing = await pool.query(
      'SELECT 1 FROM app_users WHERE lower(username)=lower($1) LIMIT 1',
      [candidate]
    );
    if (!existing.rows.length) return candidate;
  }
  throw new Error('oauth_username_allocation_failed');
}

