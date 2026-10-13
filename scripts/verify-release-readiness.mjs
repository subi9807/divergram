import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '..');
const failures = [];
const warnings = [];

async function text(file) {
  return readFile(path.join(root, file), 'utf8');
}

async function exists(file) {
  try {
    await access(path.join(root, file));
    return true;
  } catch {
    return false;
  }
}

function requireMatch(label, value, pattern) {
  if (!pattern.test(value)) failures.push(label);
}

function parseEnv(value) {
  return Object.fromEntries(
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
      })
  );
}

function googleClientProjectNumber(clientId) {
  return String(clientId || '').match(/^(\d+)-[a-z0-9-]+\.apps\.googleusercontent\.com$/i)?.[1] || null;
}

const appConfig = await text('app/app.config.ts');
const appPackage = JSON.parse(await text('app/package.json'));
const androidGradle = await text('app/android/app/build.gradle');
const accountDeletion = await text('web/src/components/AccountDeletionGuide.tsx');
const sitemap = await text('web/public/sitemap.xml');
const assetLinks = JSON.parse(await text('web/public/.well-known/assetlinks.json'));
const aasa = JSON.parse(await text('web/public/.well-known/apple-app-site-association'));

requireMatch('Android App Links must include divergram.com', appConfig, /['"]divergram\.com['"]/);
requireMatch('iOS Associated Domains must include divergram.com', appConfig, /applinks:divergram\.com/);
requireMatch('Account deletion page must explain 30-day recovery', accountDeletion, /30일/);
requireMatch('Sitemap must include account deletion page', sitemap, /\/account-deletion/);
requireMatch('Android release must use the release signing config', androidGradle, /release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.release/);
requireMatch('AdMob iOS app ID must be configured', appConfig, /5278215124/);
requireMatch('AdMob Android app ID must be configured', appConfig, /9736334888/);
requireMatch('iOS native Google client ID must be configured', appConfig, /GIDClientID/);
requireMatch('Google server client ID must be configured', appConfig, /GIDServerClientID/);

if (!Array.isArray(assetLinks) || assetLinks.length === 0) failures.push('assetlinks.json has no statements');
if (!aasa?.applinks?.details?.length) failures.push('apple-app-site-association has no applinks details');
if (!(await exists('app/GoogleService-Info.plist'))) failures.push('iOS Firebase plist is missing');
if (!(await exists('app/google-services.json'))) failures.push('Android Firebase JSON is missing');
if (!(await exists('app/ios/Divergram/PrivacyInfo.xcprivacy'))) failures.push('iOS privacy manifest is missing');

const configVersion = appConfig.match(/version:\s*'([^']+)'/)?.[1];
const gradleVersion = androidGradle.match(/versionName\s+"([^"]+)"/)?.[1];
if (!configVersion || configVersion !== appPackage.version || configVersion !== gradleVersion) {
  failures.push(`Version mismatch: config=${configVersion}, package=${appPackage.version}, android=${gradleVersion}`);
}

if (/signingConfig\s+findProperty\('DIVERGRAM_UPLOAD_STORE_FILE'\)\s+\?\s+signingConfigs\.release\s+:\s+signingConfigs\.debug/.test(androidGradle)) {
  failures.push('Release build must not fall back to debug signing.');
}
if (/orientation:\s*'portrait'/.test(appConfig)) {
  warnings.push('Portrait-only orientation may continue to trigger Android large-screen policy warnings.');
}

try {
  const googleServices = JSON.parse(await text('app/google-services.json'));
  const productionClient = googleServices.client?.find(
    (client) => client.client_info?.android_client_info?.package_name === 'com.divergram.app'
  );
  if (!productionClient?.oauth_client?.length) {
    warnings.push(
      'Android Firebase JSON has no OAuth client entry for com.divergram.app; native Google Sign-In uses the separately configured Google Auth Platform clients.'
    );
  }

  if (await exists('app/.env')) {
    const appEnv = parseEnv(await text('app/.env'));
    const configuredProjects = new Set();
    for (const name of [
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID',
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS',
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB'
    ]) {
      const configuredProjectNumber = googleClientProjectNumber(appEnv[name]);
      if (!configuredProjectNumber) {
        failures.push(`${name} is missing or invalid.`);
      } else {
        configuredProjects.add(configuredProjectNumber);
      }
    }
    if (configuredProjects.size > 1) {
      failures.push('Google Android, iOS, and web OAuth clients belong to different Google Auth Platform projects.');
    }
  }
} catch {
  failures.push('Android Firebase JSON is invalid.');
}
if (/NSPrivacyCollectedDataTypes[\s\S]{0,120}<array\/>/.test(await text('app/ios/Divergram/PrivacyInfo.xcprivacy'))) {
  warnings.push('App privacy manifest has an empty collected-data array; reconcile it with active SDK behavior.');
}

console.log(`Release readiness: ${failures.length ? 'FAIL' : 'PASS'}`);
console.log(`Version: ${appPackage.version}`);
for (const item of failures) console.error(`FAIL: ${item}`);
for (const item of warnings) console.warn(`WARN: ${item}`);
process.exitCode = failures.length ? 1 : 0;
