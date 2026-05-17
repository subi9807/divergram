import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../../src/hooks/useAuth';
import { LoadingOverlay } from '../../../src/components/LoadingOverlay';
import { useToast } from '../../../src/components/Toast';
import { useTranslation } from 'react-i18next';

export default function AppleCallbackScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const { loginWithApple } = useAuth();

  const handleCallback = useCallback(async () => {
      try {
        if (params.code || params.id_token) {
          // Handle the OAuth callback
          await loginWithApple();
          router.replace('/(tabs)/feed');
        } else if (params.error) {
          throw new Error(params.error as string);
        }
      } catch (error) {
        console.error('Apple OAuth callback error:', error);
        showToast({
          type: 'error',
          title: t('auth.error'),
          message: t('auth.loginFailed')
        });
        router.replace('/(auth)/login');
      }
  }, [loginWithApple, params, showToast, t]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  return (
    <View className="flex-1 bg-white">
      <LoadingOverlay visible={true} text={t('auth.processing')} />
    </View>
  );
}
