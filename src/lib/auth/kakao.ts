import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

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
    this.config = config;
  }

  async login(): Promise<{ accessToken: string; userInfo: KakaoUserInfo }> {
    try {
      // Step 1: Get authorization code
      const authUrl = this.buildAuthUrl();
      const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: this.config.redirectUri,
      });

      if (result.type !== 'success' || !result.params.code) {
        throw new Error('카카오 로그인이 취소되었습니다.');
      }

      // Step 2: Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(result.params.code);
      
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
      const error = await response.json();
      throw new Error(`카카오 토큰 교환 실패: ${error.error_description}`);
    }

    return response.json();
  }

  private async getUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    if (!response.ok) {
      throw new Error('카카오 사용자 정보 조회 실패');
    }

    return response.json();
  }
}

export const kakaoAuth = new KakaoAuth({
  restApiKey: process.env.KAKAO_REST_API_KEY || '',
  redirectUri: process.env.KAKAO_REDIRECT_URI || 'divergram://auth/kakao',
});