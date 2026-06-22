import '../global.css';
import React, { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ToastProvider } from '../src/components/Toast';
import { AuthProvider } from '../src/providers/AuthProvider';
import { GlobalEdgeSwipeNav } from '../src/components/GlobalEdgeSwipeNav';
import { useAuth } from '../src/hooks/useAuth';
import { useResolvedTheme } from '../src/hooks/useResolvedTheme';
import { loadAiSettings } from '../src/services/aiSettingsService';

SplashScreen.preventAutoHideAsync().catch(() => {});
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient();

export default function RootLayout() {
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
    setColorScheme(resolvedTheme === 'dark' ? 'dark' : 'light');
  }, [resolvedTheme, setColorScheme]);

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
              <SettingsHydrationBridge />
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

function SettingsHydrationBridge() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    void loadAiSettings();
  }, [user?.id]);

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
