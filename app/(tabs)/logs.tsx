import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Calendar, Gauge, MapPin, Thermometer, Timer, UserRound, Waves } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';

const fields = [
  { key: 'location', labelKey: 'logsForm.fields.locationLabel', placeholderKey: 'logsForm.fields.locationPlaceholder', icon: MapPin },
  { key: 'depth', labelKey: 'logsForm.fields.depthLabel', placeholder: '18', icon: Gauge, suffix: 'm', keyboardType: 'numeric' },
  { key: 'duration', labelKey: 'logsForm.fields.durationLabel', placeholder: '45', icon: Timer, suffixKey: 'logsForm.units.minute', keyboardType: 'numeric' },
  { key: 'temperature', labelKey: 'logsForm.fields.temperatureLabel', placeholder: '18', icon: Thermometer, suffix: '°C', keyboardType: 'numeric' },
  { key: 'visibility', labelKey: 'logsForm.fields.visibilityLabel', placeholder: '12', icon: Waves, suffix: 'm', keyboardType: 'numeric' },
  { key: 'buddy', labelKey: 'logsForm.fields.buddyLabel', placeholderKey: 'logsForm.fields.buddyPlaceholder', icon: UserRound },
] as const;

export default function LogsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    location: '',
    depth: '',
    duration: '',
    temperature: '',
    visibility: '',
    buddy: '',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => apiClient.createLog(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['logs'] });
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
      setForm({ title: '', location: '', depth: '', duration: '', temperature: '', visibility: '', buddy: '', notes: '' });
      Alert.alert(t('logsForm.saveSuccessTitle'), t('logsForm.saveSuccessMessage'));
    },
    onError: () => Alert.alert(t('logsForm.saveFailTitle'), t('logsForm.saveFailMessage')),
  });

  const update = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const canSubmit = form.title.trim() && form.location.trim();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-4 pb-5 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('logsForm.title')}</Text>
          <Text className="mt-1 text-gray-500">{t('logsForm.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          <View className="rounded-3xl bg-gray-950 p-5">
            <View className="flex-row items-center">
              <View className="h-12 w-12 rounded-2xl bg-white items-center justify-center">
                <Calendar size={24} color="#111827" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xl font-bold text-white">{t('logsForm.heroTitle')}</Text>
                <Text className="mt-1 text-gray-300">{t('logsForm.heroSubtitle')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5">
          <Text className="mb-2 text-sm font-semibold text-gray-700">{t('logsForm.fields.titleLabel')}</Text>
          <TextInput
            className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-950"
            placeholder={t('logsForm.fields.titlePlaceholder')}
            placeholderTextColor="#9ca3af"
            value={form.title}
            onChangeText={(value) => update('title', value)}
          />

          <View className="flex-row flex-wrap -mx-1">
            {fields.map((field) => {
              const Icon = field.icon;
              return (
                <View key={field.key} className="w-1/2 p-1">
                  <View className="rounded-2xl border border-gray-200 bg-white p-3">
                    <View className="mb-2 flex-row items-center">
                      <Icon size={16} color="#6b7280" />
                      <Text className="ml-1 text-xs font-semibold text-gray-500">{t(field.labelKey)}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <TextInput
                        className="flex-1 py-1 text-base font-semibold text-gray-950"
                        placeholder={'placeholderKey' in field ? t(field.placeholderKey) : field.placeholder}
                        placeholderTextColor="#9ca3af"
                        keyboardType={'keyboardType' in field ? field.keyboardType : 'default'}
                        value={form[field.key]}
                        onChangeText={(value) => update(field.key, value)}
                      />
                      {'suffix' in field && <Text className="ml-1 text-sm text-gray-500">{field.suffix}</Text>}
                      {'suffixKey' in field && <Text className="ml-1 text-sm text-gray-500">{t(field.suffixKey)}</Text>}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <Text className="mb-2 mt-4 text-sm font-semibold text-gray-700">{t('logsForm.fields.notesLabel')}</Text>
          <TextInput
            className="min-h-28 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-950"
            multiline
            textAlignVertical="top"
            placeholder={t('logsForm.fields.notesPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={form.notes}
            onChangeText={(value) => update('notes', value)}
          />

          <TouchableOpacity
            disabled={!canSubmit || mutation.isPending}
            className={`mt-5 h-13 rounded-2xl items-center justify-center ${canSubmit && !mutation.isPending ? 'bg-gray-950' : 'bg-gray-300'}`}
            onPress={() => mutation.mutate()}
          >
            <Text className="font-semibold text-white">{mutation.isPending ? t('logsForm.buttons.saving') : t('logsForm.buttons.save')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
