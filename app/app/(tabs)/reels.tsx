import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Film, Heart, MessageCircle, Play, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { appRouteMap } from '../../src/config/sitemap';

const reelGradients: [string, string][] = [
  ['#072f54', '#0d5fa8'],
  ['#0a3a63', '#1198f5'],
  ['#062a48', '#0e70bf'],
];

export default function ReelsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 76;
  const reelHeight = Math.max(windowHeight - tabBarHeight, 1);
  const headerTop = insets.top + 12;
  const actionsBottom = insets.bottom + 108;
  const detailsBottom = insets.bottom + 24;

  const { data: reelPosts = [] } = useQuery({ queryKey: ['reels'], queryFn: apiClient.getReels });

  const reels = reelPosts.map((post: any) => ({
        id: String(post.id),
        title: String(post.content || post.location || t('tabs.reels')).split('\n')[0],
        author: String(post.user?.name || 'Diver'),
        likes: String(post.likes || 0),
        comments: String(post.comments || 0),
        shares: '공유',
        tag: String(post.diveSite || post.location || 'Dive'),
      }));

  return (
    <Screen safe={false} tone="plain" style={{ backgroundColor: '#04111f' }}>
      <ScrollView
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={reelHeight}
        snapToAlignment="start"
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        {reels.length === 0 ? (
          <View style={[styles.reel, { height: reelHeight, alignItems: 'center', justifyContent: 'center' }]}>
            <Film size={40} color="#7dd3fc" />
            <Text className="mt-4 text-base font-semibold text-white">{t('common.noData', { defaultValue: '등록된 릴스가 없습니다.' })}</Text>
          </View>
        ) : null}
        {reels.map((item, index) => (
          <LinearGradient
            key={`${item.id}-${index}`}
            colors={reelGradients[index % reelGradients.length]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.reel, { height: reelHeight }]}
          >
            <View className="absolute left-4 right-4 flex-row items-center justify-between" style={{ top: headerTop }}>
              <View className="rounded-full bg-white/15 px-3 py-1">
                <Text className="text-xs font-semibold text-white">{t('tabs.reels')}</Text>
              </View>
              <View className="rounded-full bg-white/15 px-3 py-1">
                <Text className="text-xs font-semibold text-white">{item.tag}</Text>
              </View>
            </View>

            <View className="absolute inset-0 items-center justify-center">
              <TouchableOpacity
                activeOpacity={0.9}
                className="h-20 w-20 items-center justify-center rounded-full bg-white/20"
                onPress={() => {
                  if (String(item.id).startsWith('sample-')) return;
                  router.push(`${appRouteMap.post.path}?post=${encodeURIComponent(item.id)}` as never);
                }}
              >
                <Play size={38} color="#ffffff" fill="#ffffff" />
              </TouchableOpacity>
            </View>

            <View className="absolute right-4 items-center" style={{ bottom: actionsBottom }}>
              <Action icon={<Heart size={22} color="#ffffff" />} value={item.likes} />
              <Action icon={<MessageCircle size={22} color="#ffffff" />} value={item.comments} />
              <Action icon={<Send size={22} color="#ffffff" />} value={item.shares} />
            </View>

            <View className="absolute left-5 right-24" style={{ bottom: detailsBottom }}>
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

const styles = StyleSheet.create({
  reel: {
    width: '100%',
    overflow: 'hidden',
  },
});
