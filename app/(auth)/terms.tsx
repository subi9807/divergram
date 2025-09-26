import React from 'react';
import { ScrollView, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';

export default function TermsScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <ScrollView className="px-6 py-8">
        <Text className="text-2xl font-bold text-secondary-800 mb-6">
          {t('auth.terms')}
        </Text>
        <Text className="text-secondary-600 leading-6 mb-4">
          {t('terms.content1')}
        </Text>
        <Text className="text-secondary-600 leading-6 mb-4">
          {t('terms.content2')}
        </Text>
        <Text className="text-secondary-600 leading-6">
          {t('terms.content3')}
        </Text>
      </ScrollView>
    </Screen>
  );
}