import React from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Play, Send } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';

const cardHeight = Math.min(Dimensions.get('window').height - 170, 640);
const reelGradients: [string, string][] = [
  ['#072f54', '#0d5fa8'],
  ['#0a3a63', '#1198f5'],
  ['#062a48', '#0e70bf'],
];

export default function ReelsScreen() {
  const { t } = useTranslation();
  const reels = [
    { title: t('reels.items.item1'), author: 'diver_jeju', likes: '1.2k', comments: '221', shares: '74', tag: 'Drift' },
    { title: t('reels.items.item2'), author: 'nightblue', likes: '842', comments: '108', shares: '31', tag: 'Night' },
    { title: t('reels.items.item3'), author: 'deep_ulleung', likes: '2.4k', comments: '390', shares: '98', tag: 'Wall' },
  ];

  return (
    <Screen tone="plain" className="bg-[#04111f]">
      <ScrollView pagingEnabled showsVerticalScrollIndicator={false}>
        {reels.map((item, index) => (
          <LinearGradient
            key={item.title}
            colors={reelGradients[index % reelGradients.length]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: cardHeight }}
            className="mx-4 my-3 overflow-hidden rounded-3xl border border-white/10"
          >
            <View className="absolute left-4 right-4 top-4 flex-row items-center justify-between">
              <View className="rounded-full bg-white/15 px-3 py-1">
                <Text className="text-xs font-semibold text-white">{t('tabs.reels')}</Text>
              </View>
              <View className="rounded-full bg-white/15 px-3 py-1">
                <Text className="text-xs font-semibold text-white">{item.tag}</Text>
              </View>
            </View>

            <View className="absolute inset-0 items-center justify-center">
              <TouchableOpacity activeOpacity={0.9} className="h-20 w-20 items-center justify-center rounded-full bg-white/20">
                <Play size={38} color="#ffffff" fill="#ffffff" />
              </TouchableOpacity>
            </View>

            <View className="absolute bottom-24 right-4 items-center">
              <Action icon={<Heart size={22} color="#ffffff" />} value={item.likes} />
              <Action icon={<MessageCircle size={22} color="#ffffff" />} value={item.comments} />
              <Action icon={<Send size={22} color="#ffffff" />} value={item.shares} />
            </View>

            <View className="absolute bottom-7 left-5 right-24">
              <View className="rounded-2xl border border-white/15 bg-black/25 p-4">
                <Text className="text-sm font-semibold text-blue-100">@{item.author}</Text>
                <Text className="mt-2 text-2xl font-bold text-white">{item.title}</Text>
                <Text className="mt-2 text-blue-100">{t('reels.likesSummary', { count: item.likes })}</Text>
              </View>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>
    </Screen>
  );
}

function Action({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <TouchableOpacity activeOpacity={0.9} className="mb-5 items-center">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-white/15">
        {icon}
      </View>
      <Text className="mt-1 text-xs font-semibold text-white">{value}</Text>
    </TouchableOpacity>
  );
}
