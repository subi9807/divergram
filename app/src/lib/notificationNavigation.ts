import { parseAppDeepLink } from './deepLinks';

export function notificationDestination(row: { deepLink?: string; postId?: string; type: string; actor: { id: string } }): string | null {
  const destination = parseAppDeepLink(row.deepLink);
  if (destination && destination !== '/(tabs)/notifications') return destination;
  if (row.postId) return `/(tabs)/post?post=${encodeURIComponent(row.postId)}`;
  if (row.type === 'follow' && row.actor.id) return `/(tabs)/account?userId=${encodeURIComponent(row.actor.id)}`;
  return null;
}

export async function markNotificationsRead(ids: string[], mark: (id: string) => Promise<unknown>) {
  let failed = 0;
  for (let i = 0; i < ids.length; i += 5) {
    const result = await Promise.allSettled(ids.slice(i, i + 5).map(mark));
    failed += result.filter(item => item.status === 'rejected').length;
  }
  return { failed, succeeded: ids.length - failed };
}
