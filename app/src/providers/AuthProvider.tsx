import React, { createContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import {
  GoogleSignin,
  isSuccessResponse as isGoogleSignInSuccess,
} from '@react-native-google-signin/google-signin';
import type * as AppleAuthenticationTypes from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { apiClient } from '../lib/api';
import { getLayoutPreviewPayload, isLayoutPreviewEnabled } from '../lib/layoutPreview';
import { getSocialAuthConfig, toGoogleIosUrlScheme } from '../config/socialAuth';
import { useToast } from '../components/Toast';
import i18n from '../lib/i18n';
import { storage } from '../lib/storage';
import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  deleteSecureAuthValue,
  getSecureAuthValue,
  hydrateSecureAuthStorage,
  setSecureAuthValue,
} from '../lib/secureAuthStorage';
import { useSettingsFeatureStore } from '../stores/settingsFeatureStore';
import { startUserPreferencesSync, stopUserPreferencesSync } from '../services/userPreferencesSyncService';

function normalizeEnvValue(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  const lowered = normalized.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return '';
  return normalized;
}

const AUTH_USER_KEY = 'auth_user';
const AUTH_SESSION_EXPIRES_AT_KEY = 'auth_session_expires_at';
const AUTH_STORAGE_KEYS = [AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_USER_KEY, AUTH_SESSION_EXPIRES_AT_KEY] as const;
const AUTH_BOOT_TIMEOUT_MS = 10000;
const DEFAULT_SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}_timeout`));
    }, timeoutMs);
    promise.then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function parseDateMs(value: unknown): number | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

async function hydrateAuthBackup() {
  try {
    const entries = await AsyncStorage.multiGet([...AUTH_STORAGE_KEYS]);
    const lookup = Object.fromEntries(entries.map(([key, value]) => [key, value || '']));
    await hydrateSecureAuthStorage();
    const token = String(getSecureAuthValue(AUTH_TOKEN_KEY) || '').trim();
    if (!token) return null;
    let cachedUser: User | null = null;
    const rawUser = String(lookup[AUTH_USER_KEY] || '').trim();
    if (rawUser) {
      try {
        cachedUser = normalizeUser(JSON.parse(rawUser));
      } catch {
        cachedUser = null;
      }
    }
    return {
      token,
      refreshToken: String(getSecureAuthValue(REFRESH_TOKEN_KEY) || '').trim() || null,
      user: cachedUser,
      sessionExpiresAt: parseDateMs(lookup[AUTH_SESSION_EXPIRES_AT_KEY]),
    };
  } catch {
    return null;
  }
}

function persistAuthBackup(payload: { token: string; refreshToken?: string | null; user?: User | null; sessionExpiresAt?: string | null }) {
  void AsyncStorage.multiSet([
    [AUTH_USER_KEY, payload.user ? JSON.stringify(payload.user) : ''],
    [AUTH_SESSION_EXPIRES_AT_KEY, payload.sessionExpiresAt || ''],
  ]).catch(() => undefined);
}

function clearAuthBackup() {
  void AsyncStorage.multiRemove([AUTH_USER_KEY, AUTH_SESSION_EXPIRES_AT_KEY]).catch(() => undefined);
}

function resolveSessionExpiryMs(sessionDays?: number) {
  const now = Date.now();
  const requestedDays = Number(sessionDays);
  const fallbackDays = Number.isFinite(requestedDays) && requestedDays > 0 ? requestedDays : DEFAULT_SESSION_DAYS;
  return now + fallbackDays * DAY_MS;
}

function formatAppleFullName(fullName?: AppleAuthenticationTypes.AppleAuthenticationFullName | null) {
  if (!fullName) return '';
  return [fullName.givenName, fullName.middleName, fullName.familyName]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');
}

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

function normalizeUser(raw: any): User | null {
  const id = String(raw?.id || '').trim();
  const email = String(raw?.email || '').trim().toLowerCase();
  if (!id || !email) return null;
  const name = raw?.name ? String(raw.name) : undefined;
  const avatar = raw?.avatar ? String(raw.avatar) : undefined;
  return { id, email, name, avatar };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  syncCurrentUserProfile: (profile: { full_name?: string; username?: string; avatar_url?: string }) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithInstagram: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, name: string, contact: string) => Promise<User | null>;
  signupWithSocialAccount: (signup: SocialSignupInput) => Promise<User | null>;
  linkSocialAccount: (link: SocialLinkInput, options?: { requireCurrentSession?: boolean }) => Promise<void>;
  logout: () => void;
  getAccessToken: () => string | null;
}

type SocialProvider = 'google' | 'apple' | 'instagram';

export type SocialLinkInput = {
  provider: SocialProvider;
  providerUserId: string;
  email: string;
  linkToken?: string;
};

export type SocialSignupInput = {
  provider: SocialProvider;
  accessToken: string;
  userInfo?: any;
  providerUserId?: string;
  email?: string;
  name?: string;
  avatar?: string;
};

function normalizeOAuthErrorText(error: any) {
  const body = error?.response?.data || {};
  return String(body?.code || body?.error || body?.message || error?.code || error?.message || '').toLowerCase();
}

function isSocialEmailExistsError(error: any) {
  const status = Number(error?.response?.status || 0);
  const text = normalizeOAuthErrorText(error);
  return status === 409 && (text.includes('sso_email_exists') || text.includes('email'));
}

function isSocialSignupRequiredError(error: any) {
  const status = Number(error?.response?.status || 0);
  const text = normalizeOAuthErrorText(error);
  if (text.includes('sso_signup_required') || text.includes('oauth_signup_required')) return true;
  if (text.includes('user_not_found') || text.includes('member_not_found') || text.includes('account_not_found')) return true;
  if (text.includes('not_registered') || text.includes('no_member') || text.includes('no_user')) return true;
  if (text.includes('회원') || text.includes('가입')) return true;
  return status === 404 && /user|member|account|registered/.test(text);
}

function buildSocialLinkError(provider: SocialProvider, error: any, userInfo?: any) {
  const body = error?.response?.data || {};
  const linkError = new Error('sso_email_exists');
  (linkError as any).code = 'sso_email_exists';
  (linkError as any).socialLink = {
    provider,
    providerUserId: String(body?.providerUserId || body?.provider_user_id || userInfo?.id || userInfo?.sub || '').trim(),
    email: String(body?.email || userInfo?.email || '').trim().toLowerCase(),
    linkToken: String(body?.linkToken || body?.link_token || '').trim(),
  } satisfies SocialLinkInput;
  return linkError;
}

function buildSocialSignupInput(provider: SocialProvider, accessToken: string, userInfo?: any, error?: any): SocialSignupInput {
  const body = error?.response?.data || {};
  return {
    provider,
    accessToken,
    userInfo,
    providerUserId: String(body?.providerUserId || body?.provider_user_id || userInfo?.id || userInfo?.sub || '').trim(),
    email: String(body?.email || userInfo?.email || '').trim().toLowerCase() || undefined,
    name: String(body?.name || userInfo?.name || userInfo?.nickname || '').trim() || undefined,
    avatar: String(body?.avatar || userInfo?.avatar || userInfo?.picture || userInfo?.profile_image || '').trim() || undefined,
  };
}

function decodeBase64JsonSegment(segment: string): Record<string, any> | null {
  const raw = String(segment || '').trim();
  if (!raw) return null;
  try {
    const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    const decoded = typeof globalThis.atob === 'function' ? globalThis.atob(padded) : '';
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function buildGoogleUserInfoHint(token: string, fallback?: Record<string, any>) {
  const claims = decodeBase64JsonSegment(String(token || '').split('.')[1] || '');
  const source = claims || fallback || {};
  const providerUserId = String(source.sub || source.user_id || source.providerUserId || source.id || '').trim();
  const email = String(source.email || '').trim().toLowerCase();
  const name = String(source.name || source.given_name || source.nickname || source.full_name || '').trim();
  const avatar = String(source.picture || source.avatar || source.photoURL || '').trim();
  if (!providerUserId && !email && !name && !avatar) return undefined;
  return {
    id: providerUserId || undefined,
    sub: providerUserId || undefined,
    providerUserId: providerUserId || undefined,
    email: email || undefined,
    name: name || undefined,
    avatar: avatar || undefined,
  };
}

function buildGoogleUserInfoFromTokens(accessToken: string, idToken?: string, fallback?: Record<string, any>) {
  return buildGoogleUserInfoHint(idToken || accessToken, fallback);
}

function buildSocialSignupError(provider: SocialProvider, accessToken: string, userInfo?: any, error?: any) {
  const signupError = new Error('sso_signup_required');
  (signupError as any).code = 'sso_signup_required';
  (signupError as any).socialSignup = buildSocialSignupInput(provider, accessToken, userInfo, error);
  return signupError;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pushInitUserIdRef = useRef<string | null>(null);
  const { showToast } = useToast();
  const socialAuth = getSocialAuthConfig();
  const googleIosUrlScheme = toGoogleIosUrlScheme(socialAuth.googleClientIdIos);
  const googleRedirectUri = useMemo(
    () =>
      normalizeEnvValue(
        AuthSession.makeRedirectUri({
          scheme: 'divergram',
          path: 'auth',
          native: Platform.OS === 'ios' && googleIosUrlScheme ? `${googleIosUrlScheme}:/oauthredirect` : undefined,
        })
      ),
    [googleIosUrlScheme]
  );
  const [googleAuthRequest, , promptGoogleAsync] = Google.useAuthRequest(
    {
      iosClientId: socialAuth.googleClientIdIos || undefined,
      androidClientId: socialAuth.googleClientIdAndroid || undefined,
      webClientId: socialAuth.googleClientIdWeb || undefined,
      redirectUri: googleRedirectUri,
      scopes: ['openid', 'profile', 'email'],
      selectAccount: true,
      // loginWithGoogle exchanges the code synchronously so the caller can finish
      // the API login before navigating. Prevent the hook from consuming it first.
      shouldAutoExchangeCode: false,
      extraParams: { access_type: 'offline', prompt: 'select_account' },
    } as any,
    { native: Platform.OS === 'ios' && googleIosUrlScheme ? `${googleIosUrlScheme}:/oauthredirect` : undefined }
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || !socialAuth.googleClientIdWeb) return;
    GoogleSignin.configure({
      webClientId: socialAuth.googleClientIdWeb,
      scopes: ['profile', 'email'],
      offlineAccess: false,
    });
  }, [socialAuth.googleClientIdWeb]);

  // OAuth configuration
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const googleClientId = isExpoGo
    ? socialAuth.googleClientIdWeb
    : Platform.select({
        ios: socialAuth.googleClientIdIos,
        android: socialAuth.googleClientIdAndroid,
        default: socialAuth.googleClientIdWeb,
      });

  const clearAuthSession = useCallback(() => {
    deleteSecureAuthValue(AUTH_TOKEN_KEY);
    deleteSecureAuthValue(REFRESH_TOKEN_KEY);
    storage.delete(AUTH_USER_KEY);
    storage.delete(AUTH_SESSION_EXPIRES_AT_KEY);
    clearAuthBackup();
    useSettingsFeatureStore.getState().syncSocialLinks([]);
    setUser(null);
  }, []);

  const extendAuthSession = useCallback((sessionDays = DEFAULT_SESSION_DAYS) => {
    const sessionExpiryMs = resolveSessionExpiryMs(sessionDays);
    storage.set(AUTH_SESSION_EXPIRES_AT_KEY, new Date(sessionExpiryMs).toISOString());
    return sessionExpiryMs;
  }, []);

  const persistAuthPayload = useCallback(
    (
      payload: any,
      fallback?: Partial<User>,
      options?: {
        sessionDays?: number;
      }
    ) => {
      const token = String(payload?.token || payload?.accessToken || payload?.access_token || '').trim();
      if (!token) throw new Error('missing_auth_token');
      setSecureAuthValue(AUTH_TOKEN_KEY, token);
      const nextRefreshToken = String(payload?.refreshToken || payload?.refresh_token || '').trim();
      if (nextRefreshToken) setSecureAuthValue(REFRESH_TOKEN_KEY, nextRefreshToken);
      else if (!getSecureAuthValue(REFRESH_TOKEN_KEY)) deleteSecureAuthValue(REFRESH_TOKEN_KEY);

      const userPayload = payload?.user || {};
      const profilePayload = payload?.profile || {};
      const nextUser = normalizeUser({
        id: String(userPayload.id || fallback?.id || ''),
        email: String(userPayload.email || fallback?.email || ''),
        name: profilePayload.full_name || profilePayload.username || fallback?.name,
        avatar: profilePayload.avatar_url || fallback?.avatar,
      });
      setUser(nextUser);
      if (nextUser) {
        storage.set(AUTH_USER_KEY, JSON.stringify(nextUser));
      }
      const sessionExpiryMs = extendAuthSession(options?.sessionDays || DEFAULT_SESSION_DAYS);
      persistAuthBackup({
        token,
        refreshToken: nextRefreshToken || null,
        user: nextUser,
        sessionExpiresAt: new Date(sessionExpiryMs).toISOString(),
      });
      return nextUser;
    },
    [extendAuthSession]
  );

  const syncCurrentUserProfile = useCallback((profile: { full_name?: string; username?: string; avatar_url?: string }) => {
    setUser((current) => {
      if (!current) return current;
      const nextUser = normalizeUser({
        id: current.id,
        email: current.email,
        name: String(profile.full_name || profile.username || current.name || '').trim(),
        avatar: String(profile.avatar_url || current.avatar || '').trim(),
      });
      if (!nextUser) return current;
      storage.set(AUTH_USER_KEY, JSON.stringify(nextUser));
      return nextUser;
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

  const syncSocialLinksFromServer = useCallback(async () => {
    try {
      const result = await apiClient.getOAuthLinks();
      useSettingsFeatureStore.getState().syncSocialLinks(result.links);
      return result.links;
    } catch {
      return [];
    }
  }, []);

  const linkCurrentSocialAccountFromError = useCallback(async (provider: SocialProvider, error: any, userInfo?: any) => {
    const body = error?.response?.data || {};
    const linkToken = String(body?.linkToken || body?.link_token || '').trim();
    const email = String(body?.email || userInfo?.email || '').trim().toLowerCase();
    const currentEmail = String(user?.email || '').trim().toLowerCase();
    if (!linkToken || !currentEmail || email !== currentEmail) return false;

    try {
      const response = await apiClient.linkOAuthMobile(linkToken);
      persistAuthPayload(response.data, undefined, { sessionDays: DEFAULT_SESSION_DAYS });
      await syncSocialLinksFromServer();
      showToast({
        type: 'success',
        title: i18n.t('auth.ssoLinkedTitle'),
        message: i18n.t('auth.ssoLinkedMessage', { provider }),
      });
      return true;
    } catch (linkError: any) {
      const linkMessage = String(linkError?.response?.data?.error || linkError?.message || '');
      if (linkMessage.includes('oauth_already_linked')) {
        await syncSocialLinksFromServer();
        return true;
      }
      throw linkError;
    }
  }, [persistAuthPayload, showToast, syncSocialLinksFromServer, user?.email]);

  const linkSocialAccount = useCallback(async (link: SocialLinkInput, options?: { requireCurrentSession?: boolean }) => {
    const linkToken = String(link.linkToken || '').trim();
    if (!linkToken) throw new Error('missing_link_token');
    if (options?.requireCurrentSession) {
      const response = await apiClient.linkOAuthMobile(linkToken);
      persistAuthPayload(response.data);
      await syncSocialLinksFromServer();
      return;
    }
    try {
      const response = await apiClient.linkOAuthMobileConfirm(linkToken, 'approve');
      persistAuthPayload(response.data);
      await syncSocialLinksFromServer();
      return;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404 || status === 405) {
        const response = await apiClient.linkOAuthMobile(linkToken);
        persistAuthPayload(response.data);
        await syncSocialLinksFromServer();
        return;
      }
      throw error;
    }
  }, [persistAuthPayload, syncSocialLinksFromServer]);

  const signInOrSignUpWithGoogle = useCallback(
    async (googleAccessToken: string, userInfoHint?: Record<string, any>, googleIdToken?: string) => {
      try {
        const response = await apiClient.authWithOAuthMobile('google', googleAccessToken, 30, userInfoHint, googleIdToken);
        persistAuthPayload(response.data, undefined, { sessionDays: 30 });
        void syncSocialLinksFromServer();
      } catch (error: any) {
        if (isSocialEmailExistsError(error)) {
          if (await linkCurrentSocialAccountFromError('google', error)) return;
          throw buildSocialLinkError('google', error);
        }
        if (isSocialSignupRequiredError(error)) {
          throw buildSocialSignupError('google', googleAccessToken, undefined, error);
        }
        throw error;
      }
    },
    [linkCurrentSocialAccountFromError, persistAuthPayload, syncSocialLinksFromServer]
  );

  const checkAuthState = useCallback(async () => {
    const previewPayload = isLayoutPreviewEnabled() ? getLayoutPreviewPayload() : null;
    if (previewPayload?.auth?.user?.id && previewPayload.auth.user.email) {
      const previewUser = normalizeUser(previewPayload.auth.user);
      if (previewUser) {
        const previewToken = String(previewPayload.auth.token || 'layout-preview-token').trim();
        const previewRefreshToken = String(previewPayload.auth.refreshToken || '').trim();
        const sessionExpiresAt = previewPayload.auth.sessionExpiresAt || new Date(resolveSessionExpiryMs(DEFAULT_SESSION_DAYS)).toISOString();
        setSecureAuthValue(AUTH_TOKEN_KEY, previewToken);
        if (previewRefreshToken) setSecureAuthValue(REFRESH_TOKEN_KEY, previewRefreshToken);
        storage.set(AUTH_USER_KEY, JSON.stringify(previewUser));
        storage.set(AUTH_SESSION_EXPIRES_AT_KEY, sessionExpiresAt);
        setUser(previewUser);
        setLoading(false);
        return;
      }
    }

    await hydrateSecureAuthStorage();
    let token = getSecureAuthValue(AUTH_TOKEN_KEY);
    let rawUser = storage.getString(AUTH_USER_KEY);
    let sessionExpiresAt = parseDateMs(storage.getString(AUTH_SESSION_EXPIRES_AT_KEY));
    if (!token || !rawUser || !sessionExpiresAt) {
      const backup = await hydrateAuthBackup();
      if (backup?.token) {
        token = token || backup.token;
        if (!rawUser && backup.user) {
          rawUser = JSON.stringify(backup.user);
        }
        if (!sessionExpiresAt && backup.sessionExpiresAt) {
          sessionExpiresAt = backup.sessionExpiresAt;
        }
        setSecureAuthValue(AUTH_TOKEN_KEY, token);
        if (backup.refreshToken) setSecureAuthValue(REFRESH_TOKEN_KEY, backup.refreshToken);
        if (backup.user) storage.set(AUTH_USER_KEY, JSON.stringify(backup.user));
        if (backup.sessionExpiresAt) storage.set(AUTH_SESSION_EXPIRES_AT_KEY, new Date(backup.sessionExpiresAt).toISOString());
      }
    }
    if (sessionExpiresAt && Date.now() > sessionExpiresAt) {
      clearAuthSession();
      setLoading(false);
      return;
    }
    if (token) {
      extendAuthSession(DEFAULT_SESSION_DAYS);
    }
    let cachedUser: User | null = null;
    if (rawUser) {
      try {
        cachedUser = normalizeUser(JSON.parse(rawUser));
      } catch {
        storage.delete(AUTH_USER_KEY);
      }
    }

    if (!token) {
      // 토큰이 없어도 캐시 사용자 정보가 있으면 세션 UX를 유지한다.
      if (cachedUser) {
        setUser(cachedUser);
        setLoading(false);
        return;
      }
      clearAuthSession();
      setLoading(false);
      return;
    }

    if (cachedUser) {
      setUser(cachedUser);
      // 캐시 세션이 있으면 즉시 화면을 띄우고 서버 검증은 백그라운드로 진행
      setLoading(false);
    }

    try {
      const userData = normalizeUser(await withTimeout(apiClient.getMe(), AUTH_BOOT_TIMEOUT_MS, 'auth_get_me'));
      if (userData) {
        setUser(userData);
        storage.set(AUTH_USER_KEY, JSON.stringify(userData));
      } else if (!cachedUser) {
        setUser(null);
      }
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        const refreshToken = getSecureAuthValue(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          try {
            const refreshed = await withTimeout(
              apiClient.refreshToken(refreshToken),
              AUTH_BOOT_TIMEOUT_MS,
              'auth_refresh'
            );
            persistAuthPayload(refreshed, cachedUser || undefined, { sessionDays: DEFAULT_SESSION_DAYS });
            const userData = normalizeUser(
              await withTimeout(apiClient.getMe(), AUTH_BOOT_TIMEOUT_MS, 'auth_get_me_after_refresh')
            );
            if (userData) {
              setUser(userData);
              storage.set(AUTH_USER_KEY, JSON.stringify(userData));
              return;
            }
          } catch {
            // refresh failed -> clear session below
          }
        }
        if (!cachedUser) {
          clearAuthSession();
        }
      }
    } finally {
      if (!cachedUser) {
        setLoading(false);
      }
    }
  }, [clearAuthSession, extendAuthSession, persistAuthPayload]);

  useEffect(() => {
    void Promise.resolve().then(checkAuthState);
  }, [checkAuthState]);

  useEffect(() => {
    const userId = String(user?.id || '').trim();
    if (!userId) {
      pushInitUserIdRef.current = null;
      stopUserPreferencesSync();
      return;
    }
    if (pushInitUserIdRef.current === userId) return;
    pushInitUserIdRef.current = userId;
    void startUserPreferencesSync(userId);
    void syncSocialLinksFromServer();
  }, [syncSocialLinksFromServer, user?.id]);

  const loginWithGoogle = async () => {
    try {
      if (isExpoGo) {
        throw new Error('google_requires_dev_build');
      }
      if (!googleClientId) {
        throw new Error('missing_google_client_id');
      }
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const nativeResult = await GoogleSignin.signIn();
        if (!isGoogleSignInSuccess(nativeResult)) {
          throw new Error('google_login_cancelled');
        }
        const tokens = await GoogleSignin.getTokens();
        const accessToken = String(tokens.accessToken || '').trim();
        const idToken = String(tokens.idToken || nativeResult.data.idToken || '').trim();
        if (!accessToken && !idToken) {
          throw new Error('google_access_token_missing');
        }
        const nativeUser = nativeResult.data.user;
        await signInOrSignUpWithGoogle(
          accessToken || idToken,
          {
            id: nativeUser.id,
            sub: nativeUser.id,
            email: nativeUser.email,
            name: nativeUser.name || '',
            avatar: nativeUser.photo || '',
          },
          idToken
        );
        return;
      }
      if (!googleAuthRequest) {
        throw new Error('google_request_not_ready');
      }
      if (!googleRedirectUri) {
        throw new Error('invalid_return_url');
      }
      const result = await promptGoogleAsync();

      if (result.type !== 'success') {
        throw new Error(result.type === 'cancel' || result.type === 'dismiss' ? 'google_login_cancelled' : 'google_login_failed');
      }

      let access_token = String(
        result.authentication?.accessToken ||
          result.authentication?.idToken ||
          result.params.access_token ||
          result.params.id_token ||
          ''
      ).trim();
      let googleIdToken = String(
        result.authentication?.idToken ||
          result.params.id_token ||
          ''
      ).trim();
      if (!access_token && result.params.code) {
        const discovery = {
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenEndpoint: 'https://oauth2.googleapis.com/token',
          revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
          userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
        };
        const exchange = await AuthSession.exchangeCodeAsync(
          {
            clientId: googleClientId!,
            code: result.params.code,
            redirectUri: googleRedirectUri,
            extraParams: String((googleAuthRequest as any)?.codeVerifier || '').trim()
              ? { code_verifier: String((googleAuthRequest as any)?.codeVerifier || '').trim() }
              : undefined,
          },
          discovery
        );
        const exchangePayload = exchange as any;
        access_token = String(exchangePayload.accessToken || exchangePayload.authentication?.accessToken || exchangePayload.idToken || '').trim();
        googleIdToken = String(exchangePayload.idToken || exchangePayload.authentication?.idToken || '').trim();
      }

      if (!access_token) {
        throw new Error('google_access_token_missing');
      }

      const googleUserInfoHint = buildGoogleUserInfoHint(access_token, {
        id: result.params.sub || result.params.user_id || result.params.id || (result.authentication as any)?.userId || '',
        sub: result.params.sub || result.params.user_id || result.params.id || (result.authentication as any)?.userId || '',
        email: result.params.email || (result.authentication as any)?.email || '',
        name: result.params.name || (result.authentication as any)?.fullName || (result.authentication as any)?.displayName || '',
        avatar: result.params.picture || (result.authentication as any)?.picture || '',
      });

      const fallbackGoogleUserInfo = buildGoogleUserInfoFromTokens(access_token, googleIdToken, googleUserInfoHint);
      await signInOrSignUpWithGoogle(access_token, fallbackGoogleUserInfo, googleIdToken);
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const loginWithApple = async () => {
    try {
      const AppleAuthentication = await import('expo-apple-authentication');
      if (Platform.OS !== 'ios') {
        throw new Error('apple_requires_ios');
      }
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new Error('apple_login_unavailable');
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const identityToken = String(credential.identityToken || '').trim();
      if (!identityToken) {
        throw new Error('apple_identity_token_missing');
      }
      await handleOAuthSuccess('apple', identityToken, {
        id: credential.user,
        email: credential.email || '',
        name: formatAppleFullName(credential.fullName),
        authorizationCode: credential.authorizationCode || '',
        realUserStatus: credential.realUserStatus,
      });
    } catch (error) {
      console.error('Apple login error:', error);
      throw error;
    }
  };

  const loginWithInstagram = async () => {
    try {
      const { instagramAuth } = await import('../lib/auth/instagram');
      const { accessToken, userInfo } = await instagramAuth.login();
      await handleOAuthSuccess('instagram', accessToken, {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.username,
        avatar: '',
      });
    } catch (error) {
      // OAuth cancellation/failure is handled by the login screen; avoid Expo's blocking error overlay.
      console.info('Instagram login did not complete:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const response = await apiClient.authWithEmail(email, password, DEFAULT_SESSION_DAYS);
      persistAuthPayload(response.data, undefined, { sessionDays: DEFAULT_SESSION_DAYS });
      void syncSocialLinksFromServer();
      
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

  const signupWithEmail = async (email: string, password: string, name: string, contact: string): Promise<User | null> => {
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
        const response = await apiClient.authWithEmailSignup(normalizedEmail, password, username, 'personal', DEFAULT_SESSION_DAYS);
        const createdUser = persistAuthPayload(response.data, {
          email: normalizedEmail,
          name: normalizedName || username,
        }, { sessionDays: DEFAULT_SESSION_DAYS });
        void syncSocialLinksFromServer();
        showToast({
          type: 'success',
          title: i18n.t('auth.welcomeTitle'),
          message: i18n.t('auth.welcomeMessage')
        });
        return createdUser;
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

  const signupWithSocialAccount = async (signup: SocialSignupInput): Promise<User | null> => {
    try {
      const userInfo = {
        ...(signup.userInfo || {}),
        providerUserId: signup.providerUserId,
        email: signup.email,
        name: signup.name,
        avatar: signup.avatar,
      };
      const response = await apiClient.authWithOAuthSignup(signup.provider, signup.accessToken, userInfo, DEFAULT_SESSION_DAYS);
      const createdUser = persistAuthPayload(response.data, {
        email: signup.email,
        name: signup.name,
        avatar: signup.avatar,
      }, { sessionDays: DEFAULT_SESSION_DAYS });
      void syncSocialLinksFromServer();

      showToast({
        type: 'success',
        title: i18n.t('auth.socialSignupCompleteTitle'),
        message: i18n.t('auth.socialSignupCompleteMessage')
      });
      return createdUser;
    } catch (error) {
      console.error('Social signup error:', error);
      throw error;
    }
  };

  const handleOAuthSuccess = async (provider: SocialProvider, accessToken: string, userInfo?: any) => {
    try {
      const response = await apiClient.authWithOAuth(provider, accessToken, userInfo, DEFAULT_SESSION_DAYS);
      persistAuthPayload(response.data, undefined, { sessionDays: DEFAULT_SESSION_DAYS });
      void syncSocialLinksFromServer();
      
      showToast({
        type: 'success',
        title: i18n.t('auth.welcomeTitle'),
        message: i18n.t('auth.welcomeMessage')
      });
    } catch (error: any) {
      if (isSocialEmailExistsError(error)) {
        if (await linkCurrentSocialAccountFromError(provider, error, userInfo)) return;
        throw buildSocialLinkError(provider, error, userInfo);
      }
      if (isSocialSignupRequiredError(error)) {
        throw buildSocialSignupError(provider, accessToken, userInfo, error);
      }
      if (error?.response?.status === 404) {
        throw new Error('oauth_backend_not_available');
      }
      console.error('OAuth success handler error:', error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    clearAuthSession();
    
    showToast({
      type: 'info',
      title: i18n.t('auth.signedOutTitle'),
      message: i18n.t('auth.signedOutMessage')
    });
  }, [clearAuthSession, showToast]);

  const getAccessToken = () => {
    return getSecureAuthValue(AUTH_TOKEN_KEY);
  };

  const value = {
    user,
    loading,
    syncCurrentUserProfile,
    loginWithGoogle,
    loginWithApple,
    loginWithInstagram,
    loginWithEmail,
    signupWithEmail,
    signupWithSocialAccount,
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
