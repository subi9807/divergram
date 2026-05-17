import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/hooks/useAuth';

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState('');

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.profileEdit')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.profileEdit.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          <Text className="mb-2 text-sm font-semibold text-gray-700">{t('pages.profileEdit.name')}</Text>
          <TextInput
            className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-950"
            value={name}
            onChangeText={setName}
          />

          <Text className="mb-2 text-sm font-semibold text-gray-700">{t('pages.profileEdit.bio')}</Text>
          <TextInput
            className="min-h-28 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-950"
            multiline
            textAlignVertical="top"
            value={bio}
            onChangeText={setBio}
          />

          <TouchableOpacity className="mt-5 h-12 rounded-2xl bg-gray-950 items-center justify-center" onPress={() => Alert.alert(t('pages.profileEdit.doneTitle'), t('pages.profileEdit.doneBody'))}>
            <Text className="font-semibold text-white">{t('pages.profileEdit.save')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
