import test from 'node:test';
import assert from 'node:assert/strict';
import { decideDiveEnvironmentLookup } from '../src/services/diveEnvironmentPolicy.ts';

const base = { entryLocation: { lat: 1, lng: 2 }, diveDate: '2026-09-06', entryTime: '10:00' };
const now = new Date('2026-09-06T12:00:00');

test('environment lookup requires location and refuses historical current-weather substitution', () => {
  assert.equal(decideDiveEnvironmentLookup({ ...base, entryLocation: undefined }, now), 'missing_location');
  assert.equal(decideDiveEnvironmentLookup({ ...base, diveDate: '2025-09-06' }, now), 'historical_unsupported');
});

test('only a current dive with coordinates is ready for the current-only provider', () => {
  assert.equal(decideDiveEnvironmentLookup(base, now), 'ready');
  assert.equal(decideDiveEnvironmentLookup({ ...base, entryTime: '' }, now), 'historical_unsupported');
});
