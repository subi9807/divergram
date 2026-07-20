import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizePushData } from './adminPushDelivery.js';

test('normalizePushData converts FCM data values to strings', () => {
  assert.deepEqual(
    normalizePushData({
      userId: 18,
      isBlocked: false,
      metadata: { source: 'admin' },
      empty: null,
    }),
    {
      userId: '18',
      isBlocked: 'false',
      metadata: '{"source":"admin"}',
      empty: 'null',
    }
  );
});
