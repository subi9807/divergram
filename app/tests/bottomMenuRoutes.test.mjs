import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizePreferences } from '../../api/server/routes/userPreferences.js';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const settings = read('../src/stores/settingsStore.ts');
const strings = value => [...value.matchAll(/'([^']+)'/g)].map(match => match[1]);
const candidates = strings(settings.match(/bottomTabCandidates[^=]*= \[([\s\S]*?)\];/)[1]);
const header = strings(settings.match(/headerMenuDefault = \[([\s\S]*?)\];/)[1]);

test('eligible all-menu items have selectable bottom tabs and real screens', () => {
  assert.equal(new Set(candidates).size, candidates.length);
  for (const item of header.filter(item => !['app_info', 'membership'].includes(item))) assert(candidates.includes(item.replaceAll('_', '-')), item);
  const layout = read('../app/(tabs)/_layout.tsx');
  for (const route of candidates) {
    assert(fs.existsSync(new URL(`../app/(tabs)/${route}.tsx`, import.meta.url)), route);
    assert(!layout.includes(`<Tabs.Screen name="${route}"`), `duplicate screen: ${route}`);
  }
});

test('excluded utility and payment menus stay accessible but cannot be pinned', () => {
  const layout = read('../app/(tabs)/_layout.tsx');
  for (const route of ['app-info', 'membership', 'donate']) {
    assert(!candidates.includes(route));
    assert(layout.includes(`<Tabs.Screen name="${route}" options={{ href: null }} />`));
  }
  const old = ['index', 'resorts', 'app-info', 'membership', 'donate'];
  const cleaned = normalizePreferences({ bottomTabItems: old });
  assert.deepEqual(cleaned.bottomTabItems, ['index', 'resorts', 'explore', 'location']);
  assert.deepEqual(normalizePreferences(cleaned).bottomTabItems, cleaned.bottomTabItems);
});

test('server preserves every selectable menu and its order on save and reload', () => {
  for (const route of candidates) {
    const items = [...new Set(['index', route, 'logs', 'profile', 'settings'])];
    const saved = normalizePreferences({ bottomTabItems: items });
    const reloaded = normalizePreferences(JSON.parse(JSON.stringify(saved)));
    assert.deepEqual(reloaded.bottomTabItems, items, route);
  }
  assert.deepEqual(normalizePreferences({ headerMenuItems: header }).headerMenuItems, header);
});
