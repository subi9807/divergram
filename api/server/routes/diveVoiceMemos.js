import multer from 'multer';
import { getDiveAiPolicy } from '../lib/diveAiPolicy.js';

const ALLOWED_AUDIO = new Set(['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, done) => done(null, ALLOWED_AUDIO.has(String(file.mimetype || '').toLowerCase())) });

export function registerDiveVoiceMemoRoutes(app, { getAuthUserId, authRateLimit, fetchImpl = fetch }) {
  app.post('/api/dive-ai/transcribe', authRateLimit(8, 60_000), (req, res) => {
    if (!getAuthUserId(req)) return res.status(401).json({ error: 'unauthorized' });
    upload.single('audio')(req, res, async uploadError => {
      if (uploadError || !req.file?.buffer?.length) return res.status(uploadError?.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: uploadError?.code === 'LIMIT_FILE_SIZE' ? 'audio_too_large' : 'invalid_audio' });
      if (String(req.body?.consent) !== 'true') return res.status(400).json({ error: 'transcription_consent_required' });
      const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
      if (!apiKey) return res.status(503).json({ error: 'ai_not_configured' });
      const body = new FormData();
      body.append('model', getDiveAiPolicy('transcription').model);
      body.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname || 'dive-memo.m4a');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await fetchImpl('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body, signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return res.status(502).json({ error: 'transcription_provider_failed' });
        const transcript = String(payload?.text || '').trim().slice(0, 10000);
        if (!transcript) return res.status(502).json({ error: 'empty_transcript' });
        return res.json({ ok: true, data: { transcript, source: 'SPEECH_TO_TEXT', confirmed: false } });
      } catch (error) {
        return res.status(error?.name === 'AbortError' ? 504 : 502).json({ error: 'transcription_failed' });
      } finally { clearTimeout(timeout); }
    });
  });
}
