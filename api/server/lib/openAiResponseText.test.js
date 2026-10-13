import test from 'node:test';
import assert from 'node:assert/strict';
import { extractOpenAiResponseText } from './openAiResponseText.js';

test('reads SDK-style output_text', () => {
  assert.equal(extractOpenAiResponseText({ output_text: ' hello ' }), 'hello');
});

test('reads Responses REST output content', () => {
  assert.equal(extractOpenAiResponseText({
    output: [{ content: [{ type: 'output_text', text: 'translated text' }] }],
  }), 'translated text');
});

test('joins multiple text content blocks and ignores non-text content', () => {
  assert.equal(extractOpenAiResponseText({
    output: [{ content: [
      { type: 'reasoning', text: 'hidden' },
      { type: 'output_text', text: 'one' },
      { type: 'output_text', text: 'two' },
    ] }],
  }), 'one\ntwo');
});
