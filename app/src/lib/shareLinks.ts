export const DIVERGRAM_WEB_ORIGIN = 'https://divergram.com';

export type ShareableContentType = 'post' | 'reel' | 'profile' | 'resort' | 'guide' | 'marine-life';

export function buildShareUrl(type: ShareableContentType, id: string | number): string {
  const normalizedId = String(id).trim();
  if (!normalizedId) throw new Error('share_link_id_required');
  return `${DIVERGRAM_WEB_ORIGIN}/${type}/${encodeURIComponent(normalizedId)}`;
}
