import React, { useState } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Apple, ArrowLeft, Facebook, Mail, MessageCircle, UserRound } from 'lucide-react-native';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useAuth } from '../../src/hooks/useAuth';

type Provider = 'google' | 'apple' | 'facebook' | 'kakao' | 'naver';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { loginWithGoogle, loginWithApple, loginWithFacebook, loginWithKakao, loginWithNaver, loginWithEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleSocialLogin = async (provider: Provider) => {
    setLoading(true);
    try {
      switch (provider) {
        case 'google':
          await loginWithGoogle();
          break;
        case 'apple':
          await loginWithApple();
          break;
        case 'facebook':
          await loginWithFacebook();
          break;
        case 'kakao':
          await loginWithKakao();
          break;
        case 'naver':
          await loginWithNaver();
          break;
      }
      router.replace('/(tabs)/feed');
    } catch {
      Alert.alert(t('auth.error'), t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('auth.error'), t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email, password);
      router.replace('/(tabs)/feed');
    } catch {
      Alert.alert(t('auth.error'), t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen className="bg-surface-50 px-5">
      <LoadingOverlay visible={loading} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="pt-8">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.86}
            className="h-10 w-10 items-center justify-center rounded-full border border-surface-200 bg-white"
          >
            <ArrowLeft size={20} color="#475569" />
          </TouchableOpacity>
        </View>

        <View className="mt-7 mb-6">
          <Text className="text-3xl font-bold text-surface-900">{t('auth.welcome')}</Text>
          <Text className="mt-2 text-base leading-6 text-surface-600">{t('auth.loginSubtitle')}</Text>
        </View>

        {!showEmailForm ? (
          <View className="rounded-3xl border border-surface-200 bg-white p-4 shadow-sm shadow-surface-200">
            <View>
              <SocialLoginButton label={t('auth.continueWithGoogle')} onPress={() => handleSocialLogin('google')} icon="G" />
              <SocialLoginButton
                label={t('auth.continueWithApple')}
                onPress={() => handleSocialLogin('apple')}
                icon={<Apple size={18} color="#0f172a" />}
                className="mt-3"
              />
              <SocialLoginButton
                label={t('auth.continueWithFacebook')}
                onPress={() => handleSocialLogin('facebook')}
                icon={<Facebook size={18} color="#1877f2" />}
                className="mt-3"
              />
              <SocialLoginButton
                label={t('auth.continueWithKakao')}
                onPress={() => handleSocialLogin('kakao')}
                icon={<MessageCircle size={18} color="#78350f" />}
                className="mt-3 border-[#f2d84f] bg-[#fee500]"
              />
              <SocialLoginButton
                label={t('auth.continueWithNaver')}
                onPress={() => handleSocialLogin('naver')}
                icon={<UserRound size={18} color="#ffffff" />}
                className="mt-3 border-[#00c73c] bg-[#00c73c]"
                textClassName="text-white"
                iconWrapClassName="bg-white/15 border-white/20"
              />
            </View>

            <View className="my-5 flex-row items-center">
              <View className="h-px flex-1 bg-surface-200" />
              <Text className="mx-3 text-surface-500">{t('auth.or')}</Text>
              <View className="h-px flex-1 bg-surface-200" />
            </View>

            <Button onPress={() => setShowEmailForm(true)} variant="secondary" size="lg" className="w-full">
              <View className="flex-row items-center justify-center">
                <Mail size={18} color="#334155" />
                <Text className="ml-2 font-semibold text-surface-700">{t('auth.continueWithEmail')}</Text>
              </View>
            </Button>
          </View>
        ) : (
          <View className="rounded-3xl border border-surface-200 bg-white p-5 shadow-sm shadow-surface-200">
            <View>
              <Text className="mb-2 font-medium text-surface-700">{t('auth.email')}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-surface-900"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View className="mt-4">
              <Text className="mb-2 font-medium text-surface-700">{t('auth.password')}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.passwordPlaceholder')}
                secureTextEntry
                className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-surface-900"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <Button onPress={handleEmailLogin} variant="primary" size="lg" className="mt-6 w-full" disabled={loading || !email || !password}>
              {t('auth.signIn')}
            </Button>

            <Button onPress={() => setShowEmailForm(false)} variant="ghost" size="sm" className="mt-2 w-full">
              {t('auth.backToSocial')}
            </Button>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function SocialLoginButton({
  label,
  onPress,
  icon,
  className,
  textClassName,
  iconWrapClassName,
}: {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
  className?: string;
  textClassName?: string;
  iconWrapClassName?: string;
}) {
  return (
    <TouchableOpacity
      className={`h-14 w-full flex-row items-center rounded-2xl border border-surface-200 bg-white px-4 ${className || ''}`}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View className={`h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-surface-50 ${iconWrapClassName || ''}`}>
        {typeof icon === 'string' ? <Text className="font-bold text-surface-700">{icon}</Text> : icon}
      </View>
      <Text className={`ml-3 flex-1 text-center text-base font-semibold text-surface-800 ${textClassName || ''}`}>{label}</Text>
      <View className="w-8" />
    </TouchableOpacity>
  );
}
