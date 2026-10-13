export const VISIBILITY_VALUES = new Set(['public', 'followers', 'private']);
export const ITEM_VISIBILITY_VALUES = new Set(['inherit', ...VISIBILITY_VALUES]);

export function normalizeVisibility(value, fallback = 'private') {
  const normalized = String(value || '').trim().toLowerCase();
  return VISIBILITY_VALUES.has(normalized) ? normalized : fallback;
}

export function normalizeItemVisibility(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ITEM_VISIBILITY_VALUES.has(normalized) ? normalized : 'inherit';
}

export function effectiveVisibility(itemVisibility, categoryVisibility) {
  const item = normalizeItemVisibility(itemVisibility);
  return item === 'inherit' ? normalizeVisibility(categoryVisibility) : item;
}

export function canViewVisibility(scope, { isOwner = false, isFollowing = false } = {}) {
  if (isOwner) return true;
  const normalized = normalizeVisibility(scope);
  if (normalized === 'public') return true;
  return normalized === 'followers' && isFollowing;
}
