import test from 'node:test';
import assert from 'node:assert/strict';
import { isInternationalPhone, normalizeInternationalPhone } from './internationalPhone.js';

test('normalizes an international phone number to E.164', () => {
  assert.equal(normalizeInternationalPhone('+82 10-1234-5678'), '+821012345678');
  assert.equal(normalizeInternationalPhone('+1 (415) 555-2671'), '+14155552671');
});

test('rejects phone numbers without a country calling code', () => {
  assert.equal(normalizeInternationalPhone('010-1234-5678'), '');
  assert.equal(isInternationalPhone('01012345678'), false);
});

test('rejects invalid characters and E.164 lengths', () => {
  assert.equal(normalizeInternationalPhone('+82 CALL-ME'), '');
  assert.equal(normalizeInternationalPhone('+1234567'), '');
  assert.equal(normalizeInternationalPhone('+1234567890123456'), '');
});
