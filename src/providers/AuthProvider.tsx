import React, { createContext, useEffect, useState, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { apiClient } from '../lib/api';
import { useToast } from '../components/Toast';
import { kakaoAuth } from '../lib/auth/kakao';
import { naverAuth } from '../lib/auth/naver';
import i18n from '../lib/i18n';
import { storage } from '../lib/storage';

WebBrowser.maybeCompleteAuthSession();

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
  logout: () => void;
  getAccessToken: () => string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // OAuth configuration
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'divergram',
    path: 'auth'
  });

  const googleConfig = {
    clientId: Platform.select({
      ios: process.env.GOOGLE_CLIENT_ID_IOS,
      android: process.env.GOOGLE_CLIENT_ID_ANDROID,
      default: process.env.GOOGLE_CLIENT_ID_WEB,
    }),
  };

  useEffect(() => {
    checkAuthState();
  }, []);

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
      const request = new AuthSession.AuthRequest({
        clientId: googleConfig.clientId!,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Token,
      } as any);

      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
        userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
      };

      const result = await request.promptAsync(discovery);
      
      if (result.type === 'success') {
        const { access_token } = result.params;
        await handleOAuthSuccess('google', access_token);
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
      const { token, refreshToken, user } = response.data;
      
      storage.set('auth_token', token);
      storage.set('refresh_token', refreshToken);
      setUser(user);
      
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

  const handleOAuthSuccess = async (provider: string, accessToken: string, userInfo?: any) => {
    try {
      const response = await apiClient.authWithOAuth(provider, accessToken, userInfo);
      const { token, refreshToken, user } = response.data;
      
      storage.set('auth_token', token);
      storage.set('refresh_token', refreshToken);
      setUser(user);
      
      showToast({
        type: 'success',
        title: i18n.t('auth.welcomeTitle'),
        message: i18n.t('auth.welcomeMessage')
      });
    } catch (error) {
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
    logout,
    getAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
