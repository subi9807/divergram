import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';

export default function ReportScreen() {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.report')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.report.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          <TextInput
            className="min-h-32 rounded-2xl border border-gray-200 bg-white p-4 text-gray-950"
            multiline
            textAlignVertical="top"
            value={text}
            onChangeText={setText}
            placeholder={t('pages.report.placeholder')}
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity
            className={`mt-4 h-12 rounded-2xl items-center justify-center ${text.trim() ? 'bg-gray-950' : 'bg-gray-300'}`}
            disabled={!text.trim()}
            onPress={() => {
              setText('');
              Alert.alert(t('pages.report.doneTitle'), t('pages.report.doneBody'));
            }}
          >
            <Text className="font-semibold text-white">{t('pages.report.submit')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
