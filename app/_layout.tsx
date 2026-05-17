import '../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ToastProvider } from '../src/components/Toast';
import { AuthProvider } from '../src/providers/AuthProvider';
import i18n from '../src/lib/i18n';
import { useSettingsStore } from '../src/stores/settingsStore';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  useFrameworkReady();
  const language = useSettingsStore((state) => state.language);

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

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
