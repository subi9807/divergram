import '../global.css';
import React, { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { Animated, AppState, Easing, LogBox, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ToastProvider } from '../src/components/Toast';
import { AuthProvider } from '../src/providers/AuthProvider';
import { GlobalEdgeSwipeNav } from '../src/components/GlobalEdgeSwipeNav';
import { useAuth } from '../src/hooks/useAuth';
import { useResolvedTheme } from '../src/hooks/useResolvedTheme';
import { initializeAdMob } from '../src/lib/initAdMob';
import { loadAiSettings } from '../src/services/aiSettingsService';
import {
  isRemoteNotificationRuntimeEnabled,
  useNotifications,
} from '../src/lib/notifications';
import { Sentry } from '../src/lib/sentry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../src/lib/api';
import { parseAppDeepLink, resolveAppDeepLink } from '../src/lib/deepLinks';
import { privateDiveLogService } from '../src/services/privateDiveLogService';
import { useDiveLogStore } from '../src/stores/diveLogStore';
import { isLayoutPreviewEnabled } from '../src/lib/layoutPreview';

SplashScreen.preventAutoHideAsync().catch(() => {});
WebBrowser.maybeCompleteAuthSession();
if (isLayoutPreviewEnabled()) LogBox.ignoreAllLogs();

const queryClient = new QueryClient();

function RootLayout() {
  useFrameworkReady();
  const { resolvedTheme } = useResolvedTheme();
  const { setColorScheme } = useNativewindColorScheme();
  const { width } = useWindowDimensions();
  const [swipeTranslateX] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const minimumSplashTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 2500);
    return () => clearTimeout(minimumSplashTimer);
  }, []);

  useEffect(() => {
    try {
      setColorScheme(resolvedTheme === 'dark' ? 'dark' : 'light');
    } catch {
      // NativeWind가 테마 수동 설정을 허용하지 않는 런타임에서는 무시한다.
    }
  }, [resolvedTheme, setColorScheme]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void initializeAdMob();
  }, []);

  const handleSwipeProgress = useCallback(
    (dragX: number) => {
      const friction = 0.32;
      const clamped = Math.max(-width * 0.42, Math.min(width * 0.42, dragX * friction));
      swipeTranslateX.setValue(clamped);
    },
    [swipeTranslateX, width]
  );

  const handleSwipeCancel = useCallback(() => {
    Animated.spring(swipeTranslateX, {
      toValue: 0,
      useNativeDriver: true,
      stiffness: 210,
      damping: 24,
      mass: 0.9,
    }).start();
  }, [swipeTranslateX]);

  const handleSwipeCommit = useCallback(
    (direction: 'back' | 'forward', navigate: () => void) => {
      const delta = Math.max(72, Math.round(width * 0.22));
      const target = direction === 'back' ? delta : -delta;

      Animated.timing(swipeTranslateX, {
        toValue: target,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        navigate();
        requestAnimationFrame(() => {
          swipeTranslateX.setValue(0);
        });
      });
    },
    [swipeTranslateX, width]
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>
              <AccountDeletionNavigationGuard />
              <SettingsHydrationBridge />
              <DiveLogHydrationBridge />
              <DeepLinkBootstrapBridge />
              <NotificationBootstrapBridge />
              <PresenceHeartbeatBridge />
              <Animated.View style={[styles.stackShell, { transform: [{ translateX: swipeTranslateX }] }]}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="+not-found" />
                </Stack>
              </Animated.View>
              <GlobalEdgeSwipeNav
                onSwipeProgress={handleSwipeProgress}
                onSwipeCancel={handleSwipeCancel}
                onSwipeCommit={handleSwipeCommit}
              />
              <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
            </AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const PENDING_DEEP_LINK_KEY = 'dg_pending_deep_link_v1';

function DeepLinkBootstrapBridge() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const lastReceivedRef = React.useRef('');

  useEffect(() => {
    let disposed = false;
    const remember = async (rawUrl: string | null) => {
      const destination = parseAppDeepLink(rawUrl);
      if (!destination || destination === lastReceivedRef.current) return;
      lastReceivedRef.current = destination;
      await AsyncStorage.setItem(PENDING_DEEP_LINK_KEY, destination);
      if (!disposed) setPendingDestination(destination);
    };

    void AsyncStorage.getItem(PENDING_DEEP_LINK_KEY).then((stored) => {
      if (!disposed && stored) setPendingDestination(stored);
    });
    void Linking.getInitialURL().then(remember);
    const subscription = Linking.addEventListener('url', ({ url }) => void remember(url));
    return () => {
      disposed = true;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (loading || !pendingDestination) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    void AsyncStorage.removeItem(PENDING_DEEP_LINK_KEY);
    lastReceivedRef.current = '';
    setPendingDestination(null);
    router.replace(pendingDestination as never);
  }, [loading, pendingDestination, router, user]);

  return null;
}

export default Sentry.wrap(RootLayout);

function AccountDeletionNavigationGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading, accountDeletion, accountDeletionLoading } = useAuth();
  const isRecoveryRoute = segments[0] === '(auth)' && segments[1] === 'account-recovery';

  useEffect(() => {
    if (loading || accountDeletionLoading || !user) return;
    if (accountDeletion?.pending && !isRecoveryRoute) {
      router.replace('/(auth)/account-recovery');
      return;
    }
    if (!accountDeletion?.pending && isRecoveryRoute) {
      router.replace('/(tabs)/feed');
    }
  }, [accountDeletion?.pending, accountDeletionLoading, isRecoveryRoute, loading, router, user]);

  return null;
}

function SettingsHydrationBridge() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    void loadAiSettings();
  }, [user?.id]);

  return null;
}

function DiveLogHydrationBridge() {
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const store = useDiveLogStore.getState();
    store.replaceLogs([]);
    if (!user?.id) return () => { cancelled = true; };
    store.setLoadState(true);
    void privateDiveLogService.listAll()
      .then((logs) => {
        if (!cancelled) useDiveLogStore.getState().replaceLogs(logs);
      })
      .catch((error) => {
        if (!cancelled) useDiveLogStore.getState().setLoadState(false, String(error?.response?.data?.error || error?.message || 'dive_log_load_failed'));
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  return null;
}

const PRESENCE_DEVICE_ID_KEY = 'dg_presence_device_id_v1';
let presenceDeviceIdPromise: Promise<string> | null = null;

function getPresenceDeviceId() {
  if (!presenceDeviceIdPromise) {
    presenceDeviceIdPromise = (async () => {
      const stored = await AsyncStorage.getItem(PRESENCE_DEVICE_ID_KEY);
      if (stored) return stored;
      const generated = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      await AsyncStorage.setItem(PRESENCE_DEVICE_ID_KEY, generated);
      return generated;
    })();
  }
  return presenceDeviceIdPromise;
}

function PresenceHeartbeatBridge() {
  const { user } = useAuth();
  const segments = useSegments();
  const currentRoute = `/${segments.join('/')}`;

  useEffect(() => {
    if (!user?.id || Platform.OS === 'web') return;
    let disposed = false;
    const sendHeartbeat = async () => {
      if (disposed || AppState.currentState !== 'active') return;
      try {
        await apiClient.sendPresenceHeartbeat({
          platform: Platform.OS,
          deviceId: await getPresenceDeviceId(),
          appVersion: String(Constants.expoConfig?.version || ''),
          buildNumber: String(Platform.OS === 'ios' ? Constants.expoConfig?.ios?.buildNumber || '' : Constants.expoConfig?.android?.versionCode || ''),
          currentRoute,
        });
      } catch {
        // 접속 상태 전송 실패가 앱 사용을 막아서는 안 된다.
      }
    };

    void sendHeartbeat();
    const timer = setInterval(() => void sendHeartbeat(), 30_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sendHeartbeat();
    });
    return () => {
      disposed = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [currentRoute, user?.id]);

  return null;
}

function NotificationBootstrapBridge() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = String(user?.id || '');
  const notificationRuntimeEnabled =
    Boolean(userId) && isRemoteNotificationRuntimeEnabled();
  useNotifications(notificationRuntimeEnabled, userId);

  useEffect(() => {
    if (!notificationRuntimeEnabled) return;

    const openNotification = (data: Record<string, unknown> | undefined) => {
      const raw = String(data?.deepLink || data?.deep_link || '').trim();
      router.push(resolveAppDeepLink(raw) as never);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      openNotification(response.notification.request.content.data as Record<string, unknown>);
    });
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      }
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openNotification(response.notification.request.content.data as Record<string, unknown>);
    });
    return () => {
      subscription.remove();
      receivedSubscription.remove();
      appStateSubscription.remove();
    };
  }, [notificationRuntimeEnabled, queryClient, router, userId]);

  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stackShell: {
    flex: 1,
  },
});
