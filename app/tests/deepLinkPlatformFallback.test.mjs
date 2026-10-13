import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publicPrefixes = ['/post', '/reel', '/profile', '/resort', '/guide', '/marine-life'];

test('web fallback detects mobile platforms and links to both stores', async () => {
  const script = await readFile(new URL('../../site/js/deep-link.js', import.meta.url), 'utf8');
  assert.match(script, /iPhone\|iPad\|iPod/);
  assert.match(script, /Android/);
  assert.match(script, /apps\.apple\.com\/app\/id6769253236/);
  assert.match(script, /play\.google\.com\/store\/apps\/details\?id=com\.divergram\.app/);
  assert.match(script, /location\.replace\(storeUrl\)/);
});

test('iOS and Android association files cover every public content route', async () => {
  const [aasaText, appConfigText] = await Promise.all([
    readFile(new URL('../../site/.well-known/apple-app-site-association', import.meta.url), 'utf8'),
    readFile(new URL('../app.json', import.meta.url), 'utf8'),
  ]);
  const aasa = JSON.parse(aasaText);
  const appConfig = JSON.parse(appConfigText).expo;
  const iosPaths = aasa.applinks.details[0].components.map((item) => item['/']);
  const androidPaths = appConfig.android.intentFilters[0].data
    .filter((item) => item.host === 'divergram.com')
    .map((item) => item.pathPrefix);

  for (const prefix of publicPrefixes) {
    assert.ok(iosPaths.some((path) => path.startsWith(prefix)), `iOS missing ${prefix}`);
    assert.ok(androidPaths.includes(prefix), `Android missing ${prefix}`);
  }
});
