import React, { useMemo } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Search, Send, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { messageRoomSamples } from '../../src/mock/menuSamples';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const { data = messageRoomSamples } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => messageRoomSamples,
  });
  const unreadCount = useMemo(() => data.reduce((sum, room) => sum + room.unread, 0), [data]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 pb-4 pt-4">
          <Text className="text-2xl font-bold text-surface-900 dark:text-surface-50">{t('tabs.messages')}</Text>
          <Text className="mt-1 text-surface-500 dark:text-surface-400">{t('pages.messages.subtitle')}</Text>
          <View className="mt-4 h-12 flex-row items-center rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4">
            <Search size={18} color="#64748b" />
            <TextInput className="ml-2 flex-1 text-surface-900 dark:text-surface-50" placeholder={t('tabs.search')} placeholderTextColor="#94a3b8" />
          </View>
        </View>

        <View className="px-5 pb-4">
          <View className="rounded-3xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 shadow-sm shadow-surface-200">
            <Text className="text-sm font-semibold text-brand-700">{t('brand.tagline')}</Text>
            <Text className="mt-2 text-base text-surface-600">{t('pages.messages.subtitle')}</Text>
            <View className="mt-4 flex-row">
              <View className="mr-2 flex-1 rounded-2xl bg-surface-50 dark:bg-surface-800 px-3 py-2">
                <Text className="text-xs text-surface-500 dark:text-surface-400">{t('pages.messages.unread')}</Text>
                <Text className="mt-1 text-base font-bold text-surface-900 dark:text-surface-50">{unreadCount}</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-surface-50 dark:bg-surface-800 px-3 py-2">
                <Text className="text-xs text-surface-500 dark:text-surface-400">{t('pages.messages.rooms')}</Text>
                <Text className="mt-1 text-base font-bold text-surface-900 dark:text-surface-50">{data.length}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 pb-2">
          <Text className="text-sm font-semibold text-surface-500 dark:text-surface-400">{t('pages.messages.rooms')}</Text>
        </View>

        <View className="px-5 py-1">
          {data.map((room) => (
            <TouchableOpacity
              key={room.id}
              activeOpacity={0.9}
              className={`mb-3 rounded-3xl border bg-white dark:bg-surface-900 p-4 shadow-sm shadow-surface-200 ${
                room.unread > 0 ? 'border-brand-200' : 'border-surface-200 dark:border-surface-700'
              }`}
            >
              <View className="flex-row items-center">
                <View className={`h-12 w-12 items-center justify-center rounded-2xl ${room.unread > 0 ? 'bg-brand-50 dark:bg-[#1d3550]' : 'bg-surface-100 dark:bg-surface-800'}`}>
                  {room.unread > 0 ? <Users size={20} color="#0d5fa8" /> : <MessageCircle size={20} color="#334155" />}
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-surface-900 dark:text-surface-50">{room.name}</Text>
                    <Text className="text-xs text-surface-400 dark:text-[#8ea4ba]">{room.updatedAt}</Text>
                  </View>
                  <Text className="mt-1 text-sm text-surface-500 dark:text-surface-400">{room.last}</Text>
                  <View className="mt-2 flex-row items-center">
                    <Text className="text-xs text-surface-400 dark:text-[#8ea4ba]">{t('pages.messages.members', { count: room.members })}</Text>
                    <View className={`ml-2 h-1.5 w-1.5 rounded-full ${room.active ? 'bg-emerald-500' : 'bg-surface-300 dark:bg-surface-600'}`} />
                    <Text className="ml-1 text-xs text-surface-400 dark:text-[#8ea4ba]">{room.active ? t('pages.messages.active') : t('pages.messages.idle')}</Text>
                  </View>
                </View>
                {room.unread > 0 ? (
                  <View className="h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-2">
                    <Text className="text-xs font-semibold text-white">{room.unread}</Text>
                  </View>
                ) : (
                  <Send size={16} color={isDark ? '#8ea4ba' : '#94a3b8'} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
