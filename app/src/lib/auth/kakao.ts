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

interface KakaoAuthConfig {
  restApiKey: string;
  redirectUri: string;
}

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
}

interface KakaoUserInfo {
  id: number;
  connected_at: string;
  properties: {
    nickname: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
  kakao_account: {
    profile_nickname_needs_agreement: boolean;
    profile_image_needs_agreement: boolean;
    profile: {
      nickname: string;
      thumbnail_image_url?: string;
      profile_image_url?: string;
    };
    has_email: boolean;
    email_needs_agreement: boolean;
    is_email_valid: boolean;
    is_email_verified: boolean;
    email?: string;
  };
}

export class KakaoAuth {
  private config: KakaoAuthConfig;

  constructor(config: KakaoAuthConfig) {
    const fallbackRedirectUri = 'divergram://auth/kakao';
    const redirectUri = normalizeEnvValue(config.redirectUri) || fallbackRedirectUri;
    this.config = {
      restApiKey: normalizeEnvValue(config.restApiKey),
      redirectUri: isUrlLike(redirectUri) ? redirectUri : fallbackRedirectUri,
    };
  }

  async login(): Promise<{ accessToken: string; userInfo: KakaoUserInfo }> {
    try {
      if (!this.config.restApiKey || this.config.restApiKey.startsWith('your-')) {
        throw new Error('kakao_config_missing');
      }

      // Step 1: Get authorization code
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
        throw new Error(i18n.t('auth.kakaoCancelled'));
      }
      const callback = new URL(result.url);
      const code = String(callback.searchParams.get('code') || '').trim();
      if (!code) throw new Error(i18n.t('auth.kakaoCancelled'));

      // Step 2: Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(code);
      
      // Step 3: Get user info
      const userInfo = await this.getUserInfo(tokenResponse.access_token);

      return {
        accessToken: tokenResponse.access_token,
        userInfo
      };
    } catch (error) {
      console.error('Kakao login error:', error);
      throw error;
    }
  }

  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.restApiKey,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'profile_nickname,profile_image,account_email',
    });

    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  }

  private async exchangeCodeForToken(code: string): Promise<KakaoTokenResponse> {
    const response = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.restApiKey,
        redirect_uri: this.config.redirectUri,
        code,
      }).toString(),
    });

    if (!response.ok) {
      const error = await readJsonResponse<any>(response);
      throw new Error(i18n.t('auth.kakaoTokenExchangeFailed', { message: error.error_description }));
    }

    return readJsonResponse<KakaoTokenResponse>(response);
  }

  private async getUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    if (!response.ok) {
      throw new Error(i18n.t('auth.kakaoUserInfoFailed'));
    }

    return readJsonResponse<KakaoUserInfo>(response);
  }
}

export const kakaoAuth = new KakaoAuth({
  restApiKey: getSocialAuthConfig().kakaoRestApiKey || process.env.KAKAO_REST_API_KEY || '',
  redirectUri: getSocialAuthConfig().kakaoRedirectUri || process.env.KAKAO_REDIRECT_URI || 'divergram://auth/kakao',
});
