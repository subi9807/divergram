import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bookmark, Navigation, Search, Star, Waves } from 'lucide-react-native';
import { Image } from 'expo-image';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { appRouteMap } from '../../src/config/sitemap';
import { useAuth } from '../../src/hooks/useAuth';
import { FeedAdSlot } from '../../src/features/feed/FeedAdSlot';
import { isAdMobEnabled } from '../../src/config/ads';
import { isLayoutPreviewEnabled } from '../../src/lib/layoutPreview';
import type { ActiveAdSlot } from '../../src/lib/api';

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
  source?: string;
  sourceUrl?: string;
  coverUrl?: string;
  certifications?: string[];
  bookingEnabled: boolean;
  bookingDepositAmount: number;
  bookingDepositCurrency: string;
};

type LocationState = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

const previewResorts: ResortItem[] = [
  {
    id: 'preview-palawan',
    name: 'Blue Current Palawan',
    country: 'Philippines',
    region: 'Palawan',
    address: 'Coron Bay, Palawan',
    area: 'Palawan · Philippines',
    lat: 11.9986,
    lng: 120.2043,
    rating: 4.9,
    reviewCount: 284,
    tags: 'PADI 5 Star Dive Center',
    source: 'Divergram',
    coverUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200',
    certifications: ['PADI 5 Star Dive Center'],
    bookingEnabled: true,
    bookingDepositAmount: 50,
    bookingDepositCurrency: 'USD',
  },
  {
    id: 'preview-jeju',
    name: 'Jeju Ocean Base',
    country: 'South Korea',
    region: 'Jeju',
    address: 'Seogwipo, Jeju-do',
    area: 'Jeju · South Korea',
    lat: 33.2538,
    lng: 126.5596,
    rating: 4.8,
    reviewCount: 196,
    tags: 'SSI Diamond Center',
    source: 'Divergram',
    coverUrl: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1200',
    certifications: ['SSI Diamond Center'],
    bookingEnabled: true,
    bookingDepositAmount: 50,
    bookingDepositCurrency: 'USD',
  },
];

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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('nearest');
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [savingResortId, setSavingResortId] = useState<string | null>(null);
  const [reservableOnly, setReservableOnly] = useState(false);
  const previewEnabled = isLayoutPreviewEnabled();

  const { data: resortData = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['resorts'],
    queryFn: apiClient.getResorts,
    enabled: !previewEnabled,
  });
  const { data: savedResortIds = [] } = useQuery({
    queryKey: ['saved-resorts', user?.id],
    enabled: Boolean(user?.id) && !previewEnabled,
    queryFn: () => apiClient.getSavedResortIds(String(user?.id || '')),
  });
  const { data: resortAds = [] } = useQuery<ActiveAdSlot[]>({
    queryKey: ['resort-active-ads'],
    queryFn: () => apiClient.getActiveAdSlots('resort_inline'),
    staleTime: 5 * 60 * 1000,
    enabled: !previewEnabled,
  });
  const savedResortSet = useMemo(() => new Set(savedResortIds), [savedResortIds]);
  const showResortAds = !isLayoutPreviewEnabled() && (resortAds.some((ad) => ad.isActive) || __DEV__ || isAdMobEnabled());

  useEffect(() => {
    if (previewEnabled) {
      setCurrentLocation({ lat: 11.9986, lng: 120.2043 });
      setLocationState('granted');
      return;
    }
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
  }, [previewEnabled]);

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
    if (previewEnabled) return previewResorts;
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
      source: normalizeText(item.source),
      sourceUrl: normalizeText(item.sourceUrl),
      coverUrl: normalizeText(item.coverUrl),
      certifications: Array.isArray(item.certifications) ? item.certifications : [],
      bookingEnabled: item.bookingEnabled === true,
      bookingDepositAmount: Number(item.bookingDepositAmount || 0),
      bookingDepositCurrency: normalizeText(item.bookingDepositCurrency || 'USD'),
    }));
  }, [previewEnabled, resortData, t]);

  const searchResults = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const candidates = reservableOnly ? resorts.filter((item) => item.bookingEnabled) : resorts;
    if (!keyword) return candidates;
    return candidates.filter((item) => {
      const haystack = [item.name, item.country, item.region, item.address, item.area, item.tags].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [reservableOnly, resorts, searchText]);

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

  useEffect(() => {
    setVisibleCount(10);
  }, [reservableOnly, searchText, sortMode]);

  const visibleResorts = sortedResorts.slice(0, visibleCount);

  const toggleSavedResort = async (resortId: string) => {
    const userId = String(user?.id || '').trim();
    if (!userId || savingResortId) return;
    setSavingResortId(resortId);
    try {
      await apiClient.toggleSavedResort(resortId, userId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['saved-resorts', userId] }),
        queryClient.invalidateQueries({ queryKey: ['profile-grid-saved-resorts', userId] }),
      ]);
    } catch (error) {
      console.error('[Resorts] Failed to toggle saved resort', error);
    } finally {
      setSavingResortId(null);
    }
  };

  const openDetail = (resortId: string) => {
    router.push(`${appRouteMap.resort_detail.path}?resortId=${encodeURIComponent(resortId)}` as never);
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} colors={[colors.accent]} />}
        onScroll={({ nativeEvent }) => {
          const nearBottom = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 180;
          if (nearBottom && visibleCount < sortedResorts.length) setVisibleCount((count) => Math.min(count + 10, sortedResorts.length));
        }}
        scrollEventThrottle={16}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.title }}>{t('tabs.resorts')}</Text>
          <Text style={{ marginTop: 4, color: colors.subtitle }}>{t('resorts.subtitle')}</Text>
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
              placeholder={t('resorts.searchPlaceholder')}
              placeholderTextColor={colors.muted}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.88}>
                <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12 }}>{t('common.reset')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
          {[
            { key: 'nearest' as const, label: t('resorts.sort.nearest') },
            { key: 'rating' as const, label: t('resorts.sort.rating') },
            { key: 'reviews' as const, label: t('resorts.sort.reviews') },
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
            onPress={() => setReservableOnly((value) => !value)}
            style={{ marginRight: 8, marginBottom: 8, borderRadius: 999, borderWidth: 1, borderColor: reservableOnly ? '#087F79' : colors.chipBorder, backgroundColor: reservableOnly ? '#087F79' : colors.chipBg, paddingHorizontal: 14, paddingVertical: 9 }}
          >
            <Text style={{ color: reservableOnly ? '#fff' : colors.text, fontWeight: '800', fontSize: 12 }}>{t('resortBooking.availableOnly')}</Text>
          </TouchableOpacity>
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
            <Text style={{ marginLeft: 6, color: colors.text, fontWeight: '800', fontSize: 12 }}>{locationState === 'granted' ? t('common.retry') : t('pages.location.mapPlaceholder')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {isLoading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 42 }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : visibleResorts.length ? (
            visibleResorts.map((item, index) => {
              const distance = currentLocation && item.lat != null && item.lng != null ? distanceKm(currentLocation.lat, currentLocation.lng, item.lat, item.lng) : null;
              return (
                <Fragment key={item.id}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => openDetail(item.id)}
                  style={{
                    marginBottom: 14,
                    borderRadius: 26,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    backgroundColor: colors.cardBg,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ height: 210, backgroundColor: colors.accentSoft }}>
                    {item.coverUrl ? <Image source={{ uri: item.coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={180} /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Waves size={38} color={colors.accent} /></View>}
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t(savedResortSet.has(item.id) ? 'resortFavorite.remove' : 'resortFavorite.add', { name: item.name })}
                      activeOpacity={0.85}
                      disabled={!user?.id || savingResortId === item.id}
                      onPress={(event) => { event.stopPropagation(); void toggleSavedResort(item.id); }}
                      style={{ position: 'absolute', right: 14, top: 14, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(3,18,31,0.68)' }}
                    >
                      {savingResortId === item.id ? <ActivityIndicator size="small" color="#fff" /> : <Bookmark size={21} color="#fff" fill={savedResortSet.has(item.id) ? '#ffffff' : 'transparent'} />}
                    </TouchableOpacity>
                  </View>
                  <View style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.title }}>{item.name}</Text>
                          <Text style={{ marginTop: 4, fontSize: 12, color: colors.subtitle }}>
                            {(item.address ? item.country : [item.region, item.country].filter(Boolean).join(' · ')) || t('resorts.locationFallback')}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 6 }}>
                          <Star size={12} color={colors.accent} />
                          <Text style={{ marginLeft: 4, fontSize: 12, fontWeight: '800', color: colors.title }}>{item.rating ? item.rating.toFixed(1) : '-'}</Text>
                        </View>
                      </View>
                      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
                        {item.bookingEnabled ? (
                          <View style={{ marginRight: 6, marginBottom: 6, borderRadius: 999, backgroundColor: isDark ? '#153A36' : '#E5F7F2', paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Text style={{ fontSize: 11, fontWeight: '900', color: isDark ? '#73D9C8' : '#087F79' }}>{t('resortBooking.availableBadge')}</Text>
                          </View>
                        ) : null}
                        {item.certifications?.[0] ? (
                          <View style={{ marginRight: 6, marginBottom: 6, borderRadius: 999, backgroundColor: isDark ? '#153A36' : '#E5F7F2', paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#73D9C8' : '#087F79' }} numberOfLines={1}>{item.certifications[0]}</Text>
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
                      {item.address || item.area || t('resorts.locationFallback')}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => openDetail(item.id)}
                      style={{ borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 10 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{t('resorts.cta')}</Text>
                    </TouchableOpacity>
                  </View>
                  {item.source ? (
                    <TouchableOpacity
                      disabled={!item.sourceUrl}
                      onPress={(event) => { event.stopPropagation(); if (item.sourceUrl) void Linking.openURL(item.sourceUrl); }}
                      style={{ marginTop: 9, alignSelf: 'flex-start' }}
                    >
                      <Text style={{ color: colors.muted, fontSize: 10, textDecorationLine: item.sourceUrl ? 'underline' : 'none' }}>
                        {t('resorts.sourceLabel', { source: item.source.toUpperCase() })}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  </View>
                </TouchableOpacity>
                {showResortAds && (index + 1) % 5 === 0 ? (
                  <FeedAdSlot label={t('resortAds.label')} subtitle={t('resortAds.subtitle')} ctaLabel={t('resortAds.cta')} />
                ) : null}
                </Fragment>
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
                {t('common.noResults')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
