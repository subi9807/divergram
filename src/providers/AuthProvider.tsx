import React, { createContext, useEffect, useState, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '../lib/api';
import { useToast } from '../components/Toast';
import { kakaoAuth } from '../lib/auth/kakao';
import { naverAuth } from '../lib/auth/naver';
import i18n from '../lib/i18n';
import { storage } from '../lib/storage';

WebBrowser.maybeCompleteAuthSession();
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || process.env.GOOGLE_CLIENT_ID_IOS || '';
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || process.env.GOOGLE_CLIENT_ID_ANDROID || '';
const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || process.env.GOOGLE_CLIENT_ID_WEB || '';

function toGoogleIosUrlScheme(clientId: string): string | null {
  const trimmed = clientId.trim();
  if (!trimmed) return null;
  const suffix = '.apps.googleusercontent.com';
  if (!trimmed.endsWith(suffix)) return null;
  const id = trimmed.slice(0, -suffix.length);
  return id ? `com.googleusercontent.apps.${id}` : null;
}

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithKakao: () => Promise<void>;
  loginWithNaver: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, name: string, contact: string) => Promise<void>;
  linkSocialAccount: (link: SocialLinkInput) => Promise<void>;
  logout: () => void;
  getAccessToken: () => string | null;
}

type SocialProvider = 'google' | 'apple' | 'facebook' | 'kakao' | 'naver';

export type SocialLinkInput = {
  provider: SocialProvider;
  providerUserId: string;
  email: string;
  linkToken?: string;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const googleIosUrlScheme = toGoogleIosUrlScheme(GOOGLE_CLIENT_ID_IOS);

  // OAuth configuration
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'divergram',
    path: 'auth',
    native: Platform.OS === 'ios' && googleIosUrlScheme ? `${googleIosUrlScheme}:/oauthredirect` : undefined,
  });

  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const googleClientId = isExpoGo
    ? GOOGLE_CLIENT_ID_WEB
    : Platform.select({
        ios: GOOGLE_CLIENT_ID_IOS,
        android: GOOGLE_CLIENT_ID_ANDROID,
        default: GOOGLE_CLIENT_ID_WEB,
      });

  useEffect(() => {
    checkAuthState();
  }, []);

  const persistAuthPayload = useCallback((payload: any, fallback?: Partial<User>) => {
    const token = payload?.token;
    if (!token) throw new Error('missing_auth_token');
    storage.set('auth_token', token);
    if (payload?.refreshToken) storage.set('refresh_token', payload.refreshToken);
    else storage.delete('refresh_token');

    const userPayload = payload?.user || {};
    const profilePayload = payload?.profile || {};
    setUser({
      id: String(userPayload.id || fallback?.id || ''),
      email: String(userPayload.email || fallback?.email || ''),
      name: profilePayload.full_name || profilePayload.username || fallback?.name,
      avatar: profilePayload.avatar_url || fallback?.avatar,
    });
  }, []);

  const sanitizeUsername = useCallback((value: string) => {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return (normalized || 'diver').slice(0, 20);
  }, []);

  const linkSocialAccount = useCallback(async (link: SocialLinkInput) => {
    const linkToken = String(link.linkToken || '').trim();
    if (!linkToken) throw new Error('missing_link_token');
    try {
      const response = await apiClient.linkOAuthMobileConfirm(linkToken, 'approve');
      persistAuthPayload(response.data);
      return;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404 || status === 405) {
        await apiClient.linkOAuthMobile(linkToken);
        return;
      }
      throw error;
    }
  }, [persistAuthPayload]);

  const signInOrSignUpWithGoogle = useCallback(
    async (googleAccessToken: string) => {
      try {
        const response = await apiClient.authWithOAuthMobile('google', googleAccessToken);
        persistAuthPayload(response.data);
      } catch (error: any) {
        const status = error?.response?.status;
        const body = error?.response?.data || {};
        const message = String(body?.error || error?.message || '');
        if (status === 409 && (message.includes('sso_email_exists') || message.includes('email'))) {
          const linkError = new Error('sso_email_exists');
          (linkError as any).code = 'sso_email_exists';
          (linkError as any).socialLink = {
            provider: 'google',
            providerUserId: String(body?.providerUserId || ''),
            email: String(body?.email || '').trim().toLowerCase(),
            linkToken: String(body?.linkToken || ''),
          } satisfies SocialLinkInput;
          throw linkError;
        }
        throw error;
      }
    },
    [persistAuthPayload]
  );

  const checkAuthState = async () => {
    try {
      const token = storage.getString('auth_token');
      if (token) {
        const userData = await apiClient.getMe();
        setUser(userData);
      }
    } catch {
      // Token invalid, clear storage
      storage.delete('auth_token');
      storage.delete('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      if (isExpoGo) {
        throw new Error('google_requires_dev_build');
      }
      if (!googleClientId) {
        throw new Error('missing_google_client_id');
      }
      const request = new AuthSession.AuthRequest({
        clientId: googleClientId!,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        extraParams: { access_type: 'offline' },
      } as any);

      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
        userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
      };

      const result = await request.promptAsync(discovery);
      
      if (result.type === 'success') {
        let access_token = result.params.access_token;
        if (!access_token && result.params.code) {
          const exchange = await AuthSession.exchangeCodeAsync(
            {
              clientId: googleClientId!,
              code: result.params.code,
              redirectUri,
              extraParams: (request as any).codeVerifier ? { code_verifier: (request as any).codeVerifier } : undefined,
            },
            discovery
          );
          access_token = exchange.accessToken;
        }
        if (!access_token) {
          throw new Error('google_access_token_missing');
        }
        await signInOrSignUpWithGoogle(access_token);
      }
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const loginWithApple = async () => {
    try {
      // Apple Sign In implementation would go here
      // For now, using mock data
      await handleOAuthSuccess('apple', 'mock_token');
    } catch (error) {
      console.error('Apple login error:', error);
      throw error;
    }
  };

  const loginWithFacebook = async () => {
    try {
      // Facebook OAuth implementation would go here
      // For now, using mock data
      await handleOAuthSuccess('facebook', 'mock_token');
    } catch (error) {
      console.error('Facebook login error:', error);
      throw error;
    }
  };

  const loginWithKakao = async () => {
    try {
      const { accessToken, userInfo } = await kakaoAuth.login();
      await handleOAuthSuccess('kakao', accessToken, {
        id: userInfo.id.toString(),
        email: userInfo.kakao_account.email,
        name: userInfo.properties.nickname,
        avatar: userInfo.properties.profile_image,
      });
    } catch (error) {
      console.error('Kakao login error:', error);
      throw error;
    }
  };

  const loginWithNaver = async () => {
    try {
      const { accessToken, userInfo } = await naverAuth.login();
      await handleOAuthSuccess('naver', accessToken, {
        id: userInfo.response.id,
        email: userInfo.response.email,
        name: userInfo.response.name,
        avatar: userInfo.response.profile_image,
      });
    } catch (error) {
      console.error('Naver login error:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const response = await apiClient.authWithEmail(email, password);
      persistAuthPayload(response.data);
      
      showToast({
        type: 'success',
        title: i18n.t('auth.welcomeBackTitle'),
        message: i18n.t('auth.welcomeBackMessage')
      });
    } catch (error) {
      console.error('Email login error:', error);
      throw error;
    }
  };

  const signupWithEmail = async (email: string, password: string, name: string, contact: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedContact = contact.trim();
    const baseUsername = sanitizeUsername(normalizedName || normalizedEmail.split('@')[0] || 'diver');
    const attempts = [
      baseUsername,
      `${baseUsername}_${Date.now().toString().slice(-6)}`,
      `${baseUsername}_${Math.floor(Math.random() * 9000 + 1000)}`,
    ];
    let lastError: any;

    for (const username of attempts) {
      try {
        const response = await apiClient.authWithEmailSignup(normalizedEmail, password, username, 'personal');
        persistAuthPayload(response.data, {
          email: normalizedEmail,
          name: normalizedName || username,
        });
        showToast({
          type: 'success',
          title: i18n.t('auth.welcomeTitle'),
          message: i18n.t('auth.welcomeMessage')
        });
        return;
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;
        const message = String(error?.response?.data?.error || error?.message || '').toLowerCase();
        const usernameConflict = status === 409 && message.includes('username');
        if (usernameConflict) continue;
        if (status === 409 && (message.includes('email') || message.includes('already'))) {
          throw new Error('email_already_exists');
        }
        if (status === 400 && message.includes('password')) {
          throw new Error('password_too_short');
        }
        throw error;
      }
    }

    // Contact is collected in mobile UX and will be saved once backend field mapping is enabled.
    void normalizedContact;
    throw lastError || new Error('signup_failed');
  };

  const handleOAuthSuccess = async (provider: string, accessToken: string, userInfo?: any) => {
    try {
      const response = await apiClient.authWithOAuth(provider, accessToken, userInfo);
      persistAuthPayload(response.data);
      
      showToast({
        type: 'success',
        title: i18n.t('auth.welcomeTitle'),
        message: i18n.t('auth.welcomeMessage')
      });
    } catch (error) {
      if ((error as any)?.response?.status === 404) {
        throw new Error('oauth_backend_not_available');
      }
      console.error('OAuth success handler error:', error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    storage.delete('auth_token');
    storage.delete('refresh_token');
    setUser(null);
    
    showToast({
      type: 'info',
      title: i18n.t('auth.signedOutTitle'),
      message: i18n.t('auth.signedOutMessage')
    });
  }, [showToast]);

  const getAccessToken = () => {
    return storage.getString('auth_token') || null;
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    loginWithApple,
    loginWithFacebook,
    loginWithKakao,
    loginWithNaver,
    loginWithEmail,
    signupWithEmail,
    linkSocialAccount,
    logout,
    getAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
