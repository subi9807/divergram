import React, { useMemo } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Search, Send, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';

const fallbackRooms = [
  { id: '1', name: 'Blue Coral Team', last: '내일 오전 8시 출항해요.', unread: 2, members: 12, updatedAt: '09:32', active: true },
  { id: '2', name: 'Jeju Buddy', last: '문섬 시야 12m 확인!', unread: 0, members: 2, updatedAt: '08:11', active: false },
  { id: '3', name: 'Divergram Crew', last: '장비 점검 체크리스트 공유합니다.', unread: 1, members: 18, updatedAt: '어제', active: true },
];

export default function MessagesScreen() {
  const { t } = useTranslation();
  const { data = fallbackRooms } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => fallbackRooms,
  });
  const unreadCount = useMemo(() => data.reduce((sum, room) => sum + room.unread, 0), [data]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 pb-4 pt-4">
          <Text className="text-2xl font-bold text-surface-900">{t('tabs.messages')}</Text>
          <Text className="mt-1 text-surface-500">{t('pages.messages.subtitle')}</Text>
          <View className="mt-4 h-12 flex-row items-center rounded-2xl border border-surface-200 bg-white px-4">
            <Search size={18} color="#64748b" />
            <TextInput className="ml-2 flex-1 text-surface-900" placeholder={t('tabs.search')} placeholderTextColor="#94a3b8" />
          </View>
        </View>

        <View className="px-5 pb-4">
          <View className="flex-row">
            <View className="mr-2 flex-1 rounded-2xl border border-surface-200 bg-white p-3">
              <Text className="text-xs font-medium text-surface-500">{t('pages.messages.unread')}</Text>
              <Text className="mt-1 text-xl font-bold text-brand-700">{unreadCount}</Text>
            </View>
            <View className="flex-1 rounded-2xl border border-surface-200 bg-white p-3">
              <Text className="text-xs font-medium text-surface-500">{t('pages.messages.rooms')}</Text>
              <Text className="mt-1 text-xl font-bold text-surface-900">{data.length}</Text>
            </View>
          </View>
        </View>

        <View className="px-5 pb-3">
          <View className="flex-row">
            <TouchableOpacity activeOpacity={0.86} className="mr-2 rounded-full bg-brand-600 px-4 py-2">
              <Text className="text-sm font-semibold text-white">{t('menu.quick')}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.86} className="rounded-full border border-surface-200 bg-white px-4 py-2">
              <Text className="text-sm font-semibold text-surface-700">{t('menu.more')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-5 py-2">
          {data.map((room) => (
            <TouchableOpacity
              key={room.id}
              activeOpacity={0.9}
              className={`mb-3 rounded-3xl border bg-white p-4 shadow-sm shadow-surface-200 ${
                room.unread > 0 ? 'border-brand-200' : 'border-surface-200'
              }`}
            >
              <View className="flex-row items-center">
                <View className={`h-12 w-12 items-center justify-center rounded-2xl ${room.unread > 0 ? 'bg-brand-50' : 'bg-surface-100'}`}>
                  {room.unread > 0 ? <Users size={20} color="#0d5fa8" /> : <MessageCircle size={20} color="#334155" />}
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-surface-900">{room.name}</Text>
                    <Text className="text-xs text-surface-400">{room.updatedAt}</Text>
                  </View>
                  <Text className="mt-1 text-sm text-surface-500">{room.last}</Text>
                  <View className="mt-2 flex-row items-center">
                    <Text className="text-xs text-surface-400">{t('pages.messages.members', { count: room.members })}</Text>
                    <View className={`ml-2 h-1.5 w-1.5 rounded-full ${room.active ? 'bg-emerald-500' : 'bg-surface-300'}`} />
                    <Text className="ml-1 text-xs text-surface-400">{room.active ? t('pages.messages.active') : t('pages.messages.idle')}</Text>
                  </View>
                </View>
                {room.unread > 0 ? (
                  <View className="h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-2">
                    <Text className="text-xs font-semibold text-white">{room.unread}</Text>
                  </View>
                ) : (
                  <Send size={16} color="#94a3b8" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
