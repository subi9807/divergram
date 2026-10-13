import type { DiveLog, MarineWeather } from '../models';
import { apiClient } from '../lib/api';

const OPENAI_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4.1-mini';

export type AiHealthStatus = 'ready' | 'missing_key' | 'unreachable';

function outputLanguage(locale: string) {
  return ({ ko: 'Korean', en: 'English', ja: 'Japanese', zh: 'Simplified Chinese' } as Record<string, string>)[locale.split(/[-_]/)[0]] || 'English';
}

async function callOpenAiText(task: string, prompt: string, fallback: string): Promise<string> {
  try {
    return (await apiClient.generateAiText(task, prompt)) || fallback;
  } catch {
    return fallback;
  }
}

export async function generateDiveLogSummary(log: DiveLog, locale = 'en', fallback = ''): Promise<string> {
  const prompt = [
    `Write a two-sentence dive log summary in ${outputLanguage(locale)}.`,
    `Dive site: ${log.divePointName || '-'}`,
    `Maximum depth: ${log.maxDepth ?? '-'}m`,
    `Average depth: ${log.avgDepth ?? '-'}m`,
    `Duration: ${log.totalDiveTime ?? '-'} minutes`,
    `Water temperature: ${log.waterTemperature ?? '-'}℃`,
    `Memo: ${log.memo || '-'}`,
  ].join('\n');
  return callOpenAiText('dive_summary', prompt, fallback);
}

export async function generateDiveCaption(log: DiveLog, locale = 'en'): Promise<string> {
  const fallback = `#Divergram #DiveLog ${log.divePointName || ''}`.trim();
  const prompt = [
    `Write a one- or two-sentence diving social caption in ${outputLanguage(locale)}, followed by three hashtags.`,
    `Dive site: ${log.divePointName || '-'}`,
    `Depth: ${log.maxDepth ?? '-'}m`,
    `Water temperature: ${log.waterTemperature ?? '-'}℃`,
    `Memo: ${log.memo || '-'}`,
  ].join('\n');
  return callOpenAiText('dive_caption', prompt, fallback);
}

export async function generateMarineRiskDescription(weather: MarineWeather, locale = 'en', fallback = weather.summary): Promise<string> {
  const language = ({ ko: 'Korean', en: 'English', ja: 'Japanese', zh: 'Simplified Chinese' } as Record<string, string>)[locale.split(/[-_]/)[0]] || 'English';
  const prompt = [
    `Write two concise dive-condition guidance sentences in ${language}.`,
    'Do not translate proper nouns. Do not claim the conditions are safe.',
    `Wave height: ${weather.waveHeightM ?? '-'}m`,
    `Current speed: ${weather.currentSpeedKnot ?? '-'}kt`,
    `Water temperature: ${weather.waterTempC ?? '-'}℃`,
    `Visibility: ${weather.visibilityM ?? '-'}m`,
    `Risk level: ${weather.riskLevel}`,
  ].join('\n');
  return callOpenAiText('marine_risk', prompt, fallback);
}

export async function recommendDivePoint(profile: { level?: string; tags?: string[] }, locale = 'en'): Promise<string[]> {
  const fallback = ['Jeju Munseom', 'Amed Reef'];
  const prompt = [
    `Recommend three dive sites for this diver. Return names only, one per line, using ${outputLanguage(locale)} where localization is appropriate.`,
    `Level: ${profile.level || '-'}`,
    `Interest tags: ${(profile.tags || []).join(', ') || '-'}`,
  ].join('\n');

  const text = await callOpenAiText('dive_point_recommendation', prompt, fallback.join('\n'));
  const items = text
    .split('\n')
    .map((line) => line.replace(/^[\-\d\.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
  return items.length ? items : fallback;
}

export function getAiRuntimeConfig() {
  return {
    hasApiKey: true,
    model: OPENAI_MODEL,
  };
}

export async function checkAiHealth(): Promise<{ status: AiHealthStatus; message: string }> {
  const fallbackToken = `__ai_health_fallback__${Date.now()}`;
  const text = await callOpenAiText('health', 'Reply with "ok" only.', fallbackToken);
  if (!text || text === fallbackToken) {
    return { status: 'unreachable', message: 'Response check required' };
  }
  return { status: 'ready', message: `Active (${OPENAI_MODEL})` };
}
