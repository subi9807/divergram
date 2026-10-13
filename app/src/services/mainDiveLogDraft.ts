export type MainDiveLogDraftMedia = {
  uri: string;
  type: 'image' | 'video';
  photoMetadata?: Record<string, unknown>;
};

export type MainDiveLogDraft = {
  version: 1;
  updatedAt: string;
  form: Record<string, string>;
  selectedMedia: MainDiveLogDraftMedia[];
  pointQuery: string;
  resortQuery: string;
  detailsOpen: boolean;
  publishToFeed: boolean;
  publishToReels: boolean;
};

const FORM_KEYS = [
  'title', 'diveType', 'gasType', 'gasPercent', 'pointName', 'pointAddress',
  'locationLat', 'locationLng', 'resortName', 'depth', 'duration',
  'temperature', 'visibility', 'buddy', 'notes', 'photoUri',
] as const;

const MAX_DRAFT_BYTES = 450_000;

export function utf8ByteLength(value: string) {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) || 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function boundedText(value: unknown, maxLength = 20_000) {
  return typeof value === 'string' && value.length <= maxLength ? value : '';
}

export function mainDiveLogDraftKey(userId: string) {
  return `dg_main_dive_log_draft_v1:${String(userId).trim()}`;
}

export function normalizeMainDiveLogDraft(value: unknown): MainDiveLogDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  try {
    if (utf8ByteLength(JSON.stringify(value)) > MAX_DRAFT_BYTES) return null;
  } catch {
    return null;
  }
  const input = value as Record<string, unknown>;
  if (input.version !== 1 || !input.form || typeof input.form !== 'object' || Array.isArray(input.form)) return null;
  const rawForm = input.form as Record<string, unknown>;
  const form = Object.fromEntries(FORM_KEYS.map((key) => [key, boundedText(rawForm[key])])) as Record<string, string>;
  if (!['scuba', 'freediving', 'daily'].includes(form.diveType)) form.diveType = 'freediving';
  if (!['air', 'nitrox', 'heliox'].includes(form.gasType)) form.gasType = 'air';

  const rawMedia = Array.isArray(input.selectedMedia) ? input.selectedMedia.slice(0, 10) : [];
  const selectedMedia = rawMedia.flatMap((item): MainDiveLogDraftMedia[] => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const uri = boundedText(row.uri, 4_000).trim();
    if (!uri || !/^(file|content|ph|assets-library|https?):\/\//i.test(uri)) return [];
    const type = row.type === 'video' ? 'video' : row.type === 'image' ? 'image' : null;
    if (!type) return [];
    const photoMetadata = row.photoMetadata && typeof row.photoMetadata === 'object' && !Array.isArray(row.photoMetadata)
      ? JSON.parse(JSON.stringify(row.photoMetadata)) as Record<string, unknown>
      : undefined;
    return [{ uri, type, ...(photoMetadata ? { photoMetadata } : {}) }];
  });

  const updatedAt = boundedText(input.updatedAt, 64);
  if (!updatedAt || !Number.isFinite(Date.parse(updatedAt))) return null;
  return {
    version: 1,
    updatedAt,
    form,
    selectedMedia,
    pointQuery: boundedText(input.pointQuery, 4_000),
    resortQuery: boundedText(input.resortQuery, 1_000),
    detailsOpen: input.detailsOpen === true,
    publishToFeed: input.publishToFeed !== false,
    publishToReels: input.publishToReels === true,
  };
}

export function hasMainDiveLogDraftContent(draft: Pick<MainDiveLogDraft, 'form' | 'selectedMedia'>) {
  return draft.selectedMedia.length > 0 || FORM_KEYS.some((key) => {
    if (key === 'diveType' || key === 'gasType') return false;
    return Boolean(draft.form[key]?.trim());
  });
}
