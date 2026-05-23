import { Linking, Share } from 'react-native';

function makeShareMessage(message: string, mediaUrl?: string) {
  const text = String(message || '').trim();
  const url = String(mediaUrl || '').trim();
  if (!url) return text;
  if (!text) return url;
  return `${text}\n${url}`;
}

async function isInstagramInstalled() {
  try {
    return await Linking.canOpenURL('instagram://app');
  } catch {
    return false;
  }
}

export async function shareToInstagramFeed(message: string, mediaUrl?: string) {
  const shareMessage = makeShareMessage(message, mediaUrl);
  const installed = await isInstagramInstalled();
  const result = await Share.share({ message: shareMessage });
  return { ...result, installed };
}

export async function shareToInstagramStory(message: string, mediaUrl?: string) {
  const shareMessage = makeShareMessage(message, mediaUrl);
  const installed = await isInstagramInstalled();
  const result = await Share.share({ message: shareMessage });
  return { ...result, installed };
}
