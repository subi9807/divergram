import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Navigation, Search, Star, Store, Waves } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { appRouteMap } from '../../src/config/sitemap';

type SortMode = 'nearest' | 'rating' | 'reviews';

type ResortItem = {
  id: string;
  name: string;
  country: string;
  region: string;
  address: string;
  area: string;
  lat?: number;
  lng?: number;
  rating: number;
  reviewCount: number;
  tags?: string;
};

type LocationState = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

export default function ResortsScreen() {
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('nearest');
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: resortData = [], isLoading, refetch } = useQuery({ queryKey: ['resorts'], queryFn: apiClient.getResorts });

  useEffect(() => {
    let canceled = false;
    const loadLocation = async () => {
      setLocationState('loading');
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (!canceled) setLocationState('denied');
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (canceled) return;
        setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationState('granted');
      } catch {
        if (!canceled) setLocationState('error');
      }
    };

    void loadLocation();
    return () => {
      canceled = true;
    };
  }, []);

  const colors = useMemo(
    () => ({
      title: isDark ? '#E2E8F0' : '#0F172A',
      subtitle: isDark ? '#94A3B8' : '#64748B',
      text: isDark ? '#CBD5E1' : '#334155',
      muted: isDark ? '#94A3B8' : '#64748B',
      cardBg: isDark ? '#0F1B2A' : '#FFFFFF',
      cardBorder: isDark ? '#243447' : '#DCE8F4',
      fieldBg: isDark ? '#0F1B2A' : '#FFFFFF',
      fieldBorder: isDark ? '#243447' : '#DCE8F4',
      chipBg: isDark ? '#162436' : '#FFFFFF',
      chipBorder: isDark ? '#2A3E52' : '#DCE8F4',
      accent: '#0D5FA8',
      accentSoft: isDark ? '#1D3550' : '#EAF4FF',
    }),
    [isDark]
  );

  const resorts = useMemo<ResortItem[]>(() => {
    return (resortData as any[]).map((item) => ({
      id: String(item.id),
      name: normalizeText(item.name || t('api.resorts.defaultName')),
      country: normalizeText(item.country),
      region: normalizeText(item.region),
      address: normalizeText(item.address),
      area: normalizeText(item.area || [item.country, item.region, item.address].filter(Boolean).join(' · ')),
      lat: Number.isFinite(Number(item.lat)) ? Number(item.lat) : undefined,
      lng: Number.isFinite(Number(item.lng)) ? Number(item.lng) : undefined,
      rating: Number(item.rating || 0),
      reviewCount: Number(item.reviewCount || 0),
      tags: normalizeText(item.tags),
    }));
  }, [resortData, t]);

  const searchResults = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return resorts;
    return resorts.filter((item) => {
      const haystack = [item.name, item.country, item.region, item.address, item.area, item.tags].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [resorts, searchText]);

  const sortedResorts = useMemo(() => {
    const next = [...searchResults];
    next.sort((a, b) => {
      if (sortMode === 'rating') {
        return (Number(b.rating || 0) - Number(a.rating || 0)) || (Number(b.reviewCount || 0) - Number(a.reviewCount || 0));
      }
      if (sortMode === 'reviews') {
        return (Number(b.reviewCount || 0) - Number(a.reviewCount || 0)) || (Number(b.rating || 0) - Number(a.rating || 0));
      }
      const aHasLocation = Boolean(currentLocation && a.lat != null && a.lng != null);
      const bHasLocation = Boolean(currentLocation && b.lat != null && b.lng != null);
      if (aHasLocation && bHasLocation && currentLocation) {
        return distanceKm(currentLocation.lat, currentLocation.lng, a.lat!, a.lng!) - distanceKm(currentLocation.lat, currentLocation.lng, b.lat!, b.lng!);
      }
      if (aHasLocation) return -1;
      if (bHasLocation) return 1;
      return (Number(b.rating || 0) - Number(a.rating || 0)) || (Number(b.reviewCount || 0) - Number(a.reviewCount || 0));
    });
    return next;
  }, [currentLocation, searchResults, sortMode]);

  const summary = useMemo(() => {
    const rated = resorts.filter((item) => Number(item.rating || 0) > 0);
    const avgRating = rated.length ? rated.reduce((sum, item) => sum + Number(item.rating || 0), 0) / rated.length : 0;
    const reachable = resorts.filter((item) => item.lat != null && item.lng != null).length;
    return {
      total: resorts.length,
      avgRating,
      reachable,
    };
  }, [resorts]);

  const openDetail = (resortId: string) => {
    router.push(`${appRouteMap.resort_detail.path}?resortId=${encodeURIComponent(resortId)}` as never);
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.title }}>{t('tabs.resorts')}</Text>
          <Text style={{ marginTop: 4, color: colors.subtitle }}>{t('resorts.subtitle', { defaultValue: '검증된 다이빙 리조트를 가까운 순서와 검색으로 살펴보세요.' })}</Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <View
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.cardBg,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.subtitle }}>{t('resorts.heroTitle', { defaultValue: '검증된 다이빙 리조트' })}</Text>
                <Text style={{ marginTop: 4, fontSize: 22, fontWeight: '800', color: colors.title }}>{summary.total}</Text>
              </View>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.accentSoft,
                }}
              >
                <Store size={24} color={colors.accent} />
              </View>
            </View>
            <Text style={{ marginTop: 10, lineHeight: 20, color: colors.subtitle }}>
              {locationState === 'granted'
                ? t('resorts.locationGranted', { defaultValue: '현재 위치를 기준으로 가까운 리조트부터 보여드립니다.' })
                : t('resorts.locationFallback', { defaultValue: '위치 권한이 없으면 평점과 리뷰 기준으로 정렬합니다.' })}
            </Text>
            <View style={{ marginTop: 12, flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: 8, borderRadius: 18, backgroundColor: colors.accentSoft, padding: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>{t('resorts.filters.reviewed')}</Text>
                <Text style={{ marginTop: 4, fontSize: 18, fontWeight: '800', color: colors.title }}>{summary.avgRating ? summary.avgRating.toFixed(1) : '-'}</Text>
              </View>
              <View style={{ flex: 1, borderRadius: 18, backgroundColor: colors.accentSoft, padding: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>{t('pages.location.mapTitle', { defaultValue: '위치 가능' })}</Text>
                <Text style={{ marginTop: 4, fontSize: 18, fontWeight: '800', color: colors.title }}>{summary.reachable}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.fieldBorder,
              backgroundColor: colors.fieldBg,
              paddingHorizontal: 14,
              height: 50,
            }}
          >
            <Search size={18} color={colors.muted} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              style={{ marginLeft: 8, flex: 1, color: colors.text }}
              placeholder={t('resorts.searchPlaceholder', { defaultValue: '국가, 지역, 리조트명, 주소로 검색' })}
              placeholderTextColor={colors.muted}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.88}>
                <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12 }}>{t('common.reset', { defaultValue: '초기화' })}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
          {[
            { key: 'nearest' as const, label: t('resorts.sort.nearest', { defaultValue: '가까운 순' }) },
            { key: 'rating' as const, label: t('resorts.sort.rating', { defaultValue: '평점 순' }) },
            { key: 'reviews' as const, label: t('resorts.sort.reviews', { defaultValue: '리뷰 순' }) },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.88}
              onPress={() => setSortMode(item.key)}
              style={{
                marginRight: 8,
                marginBottom: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: sortMode === item.key ? colors.accent : colors.chipBorder,
                backgroundColor: sortMode === item.key ? colors.accent : colors.chipBg,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: sortMode === item.key ? '#fff' : colors.text, fontWeight: '800', fontSize: 12 }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => void refetch()}
            style={{
              marginBottom: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.chipBorder,
              backgroundColor: colors.chipBg,
              paddingHorizontal: 14,
              paddingVertical: 9,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Navigation size={13} color={colors.accent} />
            <Text style={{ marginLeft: 6, color: colors.text, fontWeight: '800', fontSize: 12 }}>{locationState === 'granted' ? t('common.retry', { defaultValue: '갱신' }) : t('pages.location.mapPlaceholder', { defaultValue: '위치 없음' })}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {isLoading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 42 }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : sortedResorts.length ? (
            sortedResorts.map((item, index) => {
              const distance = currentLocation && item.lat != null && item.lng != null ? distanceKm(currentLocation.lat, currentLocation.lng, item.lat, item.lng) : null;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.92}
                  onPress={() => openDetail(item.id)}
                  style={{
                    marginBottom: 14,
                    borderRadius: 26,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    backgroundColor: colors.cardBg,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row' }}>
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 22,
                        backgroundColor: colors.accentSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Waves size={28} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.title }}>{item.name}</Text>
                          <Text style={{ marginTop: 4, fontSize: 12, color: colors.subtitle }}>{item.area || item.address || item.region || item.country}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 6 }}>
                          <Star size={12} color={colors.accent} />
                          <Text style={{ marginLeft: 4, fontSize: 12, fontWeight: '800', color: colors.title }}>{item.rating ? item.rating.toFixed(1) : '-'}</Text>
                        </View>
                      </View>
                      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
                        {item.country ? (
                          <View style={{ marginRight: 6, marginBottom: 6, borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent }}>{item.country}</Text>
                          </View>
                        ) : null}
                        {item.region ? (
                          <View style={{ marginRight: 6, marginBottom: 6, borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent }}>{item.region}</Text>
                          </View>
                        ) : null}
                        <View style={{ marginRight: 6, marginBottom: 6, borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 5 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent }}>{t('resorts.reviews', { count: item.reviewCount })}</Text>
                        </View>
                        {distance != null ? (
                          <View style={{ marginRight: 6, marginBottom: 6, borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent }}>{distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ flex: 1, paddingRight: 12, fontSize: 12, lineHeight: 18, color: colors.muted }} numberOfLines={2}>
                      {item.address || item.area || t('resorts.locationFallback', { defaultValue: '위치 정보 없음' })}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => openDetail(item.id)}
                      style={{ borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 10 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{t('resorts.cta', { defaultValue: '상세보기' })}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.cardBg,
                padding: 24,
                alignItems: 'center',
              }}
            >
              <Search size={26} color={colors.muted} />
              <Text style={{ marginTop: 12, color: colors.subtitle, textAlign: 'center', lineHeight: 20 }}>
                {t('common.noResults', { defaultValue: '조건에 맞는 리조트를 찾지 못했습니다.' })}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
