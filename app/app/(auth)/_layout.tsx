import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AuthLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="tutorial" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="account-recovery" />
      <Stack.Screen name="consent" />
      <Stack.Screen name="policy-document" />
      <Stack.Screen name="callback" />
      <Stack.Screen name="privacy" options={{ title: t('auth.privacy'), headerShown: true }} />
      <Stack.Screen name="terms" options={{ title: t('auth.terms'), headerShown: true }} />
    </Stack>
  );
}
