import test from 'node:test';
import assert from 'node:assert/strict';
import { getCancellationType } from './bookingPolicy.js';

test('pending deposit cancellations are recorded as pre-payment cancellations', () => {
  assert.equal(getCancellationType('pending'), 'pre_payment');
});

test('other customer cancellations use the customer type', () => {
  assert.equal(getCancellationType('waived'), 'customer');
  assert.equal(getCancellationType('refunded'), 'customer');
});
