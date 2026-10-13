import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiveCopilotSuggestions, buildOneTapReadiness } from '../src/services/diveCopilot.ts';

const base = { sourceType: 'manual', diveDate: '2026-09-06', entryTime: '10:00', entryLocation: { lat: 33, lng: 126 }, media: [] };

test('copilot only proposes reviewable evidence and never invents fields', () => {
  const suggestions = buildDiveCopilotSuggestions({ ...base, media: [{
    id: 'p1', type: 'image', createdAt: '', updatedAt: '',
    aiAnalysis: { marineLifeCandidates: ['turtle'], environmentCandidates: [], confidence: 'medium', notes: '', source: 'AI_SUGGESTION', confirmed: false },
    diveMatch: { status: 'inside', candidateLogIds: ['d1'], suggestedLogId: 'd1', evidence: 'CAPTURE_LOCAL_AND_DIVE_INTERVAL', confirmed: false },
  }] }, 'd1', new Date('2026-09-06T11:00:00'));
  assert.deepEqual(suggestions.map(item => item.kind), ['photo_tags', 'photo_match', 'environment']);
  assert.equal(suggestions.every(item => item.evidenceRefs.length > 0), true);
});

test('accepted and rejected photo proposals are no longer offered', () => {
  const suggestions = buildDiveCopilotSuggestions({ ...base, weather: { source: 'cache' }, media: [{
    id: 'p1', type: 'image', createdAt: '', updatedAt: '',
    aiAnalysis: { marineLifeCandidates: ['turtle'], environmentCandidates: [], confidence: 'medium', notes: '', source: 'AI_SUGGESTION', confirmed: true },
    diveMatch: { status: 'inside', candidateLogIds: ['d1'], suggestedLogId: 'd1', evidence: 'CAPTURE_LOCAL_AND_DIVE_INTERVAL', confirmed: false, rejected: true },
  }] }, 'd1', new Date('2026-09-06T11:00:00'));
  assert.deepEqual(suggestions, []);
});

test('one tap readiness distinguishes required facts from optional enrichment', () => {
  const rows = buildOneTapReadiness({ ...base, maxDepth: 0, memo: 'ok' });
  assert.equal(rows.find(item => item.id === 'base')?.status, 'ready');
  assert.equal(rows.find(item => item.id === 'memo')?.status, 'ready');
  assert.equal(rows.find(item => item.id === 'photos')?.status, 'optional');
});
