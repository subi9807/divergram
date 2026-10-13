import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAiGenerationRoutes } from './aiGeneration.js';

function setup() {
  const handlers = new Map();
  const records = new Map();
  let providerCalls = 0;
  const app = { post(path, ...callbacks) { handlers.set(path, callbacks.at(-1)); } };
  const pool = { async query(sql, params) {
    if (sql.startsWith('SELECT')) return { rows: records.has(params[0]) ? [{ data: records.get(params[0]) }] : [] };
    if (sql.startsWith('INSERT')) { records.set(params[0], JSON.parse(params[1])); return { rows: [] }; }
    throw new Error(`Unexpected SQL: ${sql}`);
  } };
  const fetchImpl = async () => {
    providerCalls += 1;
    return { ok: true, json: async () => ({ output_text: 'generated dive story' }) };
  };
  registerAiGenerationRoutes(app, { pool, getAuthUserId: req => req.user, authRateLimit: () => (_req, _res, next) => next(), fetchImpl });
  return {
    providerCalls: () => providerCalls,
    async call(body, user = 'owner') {
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
      await handlers.get('/api/ai/generate')({ body, user }, res);
      return res;
    },
  };
}

test('identical owner-scoped narrative prompts reuse server cache', async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  try {
    const h = setup();
    const first = await h.call({ task: 'dive_summary', prompt: 'facts only' });
    const second = await h.call({ task: 'dive_summary', prompt: 'facts only' });
    assert.equal(first.body.cached, false);
    assert.equal(second.body.cached, true);
    assert.equal(second.body.text, 'generated dive story');
    assert.equal(h.providerCalls(), 1);
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test('invalid or unauthenticated AI requests fail before provider calls', async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  try {
    const h = setup();
    assert.equal((await h.call({ task: 'dive_summary', prompt: 'ok' }, null)).statusCode, 401);
    assert.equal((await h.call({ task: 'unknown', prompt: 'ok' })).statusCode, 400);
    assert.equal((await h.call({ task: 'dive_summary', prompt: 'x'.repeat(4001) })).statusCode, 400);
    assert.equal(h.providerCalls(), 0);
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});
