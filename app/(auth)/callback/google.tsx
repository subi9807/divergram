import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../../src/hooks/useAuth';
import { LoadingOverlay } from '../../../src/components/LoadingOverlay';
import { useToast } from '../../../src/components/Toast';
import { useTranslation } from 'react-i18next';

export default function GoogleCallbackScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (params.code || params.access_token) {
          // Handle the OAuth callback
          await loginWithGoogle();
          router.replace('/(tabs)/feed');
        } else if (params.error) {
          throw new Error(params.error as string);
        }
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        showToast({
          type: 'error',
          title: t('auth.error'),
          message: t('auth.loginFailed')
        });
        router.replace('/(auth)/login');
      }
    };

    handleCallback();
  }, [params]);

  return (
    <View className="flex-1 bg-white">
      <LoadingOverlay visible={true} text={t('auth.processing')} />
    </View>
  );
}