import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeResortAddressFields, normalizeResortLocation } from '../src/utils/resortLocation.ts';

test('resort location removes source placeholders and repeated country names', () => {
  assert.deepEqual(normalizeResortAddressFields({
    country: 'South Korea',
    region: 'Hanam, Gyeonggi-do, South Korea',
    address: 'No State Seoul, 28-31, Yangjae-daero 71-gil, Songpa-gu, 16944, South Korea',
  }), {
    country: 'South Korea',
    region: 'Hanam, Gyeonggi-do',
    address: 'Seoul, 28-31, Yangjae-daero 71-gil, Songpa-gu, 16944',
  });
});

test('resort location hides empty source markers without damaging real names', () => {
  assert.equal(normalizeResortLocation('No State'), '');
  assert.equal(normalizeResortLocation('Unknown Province Busan'), 'Busan');
  assert.equal(normalizeResortLocation('State College, Pennsylvania'), 'State College, Pennsylvania');
});
