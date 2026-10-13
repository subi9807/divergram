import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiveSourceDetails } from '../src/services/diveSourceDetails.ts';

test('source details keep sensor-adjacent, AI and user review evidence separate', () => {
  const details = buildDiveSourceDetails({
    id: 'd1', userId: 'u1', sourceType: 'legacy_import', diveDate: '2026-09-06', fieldSources: { maxDepth: 'IMPORT' },
    originalSource: { kind: 'UNVERIFIED_IMPORT', payload: { maxDepth: 20 } }, media: [{ id: 'p1', type: 'image', createdAt: '', updatedAt: '', photoMetadata: {}, aiAnalysis: { marineLifeCandidates: [], environmentCandidates: [], confidence: 'low', notes: '', source: 'AI_SUGGESTION', confirmed: true }, diveMatch: { status: 'inside', candidateLogIds: ['d1'], suggestedLogId: 'd1', evidence: 'CAPTURE_LOCAL_AND_DIVE_INTERVAL', confirmed: true } }],
    tags: [], isPublic: false, visibilityType: 'private', syncStatus: 'done', createdAt: '', updatedAt: '', weather: { source: 'cache', observedAt: '2026-09-06T00:00:00Z' },
  });
  assert.deepEqual(new Set(details.map(item => item.source)), new Set(['IMPORT', 'PHOTO_EXIF', 'AI_IMAGE_ANALYSIS', 'DERIVED', 'WEATHER_API']));
  assert.equal(details.find(item => item.field === 'maxDepth')?.evidenceRef, 'originalSource');
});
