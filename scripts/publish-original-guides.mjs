import fs from 'node:fs/promises';

const input = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
if (!process.env.ADMIN_API_KEY) throw new Error('ADMIN_API_KEY required');
const base = process.env.DIVE_GUIDE_ADMIN_BASE_URL || 'http://127.0.0.1:43100/api/admin/dive-guides';
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'x-admin-key': process.env.ADMIN_API_KEY, 'content-type': 'application/json' } });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(JSON.stringify(result));
  return result.data;
}
const existing = await request(base);
for (const guide of input) {
  const matches = existing.filter(item => item.translations.ko?.title === guide.translations.ko.title);
  if (matches.length > 1) throw new Error('Ambiguous duplicate guide');
  const current = matches[0];
  const saved = await request(current ? `${base}/${current.id}` : base, {
    method: current ? 'PATCH' : 'POST', body: JSON.stringify(guide),
  });
  console.log(JSON.stringify({ id: saved.id, title: saved.translations.ko.title, status: saved.status }));
}
