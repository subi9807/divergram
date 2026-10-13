import { extractOpenAiResponseText } from '../lib/openAiResponseText.js';
import { diveAiCacheId, getDiveAiPolicy } from '../lib/diveAiPolicy.js';

const ALLOWED_TASKS = new Set(['dive_summary', 'dive_caption', 'marine_risk', 'dive_point_recommendation', 'health']);

export function registerAiGenerationRoutes(app, { pool, getAuthUserId, authRateLimit, fetchImpl = fetch }) {
  app.post('/api/ai/generate', authRateLimit(20, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const task = String(req.body?.task || '').trim();
    const prompt = String(req.body?.prompt || '').trim();
    if (!ALLOWED_TASKS.has(task)) return res.status(400).json({ error: 'invalid_ai_task' });
    const policy = getDiveAiPolicy(task);
    if (!prompt || prompt.length > policy.maxInputChars) return res.status(400).json({ error: 'invalid_ai_prompt' });

    const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) return res.status(503).json({ error: 'ai_not_configured' });

    const cacheId = diveAiCacheId({ userId, task, model: policy.model, prompt, policyVersion: policy.policyVersion });
    if (policy.cache && pool) {
      try {
        const cached = await pool.query("SELECT data FROM app_records WHERE table_name='dive_ai_text_cache' AND record_id=$1 LIMIT 1", [cacheId]);
        const text = String(cached.rows[0]?.data?.text || '').trim();
        if (text) return res.json({ ok: true, task, text, cached: true });
      } catch (error) {
        if (error?.code === '42P01') return res.status(503).json({ error: 'dive_logs_migration_required' });
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: policy.model,
          input: prompt,
          max_output_tokens: policy.maxOutputTokens,
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(502).json({ error: 'ai_provider_failed' });
      const text = extractOpenAiResponseText(payload).slice(0, 4000);
      if (!text) return res.status(502).json({ error: 'ai_empty_response' });
      if (policy.cache && pool) {
        try {
          await pool.query(`INSERT INTO app_records(table_name,record_id,data,updated_at)
            VALUES('dive_ai_text_cache',$1,$2::jsonb,now())
            ON CONFLICT(table_name,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()`, [cacheId, JSON.stringify({ text, task, model: policy.model, policyVersion: policy.policyVersion })]);
        } catch {
          // Cache availability must not turn a successful optional AI draft into a failed save flow.
        }
      }
      return res.json({ ok: true, task, text, cached: false });
    } catch (error) {
      return res.status(error?.name === 'AbortError' ? 504 : 502).json({ error: 'ai_request_failed' });
    } finally {
      clearTimeout(timeout);
    }
  });
}
