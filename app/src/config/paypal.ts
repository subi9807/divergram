import Constants from 'expo-constants';

export function getPaypalDonateUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { paypal?: { donateUrl?: string } };
  return String(extra.paypal?.donateUrl || process.env.EXPO_PUBLIC_PAYPAL_DONATE_URL || process.env.PAYPAL_DONATE_URL || '').trim();
}

export function getPaypalClientId(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { paypal?: { clientId?: string } };
  return String(
    extra.paypal?.clientId ||
      process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID ||
      process.env.PAYPAL_CLIENT_ID ||
      'BAAnnRigmVrw7Ackm5yYkRNTEofhNYC6HRrYlKNZj08Hk2fHQWLTYqIG3i3OjZjmmhk8zfzktmm4YZR1Ow'
  ).trim();
}

export function getPaypalHostedButtonId(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { paypal?: { hostedButtonId?: string } };
  return String(
    extra.paypal?.hostedButtonId ||
      process.env.EXPO_PUBLIC_PAYPAL_HOSTED_BUTTON_ID ||
      process.env.PAYPAL_HOSTED_BUTTON_ID ||
      'ZE8JLS99SK2EU'
  ).trim();
}

export function getPaypalDonatePageUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { paypal?: { donatePageUrl?: string } };
  const explicit = String(extra.paypal?.donatePageUrl || process.env.EXPO_PUBLIC_PAYPAL_DONATE_PAGE_URL || process.env.PAYPAL_DONATE_PAGE_URL || '').trim();
  if (explicit) return explicit;
  const hostedButtonId = getPaypalHostedButtonId();
  return hostedButtonId ? `https://www.paypal.com/donate/?hosted_button_id=${encodeURIComponent(hostedButtonId)}` : '';
}
