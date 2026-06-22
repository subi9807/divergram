import * as WebBrowser from 'expo-web-browser';
import i18n from '../i18n';
import { readJsonResponse } from '../fetch-json';
import { getSocialAuthConfig } from '../../config/socialAuth';

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

interface InstagramAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface InstagramTokenResponse {
  access_token: string;
  user_id: string;
}

interface InstagramUserInfo {
  id: string;
  username: string;
  email?: string;
}

export class InstagramAuth {
  private config: InstagramAuthConfig;

  constructor(config: InstagramAuthConfig) {
    const fallbackRedirectUri = 'divergram://auth/instagram';
    const redirectUri = normalizeEnvValue(config.redirectUri) || fallbackRedirectUri;
    this.config = {
      clientId: normalizeEnvValue(config.clientId),
      clientSecret: normalizeEnvValue(config.clientSecret),
      redirectUri: isUrlLike(redirectUri) ? redirectUri : fallbackRedirectUri,
    };
  }

  async login(): Promise<{ accessToken: string; userInfo: InstagramUserInfo }> {
    try {
      if (!this.config.clientId || this.config.clientId.startsWith('your-')) {
        throw new Error('instagram_config_missing');
      }
      if (!this.config.clientSecret || this.config.clientSecret.startsWith('your-')) {
        throw new Error('instagram_config_missing');
      }

      const authUrl = this.buildAuthUrl();
      const returnUrl = normalizeEnvValue(this.config.redirectUri);
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
      const code = String(callback.searchParams.get('code') || '').trim();
      if (!code) {
        throw new Error(i18n.t('auth.instagramCancelled', { defaultValue: 'Instagram 로그인이 취소되었습니다.' }));
      }

      const tokenResponse = await this.exchangeCodeForToken(code);
      const userInfo = await this.getUserInfo(tokenResponse.access_token);
      return {
        accessToken: tokenResponse.access_token,
        userInfo,
      };
    } catch (error) {
      console.info('Instagram login did not complete:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'user_profile,user_media',
      response_type: 'code',
    });
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  private async exchangeCodeForToken(code: string): Promise<InstagramTokenResponse> {
    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
        code,
      }).toString(),
    });

    if (!response.ok) {
      const error = await readJsonResponse<any>(response);
      throw new Error(i18n.t('auth.instagramTokenExchangeFailed', { defaultValue: `Instagram 토큰 교환 실패: ${String(error.error_message || error.error_description || response.status)}` }));
    }

    return readJsonResponse<InstagramTokenResponse>(response);
  }

  private async getUserInfo(accessToken: string): Promise<InstagramUserInfo> {
    const response = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`);
    if (!response.ok) {
      throw new Error(i18n.t('auth.instagramUserInfoFailed', { defaultValue: 'Instagram 사용자 정보 조회 실패' }));
    }
    return readJsonResponse<InstagramUserInfo>(response);
  }
}

const socialAuth = getSocialAuthConfig();

export const instagramAuth = new InstagramAuth({
  clientId: socialAuth.instagramClientId,
  clientSecret: socialAuth.instagramClientSecret,
  redirectUri: socialAuth.instagramRedirectUri,
});
