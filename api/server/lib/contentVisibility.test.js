import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewVisibility, effectiveVisibility, normalizeItemVisibility, normalizeVisibility } from './contentVisibility.js';

test('content visibility fails closed for invalid values', () => {
  assert.equal(normalizeVisibility('unknown'), 'private');
  assert.equal(normalizeItemVisibility('unknown'), 'inherit');
  assert.equal(effectiveVisibility('inherit', 'followers'), 'followers');
});

test('owners, followers and public viewers receive only allowed content', () => {
  assert.equal(canViewVisibility('private', { isOwner: true }), true);
  assert.equal(canViewVisibility('followers', { isFollowing: true }), true);
  assert.equal(canViewVisibility('followers'), false);
  assert.equal(canViewVisibility('public'), true);
  assert.equal(canViewVisibility('private'), false);
});
