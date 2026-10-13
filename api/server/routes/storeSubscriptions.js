import {
  getStoreSubscriptionConfig,
  publicStoreSubscriptionConfig,
  saveVerifiedMembership,
  storeAccountHash,
  storeAccountToken,
  verifyAppleAnnualSubscription,
  verifyGoogleAnnualSubscription,
} from '../lib/storeSubscriptions.js';
import { getMarineAiAllowance } from '../lib/aiMembership.js';

export function registerStoreSubscriptionRoutes(app, { pool, getAuthUserId, authRateLimit, storeSecret }) {
  const diagnosticStages = new Set([
    'screen_open', 'config_ready', 'config_error', 'store_connected', 'store_disconnected',
    'product_fetch_start', 'product_fetch_success', 'product_fetch_error', 'product_unavailable',
    'purchase_request', 'purchase_success', 'purchase_error', 'verification_start',
    'verification_success', 'verification_error', 'restore_start', 'restore_success', 'restore_error',
  ]);
  const cleanDiagnostic = (value, max = 160) => String(value ?? '').trim().slice(0, max);
  const recordDiagnostic = async (userId, detail) => {
    await pool.query(
      `INSERT INTO admin_audit_logs(action,target_user_id,detail) VALUES ('iap_diagnostic',$1,$2::jsonb)`,
      [userId, JSON.stringify(detail)]
    );
  };
  const requireUser = (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) res.status(401).json({ error: 'unauthorized' });
    return userId;
  };

  app.get('/api/memberships/annual/config', authRateLimit(60, 60_000), async (req, res) => {
    const config = getStoreSubscriptionConfig();
    const userId = requireUser(req, res);
    if (!userId) return;
    const allowance = await getMarineAiAllowance(pool, userId).catch(() => null);
    return res.json({ data: { ...publicStoreSubscriptionConfig(config, userId, storeSecret), allowance } });
  });

  app.post('/api/memberships/annual/diagnostics', authRateLimit(40, 60_000), async (req, res) => {
    const userId = requireUser(req, res);
    if (!userId) return;
    const stage = cleanDiagnostic(req.body?.stage, 64);
    if (!diagnosticStages.has(stage)) return res.status(400).json({ error: 'invalid_iap_diagnostic_stage' });
    const platform = cleanDiagnostic(req.body?.platform, 16);
    if (!['ios', 'android'].includes(platform)) return res.status(400).json({ error: 'invalid_iap_diagnostic_platform' });
    await recordDiagnostic(userId, {
      stage,
      platform,
      appVersion: cleanDiagnostic(req.body?.appVersion, 32),
      buildVersion: cleanDiagnostic(req.body?.buildVersion, 32),
      productId: cleanDiagnostic(req.body?.productId, 240),
      code: cleanDiagnostic(req.body?.code, 80),
      message: cleanDiagnostic(req.body?.message, 240),
      connected: req.body?.connected === true,
      productCount: Math.max(0, Math.min(20, Number(req.body?.productCount) || 0)),
    });
    return res.status(204).end();
  });

  app.post('/api/memberships/annual/verify/apple', authRateLimit(8, 60_000), async (req, res) => {
    const config = getStoreSubscriptionConfig();
    const userId = requireUser(req, res);
    if (!userId) return;
    try {
      const purchase = await verifyAppleAnnualSubscription(config.apple, req.body, storeAccountToken(userId, storeSecret));
      await saveVerifiedMembership(pool, userId, purchase);
      return res.json({ ok: true, allowance: await getMarineAiAllowance(pool, userId) });
    } catch (error) {
      await recordDiagnostic(userId, { stage: 'verification_error', platform: 'ios', productId: config.apple.productId, code: error.message || 'apple_iap_verification_failed' }).catch(() => undefined);
      return res.status(error.status || 502).json({ error: error.message || 'apple_iap_verification_failed' });
    }
  });

  app.post('/api/memberships/annual/verify/google', authRateLimit(8, 60_000), async (req, res) => {
    const config = getStoreSubscriptionConfig();
    const userId = requireUser(req, res);
    if (!userId) return;
    try {
      const purchase = await verifyGoogleAnnualSubscription(config.google, req.body, storeAccountHash(userId, storeSecret));
      await saveVerifiedMembership(pool, userId, purchase);
      return res.json({ ok: true, allowance: await getMarineAiAllowance(pool, userId) });
    } catch (error) {
      await recordDiagnostic(userId, { stage: 'verification_error', platform: 'android', productId: config.google.productId, code: error.message || 'google_play_iap_verification_failed' }).catch(() => undefined);
      return res.status(error.status || 502).json({ error: error.message || 'google_play_iap_verification_failed' });
    }
  });
}
