import '../global.css';
import React, { useCallback, useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ToastProvider } from '../src/components/Toast';
import { AuthProvider } from '../src/providers/AuthProvider';
import { GlobalEdgeSwipeNav } from '../src/components/GlobalEdgeSwipeNav';
import { useResolvedTheme } from '../src/hooks/useResolvedTheme';
import i18n from '../src/lib/i18n';
import { useSettingsStore } from '../src/stores/settingsStore';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  useFrameworkReady();
  const language = useSettingsStore((state) => state.language);
  const { resolvedTheme } = useResolvedTheme();
  const { width } = useWindowDimensions();
  const swipeTranslateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

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
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  stackShell: {
    flex: 1,
  },
});
