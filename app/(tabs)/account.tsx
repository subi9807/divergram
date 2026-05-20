import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Mail, ShieldCheck, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/hooks/useAuth';
import { apiClient } from '../../src/lib/api';

export default function AccountScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ userId?: string }>();
  const targetUserId = String(params.userId || '').trim();
  const isOtherUser = Boolean(targetUserId && user?.id && targetUserId !== String(user.id));

  const { data: externalProfile } = useQuery({
    queryKey: ['account-profile', targetUserId],
    queryFn: () => apiClient.getProfileById(targetUserId),
    enabled: Boolean(isOtherUser && targetUserId),
  });

  const profileName = isOtherUser
    ? externalProfile?.full_name || externalProfile?.username || 'Diver'
    : user?.name || t('profile.unnamed');
  const profileEmail = isOtherUser
    ? externalProfile?.username
      ? `@${externalProfile.username}`
      : '-'
    : user?.email || '-';
  const profileBio = isOtherUser ? externalProfile?.bio || '-' : '-';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.account')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.account.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          <View className="rounded-3xl border border-gray-200 bg-white p-5 mb-4">
            <View className="h-14 w-14 rounded-2xl bg-gray-100 items-center justify-center mb-3">
              <User size={24} color="#111827" />
            </View>
            <Text className="text-lg font-semibold text-gray-950">{profileName}</Text>
            <Text className="mt-1 text-sm text-gray-500">{profileEmail}</Text>
            {isOtherUser ? <Text className="mt-2 text-sm text-gray-600">{profileBio}</Text> : null}
          </View>

          <TouchableOpacity className="mb-3 rounded-3xl border border-gray-200 bg-white p-4 flex-row items-center">
            <Mail size={18} color="#111827" />
            <Text className="ml-3 text-sm font-semibold text-gray-900">
              {isOtherUser ? t('feed.menu.accountInfo', { defaultValue: '계정정보' }) : t('pages.account.email')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="rounded-3xl border border-gray-200 bg-white p-4 flex-row items-center">
            <ShieldCheck size={18} color="#111827" />
            <Text className="ml-3 text-sm font-semibold text-gray-900">
              {isOtherUser ? (externalProfile?.account_type || 'personal') : t('pages.account.security')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
