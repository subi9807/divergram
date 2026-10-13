import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const dateLocales: Record<string, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  zh: 'zh-CN',
};

export function formatDate(date: Date | string, language = 'en'): string {
  const d = new Date(date);
  const normalizedLanguage = String(language || 'en').split(/[-_]/)[0];
  return d.toLocaleDateString(dateLocales[normalizedLanguage] || 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatDepth(meters: number): string {
  return `${meters.toFixed(1)}m`;
}

export function formatTemperature(celsius: number): string {
  return `${celsius.toFixed(1)}°C`;
}

export function formatCompactNumber(value: number): string {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs < 1000) {
    const local = Number.isInteger(n) ? `${n}` : `${Math.round(n * 10) / 10}`;
    return local.replace(/\.0$/, '');
  }
  const raw = abs / 1000;
  const short = raw >= 10 ? Math.round(raw).toString() : raw.toFixed(1).replace(/\.0$/, '');
  return `${n < 0 ? '-' : ''}${short}k`;
}
