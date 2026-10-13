const INTERNATIONAL_PHONE_INPUT = /^\+[0-9\s().-]+$/;
const E164_PHONE = /^\+[1-9]\d{7,14}$/;

export function normalizeInternationalPhone(value) {
  const input = String(value ?? '').trim();
  if (!INTERNATIONAL_PHONE_INPUT.test(input)) return '';

  const normalized = input.replace(/[\s().-]/g, '');
  return E164_PHONE.test(normalized) ? normalized : '';
}

export function isInternationalPhone(value) {
  return Boolean(normalizeInternationalPhone(value));
}
