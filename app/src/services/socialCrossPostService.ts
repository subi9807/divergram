import { Share } from 'react-native';
import i18n from '../lib/i18n';
import { buildShareUrl } from '../lib/shareLinks';

export type SocialCrossPostTarget = 'instagram' | 'facebook' | 'threads';

type CrossPostInput = {
  postId: string;
  caption: string;
  targets: SocialCrossPostTarget[];
  visibility: 'public' | 'followers' | 'private';
};

export async function sharePostToSocialChannels({ postId, caption, targets, visibility }: CrossPostInput) {
  if (!targets.length) return { opened: false, targets: [] as SocialCrossPostTarget[] };
  if (visibility !== 'public') throw new Error('social_share_requires_public_content');

  const postUrl = buildShareUrl('post', postId);
  const targetNames: Record<SocialCrossPostTarget, string> = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    threads: 'Threads',
  };
  const names = targets.map((target) => targetNames[target]).join(', ');
  const message = [caption.trim(), postUrl].filter(Boolean).join('\n\n');
  const result = await Share.share(
    { message, url: postUrl, title: `Divergram - ${names}` },
    { dialogTitle: i18n.t('logsForm.socialDialogTitle', { names }) }
  );

  return {
    opened: result.action === Share.sharedAction,
    targets,
  };
}
