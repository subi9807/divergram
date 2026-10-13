import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('physical resort deposits expose only the PayPal checkout', async () => {
  const source = await read('../app/(tabs)/resort-booking-detail.tsx');
  assert.match(source, /payResortBookingWithPayPal/);
  assert.doesNotMatch(source, /ApplePayButton|GooglePayButton|payResortBookingWithAirwallex/);
});

test('digital annual membership remains on platform store billing', async () => {
  const source = await read('../app/(tabs)/membership.tsx');
  assert.match(source, /from 'expo-iap'/);
  assert.match(source, /requestPurchase/);
  assert.match(source, /verifyAnnualMembershipPurchase/);
});

test('donations are disabled and have no settings entry point', async () => {
  const [availability, settings, appInfo] = await Promise.all([
    read('../src/config/paymentAvailability.ts'),
    read('../app/(tabs)/settings.tsx'),
    read('../app/(tabs)/app-info.tsx'),
  ]);
  assert.match(availability, /donationPaymentsAvailable = false/);
  assert.doesNotMatch(settings, /appRouteMap\.donate/);
  assert.doesNotMatch(appInfo, /appRouteMap\.donate/);
});
