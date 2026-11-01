import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Compass, MapPin, Search, Sparkles, Video, X } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { getAdaptiveLayout } from '../../src/utils/adaptiveLayout';
import { appRouteMap } from '../../src/config/sitemap';
import { isVideoFile } from '../../src/utils/videoUtils';

const PAGE_SIZE = 24;
const DEFAULT_VIDEO_POSTER = require('../../assets/images/splash.png');

type ExploreGridItem = {
  id: string;
  postId: string;
  imageUrl: string;
  mediaType?: 'image' | 'video' | '';
  title?: string;
  location?: string;
  meta?: string;
  tags?: string[];
  createdAt?: string;
};

type GridPlacement = ExploreGridItem & {
  left: number;
  top: number;
  width: number;
  height: number;
};

function getGridSpan(index: number) {
  const cycle = index % 12;
  if (cycle === 0 || cycle === 9) return { cols: 2, rows: 2 };
  if (cycle === 3 || cycle === 8) return { cols: 2, rows: 1 };
  if (cycle === 5) return { cols: 1, rows: 2 };
  return { cols: 1, rows: 1 };
}

function buildGridPlacements(items: ExploreGridItem[], cellSize: number, gap: number) {
  const columns = 3;
  const occupancy: boolean[][] = [];
  const placements: GridPlacement[] = [];
  let maxRow = 0;

  const ensureRows = (rowCount: number) => {
    while (occupancy.length < rowCount) {
      occupancy.push(Array.from({ length: columns }, () => false));
    }
  };

  const canPlace = (row: number, col: number, cols: number, rows: number) => {
    if (col + cols > columns) return false;
    ensureRows(row + rows);
    for (let r = row; r < row + rows; r += 1) {
      for (let c = col; c < col + cols; c += 1) {
        if (occupancy[r][c]) return false;
      }
    }
    return true;
  };

  const mark = (row: number, col: number, cols: number, rows: number) => {
    ensureRows(row + rows);
    for (let r = row; r < row + rows; r += 1) {
      for (let c = col; c < col + cols; c += 1) {
        occupancy[r][c] = true;
      }
    }
    maxRow = Math.max(maxRow, row + rows);
  };

  items.forEach((item, index) => {
    const { cols, rows } = getGridSpan(index);
    let placed = false;

    for (let row = 0; !placed; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if (!canPlace(row, col, cols, rows)) continue;

        mark(row, col, cols, rows);
        placements.push({
          ...item,
          left: col * (cellSize + gap),
          top: row * (cellSize + gap),
          width: cols * cellSize + (cols - 1) * gap,
          height: rows * cellSize + (rows - 1) * gap,
        });
        placed = true;
        break;
      }
    }
  });

  return {
    placements,
    height: Math.max(0, maxRow * cellSize + Math.max(0, maxRow - 1) * gap),
  };
}

const topicKeys = ['jeju', 'freediving', 'scuba', 'night', 'beginner', 'photo'] as const;
type TopicKey = (typeof topicKeys)[number];

export default function ExploreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; tag?: string }>();
  const { width, height } = useWindowDimensions();
  const adaptiveLayout = getAdaptiveLayout(width, height);
  const { isDark } = useResolvedTheme();
  const [searchText, setSearchText] = useState('');
  const [activeTopic, setActiveTopic] = useState<TopicKey | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const colors = useMemo(
    () => ({
      text: isDark ? '#E5E7EB' : '#111827',
      muted: isDark ? '#9CA3AF' : '#64748B',
      searchBg: isDark ? '#121722' : '#E8EDF3',
      searchBorder: isDark ? '#243041' : '#D6DEE8',
      pageBg: isDark ? '#071019' : '#F4F8FB',
      cardBg: isDark ? '#101923' : '#E8F0F6',
      panel: isDark ? '#0E1924' : '#FFFFFF',
      accent: isDark ? '#67D7DB' : '#087F8C',
    }),
    [isDark]
  );

  const { data: exploreData = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['explore'],
    queryFn: apiClient.getExplore,
  });
  const normalizedProfileQuery = searchText.trim().replace(/^@+/, '');
  const { data: profileResults = [] } = useQuery({
    queryKey: ['profile-search', normalizedProfileQuery],
    queryFn: () => apiClient.searchProfiles(normalizedProfileQuery),
    enabled: normalizedProfileQuery.length >= 2,
  });

  useEffect(() => {
    const incoming = String(params.tag || params.q || '').trim();
    if (incoming) {
      setSearchText(incoming);
      setVisibleCount(PAGE_SIZE);
    }
  }, [params.q, params.tag]);

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase().replace(/^#/, '');
    const incomingTag = String(params.tag || '').trim().toLowerCase().replace(/^#/, '');
    const exactTag = keyword && keyword === incomingTag ? incomingTag : '';
    const topicLabel = activeTopic ? t(`explore.topics.${activeTopic}`).toLowerCase() : '';
    return (exploreData as ExploreGridItem[]).filter((item) => {
      const haystack = `${item.title || ''} ${item.location || ''} ${item.meta || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      if (activeTopic && !haystack.includes(activeTopic) && !haystack.includes(topicLabel)) return false;
      if (!keyword) return true;
      if (exactTag) {
        return (item.tags || []).some((tag) => String(tag).trim().toLowerCase().replace(/^#/, '') === exactTag);
      }
      return haystack.includes(keyword);
    });
  }, [activeTopic, exploreData, params.tag, searchText, t]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchText]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;
  const loadMore = () => {
    if (!hasMore) return;
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredItems.length));
  };

  const boardWidth = Math.max(0, Math.min(width, adaptiveLayout.contentMaxWidth) - 24);
  const gridGap = 4;
  const cellSize = (boardWidth - gridGap * 2) / 3;
  const board = useMemo(() => buildGridPlacements(visibleItems, cellSize, gridGap), [cellSize, visibleItems]);

  return (
    <Screen>
      <FlatList
        data={[{ id: 'explore-board' }]}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32, backgroundColor: colors.pageBg }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        renderItem={() => (
          isLoading ? (
            <View style={{ paddingVertical: 56, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={{ marginTop: 12, color: colors.muted, fontSize: 12, fontWeight: '600' }}>{t('explore.loadingTitle')}</Text>
            </View>
          ) : visibleItems.length === 0 ? (
            <View style={{ marginHorizontal: 12, paddingVertical: 52, alignItems: 'center', borderRadius: 24, backgroundColor: colors.panel }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#153342' : '#E3F5F4' }}>
                <Compass size={23} color={colors.accent} />
              </View>
              <Text style={{ marginTop: 14, color: colors.text, fontSize: 16, fontWeight: '800' }}>{t('explore.emptyTitle')}</Text>
              <Text style={{ marginTop: 5, color: colors.muted, fontSize: 12 }}>{t('explore.emptySubtitle')}</Text>
            </View>
          ) : (
          <View style={{ marginHorizontal: 12, width: boardWidth, height: board.height, position: 'relative' }}>
            {board.placements.map((item) => {
              const isVideo = item.mediaType === 'video' || isVideoFile(item.imageUrl);
              const isFeature = item.width > cellSize + 1 || item.height > cellSize + 1;
              const imageSource = isVideo && isVideoFile(item.imageUrl)
                ? DEFAULT_VIDEO_POSTER
                : { uri: item.imageUrl };

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.92}
                  onPress={() => {
                    if (!item.postId) return;
                    router.push(`${appRouteMap.post.path}?post=${encodeURIComponent(item.postId)}` as never);
                  }}
                  style={{
                    position: 'absolute',
                    left: item.left,
                    top: item.top,
                    width: item.width,
                    height: item.height,
                    overflow: 'hidden',
                    borderRadius: isFeature ? 18 : 10,
                    backgroundColor: colors.cardBg,
                  }}
                >
                  <ExpoImage
                    source={imageSource}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={180}
                  />
                  {isFeature && (item.title || item.location) ? (
                    <LinearGradient
                      colors={['transparent', 'rgba(2, 12, 22, 0.88)']}
                      locations={[0.42, 1]}
                      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 88, justifyContent: 'flex-end', padding: 12 }}
                    >
                      {item.title ? <Text numberOfLines={2} style={{ color: '#FFFFFF', fontSize: 15, lineHeight: 19, fontWeight: '800' }}>{item.title}</Text> : null}
                      {item.location ? (
                        <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                          <MapPin size={11} color="#CBE7EA" />
                          <Text numberOfLines={1} style={{ marginLeft: 4, flex: 1, color: '#D8EDF0', fontSize: 10, fontWeight: '600' }}>{item.location}</Text>
                        </View>
                      ) : null}
                    </LinearGradient>
                  ) : null}
                  {isVideo ? (
                      <View
                        style={{
                          position: 'absolute',
                          right: 7,
                          top: 7,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 12,
                          backgroundColor: 'rgba(15, 23, 42, 0.72)',
                          width: 27,
                          height: 27,
                        }}
                      >
                        <Video size={14} color="#FFFFFF" />
                      </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
          )
        )}
        ListHeaderComponent={
          <View style={{ paddingBottom: 14, backgroundColor: colors.pageBg }}>
            <LinearGradient
              colors={isDark ? ['#073746', '#092235'] : ['#DDF6F3', '#E8F2FA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ marginHorizontal: 12, marginTop: 10, borderRadius: 26, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 17, overflow: 'hidden' }}
            >
              <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, right: -48, top: -70, backgroundColor: isDark ? 'rgba(84, 205, 205, 0.10)' : 'rgba(255,255,255,0.52)' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Sparkles size={13} color={colors.accent} />
                    <Text style={{ marginLeft: 6, color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }}>{t('explore.eyebrow')}</Text>
                  </View>
                  <Text style={{ marginTop: 7, color: colors.text, fontSize: 25, lineHeight: 31, fontWeight: '900' }}>{t('explore.heroTitle')}</Text>
                  <Text style={{ marginTop: 5, color: colors.muted, fontSize: 12, lineHeight: 18 }}>{t('explore.subtitle')}</Text>
                </View>
                <View style={{ width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(103,215,219,0.12)' : 'rgba(255,255,255,0.74)' }}>
                  <Compass size={26} color={colors.accent} />
                </View>
              </View>
            </LinearGradient>
            <View
              style={{
                height: 50,
                marginHorizontal: 12,
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.searchBorder,
                backgroundColor: colors.panel,
                paddingHorizontal: 14,
                shadowColor: '#000',
                shadowOpacity: isDark ? 0.16 : 0.06,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 2,
              }}
            >
              <Search size={18} color={colors.accent} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                style={{ marginLeft: 10, flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }}
                placeholder={t('explore.searchPlaceholder')}
                placeholderTextColor={colors.muted}
              />
              {searchText ? (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.clear')} onPress={() => setSearchText('')} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color={colors.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, gap: 8 }}>
              {topicKeys.map((topic) => {
                const selected = activeTopic === topic;
                return (
                  <TouchableOpacity
                    key={topic}
                    activeOpacity={0.82}
                    onPress={() => setActiveTopic(selected ? null : topic)}
                    style={{ borderRadius: 16, borderWidth: 1, borderColor: selected ? colors.accent : colors.searchBorder, backgroundColor: selected ? colors.accent : colors.panel, paddingHorizontal: 13, paddingVertical: 8 }}
                  >
                    <Text style={{ color: selected ? '#FFFFFF' : colors.text, fontSize: 12, fontWeight: '700' }}>{t(`explore.topics.${topic}`)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {profileResults.length > 0 ? (
              <View style={{ paddingTop: 16 }}>
                <Text style={{ marginBottom: 9, marginHorizontal: 12, color: colors.text, fontSize: 14, fontWeight: '800' }}>
                  {t('pages.search.people', { defaultValue: '다이버' })}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
                  {profileResults.map((profile: any) => (
                    <TouchableOpacity
                      key={String(profile.id)}
                      activeOpacity={0.85}
                      onPress={() => {
                        const userId = String(profile.id || '').trim();
                        if (!userId) return;
                        router.push(`${appRouteMap.account.path}?userId=${encodeURIComponent(userId)}` as never);
                      }}
                      style={{ width: 172, flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: colors.searchBorder, padding: 9, backgroundColor: colors.panel }}
                    >
                      {profile.avatar_url ? (
                        <ExpoImage source={{ uri: String(profile.avatar_url) }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
                      ) : null}
                      <View style={{ marginLeft: profile.avatar_url ? 8 : 0 }}>
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{profile.full_name || profile.username}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>@{profile.username}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <View style={{ marginHorizontal: 12, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900' }}>{activeTopic ? t(`explore.topics.${activeTopic}`) : t('explore.discover')}</Text>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>{t('explore.resultCount', { count: filteredItems.length })}</Text>
            </View>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <ActivityIndicator color={colors.accent} />
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
