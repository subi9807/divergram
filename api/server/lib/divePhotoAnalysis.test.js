import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDivePhotoAnalysis, parseDivePhotoAnalysisText } from './divePhotoAnalysis.js';

test('photo AI output remains an unconfirmed suggestion and is bounded', () => {
  const value = normalizeDivePhotoAnalysis({ marineLifeCandidates: [' Turtle ', 'Turtle'], candidateDetails: [{ name: 'Turtle', category: 'reptile', scientificName: 'Chelonioidea', summary: 'Marine reptile', habitat: 'Coastal water', identificationTips: ['Shell', 'Flippers'] }], environmentCandidates: Array(20).fill('reef'), confidence: 'high', notes: 'ok', maxDepth: 30, source: 'VERIFIED' });
  assert.deepEqual(value.marineLifeCandidates, ['Turtle']);
  assert.deepEqual(value.candidateDetails[0], { name: 'Turtle', category: 'reptile', scientificName: 'Chelonioidea', summary: 'Marine reptile', habitat: 'Coastal water', identificationTips: ['Shell', 'Flippers'] });
  assert.deepEqual(value.environmentCandidates, ['reef']);
  assert.equal(value.source, 'AI_SUGGESTION');
  assert.equal(value.confirmed, false);
  assert.equal('maxDepth' in value, false);
});
test('marine organism categories include coral and reject unknown provider values', () => {
  const value = normalizeDivePhotoAnalysis({
    marineLifeCandidates: ['Staghorn coral', 'Unknown organism'],
    candidateDetails: [
      { name: 'Staghorn coral', category: 'coral' },
      { name: 'Unknown organism', category: 'invented' },
    ],
  });
  assert.equal(value.candidateDetails[0].category, 'coral');
  assert.equal(value.candidateDetails[1].category, 'other');
});
test('markdown JSON is accepted but invalid provider output fails closed', () => {
  assert.equal(parseDivePhotoAnalysisText('```json\n{"marineLifeCandidates":[],"confidence":"medium"}\n```').confidence, 'medium');
  for (const input of ['', 'not json', '[]']) assert.throws(() => parseDivePhotoAnalysisText(input));
});
