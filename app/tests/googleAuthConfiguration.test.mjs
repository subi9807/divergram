import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('native Google sign-in is configured for both iOS and Android', async () => {
  const source = await readFile(new URL('../src/providers/AuthProvider.tsx', import.meta.url), 'utf8');

  assert.match(source, /Platform\.OS !== 'android' && Platform\.OS !== 'ios'/);
  assert.match(source, /GoogleSignin\.configure\(\{[\s\S]*iosClientId:/);
  assert.match(source, /Platform\.OS === 'android' \|\| Platform\.OS === 'ios'/);
  assert.match(source, /if \(Platform\.OS === 'android'\) \{[\s\S]*GoogleSignin\.hasPlayServices/);
});

test('iOS bundle exports Google client identifiers', async () => {
  const [appConfig, infoPlist] = await Promise.all([
    readFile(new URL('../app.config.ts', import.meta.url), 'utf8'),
    readFile(new URL('../ios/Divergram/Info.plist', import.meta.url), 'utf8'),
  ]);

  assert.match(appConfig, /GIDClientID:\s*getGoogleIosClientId\(\)/);
  assert.match(appConfig, /GIDServerClientID:\s*getGoogleWebClientId\(\)/);
  assert.match(infoPlist, /<key>GIDClientID<\/key>/);
  assert.match(infoPlist, /<key>GIDServerClientID<\/key>/);
});
