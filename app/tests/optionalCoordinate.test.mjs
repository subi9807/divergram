import test from 'node:test';
import assert from 'node:assert/strict';
import { optionalCoordinate } from '../src/utils/optionalCoordinate.ts';

test('blank coordinates remain unknown rather than becoming zero', () => {
  for (const value of ['', ' ', '\n\t']) {
    assert.equal(optionalCoordinate(value, 90), null);
    assert.equal(optionalCoordinate(value, 180), null);
  }
});
test('real zero and valid signed decimal coordinates are retained', () => {
  assert.equal(optionalCoordinate('0', 90), 0);
  assert.equal(optionalCoordinate(' 33.2196 ', 90), 33.2196);
  assert.equal(optionalCoordinate('-126.5690', 180), -126.569);
  assert.equal(optionalCoordinate('90', 90), 90);
  assert.equal(optionalCoordinate('180', 180), 180);
});
test('invalid coordinates cannot produce a map pin', () => {
  for (const value of ['91', '-90.1', 'Infinity', 'NaN', '0x20', '1e2', 'abc']) assert.equal(optionalCoordinate(value, 90), null);
  assert.equal(optionalCoordinate('181', 180), null);
});
