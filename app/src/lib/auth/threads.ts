import * as WebBrowser from 'expo-web-browser';
import { apiClient } from '../api';

WebBrowser.maybeCompleteAuthSession();

const THREADS_LINK_RETURN_URL = 'https://divergram.com/auth/callback';

export async function linkThreadsAccount() {
  const { url, returnUrl } = await apiClient.startOAuthLink('threads', THREADS_LINK_RETURN_URL);
  if (!/^https?:\/\//i.test(url)) throw new Error('threads_auth_url_missing');

  const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);
  if (result.type !== 'success' || !result.url) throw new Error('threads_link_cancelled');

  const callback = new URL(result.url);
  if (callback.searchParams.get('oauth_link') !== 'success') {
    throw new Error(callback.searchParams.get('reason') || 'threads_link_failed');
  }
  return true;
}
