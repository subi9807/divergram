import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLicenses } from './divingLicenses.js';

function license(overrides = {}) {
  return {
    id: 'license-1',
    licenseNumber: 'PADI-1234',
    holderName: 'Diver One',
    discipline: 'scuba',
    certificationLevel: 'Open Water Diver',
    issueDate: '2026-09-02',
    status: 'active',
    ...overrides,
  };
}

test('assigns stable scuba and freediving member numbers', () => {
  const first = normalizeLicenses([
    license(),
    license({ id: 'license-2', discipline: 'freediving' }),
  ], '309');
  assert.match(first[0].memberNumber, /^DG-SC-2026-[0-9A-F]{4}$/);
  assert.match(first[1].memberNumber, /^DG-FD-2026-[0-9A-F]{4}$/);

  const second = normalizeLicenses(first, '309');
  assert.equal(second[0].memberNumber, first[0].memberNumber);
  assert.equal(second[1].memberNumber, first[1].memberNumber);
});

test('reissues a member number when discipline or issue year changes', () => {
  const [normalized] = normalizeLicenses([
    license({ discipline: 'freediving', issueDate: '2027-01-03', memberNumber: 'DG-SC-2026-AAAA' }),
  ], '309');
  assert.match(normalized.memberNumber, /^DG-FD-2027-[0-9A-F]{4}$/);
});
