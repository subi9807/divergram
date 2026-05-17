import React from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Heart, MessageCircle, Play, Send } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';

const cardHeight = Math.min(Dimensions.get('window').height - 180, 620);

export default function ReelsScreen() {
  const { t } = useTranslation();
  const reels = [
    { title: t('reels.items.item1'), author: 'diver_jeju', stats: '1.2k' },
    { title: t('reels.items.item2'), author: 'nightblue', stats: '842' },
    { title: t('reels.items.item3'), author: 'deep_ulleung', stats: '2.4k' },
  ];

  return (
    <Screen className="bg-gray-950">
      <ScrollView pagingEnabled showsVerticalScrollIndicator={false}>
        {reels.map((item) => (
          <View key={item.title} style={{ height: cardHeight }} className="mx-4 my-3 overflow-hidden rounded-3xl bg-gray-900">
            <View className="absolute inset-0 items-center justify-center">
              <View className="h-20 w-20 rounded-full bg-white/15 items-center justify-center">
                <Play size={38} color="#ffffff" fill="#ffffff" />
              </View>
            </View>
            <View className="absolute right-4 bottom-24 items-center">
              <TouchableOpacity className="mb-5 h-12 w-12 rounded-full bg-white/15 items-center justify-center">
                <Heart size={23} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity className="mb-5 h-12 w-12 rounded-full bg-white/15 items-center justify-center">
                <MessageCircle size={23} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity className="h-12 w-12 rounded-full bg-white/15 items-center justify-center">
                <Send size={23} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View className="absolute left-5 right-20 bottom-8">
              <Text className="text-sm font-semibold text-gray-300">@{item.author}</Text>
              <Text className="mt-2 text-2xl font-bold text-white">{item.title}</Text>
              <Text className="mt-2 text-gray-300">{t('reels.likesSummary', { count: item.stats })}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
