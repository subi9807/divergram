import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmedAnalysisForSpecies, normalizeMarineLifeSighting, speciesKey } from './marineLife.js';

test('marine sighting input requires an HTTPS photo and a bounded species name', () => {
  const row = normalizeMarineLifeSighting({ speciesName: '  Clownfish  ', imageUrl: 'https://example.com/fish.jpg', observedAt: '2026-09-06', locationName: '  Blue Reef  ' });
  assert.equal(row.speciesName, 'Clownfish');
  assert.equal(row.normalizedSpeciesName, 'clownfish');
  assert.equal(row.locationName, 'Blue Reef');
  assert.equal(row.mediaType, 'image');
  assert.equal(row.mediaUrl, 'https://example.com/fish.jpg');
  for (const input of [{ speciesName: '', imageUrl: 'https://example.com/a.jpg' }, { speciesName: 'Turtle', imageUrl: 'file:///photo.jpg' }, { speciesName: 'Turtle', imageUrl: 'https://example.com/a.jpg', observedAt: 'not-a-date' }, { speciesName: 'Turtle', imageUrl: 'https://example.com/a.jpg', observedAt: '2026-02-30' }]) {
    assert.throws(() => normalizeMarineLifeSighting(input));
  }
});

test('marine sighting accepts a video with a thumbnail and coral category', () => {
  const row = normalizeMarineLifeSighting({
    speciesName: 'Staghorn coral',
    imageUrl: 'https://images.example.com/coral-frame.jpg',
    mediaType: 'video',
    mediaUrl: 'https://videos.example.com/coral.mp4',
    category: 'coral',
  });
  assert.equal(row.mediaType, 'video');
  assert.equal(row.mediaUrl, 'https://videos.example.com/coral.mp4');
  assert.equal(row.category, 'coral');
  assert.throws(() => normalizeMarineLifeSighting({ speciesName: 'Coral', imageUrl: 'https://example.com/frame.jpg', mediaType: 'video', mediaUrl: 'file:///coral.mp4' }));
});

test('AI source is accepted only when the user-selected species matches a returned candidate', () => {
  const details = { name: 'Clownfish', category: 'fish', scientificName: 'Amphiprioninae', summary: 'An anemonefish', habitat: 'Reefs', identificationTips: ['Orange body'] };
  const analysis = { marineLifeCandidates: ['Sea Turtle', 'Clownfish'], candidateDetails: [details], confidence: 'high' };
  assert.deepEqual(confirmedAnalysisForSpecies(analysis, ' clownfish '), { candidates: ['Sea Turtle', 'Clownfish'], confidence: 'high', details });
  assert.equal(confirmedAnalysisForSpecies(analysis, 'Shark'), null);
  assert.equal(speciesKey('  SEA   Turtle '), 'sea turtle');
});
