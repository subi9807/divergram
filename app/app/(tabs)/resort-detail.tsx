import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Share as NativeShare, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, ExternalLink, Globe2, Mail, MapPin, Navigation, Phone, Share2, ShieldCheck, Star, Store } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { appRouteMap } from '../../src/config/sitemap';
import { useAuth } from '../../src/hooks/useAuth';
import { buildShareUrl } from '../../src/lib/shareLinks';

type DetailTab = 'intro' | 'prices' | 'amenities' | 'reviews';

const AMENITY_CATEGORIES = [
  { key: 'connectivity', color: '#2563EB' },
  { key: 'dive_support', color: '#0EA5E9' },
  { key: 'food', color: '#F97316' },
  { key: 'wellness', color: '#10B981' },
  { key: 'water', color: '#06B6D4' },
  { key: 'transport', color: '#8B5CF6' },
  { key: 'rooms', color: '#6366F1' },
  { key: 'safety', color: '#EF4444' },
  { key: 'family', color: '#EC4899' },
  { key: 'other', color: '#64748B' },
] as const;

const AMENITIES = [
  ['wifi','connectivity'],['parking','connectivity'],['valet_parking','connectivity'],['luggage_storage','connectivity'],
  ['shower','dive_support'],['locker','dive_support'],['towel','dive_support'],['changing_room','dive_support'],['private_shower','dive_support'],['equipment_rental','dive_support'],['gear_storage','dive_support'],['gear_shop','dive_support'],['dive_center','dive_support'],['air_fill','dive_support'],['nitrox_fill','dive_support'],['camera_rinse_tank','dive_support'],['freshwater_rinse','dive_support'],['camera_wash','dive_support'],['camera_gear_rental','dive_support'],['oxygen','dive_support'],['nitrox','dive_support'],['emergency_kit','dive_support'],
  ['restaurant','food'],['cafe','food'],['bar','food'],['beach_bar','food'],['room_service','food'],['breakfast','food'],['vegan_menu','food'],['kids_menu','food'],['bbq_area','food'],
  ['spa','wellness'],['sauna','wellness'],['massage','wellness'],['fitness_room','wellness'],['yoga_deck','wellness'],['sunset_deck','wellness'],
  ['pool','water'],['infinity_pool','water'],['kids_pool','water'],['beach_access','water'],['private_beach','water'],['boat_dock','water'],['private_boat','water'],['house_reef','water'],['boat_charter','water'],
  ['pick_up','transport'],['airport_transfer','transport'],['shuttle_bus','transport'],['guided_tour','transport'],
  ['training_room','rooms'],['meeting_room','rooms'],['conference_room','rooms'],['drying_room','rooms'],
  ['medical_support','safety'],['daily_cleaning','safety'],['housekeeping','safety'],['24h_front_desk','safety'],['security','safety'],['generator','safety'],
  ['family_friendly','family'],['kids_club','family'],['playground','family'],['wheelchair_accessible','family'],
  ['smoking_area','other'],['non_smoking','other'],
] as const;

function toRad(value: number) { return (value * Math.PI) / 180; }
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * (2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
}

export default function ResortDetailScreen() {
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ resortId?: string }>();
  const resortId = String(params.resortId || '').trim();
  const [tab, setTab] = useState<DetailTab>('intro');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: resortData = [], isLoading } = useQuery({ queryKey: ['resorts'], queryFn: apiClient.getResorts });
  const { data: prices = [], isLoading: pricesLoading } = useQuery({ queryKey: ['resort-prices', resortId], queryFn: () => apiClient.getResortPrices(resortId), enabled: Boolean(resortId) });
  const resort = useMemo(() => (resortData as any[]).find((item) => String(item.id) === resortId) || null, [resortData, resortId]);
  const { data: savedResortIds = [] } = useQuery({
    queryKey: ['saved-resorts', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getSavedResortIds(String(user?.id || '')),
  });
  const isSaved = savedResortIds.includes(resortId);

  const toggleSaved = async () => {
    const userId = String(user?.id || '').trim();
    if (!userId || !resortId || saving) return;
    setSaving(true);
    try {
      await apiClient.toggleSavedResort(resortId, userId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['saved-resorts', userId] }),
        queryClient.invalidateQueries({ queryKey: ['profile-grid-saved-resorts', userId] }),
      ]);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let canceled = false;
    void Location.requestForegroundPermissionsAsync().then(async (permission) => {
      if (!permission.granted) return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!canceled) setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
    }).catch(() => undefined);
    return () => { canceled = true; };
  }, []);

  const colors = {
    page: isDark ? '#07131F' : '#F4F8FB', title: isDark ? '#F1F5F9' : '#102A36', text: isDark ? '#CBD5E1' : '#36515D', muted: isDark ? '#8FA3B5' : '#718791',
    card: isDark ? '#0F2030' : '#FFFFFF', border: isDark ? '#243B4C' : '#DCE8EA', soft: isDark ? '#173248' : '#EAF5F8', accent: '#087F79', blue: '#0D5FA8',
  };
  const photos = useMemo(() => Array.from(new Set((resort?.photoUrls || [resort?.coverUrl]).filter(Boolean))) as string[], [resort]);
  const distance = currentLocation && resort?.lat != null && resort?.lng != null ? distanceKm(currentLocation.lat, currentLocation.lng, Number(resort.lat), Number(resort.lng)) : null;
  const amenityGroups = useMemo(() => {
    const selected = new Set<string>(Array.isArray(resort?.amenities) ? resort.amenities : []);
    return AMENITY_CATEGORIES.map((category) => ({ ...category, label: t(`resortDetail.amenityCategories.${category.key}`), items: AMENITIES.filter(([key, group]) => group === category.key && selected.has(key)).map(([key]) => ({ key, label: t(`resortAmenities.${key}`) })) })).filter((group) => group.items.length);
  }, [resort, t]);

  const openMap = () => {
    const location = encodeURIComponent([resort?.name, resort?.address || resort?.area].filter(Boolean).join(' · '));
    router.push(`${appRouteMap.location.path}?location=${location}` as never);
  };
  const openUrl = (url?: string) => { if (url) void Linking.openURL(url); };

  if (isLoading && !resort) return <Screen><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View></Screen>;
  if (!resort) return <Screen><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}><Text style={{ color: colors.muted }}>{t('resortDetail.notFound')}</Text></View></Screen>;

  const tabs: { key: DetailTab; label: string; note: string }[] = [
    { key: 'intro', label: t('resortDetail.tabs.intro'), note: t('resortDetail.tabs.guide') }, { key: 'prices', label: t('resortDetail.tabs.prices'), note: t('resortDetail.productCount', { count: prices.length }) },
    { key: 'amenities', label: t('resortDetail.tabs.amenities'), note: t('resortDetail.itemCount', { count: resort.amenities?.length || 0 }) }, { key: 'reviews', label: t('resortDetail.tabs.reviews'), note: t('resortDetail.itemCount', { count: resort.reviewCount || 0 }) },
  ];

  return (
    <Screen style={{ backgroundColor: colors.page }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View style={{ height: 310, backgroundColor: colors.soft }}>
          {photos.length ? <Image source={{ uri: photos[photoIndex] }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={180} /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Store size={48} color={colors.blue} /></View>}
          <View style={{ position: 'absolute', top: 14, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,25,35,.72)' }}><ArrowLeft size={20} color="#fff" /></TouchableOpacity>
            <View style={{ flexDirection: 'row' }}>
              {photos.length > 1 ? <View style={{ marginRight: 8, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: 'rgba(5,25,35,.72)' }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{photoIndex + 1} / {photos.length}</Text></View> : null}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.share')} onPress={() => void NativeShare.share({ title: resort.name, message: `${resort.name}\n${buildShareUrl('resort', resortId)}`, url: buildShareUrl('resort', resortId) })} style={{ width: 42, height: 42, marginRight: 8, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,25,35,.72)' }}><Share2 size={20} color="#fff" /></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t(isSaved ? 'resortFavorite.remove' : 'resortFavorite.add', { name: resort.name })} disabled={!user?.id || saving} onPress={() => void toggleSaved()} style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,25,35,.72)' }}>{saving ? <ActivityIndicator size="small" color="#fff" /> : <Bookmark size={20} color="#fff" fill={isSaved ? '#fff' : 'transparent'} />}</TouchableOpacity>
            </View>
          </View>
          {photos.length > 1 ? <><TouchableOpacity onPress={() => setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)} style={{ position: 'absolute', left: 12, top: 142, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,25,35,.55)' }}><ChevronLeft size={22} color="#fff" /></TouchableOpacity><TouchableOpacity onPress={() => setPhotoIndex((photoIndex + 1) % photos.length)} style={{ position: 'absolute', right: 12, top: 142, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,25,35,.55)' }}><ChevronRight size={22} color="#fff" /></TouchableOpacity></> : null}
        </View>

        <View style={{ marginTop: -24, marginHorizontal: 16, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}><View style={{ flex: 1, paddingRight: 10 }}><Text style={{ color: colors.title, fontSize: 24, fontWeight: '900' }}>{resort.name}</Text><Text style={{ marginTop: 5, color: colors.muted, lineHeight: 19 }}>{resort.address ? resort.country : [resort.region, resort.country].filter(Boolean).join(' · ')}</Text></View><View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.soft }}><Star size={14} color={colors.blue} /><Text style={{ marginLeft: 4, color: colors.title, fontWeight: '900' }}>{resort.rating ? resort.rating.toFixed(1) : '-'}</Text></View></View>
          <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' }}>{resort.certifications?.map((item: string) => <View key={item} style={{ marginRight: 6, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: isDark ? '#123B37' : '#E5F7F2' }}><Text style={{ color: isDark ? '#76DDD0' : colors.accent, fontSize: 10, fontWeight: '800' }}>{item}</Text></View>)}{distance != null ? <View style={{ marginBottom: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.soft, flexDirection: 'row', alignItems: 'center' }}><Navigation size={11} color={colors.blue} /><Text style={{ marginLeft: 4, color: colors.blue, fontSize: 10, fontWeight: '800' }}>{distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</Text></View> : null}</View>
          <TouchableOpacity onPress={openMap} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}><MapPin size={15} color={colors.accent} /><Text style={{ marginLeft: 7, flex: 1, color: colors.text, lineHeight: 20 }}>{resort.address || resort.area || t('resortDetail.noAddress')}</Text><ChevronRight size={16} color={colors.muted} /></TouchableOpacity>
          {resort.bookingEnabled ? <TouchableOpacity onPress={() => router.push(`${appRouteMap.resort_booking.path}?resortId=${encodeURIComponent(resortId)}` as never)} style={{ marginTop: 16, paddingVertical: 14, borderRadius: 15, alignItems: 'center', backgroundColor: colors.accent }}><Text style={{ color: '#fff', fontWeight: '900' }}>{t('resortBooking.action')}</Text></TouchableOpacity> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4 }}>
          {tabs.map((item) => <TouchableOpacity key={item.key} onPress={() => setTab(item.key)} style={{ width: 104, marginRight: 8, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: tab === item.key ? colors.accent : colors.border, backgroundColor: tab === item.key ? colors.accent : colors.card }}><Text style={{ color: tab === item.key ? '#fff' : colors.title, fontWeight: '900', fontSize: 13 }}>{item.label}</Text><Text style={{ marginTop: 3, color: tab === item.key ? 'rgba(255,255,255,.72)' : colors.muted, fontSize: 9 }}>{item.note}</Text></TouchableOpacity>)}
        </ScrollView>

        <View style={{ margin: 16, padding: 17, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
          {tab === 'intro' ? <View><Text style={{ color: colors.title, fontSize: 16, fontWeight: '900' }}>{t('resortDetail.introTitle')}</Text><Text style={{ marginTop: 10, color: colors.text, lineHeight: 23 }}>{resort.description || t('resortDetail.noDescription')}</Text><View style={{ marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}><Text style={{ color: colors.title, fontWeight: '900' }}>{t('resortDetail.contact')}</Text>{resort.phones?.map((value: string) => <TouchableOpacity key={value} onPress={() => openUrl(`tel:${value}`)} style={{ marginTop: 11, flexDirection: 'row', alignItems: 'center' }}><Phone size={15} color={colors.accent} /><Text style={{ marginLeft: 9, color: colors.text }}>{value}</Text></TouchableOpacity>)}{resort.emails?.map((value: string) => <TouchableOpacity key={value} onPress={() => openUrl(`mailto:${value}`)} style={{ marginTop: 11, flexDirection: 'row', alignItems: 'center' }}><Mail size={15} color={colors.accent} /><Text style={{ marginLeft: 9, color: colors.text }}>{value}</Text></TouchableOpacity>)}{resort.website ? <TouchableOpacity onPress={() => openUrl(resort.website)} style={{ marginTop: 11, flexDirection: 'row', alignItems: 'center' }}><Globe2 size={15} color={colors.accent} /><Text style={{ marginLeft: 9, flex: 1, color: colors.accent }} numberOfLines={1}>{resort.website}</Text><ExternalLink size={14} color={colors.accent} /></TouchableOpacity> : null}</View>{resort.source ? <TouchableOpacity onPress={() => openUrl(resort.sourceUrl)} style={{ marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center' }}><ShieldCheck size={16} color={colors.muted} /><Text style={{ marginLeft: 8, color: colors.muted, fontSize: 11 }}>{t('resorts.sourceLabel', { source: String(resort.source).toUpperCase() })}</Text></TouchableOpacity> : null}</View> : null}

          {tab === 'prices' ? <View><Text style={{ color: colors.title, fontSize: 16, fontWeight: '900' }}>{t('resortDetail.priceTitle')}</Text>{pricesLoading ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.accent} /> : prices.length ? prices.map((price: any) => <View key={price.id} style={{ marginTop: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.soft }}><View style={{ flexDirection: 'row', alignItems: 'flex-start' }}><View style={{ flex: 1, paddingRight: 8 }}><Text style={{ color: colors.title, fontWeight: '900' }}>{price.title}</Text><Text style={{ marginTop: 4, color: colors.muted, fontSize: 11 }}>{price.duration_text || price.unit_label}</Text></View><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '900' }}>{price.currency} {Number(price.amount || 0).toLocaleString()}</Text></View>{price.description ? <Text style={{ marginTop: 9, color: colors.text, lineHeight: 19 }}>{price.description}</Text> : null}{price.included_items?.length ? <Text style={{ marginTop: 8, color: colors.muted, fontSize: 11 }}>{price.included_items.join(' · ')}</Text> : null}</View>) : <Text style={{ marginTop: 18, color: colors.muted }}>{t('resortDetail.noPrices')}</Text>}</View> : null}

          {tab === 'amenities' ? <View><Text style={{ color: colors.title, fontSize: 16, fontWeight: '900' }}>{t('resortDetail.tabs.amenities')}</Text>{amenityGroups.length ? amenityGroups.map((group) => <View key={group.key} style={{ marginTop: 13, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: group.color, backgroundColor: colors.soft }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.title, fontWeight: '900' }}>{group.label}</Text><Text style={{ color: colors.muted, fontSize: 10 }}>{t('resortDetail.itemCount', { count: group.items.length })}</Text></View><View style={{ marginTop: 9, flexDirection: 'row', flexWrap: 'wrap' }}>{group.items.map((item) => <View key={item.key} style={{ marginRight: 6, marginBottom: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.card }}><Text style={{ color: colors.text, fontSize: 10, fontWeight: '700' }}>{item.label}</Text></View>)}</View></View>) : <Text style={{ marginTop: 18, color: colors.muted }}>{t('resortDetail.noAmenities')}</Text>}</View> : null}

          {tab === 'reviews' ? <View><Text style={{ color: colors.title, fontSize: 16, fontWeight: '900' }}>{t('resortDetail.tabs.reviews')}</Text><View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: colors.accent, fontSize: 44, fontWeight: '900' }}>{resort.rating ? resort.rating.toFixed(1) : '-'}</Text><View style={{ marginLeft: 16 }}><Text style={{ color: colors.title, fontWeight: '900' }}>{t('resortDetail.reviewCount', { count: resort.reviewCount || 0 })}</Text><Text style={{ marginTop: 5, color: colors.muted, fontSize: 11 }}>{t('resortDetail.reviewBasis')}</Text></View></View></View> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
