import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Navigation, Star, Store } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { appRouteMap } from '../../src/config/sitemap';

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

export default function ResortDetailScreen() {
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ resortId?: string }>();
  const resortId = String(params.resortId || '').trim();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: resortData = [], isLoading } = useQuery({ queryKey: ['resorts'], queryFn: apiClient.getResorts });

  useEffect(() => {
    let canceled = false;
    const loadLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (canceled) return;
        setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      } catch {
        if (!canceled) setCurrentLocation(null);
      }
    };

    void loadLocation();
    return () => {
      canceled = true;
    };
  }, []);

  const resort = useMemo(() => (resortData as any[]).find((item) => String(item.id) === resortId) || null, [resortData, resortId]);

  const colors = useMemo(
    () => ({
      title: isDark ? '#E2E8F0' : '#0F172A',
      subtitle: isDark ? '#94A3B8' : '#64748B',
      text: isDark ? '#CBD5E1' : '#334155',
      muted: isDark ? '#94A3B8' : '#64748B',
      cardBg: isDark ? '#0F1B2A' : '#FFFFFF',
      cardBorder: isDark ? '#243447' : '#DCE8F4',
      accent: '#0D5FA8',
      accentSoft: isDark ? '#1D3550' : '#EAF4FF',
    }),
    [isDark]
  );

  const distance = useMemo(() => {
    if (!currentLocation || !resort || resort.lat == null || resort.lng == null) return null;
    return distanceKm(currentLocation.lat, currentLocation.lng, Number(resort.lat), Number(resort.lng));
  }, [currentLocation, resort]);

  const openMap = () => {
    const q = encodeURIComponent([resort?.name, resort?.area || resort?.address].filter(Boolean).join(' · ') || resort?.name || '');
    router.push(`${appRouteMap.location.path}?location=${q}` as never);
  };

  const renderBody = () => {
    if (isLoading && !resort) {
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }

    if (!resort) {
      return (
        <View style={{ margin: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 20, alignItems: 'center' }}>
          <Text style={{ color: colors.subtitle, textAlign: 'center' }}>{t('common.noResults', { defaultValue: '리조트 정보를 찾지 못했습니다.' })}</Text>
        </View>
      );
    }

    return (
      <>
        <View style={{ margin: 20, borderRadius: 28, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 74, height: 74, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Store size={30} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.title }}>{resort.name}</Text>
              <Text style={{ marginTop: 4, color: colors.subtitle }}>{resort.area || resort.address || resort.region || resort.country}</Text>
            </View>
          </View>

          <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{ marginRight: 8, marginBottom: 8, borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>{resort.country || 'Country'}</Text>
            </View>
            {resort.region ? (
              <View style={{ marginRight: 8, marginBottom: 8, borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 7 }}>
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>{resort.region}</Text>
              </View>
            ) : null}
            <View style={{ marginRight: 8, marginBottom: 8, borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center' }}>
              <Star size={12} color={colors.accent} />
              <Text style={{ marginLeft: 4, color: colors.accent, fontSize: 12, fontWeight: '800' }}>{resort.rating ? resort.rating.toFixed(1) : '-'}</Text>
            </View>
            <View style={{ marginRight: 8, marginBottom: 8, borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>{t('resorts.reviews', { count: resort.reviewCount })}</Text>
            </View>
            {distance != null ? (
              <View style={{ marginRight: 8, marginBottom: 8, borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center' }}>
                <Navigation size={12} color={colors.accent} />
                <Text style={{ marginLeft: 4, color: colors.accent, fontSize: 12, fontWeight: '800' }}>{distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ marginTop: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.accentSoft, padding: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.title }}>{t('resorts.detailTitle', { defaultValue: '리조트 상세 정보' })}</Text>
            <Text style={{ marginTop: 6, lineHeight: 20, color: colors.text }}>
              {resort.address || resort.area || t('resorts.locationFallback', { defaultValue: '주소 정보가 아직 없습니다.' })}
            </Text>
            {resort.tags ? <Text style={{ marginTop: 8, color: colors.muted, fontSize: 12 }}>{resort.tags}</Text> : null}
          </View>

          <View style={{ marginTop: 16, flexDirection: 'row' }}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={openMap}
              style={{ flex: 1, marginRight: 8, borderRadius: 18, backgroundColor: colors.accent, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>{t('resorts.openMap', { defaultValue: '지도에서 보기' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.back()}
              style={{ flex: 1, marginLeft: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>{t('common.back', { defaultValue: '뒤로' })}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginHorizontal: 20, marginBottom: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.title }}>{t('resorts.detailCtaTitle', { defaultValue: '운영용 확인 포인트' })}</Text>
          <Text style={{ marginTop: 6, lineHeight: 20, color: colors.subtitle }}>
            {t('resorts.detailCtaBody', { defaultValue: '현재 화면은 실제 API 데이터를 사용하며, 탭하면 지도 화면과 연결됩니다.' })}
          </Text>
        </View>
      </>
    );
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.back()}
            style={{ width: 42, height: 42, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          >
            <ArrowLeft size={18} color={colors.title} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.title }}>{t('resorts.title')}</Text>
            <Text style={{ marginTop: 4, color: colors.subtitle }}>{t('resorts.subtitle', { defaultValue: '검증된 다이빙 리조트 상세 정보' })}</Text>
          </View>
        </View>

        {renderBody()}
      </ScrollView>
    </Screen>
  );
}
