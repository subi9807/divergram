import '../global.css';
import React, { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Device from 'expo-device';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ToastProvider } from '../src/components/Toast';
import { AuthProvider } from '../src/providers/AuthProvider';
import { GlobalEdgeSwipeNav } from '../src/components/GlobalEdgeSwipeNav';
import { useAuth } from '../src/hooks/useAuth';
import { useResolvedTheme } from '../src/hooks/useResolvedTheme';
import { initializeAdMob } from '../src/lib/initAdMob';
import { loadAiSettings } from '../src/services/aiSettingsService';
import { useNotifications } from '../src/lib/notifications';
import { Sentry } from '../src/lib/sentry';

SplashScreen.preventAutoHideAsync().catch(() => {});
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient();

function RootLayout() {
  useFrameworkReady();
  const { resolvedTheme } = useResolvedTheme();
  const { setColorScheme } = useNativewindColorScheme();
  const { width } = useWindowDimensions();
  const [swipeTranslateX] = useState(() => new Animated.Value(0));
  const [splashHidden, setSplashHidden] = useState(false);

  const hideSplash = useCallback(async () => {
    if (splashHidden) return;
    try {
      await SplashScreen.hideAsync();
    } catch {
      // no-op: splash can be already hidden
    } finally {
      setSplashHidden(true);
    }
  }, [splashHidden]);

  useEffect(() => {
    const fallback = setTimeout(() => {
      hideSplash();
    }, 1800);
    return () => clearTimeout(fallback);
  }, [hideSplash]);

  const handleRootLayout = useCallback(() => {
    hideSplash();
  }, [hideSplash]);

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
    <SafeAreaProvider>
      <View style={styles.root} onLayout={handleRootLayout}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>
              <AccountDeletionNavigationGuard />
              <SettingsHydrationBridge />
              <NotificationBootstrapBridge />
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
  );
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

function NotificationBootstrapBridge() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  useNotifications(Boolean(user?.id) && !(Platform.OS === 'ios' && !Device.isDevice), String(user?.id || ''));

  useEffect(() => {
    if (!user?.id || Platform.OS === 'web') return;

    const openNotification = (data: Record<string, unknown> | undefined) => {
      const raw = String(data?.deepLink || data?.deep_link || '').trim();
      if (!raw) {
        router.push('/(tabs)/notifications' as never);
        return;
      }
      const internal = raw
        .replace(/^https?:\/\/(www\.)?divergram\.com/i, '')
        .replace(/^divergram:\/\//i, '/');
      const postQueryId = internal.match(/^\/post\?(?:.*&)?post=([^&]+)/)?.[1];
      if (postQueryId) {
        router.push(`/(tabs)/post?post=${encodeURIComponent(decodeURIComponent(postQueryId))}` as never);
      } else if (internal.startsWith('/posts/')) {
        router.push(`/(tabs)/post?post=${encodeURIComponent(internal.slice('/posts/'.length))}` as never);
      } else if (internal === '/notifications' || internal.startsWith('/notifications?')) {
        router.push('/(tabs)/notifications' as never);
      } else if (internal.startsWith('/')) {
        router.push(internal as never);
      } else {
        router.push('/(tabs)/notifications' as never);
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      openNotification(response.notification.request.content.data as Record<string, unknown>);
    });
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openNotification(response.notification.request.content.data as Record<string, unknown>);
    });
    return () => {
      subscription.remove();
      receivedSubscription.remove();
    };
  }, [queryClient, router, user?.id]);

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
