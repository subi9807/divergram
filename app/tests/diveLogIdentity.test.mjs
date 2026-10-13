import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalImportedDiveLogId } from '../src/services/diveLogIdentity.ts';

test('safe imported IDs stay stable and invalid provider IDs become bounded deterministic IDs', () => {
  assert.equal(canonicalImportedDiveLogId('garmin_api', 'abc:123'), 'garmin_api-abc:123');
  const first = canonicalImportedDiveLogId('legacy_import', '../My Dive / 001');
  assert.equal(first, canonicalImportedDiveLogId('legacy_import', '../My Dive / 001'));
  assert.match(first, /^[a-zA-Z0-9._:-]{1,160}$/);
  assert.notEqual(first, canonicalImportedDiveLogId('legacy_import', '../My Dive / 002'));
});
