import { API_SERVICE_CATALOG, ensureApiSettingsSchema, publicApiService, readStoredApiSettings, saveApiSetting } from '../lib/apiSettings.js';
import { invalidateExternalIntegrationCache } from './adminExternalIntegrations.js';

function findService(id) {
  return API_SERVICE_CATALOG.find((service) => service.id === String(id || '').trim());
}

async function audit(pool, req, action, detail) {
  await pool.query('INSERT INTO admin_audit_logs(action,detail) VALUES($1,$2::jsonb)', [action, JSON.stringify({ ...detail, adminEmail: req.adminAuth?.email || '', adminUserId: req.adminAuth?.userId || '' })]);
}

export function registerAdminApiSettingsRoutes(app, { pool, requireAdmin }) {
  app.get('/api/admin/api-settings', requireAdmin, async (_req, res) => {
    try {
      await ensureApiSettingsSchema(pool);
      const stored = await readStoredApiSettings(pool);
      return res.json({ ok: true, services: API_SERVICE_CATALOG.map((service) => publicApiService(service, stored.get(service.id))), protectedKeys: ['DATABASE_URL', 'JWT_SECRET', 'DATA_ENCRYPTION_KEY', 'ADMIN_API_KEY'] });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'api_settings_read_failed', detail: String(error?.message || error) });
    }
  });

  app.patch('/api/admin/api-settings/:serviceId', requireAdmin, async (req, res) => {
    const service = findService(req.params.serviceId);
    if (!service) return res.status(404).json({ error: 'api_service_not_found' });
    try {
      await ensureApiSettingsSchema(pool);
      const changedFields = Object.entries(req.body?.values || {}).filter(([, value]) => String(value || '').trim()).map(([name]) => name);
      const stored = await saveApiSetting(pool, service, { enabled: req.body?.enabled, values: req.body?.values, updatedBy: req.adminAuth?.email || req.adminAuth?.userId || '' });
      invalidateExternalIntegrationCache();
      await audit(pool, req, 'api_settings_updated', { serviceId: service.id, enabled: stored.enabled, changedFields });
      return res.json({ ok: true, service: publicApiService(service, stored), runtimeApplied: true, workerRefreshSeconds: 60 });
    } catch (error) {
      return res.status(error.status === 400 ? 400 : 500).json({ ok: false, error: error.status === 400 ? 'invalid_api_settings' : 'api_settings_update_failed', detail: error.status === 400 ? error.message : '설정을 저장하지 못했습니다. 서버 상태를 확인해 주세요.' });
    }
  });
}
