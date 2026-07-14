import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { Filter, Search, Video } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
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

function buildGridPlacements(items: ExploreGridItem[], cellSize: number) {
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
          left: col * cellSize,
          top: row * cellSize,
          width: cols * cellSize,
          height: rows * cellSize,
        });
        placed = true;
        break;
      }
    }
  });

  return {
    placements,
    height: maxRow * cellSize,
  };
}

export default function ExploreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; tag?: string }>();
  const { width } = useWindowDimensions();
  const { isDark } = useResolvedTheme();
  const [searchText, setSearchText] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const colors = useMemo(
    () => ({
      text: isDark ? '#E5E7EB' : '#111827',
      muted: isDark ? '#9CA3AF' : '#64748B',
      searchBg: isDark ? '#121722' : '#E8EDF3',
      searchBorder: isDark ? '#243041' : '#D6DEE8',
      pageBg: isDark ? '#0B0F14' : '#FFFFFF',
    }),
    [isDark]
  );

  const { data: exploreData = [], isLoading } = useQuery({
    queryKey: ['explore'],
    queryFn: apiClient.getExplore,
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
    return (exploreData as ExploreGridItem[]).filter((item) => {
      if (!keyword) return true;
      const haystack = `${item.title || ''} ${item.location || ''} ${item.meta || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [exploreData, searchText]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchText]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;
  const loadMore = () => {
    if (!hasMore) return;
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredItems.length));
  };

  const cellSize = width / 3;
  const board = useMemo(() => buildGridPlacements(visibleItems, cellSize), [cellSize, visibleItems]);

  return (
    <Screen>
      <FlatList
        data={[{ id: 'explore-board' }]}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28, paddingTop: 2, backgroundColor: colors.pageBg }}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        renderItem={() => (
          <View style={{ width, height: board.height, position: 'relative', backgroundColor: colors.pageBg }}>
            {board.placements.map((item) => {
              const isVideo = item.mediaType === 'video' || isVideoFile(item.imageUrl);
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
                    borderRadius: 0,
                    backgroundColor: isDark ? '#10151D' : '#EDF2F7',
                  }}
                >
                  <ExpoImage
                    source={imageSource}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={180}
                  />
                  {isVideo ? (
                    <>
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(2, 6, 23, 0.20)',
                        }}
                      />
                      <View
                        style={{
                          position: 'absolute',
                          right: 8,
                          bottom: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 10,
                          backgroundColor: 'rgba(15, 23, 42, 0.72)',
                          width: 24,
                          height: 24,
                        }}
                      >
                        <Video size={14} color="#FFFFFF" />
                      </View>
                    </>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, backgroundColor: colors.pageBg }}>
            <View
              style={{
                height: 38,
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 15,
                borderWidth: 1,
                borderColor: colors.searchBorder,
                backgroundColor: colors.searchBg,
                paddingHorizontal: 12,
                shadowColor: '#000',
                shadowOpacity: isDark ? 0.12 : 0.03,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
                elevation: 1,
              }}
            >
              <Search size={15} color={colors.muted} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                style={{ marginLeft: 8, flex: 1, color: colors.text, fontSize: 13, fontWeight: '500' }}
                placeholder={t('explore.searchPlaceholder')}
                placeholderTextColor={colors.muted}
              />
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDark ? '#1A2230' : '#F7FAFC',
                }}
              >
                <Filter size={14} color={colors.muted} />
              </View>
            </View>
          </View>
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
