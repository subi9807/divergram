import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingDateRange, dateOnly, todayAt, reserveCapacity, setBookingAvailability } from './bookingCapacity.js';
import { calculateRefund } from '../routes/resortPartners.js';

test('pg DATE objects and ISO date strings produce the same refund', () => {
  const day = new Date(2026, 9, 20);
  assert.equal(dateOnly(day), '2026-10-20');
  assert.deepEqual(calculateRefund(100, day, new Date('2026-10-01T12:00:00Z')), { daysBefore: 19, refundPercent: 100, refundAmount: 100 });
});
test('invalid calendar dates are rejected', () => {
  for (const day of ['2026-02-30', '2026-13-01', 'not-a-date']) assert.throws(() => dateOnly(day));
});
test('booking notice uses the resort timezone', () => {
  assert.equal(todayAt('Pacific/Honolulu', new Date('2026-10-01T01:00:00Z')), '2026-09-30');
});
test('booking date ranges include both endpoints and reject invalid ranges', () => {
  assert.deepEqual(bookingDateRange('2026-10-01', '2026-10-03'), ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.throws(() => bookingDateRange('2026-10-03', '2026-10-01'), /invalid_booking_date_range/);
  assert.throws(() => bookingDateRange('2026-10-01', '2026-11-01'), /range_too_long/);
});
function client({ enabled = true, capacity = 2, occupied = 0, slot = null } = {}) {
  const calls = [];
  return { calls, async query(sql) {
    calls.push(sql);
    if (sql.includes('FROM app_profiles')) return { rows: [{ resort_booking_enabled: enabled, resort_booking_default_capacity: capacity, resort_booking_timezone: 'UTC' }] };
    if (sql.includes('FROM app_resort_booking_availability')) return { rows: slot ? [slot] : [] };
    if (sql.includes('SUM(participants)')) return { rows: [{ total: occupied }] };
    throw new Error('unexpected query');
  } };
}
test('default availability locks the persistent resort row exclusively', async () => {
  const db = client();
  await reserveCapacity(db, 'r', '2099-01-01', 2);
  assert.match(db.calls[0], /FOR UPDATE$/);
  assert.doesNotMatch(db.calls[0], /FOR SHARE/);
});
test('multi-day bookings validate capacity on every day', async () => {
  const db = client();
  await reserveCapacity(db, 'r', '2099-01-01', 1, '2099-01-03');
  assert.equal(db.calls.filter(sql => sql.includes('app_resort_booking_availability')).length, 3);
  assert.equal(db.calls.filter(sql => sql.includes('SUM(participants)')).length, 3);
});
for (const [name, options, error] of [
  ['disabled', { enabled: false }, 'unavailable'],
  ['full', { occupied: 2 }, 'capacity_exceeded'],
  ['zero capacity', { capacity: 0 }, 'capacity_exceeded'],
  ['closed date', { slot: { capacity: 2, is_open: false } }, 'date_closed'],
]) {
  test(`both booking entrypoints reject ${name}`, async () => {
    await assert.rejects(reserveCapacity(client(options), 'r', '2099-01-01', 1), new RegExp(error));
  });
}
test('past booking date is rejected', async () => {
  await assert.rejects(reserveCapacity(client(), 'r', '2000-01-01', 1), /notice_too_short/);
});

test('availability edits lock the same resort and reject shrinking below occupied seats', async () => {
  const calls = [];
  let released = false;
  const connection = { release() { released = true; }, async query(sql) {
    calls.push(sql);
    if (sql.includes('FROM app_profiles')) return { rows: [{ id: 'r' }] };
    if (sql.includes('SUM(participants)')) return { rows: [{ total: 3 }] };
    return { rows: [] };
  } };
  await assert.rejects(setBookingAvailability({ connect: async () => connection }, 'r', '2099-01-01', 2, true, ''), /capacity_below_existing_bookings/);
  assert.match(calls[1], /FOR UPDATE$/);
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(released, true);
  assert.ok(!calls.some(sql => sql.startsWith('INSERT')));
});

test('fractional capacities are rejected before a transaction is opened', async () => {
  await assert.rejects(setBookingAvailability({ connect: () => assert.fail('must not connect') }, 'r', '2099-01-01', 1.5, true, ''), /invalid_booking_capacity/);
});
