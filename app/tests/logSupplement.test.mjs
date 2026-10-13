import test from 'node:test';
import assert from 'node:assert/strict';
import { countLogSupplement, readLogSupplement } from '../src/utils/logSupplement.ts';

test('existing zero-valued details are restored and counted', () => {
  const fields = readLogSupplement({ waterTemperature: 0, visibility: 0 });
  assert.equal(fields.temperature, '0');
  assert.equal(fields.visibility, '0');
  assert.equal(countLogSupplement(fields), 2);
});
test('resort and buddy remain separate when restoring an existing post', () => {
  const fields = readLogSupplement({ resort: 'Test Resort', buddyName: 'Test Buddy' });
  assert.equal(fields.resortName, 'Test Resort');
  assert.equal(fields.buddy, 'Test Buddy');
  assert.equal(countLogSupplement(fields), 2);
});
test('summary count ignores blanks and never changes stored inputs', () => {
  const fields = { resortName: '', temperature: ' ', visibility: '12', buddy: 'Test Buddy' };
  const before = structuredClone(fields);
  assert.equal(countLogSupplement(fields), 2);
  assert.deepEqual(fields, before);
  assert.equal(countLogSupplement(readLogSupplement({})), 0);
});
