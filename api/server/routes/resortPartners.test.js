import test from 'node:test';
import assert from 'node:assert/strict';
import { REFUND_POLICY, calculateRefund } from './resortPartners.js';

test('refund policy returns 100 percent at least 14 days before booking', () => {
  assert.deepEqual(calculateRefund(100, '2026-10-20', new Date('2026-10-01T12:00:00Z')), { daysBefore: 19, refundPercent: 100, refundAmount: 100 });
});

test('refund policy returns 50 percent from 7 through 13 days', () => {
  assert.deepEqual(calculateRefund(75, '2026-10-20', new Date('2026-10-10T23:00:00Z')), { daysBefore: 10, refundPercent: 50, refundAmount: 37.5 });
});

test('refund policy returns zero from 6 days before and for no-show', () => {
  assert.deepEqual(calculateRefund(40, '2026-10-20', new Date('2026-10-19T01:00:00Z')), { daysBefore: 1, refundPercent: 0, refundAmount: 0 });
  assert.equal(REFUND_POLICY.noShowRefundPercent, 0);
  assert.equal(REFUND_POLICY.repeatedNoShowReview, true);
});

test('provider cancellation always returns the full deposit', () => {
  assert.deepEqual(calculateRefund(50, '2026-10-20', new Date('2026-10-20T01:00:00Z'), true), { daysBefore: null, refundPercent: 100, refundAmount: 50 });
  assert.equal(REFUND_POLICY.currency, 'USD');
  assert.equal(REFUND_POLICY.version, '2026-09-USD-v2');
});
