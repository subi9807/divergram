import * as WebBrowser from 'expo-web-browser';
import i18n from '../i18n';
import { apiClient } from '../api';

WebBrowser.maybeCompleteAuthSession();

function normalizeEnvValue(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  const lowered = normalized.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return '';
  return normalized;
}

function isUrlLike(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

interface InstagramUserInfo {
  id: string;
  username: string;
  email?: string;
}

export class InstagramAuth {
  async login(): Promise<{ accessToken: string; userInfo: InstagramUserInfo }> {
    try {
      const { url: authUrl, returnUrl: rawReturnUrl } = await apiClient.startInstagramOAuth();
      const returnUrl = normalizeEnvValue(rawReturnUrl);
      if (!isUrlLike(authUrl)) {
        throw new Error('invalid_auth_url');
      }
      if (!isUrlLike(returnUrl)) {
        throw new Error('invalid_return_url');
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
      if (result.type !== 'success' || !result.url) {
        throw new Error(i18n.t('auth.instagramCancelled', { defaultValue: 'Instagram 로그인이 취소되었습니다.' }));
      }

      const callback = new URL(result.url);
      const callbackError = String(callback.searchParams.get('error') || '').trim();
      if (callbackError) {
        throw new Error(callbackError);
      }
      const ticket = String(callback.searchParams.get('ticket') || '').trim();
      if (!ticket) throw new Error('instagram_ticket_missing');
      return apiClient.completeInstagramOAuth(ticket);
    } catch (error) {
      console.info('Instagram login did not complete:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

}

export const instagramAuth = new InstagramAuth();
