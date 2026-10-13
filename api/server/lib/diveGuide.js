export const DIVE_GUIDE_LOCALES = ['ko', 'en', 'ja', 'zh'];
export const DIVE_GUIDE_CATEGORIES = ['safety', 'equipment', 'skills', 'environment', 'travel', 'marine_life', 'news'];

const clean = (value, max) => String(value ?? '').trim().slice(0, max);

export function normalizeDiveGuideTranslations(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(DIVE_GUIDE_LOCALES.map((locale) => {
    const item = input[locale] && typeof input[locale] === 'object' ? input[locale] : {};
    return [locale, {
      title: clean(item.title, 160),
      summary: clean(item.summary, 500),
      body: clean(item.body, 20_000),
    }];
  }));
}

export function diveGuidePublicationIssues(input) {
  const translations = normalizeDiveGuideTranslations(input?.translations);
  const issues = [];
  for (const locale of DIVE_GUIDE_LOCALES) {
    if (!translations[locale].title || !translations[locale].body) issues.push(`translation_${locale}_required`);
  }
  const coverImageUrl = clean(input?.coverImageUrl ?? input?.cover_image_url, 2000);
  const videoUrl = clean(input?.videoUrl ?? input?.video_url, 2000);
  if (!coverImageUrl && !videoUrl) issues.push('guide_media_required');
  return issues;
}

export function normalizeDiveGuideInput(input, current = {}) {
  const category = clean(input?.category ?? current.category ?? 'skills', 40);
  const status = clean(input?.status ?? current.status ?? 'draft', 20);
  if (!DIVE_GUIDE_CATEGORIES.includes(category)) throw new Error('invalid_dive_guide_category');
  if (!['draft', 'published'].includes(status)) throw new Error('invalid_dive_guide_status');

  const normalized = {
    category,
    translations: normalizeDiveGuideTranslations(input?.translations ?? current.translations),
    coverImageUrl: clean(input?.coverImageUrl ?? input?.cover_image_url ?? current.cover_image_url, 2000),
    videoUrl: clean(input?.videoUrl ?? input?.video_url ?? current.video_url, 2000),
    status,
    featured: input?.featured === undefined ? current.featured === true : input.featured === true,
    sortOrder: Number.isFinite(Number(input?.sortOrder ?? input?.sort_order))
      ? Math.trunc(Number(input?.sortOrder ?? input?.sort_order))
      : Number(current.sort_order || 0),
  };
  if (status === 'published') {
    const issues = diveGuidePublicationIssues(normalized);
    if (issues.length) throw Object.assign(new Error('dive_guide_not_publishable'), { issues });
  }
  return normalized;
}

export function localizedDiveGuide(row, locale = 'ko') {
  const selectedLocale = DIVE_GUIDE_LOCALES.includes(locale) ? locale : 'en';
  const translations = normalizeDiveGuideTranslations(row?.translations);
  const copy = translations[selectedLocale];
  if (!copy.title || !copy.body) return null;
  return {
    id: String(row.id),
    category: row.category,
    title: copy.title,
    summary: copy.summary,
    body: copy.body,
    coverImageUrl: clean(row.cover_image_url, 2000),
    videoUrl: clean(row.video_url, 2000),
    featured: row.featured === true,
    publishedAt: row.published_at || row.created_at || null,
  };
}

