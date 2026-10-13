import * as WebBrowser from 'expo-web-browser';
import { apiClient } from '../api';

WebBrowser.maybeCompleteAuthSession();

const FACEBOOK_LINK_RETURN_URL = 'https://divergram.com/auth/callback';

export async function linkFacebookAccount() {
  const { url, returnUrl } = await apiClient.startOAuthLink('facebook', FACEBOOK_LINK_RETURN_URL);
  if (!/^https?:\/\//i.test(url)) throw new Error('facebook_auth_url_missing');

  const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);
  if (result.type !== 'success' || !result.url) throw new Error('facebook_link_cancelled');

  const callback = new URL(result.url);
  if (callback.searchParams.get('oauth_link') !== 'success') {
    throw new Error(callback.searchParams.get('reason') || 'facebook_link_failed');
  }
  return true;
}
