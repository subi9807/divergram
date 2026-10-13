type AppDestination = string;

const TRUSTED_WEB_HOSTS = new Set(['divergram.com', 'www.divergram.com']);

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseAppDeepLink(rawValue: unknown): AppDestination | null {
  const raw = String(rawValue || '').trim();
  if (!raw) return null;

  let internal = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (!TRUSTED_WEB_HOSTS.has(parsed.hostname.toLowerCase())) return null;
      internal = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  } else if (/^divergram:\/\//i.test(raw)) {
    internal = raw.replace(/^divergram:\/\//i, '/');
  } else if (!raw.startsWith('/')) {
    return null;
  }

  const url = internal.startsWith('/') ? internal : `/${internal}`;
  const postId = url.match(/^\/posts?\/([^/?#]+)/)?.[1] || url.match(/^\/post\?.*?[?&]?post=([^&]+)/)?.[1];
  if (postId) return `/(tabs)/post?post=${encodeURIComponent(decode(postId))}`;
  const reelId = url.match(/^\/reels?\/([^/?#]+)/)?.[1];
  if (reelId) return `/(tabs)/reels?reelId=${encodeURIComponent(decode(reelId))}`;
  const profileId = url.match(/^\/profiles?\/([^/?#]+)/)?.[1];
  if (profileId) return `/(tabs)/account?userId=${encodeURIComponent(decode(profileId))}`;
  const resortId = url.match(/^\/resorts?\/([^/?#]+)/)?.[1];
  if (resortId) return `/(tabs)/resort-detail?resortId=${encodeURIComponent(decode(resortId))}`;
  const guideId = url.match(/^\/guides?\/([^/?#]+)/)?.[1];
  if (guideId) return `/(tabs)/dive-guide-detail?id=${encodeURIComponent(decode(guideId))}`;
  const sightingId = url.match(/^\/marine-life\/([^/?#]+)/)?.[1];
  if (sightingId) return `/(tabs)/marine-life-detail?sightingId=${encodeURIComponent(decode(sightingId))}`;
  const logId = url.match(/^\/(?:dive-)?logs?\/([^/?#]+)/)?.[1];
  if (logId) return `/(tabs)/dive-log-detail?logId=${encodeURIComponent(decode(logId))}`;
  if (/^\/reels?(?:[/?#]|$)/.test(url)) return '/(tabs)/reels';
  if (/^\/licenses?(?:[/?#]|$)/.test(url)) return '/(tabs)/license-management';
  if (/^\/notifications(?:[/?#]|$)/.test(url)) return '/(tabs)/notifications';
  return null;
}

export function resolveAppDeepLink(rawValue: unknown): AppDestination {
  const destination = parseAppDeepLink(rawValue);
  if (destination) return destination;
  return '/(tabs)/notifications';
}

export function rewriteIncomingAppPath(rawValue: unknown): string {
  const raw = String(rawValue || '').trim();
  if (!raw) return '/';
  const destination = parseAppDeepLink(raw)
    || (!raw.startsWith('/') && !raw.includes('://') ? parseAppDeepLink(`/${raw}`) : null);
  return destination || raw;
}
