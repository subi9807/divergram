import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const appRoot = path.join(root, 'app');
const localeDir = path.join(appRoot, 'src', 'locales');
const sourceDirs = [path.join(appRoot, 'app'), path.join(appRoot, 'src')];
const localeCodes = ['ko', 'en', 'ja', 'zh'];

async function filesUnder(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(full));
    else if (/\.tsx?$/.test(entry.name)) result.push(full);
  }
  return result;
}

const dictionaries = Object.fromEntries(await Promise.all(localeCodes.map(async (code) => [
  code, JSON.parse(await fs.readFile(path.join(localeDir, `${code}.json`), 'utf8')),
])));
const get = (object, key) => key.split('.').reduce((value, part) => value?.[part], object);
const set = (object, key, value) => {
  const parts = key.split('.');
  const last = parts.pop();
  let current = object;
  for (const part of parts) current = current[part] ||= {};
  current[last] = value;
};

const sourceFiles = (await Promise.all(sourceDirs.map(filesUnder))).flat();
const missing = new Map();
const pattern = /\bt\(\s*['"]([^'"]+)['"]\s*,\s*\{[\s\S]{0,500}?defaultValue:\s*['"]([^'"]*[가-힣][^'"]*)['"]/g;
for (const file of sourceFiles) {
  const source = await fs.readFile(file, 'utf8');
  for (const match of source.matchAll(pattern)) {
    if (get(dictionaries.ko, match[1]) == null) missing.set(match[1], match[2]);
  }
}

for (const [key, value] of missing) set(dictionaries.ko, key, value);

async function translateBatch(items, target) {
  const separator = '\n[[DG_LOCALE_SPLIT]]\n';
  const params = new URLSearchParams({ client: 'gtx', sl: 'ko', tl: target, dt: 't', q: items.join(separator) });
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
  if (!response.ok) throw new Error(`translation_failed_${response.status}`);
  const payload = await response.json();
  const translated = payload[0].map((part) => part[0]).join('');
  const parts = translated.split(/\s*\[\[DG_LOCALE_SPLIT\]\]\s*/);
  if (parts.length !== items.length) throw new Error(`translation_split_mismatch_${items.length}_${parts.length}`);
  return parts.map((part) => part.replace(/\s+/g, ' ').trim());
}

const entries = [...missing.entries()];
for (const [locale, target] of [['en', 'en'], ['ja', 'ja'], ['zh', 'zh-CN']]) {
  const translated = [];
  for (let index = 0; index < entries.length; index += 18) {
    translated.push(...await translateBatch(entries.slice(index, index + 18).map(([, value]) => value), target));
  }
  entries.forEach(([key], index) => set(dictionaries[locale], key, translated[index]));
}

for (const locale of localeCodes) {
  await fs.writeFile(path.join(localeDir, `${locale}.json`), `${JSON.stringify(dictionaries[locale], null, 2)}\n`);
}
console.log(`Added ${entries.length} fallback keys to ko, en, ja and zh.`);
