import type { DiveLog, MarineWeather } from '../models';
import { apiClient } from '../lib/api';

const OPENAI_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4.1-mini';

export type AiHealthStatus = 'ready' | 'missing_key' | 'unreachable';

async function callOpenAiText(task: string, prompt: string, fallback: string): Promise<string> {
  try {
    return (await apiClient.generateAiText(task, prompt)) || fallback;
  } catch {
    return fallback;
  }
}

export async function generateDiveLogSummary(log: DiveLog): Promise<string> {
  const fallback = `이번 다이빙은 최대 수심 ${log.maxDepth ?? '-'}m, 총 ${log.totalDiveTime ?? '-'}분으로 기록되었습니다.`;
  const prompt = [
    '다이빙 로그 요약을 한국어 2문장으로 작성해줘.',
    `포인트: ${log.divePointName || '-'}`,
    `최대수심: ${log.maxDepth ?? '-'}m`,
    `평균수심: ${log.avgDepth ?? '-'}m`,
    `총시간: ${log.totalDiveTime ?? '-'}분`,
    `수온: ${log.waterTemperature ?? '-'}℃`,
    `메모: ${log.memo || '-'}`,
  ].join('\n');
  return callOpenAiText('dive_summary', prompt, fallback);
}

export async function generateDiveCaption(log: DiveLog): Promise<string> {
  const fallback = `#Divergram #DiveLog ${log.divePointName || ''}`.trim();
  const prompt = [
    '다이빙 SNS 캡션을 한국어로 1~2문장 작성하고 마지막 줄에 해시태그 3개를 붙여줘.',
    `다이빙포인트: ${log.divePointName || '-'}`,
    `수심: ${log.maxDepth ?? '-'}m`,
    `수온: ${log.waterTemperature ?? '-'}℃`,
    `메모: ${log.memo || '-'}`,
  ].join('\n');
  return callOpenAiText('dive_caption', prompt, fallback);
}

export async function generateMarineRiskDescription(weather: MarineWeather): Promise<string> {
  const fallback = weather.summary;
  const prompt = [
    '다이빙 안전 가이드 문장을 한국어로 2문장 작성해줘.',
    `파고: ${weather.waveHeightM ?? '-'}m`,
    `조류속도: ${weather.currentSpeedKnot ?? '-'}kt`,
    `수온: ${weather.waterTempC ?? '-'}℃`,
    `시야: ${weather.visibilityM ?? '-'}m`,
    `위험도: ${weather.riskLevel}`,
  ].join('\n');
  return callOpenAiText('marine_risk', prompt, fallback);
}

export async function recommendDivePoint(profile: { level?: string; tags?: string[] }): Promise<string[]> {
  const fallback = ['Jeju Munseom', 'Amed Reef'];
  const prompt = [
    '다이버 프로필에 맞는 추천 포인트 3개를 이름만 줄바꿈으로 출력해줘.',
    `레벨: ${profile.level || '-'}`,
    `관심 태그: ${(profile.tags || []).join(', ') || '-'}`,
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
    return { status: 'unreachable', message: '응답 점검 필요' };
  }
  return { status: 'ready', message: `활성 (${OPENAI_MODEL})` };
}
