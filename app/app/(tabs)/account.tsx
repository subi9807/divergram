import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Mail, ShieldCheck, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/hooks/useAuth';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { apiClient } from '../../src/lib/api';

export default function AccountScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
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
        <View className="border-b border-surface-200 dark:border-[#243447] px-5 py-4">
          <Text className="text-2xl font-semibold text-gray-950 dark:text-surface-50">{t('tabs.account')}</Text>
          <Text className="mt-1 text-surface-500 dark:text-[#9fb3c8]">{t('pages.account.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          <View className="mb-4 rounded-3xl border border-surface-200 bg-white p-5 dark:border-[#243447] dark:bg-[#0f1b2a]">
            <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 dark:bg-[#18283a]">
              <User size={24} color={isDark ? '#c6d3e0' : '#111827'} />
            </View>
            <Text className="text-lg font-semibold text-gray-950 dark:text-surface-50">{profileName}</Text>
            <Text className="mt-1 text-sm text-surface-500 dark:text-[#9fb3c8]">{profileEmail}</Text>
            {isOtherUser ? <Text className="mt-2 text-sm text-surface-600 dark:text-surface-300">{profileBio}</Text> : null}
          </View>

          <TouchableOpacity className="mb-3 flex-row items-center rounded-3xl border border-surface-200 bg-white p-4 dark:border-[#243447] dark:bg-[#0f1b2a]">
            <Mail size={18} color={isDark ? '#c6d3e0' : '#111827'} />
            <Text className="ml-3 text-sm font-semibold text-gray-900 dark:text-surface-50">
              {isOtherUser ? t('feed.menu.accountInfo', { defaultValue: '계정정보' }) : t('pages.account.email')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center rounded-3xl border border-surface-200 bg-white p-4 dark:border-[#243447] dark:bg-[#0f1b2a]">
            <ShieldCheck size={18} color={isDark ? '#c6d3e0' : '#111827'} />
            <Text className="ml-3 text-sm font-semibold text-gray-900 dark:text-surface-50">
              {isOtherUser ? (externalProfile?.account_type || 'personal') : t('pages.account.security')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
