import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoadingOverlay } from '../../../src/components/LoadingOverlay';
import { useToast } from '../../../src/components/Toast';

function pickParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

export function CallbackScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>;

  useEffect(() => {
    const oauth = pickParam(params.oauth);
    const oauthLink = pickParam(params.oauth_link);
    const error = pickParam(params.error) || pickParam(params.reason) || pickParam(params.error_description);
    const success = oauth === 'success' || oauthLink === 'success' || pickParam(params.linked) === '1' || pickParam(params.success) === '1';

    const timer = setTimeout(() => {
      if (error || oauth === 'failed' || oauthLink === 'failed') {
        showToast({
          type: 'error',
          title: t('auth.error'),
          message: error || t('auth.loginFailed'),
        });
        router.replace('/(auth)/login');
        return;
      }

      if (success) {
        router.replace('/(tabs)/feed');
        return;
      }

      router.replace('/(auth)/login');
    }, 0);

    return () => clearTimeout(timer);
  }, [params, showToast, t]);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <LoadingOverlay visible={true} text={t('auth.processing')} />
    </View>
  );
}

export default CallbackScreen;
