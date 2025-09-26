import React from 'react';
import { View, Text, Image } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { Waves } from 'lucide-react-native';

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <Screen className="bg-gradient-to-b from-primary-500 to-primary-700 justify-center items-center px-8">
      <View className="items-center mb-12">
        <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6">
          <Waves size={48} color="#0ea5e9" />
        </View>
        <Text className="text-white text-4xl font-bold mb-2">Divergram</Text>
        <Text className="text-primary-100 text-lg text-center leading-6">
          {t('welcome.subtitle')}
        </Text>
      </View>

      <View className="w-full space-y-4">
        <Link href="/(auth)/login" asChild>
          <Button variant="secondary" size="lg" className="w-full">
            {t('welcome.getStarted')}
          </Button>
        </Link>
        
        <View className="flex-row justify-center space-x-6 mt-8">
          <Link href="/(auth)/privacy" className="text-primary-100 text-sm underline">
            {t('auth.privacy')}
          </Link>
          <Link href="/(auth)/terms" className="text-primary-100 text-sm underline">
            {t('auth.terms')}
          </Link>
        </View>
      </View>
    </Screen>
  );
}