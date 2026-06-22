import Constants from 'expo-constants';

export type SocialAuthConfig = {
  googleClientIdIos: string;
  googleClientIdAndroid: string;
  googleClientIdWeb: string;
  kakaoRestApiKey: string;
  kakaoRedirectUri: string;
  naverClientId: string;
  naverClientSecret: string;
  naverRedirectUri: string;
  instagramClientId: string;
  instagramClientSecret: string;
  instagramRedirectUri: string;
};

function normalizeEnvValue(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  const lowered = normalized.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return '';
  return normalized;
}

function readExtraSocialAuth(): Partial<SocialAuthConfig> {
  const extra = (Constants.expoConfig?.extra ?? {}) as { socialAuth?: Partial<SocialAuthConfig> };
  return extra.socialAuth ?? {};
}

export function toGoogleIosUrlScheme(clientId: string): string | null {
  const trimmed = String(clientId || '').trim();
  if (!trimmed) return null;
  const suffix = '.apps.googleusercontent.com';
  if (!trimmed.endsWith(suffix)) return null;
  const id = trimmed.slice(0, -suffix.length);
  return id ? `com.googleusercontent.apps.${id}` : null;
}

export function getSocialAuthConfig(): SocialAuthConfig {
  const extra = readExtraSocialAuth();

  return {
    googleClientIdIos:
      normalizeEnvValue(extra.googleClientIdIos) ||
      normalizeEnvValue(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || process.env.GOOGLE_CLIENT_ID_IOS),
    googleClientIdAndroid:
      normalizeEnvValue(extra.googleClientIdAndroid) ||
      normalizeEnvValue(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || process.env.GOOGLE_CLIENT_ID_ANDROID),
    googleClientIdWeb:
      normalizeEnvValue(extra.googleClientIdWeb) ||
      normalizeEnvValue(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || process.env.GOOGLE_CLIENT_ID_WEB),
    kakaoRestApiKey:
      normalizeEnvValue(extra.kakaoRestApiKey) ||
      normalizeEnvValue(process.env.KAKAO_REST_API_KEY),
    kakaoRedirectUri:
      normalizeEnvValue(extra.kakaoRedirectUri) ||
      normalizeEnvValue(process.env.KAKAO_REDIRECT_URI || 'divergram://auth/kakao'),
    naverClientId:
      normalizeEnvValue(extra.naverClientId) ||
      normalizeEnvValue(process.env.NAVER_CLIENT_ID),
    naverClientSecret:
      normalizeEnvValue(extra.naverClientSecret) ||
      normalizeEnvValue(process.env.NAVER_CLIENT_SECRET),
    naverRedirectUri:
      normalizeEnvValue(extra.naverRedirectUri) ||
      normalizeEnvValue(process.env.NAVER_REDIRECT_URI || 'divergram://auth/naver'),
    instagramClientId:
      normalizeEnvValue(extra.instagramClientId) ||
      normalizeEnvValue(process.env.INSTAGRAM_CLIENT_ID),
    instagramClientSecret:
      normalizeEnvValue(extra.instagramClientSecret) ||
      normalizeEnvValue(process.env.INSTAGRAM_CLIENT_SECRET),
    instagramRedirectUri:
      normalizeEnvValue(extra.instagramRedirectUri) ||
      normalizeEnvValue(process.env.INSTAGRAM_REDIRECT_URI || 'divergram://auth/instagram'),
  };
}
