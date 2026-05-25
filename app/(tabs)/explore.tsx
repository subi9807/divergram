import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { Filter, MapPin, Search } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { exploreSampleCards } from '../../src/mock/menuSamples';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';

const PAGE_SIZE = 15;
const GRID_POOL_SIZE = 90;
const GRID_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200',
  'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1200',
  'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=1200',
  'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=1200',
  'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1200',
  'https://images.unsplash.com/photo-1583212292454-3f82f0a96f4d?w=1200',
];

type ExploreGridItem = {
  id: string;
  title: string;
  location: string;
  meta: string;
  imageUrl: string;
};

function buildGridCatalog(base: { title: string; location: string; meta: string }[], total: number): ExploreGridItem[] {
  const source = base.length ? base : exploreSampleCards;
  return Array.from({ length: total }, (_, index) => {
    const row = source[index % source.length] || source[0] || { title: 'Dive Spot', location: 'Ocean', meta: '' };
    const seq = Math.floor(index / Math.max(1, source.length)) + 1;
    return {
      id: `explore-grid-${index}`,
      title: source.length > 1 ? row.title : `${row.title} ${seq}`,
      location: row.location,
      meta: row.meta,
      imageUrl: GRID_IMAGE_POOL[index % GRID_IMAGE_POOL.length] || GRID_IMAGE_POOL[0],
    };
  });
}

export default function ExploreScreen() {
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const colors = {
    cardBorder: isDark ? '#2A3E52' : '#E2E8F0',
    cardBg: isDark ? '#0F1B2A' : '#ffffff',
    title: isDark ? '#F1F5F9' : '#0F172A',
    text: isDark ? '#E2E8F0' : '#0F172A',
    muted: isDark ? '#9FB3C8' : '#64748B',
    searchBg: isDark ? '#0F1B2A' : '#ffffff',
    searchText: isDark ? '#E2E8F0' : '#0F172A',
    topicInactiveBg: isDark ? '#0F1B2A' : '#ffffff',
    topicInactiveBorder: isDark ? '#2A3E52' : '#E2E8F0',
    topicInactiveText: isDark ? '#CBD5E1' : '#334155',
    countMuted: isDark ? '#9FB3C8' : '#64748B',
  };
  const topics = useMemo(
    () => [
      t('common.all'),
      t('explore.topics.jeju'),
      t('explore.topics.freediving'),
      t('explore.topics.scuba'),
      t('explore.topics.night'),
      t('explore.topics.beginner'),
      t('explore.topics.photo'),
    ],
    [t]
  );
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: exploreData = [] } = useQuery({ queryKey: ['explore'], queryFn: apiClient.getExplore });
  const baseRows = exploreData.length ? exploreData : exploreSampleCards;

  const allItems = useMemo(() => buildGridCatalog(baseRows, GRID_POOL_SIZE), [baseRows]);

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const selectedTopic = String(topics[activeTopicIndex] || '').trim().toLowerCase();

    return allItems.filter((item) => {
      const haystack = `${item.title} ${item.location} ${item.meta}`.toLowerCase();
      const matchSearch = !keyword || haystack.includes(keyword);
      const matchTopic = activeTopicIndex === 0 || haystack.includes(selectedTopic);
      return matchSearch && matchTopic;
    });
  }, [activeTopicIndex, allItems, searchText, topics]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTopicIndex, searchText]);

  useEffect(() => {
    if (visibleCount > filteredItems.length) {
      setVisibleCount(Math.max(PAGE_SIZE, Math.min(filteredItems.length, visibleCount)));
    }
  }, [filteredItems.length, visibleCount]);

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
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            style={{
              width: '33.333%',
              paddingHorizontal: 4,
              marginBottom: 8,
            }}
          >
            <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg }}>
              <ExpoImage source={{ uri: item.imageUrl }} style={{ width: '100%', aspectRatio: 1 }} contentFit="cover" />
              <View style={{ padding: 8 }}>
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <MapPin size={11} color={colors.muted} />
                  <Text numberOfLines={1} style={{ marginLeft: 3, fontSize: 11, color: colors.muted, flex: 1 }}>{item.location}</Text>
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
              <View style={{ marginTop: 14, height: 48, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.searchBg, paddingHorizontal: 14 }}>
                <Search size={18} color={colors.muted} />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  style={{ marginLeft: 8, flex: 1, color: colors.searchText }}
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
                      borderColor: colors.topicInactiveBorder,
                      backgroundColor: activeTopicIndex === index ? '#0D5FA8' : colors.topicInactiveBg,
                    }}
                  >
                    <Text style={{ color: activeTopicIndex === index ? '#fff' : colors.topicInactiveText, fontWeight: '700' }}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              <Text style={{ color: colors.countMuted, fontSize: 12, fontWeight: '700' }}>
                {t('tabs.explore')} · {filteredItems.length}개
              </Text>
            </View>
          </>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <ActivityIndicator color="#0D5FA8" />
            </View>
          ) : (
            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#94A3B8', fontSize: 12 }}>{t('common.all')}</Text>
            </View>
          )
        }
      />
    </Screen>
  );
}
