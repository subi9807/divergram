import crypto from 'crypto';
import { extractOpenAiResponseText } from '../lib/openAiResponseText.js';

const SUPPORTED_LANGUAGES = new Set(['ko', 'en', 'ja', 'zh']);

function normalizeLanguage(value) {
  const language = String(value || '').trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.has(language) ? language : '';
}

export function registerTranslationRoutes(app, { pool, getAuthUserId, authRateLimit }) {
  app.post('/api/translations/text', authRateLimit(30, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const text = String(req.body?.text || '').trim();
    const targetLanguage = normalizeLanguage(req.body?.targetLanguage);
    if (!text || text.length > 5000) return res.status(400).json({ error: 'invalid_translation_text' });
    if (!targetLanguage) return res.status(400).json({ error: 'unsupported_target_language' });

    const contentHash = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
    const cached = await pool.query(
      `SELECT translated_text, source_language
         FROM app_translation_cache
        WHERE content_hash=$1 AND target_language=$2
        LIMIT 1`,
      [contentHash, targetLanguage]
    );
    if (cached.rows.length) {
      return res.json({
        ok: true,
        translatedText: cached.rows[0].translated_text,
        sourceLanguage: cached.rows[0].source_language,
        targetLanguage,
        cached: true,
      });
    }

    const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) return res.status(503).json({ error: 'translation_not_configured' });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.OPENAI_TRANSLATION_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini',
          instructions: 'Translate user-generated diving community content faithfully. Preserve names, hashtags, line breaks, measurements, URLs, and emojis. Return only the translated text.',
          input: `Target language: ${targetLanguage}\n\n${text}`,
          max_output_tokens: 1200,
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(502).json({ error: 'translation_provider_failed' });
      const translatedText = extractOpenAiResponseText(payload).slice(0, 8000);
      if (!translatedText) return res.status(502).json({ error: 'translation_empty_response' });

      await pool.query(
        `INSERT INTO app_translation_cache(content_hash, target_language, translated_text)
         VALUES ($1,$2,$3)
         ON CONFLICT (content_hash, target_language)
         DO UPDATE SET translated_text=EXCLUDED.translated_text, updated_at=now()`,
        [contentHash, targetLanguage, translatedText]
      );
      return res.json({ ok: true, translatedText, sourceLanguage: null, targetLanguage, cached: false });
    } catch (error) {
      return res.status(error?.name === 'AbortError' ? 504 : 502).json({ error: 'translation_request_failed' });
    } finally {
      clearTimeout(timeout);
    }
  });
}
