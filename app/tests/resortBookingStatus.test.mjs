import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canPayResortBookingDeposit,
  getResortBookingStage,
  getResortBookingStatusKey,
} from '../src/features/booking/bookingStatus.ts';

const booking = (overrides = {}) => ({
  id: 'rb_test', resortId: 'resort_test', resortName: 'Test Resort', bookingDate: '2026-09-20',
  participants: 1, diveType: 'scuba', applicantName: 'Diver', status: 'pending',
  depositAmount: 50, depositCurrency: 'USD', depositStatus: 'pending', createdAt: '', updatedAt: '',
  ...overrides,
});

test('shows a pre-payment cancellation label only for that cancellation type', () => {
  assert.equal(getResortBookingStatusKey(booking({ status: 'cancelled', cancellationType: 'pre_payment' })), 'pre_payment_cancelled');
  assert.equal(getResortBookingStatusKey(booking({ status: 'cancelled', cancellationType: 'customer' })), 'cancelled');
});

test('maps deposit and review states to separate booking stages', () => {
  assert.equal(getResortBookingStage(booking()), 'payment');
  assert.equal(getResortBookingStage(booking({ depositStatus: 'paid' })), 'review');
  assert.equal(getResortBookingStage(booking({ status: 'confirmed', depositStatus: 'paid' })), 'confirmed');
  assert.equal(getResortBookingStage(booking({ status: 'completed', depositStatus: 'paid' })), 'completed');
});

test('allows payment only for active bookings awaiting a positive deposit', () => {
  assert.equal(canPayResortBookingDeposit(booking()), true);
  assert.equal(canPayResortBookingDeposit(booking({ status: 'cancelled' })), false);
  assert.equal(canPayResortBookingDeposit(booking({ depositStatus: 'paid' })), false);
});
