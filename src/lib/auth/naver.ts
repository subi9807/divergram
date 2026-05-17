import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import i18n from '../i18n';

WebBrowser.maybeCompleteAuthSession();

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
    this.config = config;
  }

  async login(): Promise<{ accessToken: string; userInfo: NaverUserInfo }> {
    try {
      // Step 1: Get authorization code
      const authUrl = this.buildAuthUrl();
      const result = await (AuthSession as any).startAsync({
        authUrl,
        returnUrl: this.config.redirectUri,
      });

      if (result.type !== 'success' || !result.params.code) {
        throw new Error(i18n.t('auth.naverCancelled'));
      }

      // Step 2: Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(result.params.code, result.params.state);
      
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
      const error = await response.json();
      throw new Error(i18n.t('auth.naverTokenExchangeFailed', { message: error.error_description }));
    }

    return response.json();
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

    return response.json();
  }
}

export const naverAuth = new NaverAuth({
  clientId: process.env.NAVER_CLIENT_ID || '',
  clientSecret: process.env.NAVER_CLIENT_SECRET || '',
  redirectUri: process.env.NAVER_REDIRECT_URI || 'divergram://auth/naver',
});
