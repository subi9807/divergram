import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Send } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';

const fallbackRooms = [
  { id: '1', name: 'Blue Coral Team', last: '내일 오전 8시 출항해요.', unread: 2 },
  { id: '2', name: 'Jeju Buddy', last: '문섬 시야 12m 확인!', unread: 0 },
  { id: '3', name: 'Divergram Crew', last: '장비 점검 체크리스트 공유합니다.', unread: 1 },
];

export default function MessagesScreen() {
  const { t } = useTranslation();
  const { data = fallbackRooms } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => fallbackRooms,
  });

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.messages')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.messages.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          {data.map((room) => (
            <TouchableOpacity key={room.id} className="mb-3 rounded-3xl border border-gray-200 bg-white p-4">
              <View className="flex-row items-center">
                <View className="h-12 w-12 rounded-2xl bg-gray-100 items-center justify-center">
                  <MessageCircle size={20} color="#111827" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-gray-950">{room.name}</Text>
                  <Text className="mt-1 text-sm text-gray-500">{room.last}</Text>
                </View>
                {room.unread > 0 ? (
                  <View className="h-6 min-w-6 px-2 rounded-full bg-blue-500 items-center justify-center">
                    <Text className="text-xs font-semibold text-white">{room.unread}</Text>
                  </View>
                ) : (
                  <Send size={16} color="#9ca3af" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
