// Run on the deployment host. Read-only; never print credentials or customer records.
import { execFileSync } from 'node:child_process';
const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8' }));
const api = processes.find(p => p.name === 'divergram-api');
if (!api) throw new Error('API process missing');
const base = `http://127.0.0.1:${api.pm2_env.PORT || 43100}`;
const headers = { 'x-admin-key': api.pm2_env.ADMIN_API_KEY };
const checks = [];
const subscriptionsResponse = await fetch(`${base}/api/admin/store-subscriptions`, { headers, signal: AbortSignal.timeout(15000) });
const subscriptions = await subscriptionsResponse.json();
checks.push({ endpoint: 'store-subscriptions', status: subscriptionsResponse.status, membershipRows: subscriptions.memberships?.length, eventRows: subscriptions.events?.length, secretValuesExposed: [...(subscriptions.memberships || []), ...(subscriptions.events || [])].filter(row => ['payload', 'metadata', 'purchase_token', 'store_transaction_id'].some(key => key in row)).length });
for (const endpoint of ['health', 'stats', 'api-settings', 'operations-overview', 'user-consents', 'device-tokens', 'comments', 'notifications', 'reported-chats', 'admin-users', 'operational-modules/dive-logs', 'operational-modules/media', 'operational-modules/stamps', 'operational-modules/support', 'operational-modules/donations', 'operational-modules/engagement', 'operational-modules/analytics', 'operational-modules/versions']) {
  const response = await fetch(`${base}/api/admin/${endpoint}`, { headers, signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  const check = { endpoint, status: response.status };
  if (endpoint === 'api-settings') {
    check.services = data.services?.length;
    check.secretValuesExposed = (data.services || []).flatMap(s => s.fields || []).filter(f => f.sensitive && f.value).length;
  }
  if (endpoint === 'operations-overview') { check.partial = data.partial; check.unavailable = data.unavailable; check.iapSummary = Array.isArray(data.iap); }
  checks.push(check);
}
for (const path of ['/api/admin/api-settings', '/api/marine-weather?lat=0&lng=0']) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(15000) });
  checks.push({ endpoint: path, unauthenticatedStatus: response.status });
}
const adminResponse = await fetch('https://adm.divergram.com/');
const html = await adminResponse.text();
checks.push({ endpoint: 'admin-html', status: adminResponse.status });
for (const path of [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(m => m[1])) {
  const response = await fetch(`https://adm.divergram.com${path}`);
  checks.push({ endpoint: path, status: response.status });
}
console.log(JSON.stringify({ processes: processes.filter(p => ['divergram-api', 'divergram-worker', 'divergram-admin'].includes(p.name)).map(p => ({ name: p.name, status: p.pm2_env.status })), checks }, null, 2));
if (checks.some(c => (c.status && c.status !== 200) || (c.unauthenticatedStatus && c.unauthenticatedStatus !== 401) || c.secretValuesExposed || c.partial)) process.exitCode = 1;
