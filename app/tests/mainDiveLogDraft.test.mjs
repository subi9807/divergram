import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasMainDiveLogDraftContent,
  mainDiveLogDraftKey,
  normalizeMainDiveLogDraft,
  utf8ByteLength,
} from '../src/services/mainDiveLogDraft.ts';

const base = {
  version: 1,
  updatedAt: '2026-09-06T12:00:00.000Z',
  form: { title: 'Night reef', diveType: 'scuba', gasType: 'nitrox', locationLat: '0' },
  selectedMedia: [{ uri: 'file:///photo.jpg', type: 'image' }],
  pointQuery: 'Jeju',
  resortQuery: '',
  detailsOpen: true,
  publishToFeed: true,
  publishToReels: false,
};

test('main form draft is normalized without dropping zero coordinates', () => {
  const result = normalizeMainDiveLogDraft(base);
  assert.equal(result?.form.locationLat, '0');
  assert.equal(result?.form.diveType, 'scuba');
  assert.equal(result?.selectedMedia[0]?.uri, 'file:///photo.jpg');
  assert.ok(result);
  assert.equal(hasMainDiveLogDraftContent(result), true);
});

test('main form draft rejects invalid envelopes and unsafe media URIs', () => {
  assert.equal(normalizeMainDiveLogDraft(null), null);
  assert.equal(normalizeMainDiveLogDraft({ ...base, updatedAt: 'not-a-date' }), null);
  const result = normalizeMainDiveLogDraft({ ...base, selectedMedia: [{ uri: 'javascript:alert(1)', type: 'image' }] });
  assert.deepEqual(result?.selectedMedia, []);
});

test('empty defaults do not create a persistent draft', () => {
  const result = normalizeMainDiveLogDraft({ ...base, form: { diveType: 'freediving', gasType: 'air' }, selectedMedia: [] });
  assert.ok(result);
  assert.equal(hasMainDiveLogDraftContent(result), false);
  assert.equal(mainDiveLogDraftKey(' user-1 '), 'dg_main_dive_log_draft_v1:user-1');
});

test('UTF-8 byte limits count multibyte text consistently on native runtimes', () => {
  assert.equal(utf8ByteLength('A한𠮷'), 8);
});
