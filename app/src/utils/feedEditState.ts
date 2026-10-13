export type EditablePostMedia = {
  uri: string;
  type: 'image' | 'video';
};

export function normalizePostIdParam(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return String(candidate || '').trim();
}

export function splitStoredCaption(value: unknown): { title: string; notes: string } {
  const caption = String(value || '').replace(/\r\n/g, '\n').trim();
  if (!caption) return { title: '', notes: '' };

  const [firstLine, ...remainingLines] = caption.split('\n');
  return {
    title: firstLine.trim(),
    notes: remainingLines.join('\n').trim(),
  };
}

export function buildFeedEditState(post: Record<string, any>) {
  const content = splitStoredCaption(post.content);
  const media: EditablePostMedia[] = (Array.isArray(post.media) ? post.media : [])
    .map((item: any) => ({
      uri: String(item?.url || '').trim(),
      type: item?.type === 'video' ? ('video' as const) : ('image' as const),
    }))
    .filter((item: EditablePostMedia) => Boolean(item.uri));

  if (!media.length && String(post.image || '').trim()) {
    media.push({ uri: String(post.image).trim(), type: 'image' });
  }

  const supplement = {
    resortName: String(post.resort ?? ''),
    temperature: String(post.waterTemperature ?? ''),
    visibility: String(post.visibility ?? ''),
    buddy: String(post.buddyName ?? ''),
  };

  return {
    form: {
      title: content.title,
      diveType: ['scuba', 'freediving', 'daily'].includes(String(post.diveType || ''))
        ? post.diveType
        : 'freediving',
      gasType: ['air', 'nitrox', 'heliox'].includes(String(post.gasType || ''))
        ? post.gasType
        : 'air',
      gasPercent: String(post.gasPercent ?? ''),
      pointName: String(post.diveSite || post.location || ''),
      pointAddress: String(post.location || ''),
      locationLat: String(post.locationLat ?? ''),
      locationLng: String(post.locationLng ?? ''),
      ...supplement,
      depth: String(post.maxDepth ?? ''),
      duration: String(post.diveDuration ?? ''),
      notes: content.notes,
      photoUri: media.find((item) => item.type === 'image')?.uri || '',
    },
    media,
    pointQuery: String(post.location || post.diveSite || ''),
    resortQuery: supplement.resortName,
    publishToFeed: post.publishToFeed !== false,
    publishToReels: post.publishToReels === true,
    contentVisibility: ['inherit', 'public', 'followers', 'private'].includes(String(post.visibilityType || ''))
      ? post.visibilityType
      : 'inherit',
    detailsOpen: Object.values(supplement).some((value) => value.trim() !== ''),
  };
}
