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

interface NaverAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface NaverTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface NaverUserInfo {
  resultcode: string;
  message: string;
  response: {
    id: string;
    nickname: string;
    name: string;
    email: string;
    gender: 'F' | 'M' | 'U';
    age: string;
    birthday: string;
    profile_image: string;
    birthyear: string;
    mobile: string;
  };
}

export class NaverAuth {
  private config: NaverAuthConfig;

  constructor(config: NaverAuthConfig) {
    const fallbackRedirectUri = 'divergram://auth/naver';
    const redirectUri = normalizeEnvValue(config.redirectUri) || fallbackRedirectUri;
    this.config = {
      clientId: normalizeEnvValue(config.clientId),
      clientSecret: normalizeEnvValue(config.clientSecret),
      redirectUri: isUrlLike(redirectUri) ? redirectUri : fallbackRedirectUri,
    };
  }

  async login(): Promise<{ accessToken: string; userInfo: NaverUserInfo }> {
    try {
      if (!this.config.clientId || this.config.clientId.startsWith('your-')) {
        throw new Error('naver_config_missing');
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
        throw new Error(i18n.t('auth.naverCancelled'));
      }
      const callback = new URL(result.url);
      const code = String(callback.searchParams.get('code') || '').trim();
      const state = String(callback.searchParams.get('state') || '').trim();
      if (!code || !state) throw new Error(i18n.t('auth.naverCancelled'));

      // Step 2: Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(code, state);
      
      // Step 3: Get user info
      const userInfo = await this.getUserInfo(tokenResponse.access_token);

      return {
        accessToken: tokenResponse.access_token,
        userInfo
      };
    } catch (error) {
      console.error('Naver login error:', error);
      throw error;
    }
  }

  private buildAuthUrl(): string {
    const state = Math.random().toString(36).substring(2, 15);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state,
    });

    return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
  }

  private async exchangeCodeForToken(code: string, state: string): Promise<NaverTokenResponse> {
    const response = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code,
        state,
      }).toString(),
    });

    if (!response.ok) {
      const error = await readJsonResponse<any>(response);
      throw new Error(i18n.t('auth.naverTokenExchangeFailed', { message: error.error_description }));
    }

    return readJsonResponse<NaverTokenResponse>(response);
  }

  private async getUserInfo(accessToken: string): Promise<NaverUserInfo> {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(i18n.t('auth.naverUserInfoFailed'));
    }

    return readJsonResponse<NaverUserInfo>(response);
  }
}

export const naverAuth = new NaverAuth({
  clientId: getSocialAuthConfig().naverClientId || process.env.NAVER_CLIENT_ID || '',
  clientSecret: getSocialAuthConfig().naverClientSecret || process.env.NAVER_CLIENT_SECRET || '',
  redirectUri: getSocialAuthConfig().naverRedirectUri || process.env.NAVER_REDIRECT_URI || 'divergram://auth/naver',
});
