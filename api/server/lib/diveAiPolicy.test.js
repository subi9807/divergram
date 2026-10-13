import test from 'node:test';
import assert from 'node:assert/strict';
import { diveAiCacheId, getDiveAiPolicy } from './diveAiPolicy.js';

test('AI models and token limits are task-specific and configurable', () => {
  const policy = getDiveAiPolicy('dive_caption', { OPENAI_DIVE_CAPTION_MODEL: 'caption-model', OPENAI_DIVE_CAPTION_MAX_OUTPUT_TOKENS: '90' });
  assert.equal(policy.model, 'caption-model');
  assert.equal(policy.maxOutputTokens, 90);
  assert.equal(policy.cache, true);
  assert.equal(getDiveAiPolicy('transcription', { OPENAI_MODEL: 'text-only-model' }).model, 'gpt-4o-mini-transcribe');
  assert.throws(() => getDiveAiPolicy('unknown', {}));
});

test('cache keys are owner scoped and stable without exposing prompt text', () => {
  const first = diveAiCacheId({ userId: 'u1', task: 'dive_summary', model: 'm1', prompt: 'private memo' });
  assert.equal(first, diveAiCacheId({ userId: 'u1', task: 'dive_summary', model: 'm1', prompt: 'private memo' }));
  assert.notEqual(first, diveAiCacheId({ userId: 'u2', task: 'dive_summary', model: 'm1', prompt: 'private memo' }));
  assert.equal(first.includes('private memo'), false);
});
