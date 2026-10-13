export function getRelativeTime(date: string | Date, locale?: string): string {
  const now = new Date();
  const postDate = new Date(date);
  const diffInMs = now.getTime() - postDate.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diffInSeconds < 60) return relative.format(0, 'second');
  if (diffInMinutes < 60) return relative.format(-diffInMinutes, 'minute');
  if (diffInHours < 24) return relative.format(-diffInHours, 'hour');
  if (diffInDays <= 3) return relative.format(-diffInDays, 'day');
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(postDate);
}
