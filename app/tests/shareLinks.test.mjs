import assert from 'node:assert/strict';
import test from 'node:test';

import { buildShareUrl } from '../src/lib/shareLinks.ts';

test('shareable content uses one canonical HTTPS URL format', () => {
  assert.equal(buildShareUrl('post', 'post 1'), 'https://divergram.com/post/post%201');
  assert.equal(buildShareUrl('reel', 'reel-2'), 'https://divergram.com/reel/reel-2');
  assert.equal(buildShareUrl('profile', 42), 'https://divergram.com/profile/42');
  assert.equal(buildShareUrl('resort', 'r/1'), 'https://divergram.com/resort/r%2F1');
  assert.equal(buildShareUrl('guide', 'g-1'), 'https://divergram.com/guide/g-1');
  assert.equal(buildShareUrl('marine-life', 'm-1'), 'https://divergram.com/marine-life/m-1');
});

test('share links reject empty identifiers', () => {
  assert.throws(() => buildShareUrl('post', '  '), /share_link_id_required/);
});
