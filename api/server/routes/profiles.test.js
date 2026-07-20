import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeProfileSearchQuery } from './profiles.js';

test('profile search accepts handles with an at-sign', () => {
  assert.equal(normalizeProfileSearchQuery('  @subi9807  '), 'subi9807');
  assert.equal(normalizeProfileSearchQuery('@@diver'), 'diver');
});
