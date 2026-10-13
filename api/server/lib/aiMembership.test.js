import test from 'node:test';
import assert from 'node:assert/strict';
import { ANNUAL_MONTHLY_CREDITS, FREE_MONTHLY_CREDITS, marineAnalysisCreditCost } from './aiMembership.js';

test('marine AI uses bounded monthly plans and charges videos as five photos', () => {
  assert.equal(FREE_MONTHLY_CREDITS, 3);
  assert.equal(ANNUAL_MONTHLY_CREDITS, 30);
  assert.equal(marineAnalysisCreditCost('image'), 1);
  assert.equal(marineAnalysisCreditCost('video'), 5);
  assert.equal(marineAnalysisCreditCost(undefined), 1);
});
