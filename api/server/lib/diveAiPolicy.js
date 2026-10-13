import crypto from 'node:crypto';

const TASKS = {
  dive_summary: { modelEnv: 'OPENAI_DIVE_SUMMARY_MODEL', fallbackModel: 'gpt-4.1-mini', maxOutputTokens: 240, cache: true },
  dive_caption: { modelEnv: 'OPENAI_DIVE_CAPTION_MODEL', fallbackModel: 'gpt-4.1-mini', maxOutputTokens: 160, cache: true },
  marine_risk: { modelEnv: 'OPENAI_MARINE_RISK_MODEL', fallbackModel: 'gpt-4.1-mini', maxOutputTokens: 240, cache: false },
  dive_point_recommendation: { modelEnv: 'OPENAI_DIVE_POINT_MODEL', fallbackModel: 'gpt-4.1-mini', maxOutputTokens: 160, cache: false },
  health: { modelEnv: 'OPENAI_HEALTH_MODEL', fallbackModel: 'gpt-4.1-mini', maxOutputTokens: 240, cache: false },
  photo_analysis: { modelEnv: 'OPENAI_VISION_MODEL', fallbackModel: 'gpt-4.1-mini', maxOutputTokens: 400, cache: true },
  transcription: { modelEnv: 'OPENAI_TRANSCRIPTION_MODEL', fallbackModel: 'gpt-4o-mini-transcribe', cache: false },
};

function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

export function getDiveAiPolicy(task, env = process.env) {
  const definition = TASKS[task];
  if (!definition) throw new Error('unsupported_ai_task');
  const sharedModel = task === 'transcription' ? '' : env.OPENAI_MODEL;
  const model = String(env[definition.modelEnv] || sharedModel || definition.fallbackModel).trim();
  const suffix = task.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return {
    task,
    model: model || definition.fallbackModel,
    maxInputChars: boundedInteger(env[`OPENAI_${suffix}_MAX_INPUT_CHARS`], 4000, 256, 20_000),
    maxOutputTokens: definition.maxOutputTokens
      ? boundedInteger(env[`OPENAI_${suffix}_MAX_OUTPUT_TOKENS`], definition.maxOutputTokens, 32, 2000)
      : undefined,
    cache: definition.cache,
    policyVersion: 'dive-ai-v1',
  };
}

export function diveAiCacheId({ userId, task, model, prompt, policyVersion = 'dive-ai-v1' }) {
  const digest = crypto.createHash('sha256').update(JSON.stringify({ task, model, prompt, policyVersion })).digest('hex');
  return `${userId}:${digest}`;
}
