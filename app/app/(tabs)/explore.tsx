import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { Filter, MapPin, Search } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { appRouteMap } from '../../src/config/sitemap';

const PAGE_SIZE = 15;

type ExploreGridItem = {
  id: string;
  postId: string;
  title: string;
  location: string;
  meta: string;
  imageUrl: string;
  tags?: string[];
  createdAt?: string;
};

export default function ExploreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; tag?: string }>();
  const { isDark } = useResolvedTheme();
  const [searchText, setSearchText] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);

  const colors = useMemo(
    () => ({
      cardBorder: isDark ? '#243447' : '#DCE8F4',
      cardBg: isDark ? '#0F1B2A' : '#ffffff',
      title: isDark ? '#E2E8F0' : '#0F172A',
      text: isDark ? '#CBD5E1' : '#334155',
      muted: isDark ? '#94A3B8' : '#64748B',
      searchBg: isDark ? '#0F1B2A' : '#ffffff',
      searchBorder: isDark ? '#243447' : '#DCE8F4',
      chipBg: isDark ? '#0F1B2A' : '#ffffff',
      chipBorder: isDark ? '#243447' : '#DCE8F4',
      chipText: isDark ? '#CBD5E1' : '#334155',
    }),
    [isDark]
  );

  const topics = useMemo(
    () => [t('common.all'), t('explore.topics.jeju'), t('explore.topics.freediving'), t('explore.topics.scuba'), t('explore.topics.night'), t('explore.topics.beginner'), t('explore.topics.photo')],
    [t]
  );

  const { data: exploreData = [], isLoading, refetch } = useQuery({
    queryKey: ['explore'],
    queryFn: apiClient.getExplore,
  });

  useEffect(() => {
    const incoming = String(params.tag || params.q || '').trim();
    if (incoming) {
      setSearchText(incoming);
      setActiveTopicIndex(0);
      setVisibleCount(PAGE_SIZE);
    }
  }, [params.q, params.tag]);

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase().replace(/^#/, '');
    const selectedTopic = String(topics[activeTopicIndex] || '').trim().toLowerCase();

    return (exploreData as ExploreGridItem[]).filter((item) => {
      const haystack = `${item.title || ''} ${item.location || ''} ${item.meta || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      const matchSearch = !keyword || haystack.includes(keyword);
      const matchTopic = activeTopicIndex === 0 || haystack.includes(selectedTopic);
      return matchSearch && matchTopic;
    });
  }, [activeTopicIndex, exploreData, searchText, topics]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTopicIndex, searchText]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;
  const loadMore = () => {
    if (!hasMore) return;
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredItems.length));
  };

  return (
    <Screen>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{ paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 28 }}
        onEndReachedThreshold={0.25}
        onEndReached={loadMore}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (!item.postId) return;
              router.push(`${appRouteMap.post.path}?post=${encodeURIComponent(item.postId)}` as never);
            }}
            style={{
              width: '33.333%',
              paddingHorizontal: 4,
              marginBottom: 8,
            }}
          >
            <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg }}>
              <ExpoImage source={{ uri: item.imageUrl }} style={{ width: '100%', aspectRatio: 1 }} contentFit="cover" />
              <View style={{ padding: 8 }}>
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                  {item.title}
                </Text>
                <View style={{ marginTop: 3, flexDirection: 'row', alignItems: 'center' }}>
                  <MapPin size={11} color={colors.muted} />
                  <Text numberOfLines={1} style={{ marginLeft: 3, fontSize: 11, color: colors.muted, flex: 1 }}>
                    {item.location}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.title }}>{t('explore.title')}</Text>
              <Text style={{ marginTop: 4, color: colors.muted }}>{t('explore.subtitle')}</Text>
              <View
                style={{
                  marginTop: 14,
                  height: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.searchBorder,
                  backgroundColor: colors.searchBg,
                  paddingHorizontal: 14,
                }}
              >
                <Search size={18} color={colors.muted} />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  style={{ marginLeft: 8, flex: 1, color: colors.text }}
                  placeholder={t('explore.searchPlaceholder')}
                  placeholderTextColor="#94A3B8"
                />
                <Filter size={18} color={colors.muted} />
              </View>
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              <FlatList
                horizontal
                data={topics}
                keyExtractor={(item, index) => `${item}-${index}`}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => setActiveTopicIndex(index)}
                    style={{
                      marginRight: 8,
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderWidth: activeTopicIndex === index ? 0 : 1,
                      borderColor: colors.chipBorder,
                      backgroundColor: activeTopicIndex === index ? '#0D5FA8' : colors.chipBg,
                    }}
                  >
                    <Text style={{ color: activeTopicIndex === index ? '#fff' : colors.chipText, fontWeight: '700' }}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>
                {t('tabs.explore')} · {filteredItems.length}개
              </Text>
              <TouchableOpacity onPress={() => void refetch()}>
                <Text style={{ color: '#0D5FA8', fontSize: 12, fontWeight: '700' }}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{t('common.noResults', { defaultValue: '검색 결과가 없습니다.' })}</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <ActivityIndicator color="#0D5FA8" />
            </View>
          ) : visibleItems.length ? (
            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{t('common.all')}</Text>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
