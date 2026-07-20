const ALLOWED_TASKS = new Set(['dive_summary', 'dive_caption', 'marine_risk', 'dive_point_recommendation', 'health']);

export function registerAiGenerationRoutes(app, { getAuthUserId, authRateLimit }) {
  app.post('/api/ai/generate', authRateLimit(20, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const task = String(req.body?.task || '').trim();
    const prompt = String(req.body?.prompt || '').trim();
    if (!ALLOWED_TASKS.has(task)) return res.status(400).json({ error: 'invalid_ai_task' });
    if (!prompt || prompt.length > 4000) return res.status(400).json({ error: 'invalid_ai_prompt' });

    const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) return res.status(503).json({ error: 'ai_not_configured' });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
          input: prompt,
          max_output_tokens: task === 'dive_point_recommendation' ? 160 : 240,
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(502).json({ error: 'ai_provider_failed' });
      const text = String(payload?.output_text || '').trim().slice(0, 4000);
      if (!text) return res.status(502).json({ error: 'ai_empty_response' });
      return res.json({ ok: true, task, text });
    } catch (error) {
      return res.status(error?.name === 'AbortError' ? 504 : 502).json({ error: 'ai_request_failed' });
    } finally {
      clearTimeout(timeout);
    }
  });
}
