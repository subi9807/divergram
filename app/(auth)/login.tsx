import React, { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useAuth } from '../../src/hooks/useAuth';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { loginWithGoogle, loginWithApple, loginWithFacebook, loginWithKakao, loginWithNaver, loginWithEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'facebook' | 'kakao' | 'naver') => {
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
    } catch (error) {
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
    } catch (error) {
      Alert.alert(t('auth.error'), t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen className="bg-white px-8 justify-center">
      <LoadingOverlay visible={loading} />
      
      <View className="absolute top-12 left-4">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View className="mb-12">
        <Text className="text-3xl font-bold text-secondary-800 mb-2">
          {t('auth.welcome')}
        </Text>
        <Text className="text-secondary-600 text-lg">
          {t('auth.loginSubtitle')}
        </Text>
      </View>

      {!showEmailForm ? (
        <View className="space-y-4">
          <Button
            onPress={() => handleSocialLogin('google')}
            variant="outline"
            size="lg"
            className="w-full flex-row items-center"
            disabled={loading}
          >
            <Text className="mr-3">🌐</Text>
            {t('auth.continueWithGoogle')}
          </Button>

          <Button
            onPress={() => handleSocialLogin('apple')}
            variant="outline"
            size="lg"
            className="w-full flex-row items-center"
            disabled={loading}
          >
            <Text className="mr-3">🍎</Text>
            {t('auth.continueWithApple')}
          </Button>

          <Button
            onPress={() => handleSocialLogin('facebook')}
            variant="outline"
            size="lg"
            className="w-full flex-row items-center"
            disabled={loading}
          >
            <Text className="mr-3">📘</Text>
            {t('auth.continueWithFacebook')}
          </Button>

          <Button
            onPress={() => handleSocialLogin('kakao')}
            variant="outline"
            size="lg"
            className="w-full flex-row items-center bg-yellow-400 border-yellow-400"
            disabled={loading}
          >
            <Text className="mr-3">💬</Text>
            <Text className="text-yellow-900 font-semibold">
              {t('auth.continueWithKakao')}
            </Text>
          </Button>

          <Button
            onPress={() => handleSocialLogin('naver')}
            variant="outline"
            size="lg"
            className="w-full flex-row items-center bg-green-500 border-green-500"
            disabled={loading}
          >
            <Text className="mr-3">🟢</Text>
            <Text className="text-white font-semibold">
              {t('auth.continueWithNaver')}
            </Text>
          </Button>

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-secondary-200" />
            <Text className="mx-4 text-secondary-500">{t('auth.or')}</Text>
            <View className="flex-1 h-px bg-secondary-200" />
          </View>

          <Button
            onPress={() => setShowEmailForm(true)}
            variant="ghost"
            size="lg"
            className="w-full flex-row items-center"
          >
            <Mail size={20} color="#64748b" className="mr-3" />
            {t('auth.continueWithEmail')}
          </Button>
        </View>
      ) : (
        <View className="space-y-4">
          <View>
            <Text className="text-secondary-700 mb-2 font-medium">
              {t('auth.email')}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-secondary-50 px-4 py-3 rounded-lg text-secondary-800"
            />
          </View>

          <View>
            <Text className="text-secondary-700 mb-2 font-medium">
              {t('auth.password')}
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              className="bg-secondary-50 px-4 py-3 rounded-lg text-secondary-800"
            />
          </View>

          <Button
            onPress={handleEmailLogin}
            variant="primary"
            size="lg"
            className="w-full mt-6"
            disabled={loading || !email || !password}
          >
            {t('auth.signIn')}
          </Button>

          <Button
            onPress={() => setShowEmailForm(false)}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            {t('auth.backToSocial')}
          </Button>
        </View>
      )}
    </Screen>
  );
}