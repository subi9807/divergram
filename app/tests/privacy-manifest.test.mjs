import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifest = fs.readFileSync(new URL('../ios/Divergram/PrivacyInfo.xcprivacy', import.meta.url), 'utf8');
const project = fs.readFileSync(new URL('../ios/Divergram.xcodeproj/project.pbxproj', import.meta.url), 'utf8');

test('privacy manifest covers current first-party data flows', () => {
  const required = [
    'Name', 'EmailAddress', 'PhoneNumber', 'UserID', 'PreciseLocation',
    'PhotosorVideos', 'AudioData', 'OtherUserContent', 'PurchaseHistory',
    'DeviceID', 'CrashData', 'PerformanceData',
  ];
  for (const type of required) {
    assert.match(manifest, new RegExp(`NSPrivacyCollectedDataType${type}`));
  }
  assert.match(manifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
});

test('permission prompts are localized for every supported app language', () => {
  const locales = ['ko', 'en', 'ja', 'zh-Hans'];
  const keys = [
    'NSLocationWhenInUseUsageDescription', 'NSCameraUsageDescription',
    'NSMicrophoneUsageDescription', 'NSPhotoLibraryUsageDescription',
    'NSBluetoothAlwaysUsageDescription', 'NSUserTrackingUsageDescription',
  ];
  for (const locale of locales) {
    const text = fs.readFileSync(new URL(`../ios/Divergram/${locale}.lproj/InfoPlist.strings`, import.meta.url), 'utf8');
    for (const key of keys) assert.match(text, new RegExp(`"${key}"\\s*=`));
    assert.match(project, new RegExp(`name = "?${locale}"?;`));
  }
});
