import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeBillingPayload } from './adminMessagingUsage.js';

test('summarizes Infobip billing rows by channel and day in USD', () => {
  const summary = summarizeBillingPayload({
    response: {
      columns: ['CATEGORY_CODE', 'DAY', 'QUANTITY', 'TOTAL_PER_UNIT', 'CURRENCY'],
      rows: [
        ['SMS', '2026-08-10', 2, 0.04, 'USD'],
        ['EMAIL', '2026-08-10', 3, 0.01, 'USD'],
      ],
    },
  });

  assert.equal(summary.currency, 'USD');
  assert.equal(summary.quantity, 5);
  assert.equal(summary.spendUsd, 0.05);
  assert.deepEqual(summary.daily, [{ day: '2026-08-10', quantity: 5, cost: 0.05, currency: 'USD' }]);
});
