import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFeedEditState, normalizePostIdParam, splitStoredCaption } from '../src/utils/feedEditState.ts';

test('normalizes scalar and array post route parameters', () => {
  assert.equal(normalizePostIdParam(' post-1 '), 'post-1');
  assert.equal(normalizePostIdParam(['post-2', 'ignored']), 'post-2');
  assert.equal(normalizePostIdParam(undefined), '');
});

test('splits the stored title and body without duplicating the title', () => {
  assert.deepEqual(splitStoredCaption('Night dive\nCalm water\nGreat visibility'), {
    title: 'Night dive',
    notes: 'Calm water\nGreat visibility',
  });
  assert.deepEqual(splitStoredCaption('Daily snapshot'), { title: 'Daily snapshot', notes: '' });
});

test('restores every editable feed field and existing media', () => {
  const restored = buildFeedEditState({
    content: 'Jeju dive\nOctopus near the wall',
    diveType: 'scuba',
    gasType: 'nitrox',
    gasPercent: 32,
    diveSite: 'Munseom',
    location: 'Seogwipo, Jeju',
    locationLat: 33.227,
    locationLng: 126.56,
    resort: 'Blue Resort',
    maxDepth: 24.5,
    diveDuration: 48,
    waterTemperature: 22,
    visibility: 15,
    buddyName: 'Mina',
    publishToFeed: true,
    publishToReels: true,
    visibilityType: 'followers',
    media: [
      { url: 'https://example.com/one.jpg', type: 'image' },
      { url: 'https://example.com/two.mp4', type: 'video' },
    ],
  });

  assert.equal(restored.form.title, 'Jeju dive');
  assert.equal(restored.form.notes, 'Octopus near the wall');
  assert.equal(restored.form.pointName, 'Munseom');
  assert.equal(restored.form.pointAddress, 'Seogwipo, Jeju');
  assert.equal(restored.form.resortName, 'Blue Resort');
  assert.equal(restored.form.temperature, '22');
  assert.equal(restored.form.visibility, '15');
  assert.equal(restored.form.buddy, 'Mina');
  assert.equal(restored.form.photoUri, 'https://example.com/one.jpg');
  assert.equal(restored.media.length, 2);
  assert.equal(restored.contentVisibility, 'followers');
  assert.equal(restored.detailsOpen, true);
});
