import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Camera, Droplets, Gauge, MapPin, Search, Thermometer, Timer, UserRound, Waves } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { useToast } from '../../src/components/Toast';
import { apiClient } from '../../src/lib/api';
import { uploadImage, uploadVideo } from '../../src/services/cloudinaryService';
import { buildGoogleStaticMapUrl, isGoogleMapsApiConfigured, reverseGooglePoint, searchGooglePoint, type GooglePointResult } from '../../src/lib/googleMapSearch';

type DiveType = 'scuba' | 'freediving';
type GasType = 'air' | 'nitrox' | 'heliox';
type SelectedMediaItem = { uri: string; type: 'image' | 'video' };

type DiveLogForm = {
  title: string;
  diveType: DiveType;
  gasType: GasType;
  gasPercent: string;
  pointName: string;
  pointAddress: string;
  locationLat: string;
  locationLng: string;
  resortName: string;
  depth: string;
  duration: string;
  temperature: string;
  visibility: string;
  buddy: string;
  notes: string;
  photoUri: string;
};

const initialForm: DiveLogForm = {
  title: '',
  diveType: 'freediving',
  gasType: 'air',
  gasPercent: '',
  pointName: '',
  pointAddress: '',
  locationLat: '',
  locationLng: '',
  resortName: '',
  depth: '',
  duration: '',
  temperature: '',
  visibility: '',
  buddy: '',
  notes: '',
  photoUri: '',
};

function toNumber(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function exifSignedValue(value: number, ref: unknown, positiveRef: string, negativeRef: string) {
  if (typeof ref !== 'string') return value;
  if (ref.toUpperCase() === negativeRef) return -Math.abs(value);
  if (ref.toUpperCase() === positiveRef) return Math.abs(value);
  return value;
}

function parseExifCoordinate(raw: unknown, ref: unknown, positiveRef: string, negativeRef: string): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return exifSignedValue(raw, ref, positiveRef, negativeRef);
  }
  if (Array.isArray(raw) && raw.length >= 3) {
    const d = Number(raw[0]);
    const m = Number(raw[1]);
    const s = Number(raw[2]);
    if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(s)) return null;
    const decimal = d + m / 60 + s / 3600;
    return exifSignedValue(decimal, ref, positiveRef, negativeRef);
  }
  if (typeof raw === 'string') {
    const parts = raw
      .split(/[,\s/]+/)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));
    if (!parts.length) return null;
    if (parts.length === 1) return exifSignedValue(parts[0], ref, positiveRef, negativeRef);
    const d = parts[0];
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    return exifSignedValue(d + m / 60 + s / 3600, ref, positiveRef, negativeRef);
  }
  return null;
}

function parseExifGps(exif: Record<string, unknown> | null | undefined): { lat: number; lng: number } | null {
  if (!exif) return null;
  const lat = parseExifCoordinate(exif.GPSLatitude, exif.GPSLatitudeRef, 'N', 'S');
  const lng = parseExifCoordinate(exif.GPSLongitude, exif.GPSLongitudeRef, 'E', 'W');
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function normalizePickedUri(raw: unknown): string {
  const uri = String(raw || '').trim();
  if (!uri) return '';
  if (/^(file|content|ph|assets-library|https?):\/\//i.test(uri)) return uri;
  if (uri.startsWith('/')) return `file://${uri}`;
  return uri;
}

export default function LogsScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useLocalSearchParams<{ postId?: string }>();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DiveLogForm>(initialForm);
  const [pointQuery, setPointQuery] = useState('');
  const [pointSearchPending, setPointSearchPending] = useState(false);
  const [pointSearchError, setPointSearchError] = useState('');
  const [pointResults, setPointResults] = useState<GooglePointResult[]>([]);
  const [resortQuery, setResortQuery] = useState('');
  const [resortFocus, setResortFocus] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaItem[]>([]);
  const [publishToFeed, setPublishToFeed] = useState(true);
  const [publishToReels, setPublishToReels] = useState(false);
  const [editingPostId, setEditingPostId] = useState('');
  const [prefilledPostId, setPrefilledPostId] = useState('');
  const [loadingExistingPost, setLoadingExistingPost] = useState(false);

  const { data: resorts = [] } = useQuery({ queryKey: ['logs-resorts'], queryFn: apiClient.getResorts });
  const { data: editingPost } = useQuery({
    queryKey: ['log-edit-post', editingPostId],
    enabled: Boolean(editingPostId),
    queryFn: () => apiClient.getPostById(editingPostId),
  });

  const resortCandidates = useMemo(() => {
    const keyword = resortQuery.trim().toLowerCase();
    if (!keyword) return resorts.slice(0, 8);
    return resorts.filter((item: any) => `${item.name || ''} ${item.area || ''}`.toLowerCase().includes(keyword)).slice(0, 8);
  }, [resorts, resortQuery]);

  const needsGasPercent = form.diveType === 'scuba' && form.gasType !== 'air';
  const latNum = toNumber(form.locationLat);
  const lngNum = toNumber(form.locationLng);
  const mapPreview = buildGoogleStaticMapUrl(latNum ?? undefined, lngNum ?? undefined);
  const hasPointName = Boolean(form.pointName.trim());
  const hasVideoMedia = selectedMedia.some((item) => item.type === 'video');
  const hasPublishTarget = publishToFeed || publishToReels;
  const canSubmit = Boolean(
    form.title.trim() &&
    hasPointName &&
    hasPublishTarget &&
    (!publishToReels || hasVideoMedia) &&
    (!needsGasPercent || form.gasPercent.trim())
  );

  useEffect(() => {
    const nextEditingPostId = String(params.postId || '').trim();
    /* eslint-disable react-hooks/set-state-in-effect -- 편집 대상 포스트를 라우트 파라미터로 동기화해야 함 */
    setEditingPostId(nextEditingPostId);
    setPrefilledPostId('');
    setLoadingExistingPost(Boolean(nextEditingPostId));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [params.postId]);

  useEffect(() => {
    if (!editingPostId || !editingPost || prefilledPostId === editingPostId) return;

    const mediaRows = Array.isArray((editingPost as any)?.media) ? (editingPost as any).media : [];
    const loadedMedia = mediaRows
      .map((item: any) => ({
        uri: String(item?.url || '').trim(),
        type: item?.type === 'video' ? ('video' as const) : ('image' as const),
      }))
      .filter((item: SelectedMediaItem) => Boolean(item.uri));

    /* eslint-disable react-hooks/set-state-in-effect -- 서버에서 불러온 편집 값을 폼 상태로 초기화 */
    setForm({
      title: String((editingPost as any)?.content || '').split('\n')[0] || '',
      diveType: (editingPost as any)?.diveType === 'scuba' ? 'scuba' : 'freediving',
      gasType: ((editingPost as any)?.gasType || 'air') as GasType,
      gasPercent: String((editingPost as any)?.gasPercent || ''),
      pointName: String((editingPost as any)?.diveSite || (editingPost as any)?.location || ''),
      pointAddress: String((editingPost as any)?.location || ''),
      locationLat: String((editingPost as any)?.locationLat || ''),
      locationLng: String((editingPost as any)?.locationLng || ''),
      resortName: String((editingPost as any)?.resort || ''),
      depth: String((editingPost as any)?.maxDepth || ''),
      duration: String((editingPost as any)?.diveDuration || ''),
      temperature: String((editingPost as any)?.waterTemperature || ''),
      visibility: String((editingPost as any)?.visibility || ''),
      buddy: '',
      notes: String((editingPost as any)?.content || ''),
      photoUri: String((editingPost as any)?.image || loadedMedia[0]?.uri || ''),
    });
    setPointQuery(String((editingPost as any)?.location || (editingPost as any)?.diveSite || ''));
    setSelectedMedia(loadedMedia);
    setPublishToFeed(Boolean((editingPost as any)?.publishToFeed !== false));
    setPublishToReels(Boolean((editingPost as any)?.publishToReels));
    setPrefilledPostId(editingPostId);
    setLoadingExistingPost(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [editingPost, editingPostId, prefilledPostId]);

  useEffect(() => {
    if (editingPostId && editingPost === null) {
      /* eslint-disable react-hooks/set-state-in-effect -- 편집 데이터가 없을 때 로딩 상태만 종료 */
      setLoadingExistingPost(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [editingPost, editingPostId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const uploadedMedia = await Promise.all(
        selectedMedia.map(async (item, index) => {
          const rawUri = String(item.uri || '').trim();
          if (!rawUri) return null;
          if (/^https?:\/\//i.test(rawUri)) {
            return { uri: rawUri, type: item.type, order: index };
          }
          const result = item.type === 'video' ? await uploadVideo(rawUri) : await uploadImage(rawUri);
          return { uri: result.url, type: item.type, order: index };
        })
      );
      const mediaAssets = uploadedMedia.filter((item): item is { uri: string; type: 'image' | 'video'; order: number } => Boolean(item?.uri));
      const primaryImageUri = mediaAssets.find((item) => item.type === 'image')?.uri || mediaAssets[0]?.uri || form.photoUri || null;

      const payload = {
        title: form.title.trim(),
        diveType: form.diveType,
        gasType: form.gasType,
        gasPercent: form.gasPercent.trim(),
        location: form.pointAddress.trim() || form.pointName.trim(),
        diveSite: form.pointName.trim(),
        pointName: form.pointName.trim(),
        depth: form.depth.trim(),
        duration: form.duration.trim(),
        temperature: form.temperature.trim(),
        visibility: form.visibility.trim(),
        buddy: form.buddy.trim(),
        notes: form.notes.trim(),
        resortName: form.resortName.trim(),
        latitude: latNum,
        longitude: lngNum,
        imageUri: primaryImageUri,
        mediaAssets,
        publishToFeed,
        publishToReels,
      };

      if (editingPostId) {
        await apiClient.updatePost(editingPostId, payload);
        return { mode: 'update' as const };
      }
      await apiClient.createLog(payload);
      return { mode: 'create' as const };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['logs'] });
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
      await queryClient.invalidateQueries({ queryKey: ['reels'] });
      await queryClient.invalidateQueries({ queryKey: ['explore'] });
      await queryClient.invalidateQueries({ queryKey: ['location-feed'] });
      await queryClient.invalidateQueries({ queryKey: ['profile-grid-own-feed'] });
      await queryClient.invalidateQueries({ queryKey: ['profile-grid-own-reels'] });
      if (editingPostId) {
        await queryClient.invalidateQueries({ queryKey: ['post-detail', editingPostId] });
      }
      setForm(initialForm);
      setSelectedMedia([]);
      setPointQuery('');
      setPointResults([]);
      setResortQuery('');
      setPublishToFeed(true);
      setPublishToReels(false);
      const nextEditingPostId = editingPostId;
      setLoadingExistingPost(false);
      Alert.alert(t('logsForm.saveSuccessTitle'), t('logsForm.saveSuccessMessage'), [
        {
          text: t('common.confirm', { defaultValue: '확인' }),
          onPress: () => {
            if (nextEditingPostId) {
              router.replace(`/(tabs)/post?post=${encodeURIComponent(nextEditingPostId)}` as never);
            }
          },
        },
      ]);
    },
    onError: (error: any) => {
      const msg = String(error?.response?.data?.error || error?.message || '');
      if (msg.includes('gas_percent')) {
        Alert.alert(t('logsForm.saveFailTitle'), t('logsForm.validation.gasPercentRequired'));
        return;
      }
      Alert.alert(t('logsForm.saveFailTitle'), t('logsForm.saveFailMessage'));
    },
  });

  const update = <K extends keyof DiveLogForm>(key: K, value: DiveLogForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const choosePoint = (item: GooglePointResult) => {
    setForm((prev) => ({
      ...prev,
      pointName: prev.pointName.trim() || item.name,
      pointAddress: item.address,
      locationLat: String(item.lat),
      locationLng: String(item.lng),
    }));
    setPointResults([]);
    setPointQuery(item.address);
    setPointSearchError('');
  };

  const runPointSearch = async () => {
    Keyboard.dismiss();
    if (!isGoogleMapsApiConfigured()) {
      const message = t('logsForm.map.apiKeyMissing');
      setPointSearchError(message);
      showToast({ type: 'error', title: message });
      return;
    }
    const keyword = pointQuery.trim();
    if (!keyword) {
      const message = t('logsForm.map.queryRequired');
      setPointSearchError(message);
      showToast({ type: 'info', title: message });
      return;
    }
    setPointSearchPending(true);
    setPointSearchError('');
    setPointResults([]);
    try {
      const rows = await searchGooglePoint(keyword);
      setPointResults(rows);
      if (!rows.length) {
        const message = t('logsForm.map.noResult');
        setPointSearchError(message);
        showToast({ type: 'info', title: message });
      } else {
        showToast({ type: 'success', title: t('logsForm.map.resultFound', { count: rows.length }) });
      }
    } catch {
      const message = t('logsForm.map.searchFailed');
      setPointSearchError(message);
      showToast({ type: 'error', title: message });
    } finally {
      setPointSearchPending(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('logsForm.photo.permissionTitle'), t('logsForm.photo.permissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      orderedSelection: true,
      quality: 0.75,
      exif: true,
    });

    if (result.canceled || !result.assets?.length) return;
    const assets = result.assets.slice(0, 10);
    const mediaItems: SelectedMediaItem[] = assets
      .map((asset): SelectedMediaItem => ({
        uri: normalizePickedUri(asset.uri),
        type: asset.type === 'video' ? 'video' : 'image',
      }))
      .filter((asset) => Boolean(asset.uri));
    if (!mediaItems.length) return;

    setSelectedMedia(mediaItems);
    if (mediaItems.some((item) => item.type === 'video')) setPublishToReels(true);
    const primaryImage = mediaItems.find((item) => item.type === 'image')?.uri || mediaItems[0]?.uri || '';
    setForm((prev) => ({ ...prev, photoUri: primaryImage }));

    let gps: { lat: number; lng: number } | null = null;
    for (const asset of assets) {
      const found = parseExifGps(asset.exif as Record<string, unknown> | null | undefined);
      if (found) {
        gps = found;
        break;
      }
    }
    if (!gps) {
      if (mediaItems.length === 1 && mediaItems[0]?.type === 'image') {
        Alert.alert(t('logsForm.photo.gpsNotFoundTitle'), t('logsForm.photo.gpsNotFoundMessage'));
      }
      return;
    }

    let address = '';
    try {
      address = await reverseGooglePoint(gps.lat, gps.lng);
    } catch {
      address = '';
    }

    const locationLabel = address || `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`;
    setForm((prev) => ({
      ...prev,
      pointAddress: locationLabel,
      pointName: prev.pointName.trim() || locationLabel.split(',')[0].trim(),
      locationLat: String(gps.lat),
      locationLng: String(gps.lng),
    }));
    setPointQuery(locationLabel);
    Alert.alert(t('logsForm.photo.gpsAppliedTitle'), t('logsForm.photo.gpsAppliedMessage'));
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pb-5 pt-4">
          <Text className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            {editingPostId ? t('logsForm.editTitle', { defaultValue: '로그 수정' }) : t('logsForm.title')}
          </Text>
          <Text className="mt-1 text-surface-500 dark:text-surface-400">
            {editingPostId ? t('logsForm.editSubtitle', { defaultValue: '기존 로그를 운영 폼 기준으로 수정합니다.' }) : t('logsForm.subtitle')}
          </Text>
        </View>

        <View className="px-5 py-5">
          <View className="rounded-3xl bg-brand-700 p-5">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/90">
                <Calendar size={24} color="#0d5fa8" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xl font-bold text-white">{t('logsForm.heroTitle')}</Text>
                <Text className="mt-1 text-blue-100">{t('logsForm.heroSubtitle')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5">
          <View className="mb-4 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4">
            <Text className="mb-2 text-xs font-semibold text-surface-500 dark:text-surface-400">
              {t('logsForm.publish.title', { defaultValue: '게시 위치' })}
            </Text>
            <Text className="mb-3 text-xs text-surface-500 dark:text-surface-400">
              {t('logsForm.publish.subtitle', { defaultValue: '피드와 릴스 노출 위치를 선택하세요. 릴스는 영상이 필요합니다.' })}
            </Text>
            <View className="flex-row">
              <ChoiceChip
                active={publishToFeed}
                label={t('logsForm.publish.feed', { defaultValue: '피드' })}
                onPress={() => setPublishToFeed((prev) => !prev)}
              />
              <ChoiceChip
                active={publishToReels}
                label={t('logsForm.publish.reels', { defaultValue: '릴스' })}
                onPress={() => setPublishToReels((prev) => !prev)}
              />
            </View>
            {!hasPublishTarget ? (
              <Text className="mt-2 text-xs text-red-500">{t('logsForm.publish.required', { defaultValue: '피드 또는 릴스 중 하나 이상 선택해주세요.' })}</Text>
            ) : null}
            {publishToReels && !hasVideoMedia ? (
              <Text className="mt-2 text-xs text-amber-600">{t('logsForm.publish.reelsNeedsVideo', { defaultValue: '릴스에는 영상 파일이 1개 이상 필요합니다.' })}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={pickPhoto}
            className="mb-4 flex-row items-center justify-center rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-4"
          >
            <Camera size={20} color="#0d5fa8" />
            <Text className="ml-2 font-semibold text-brand-700">
              {t('logsForm.photo.selectMultiple', { defaultValue: '사진/동영상 선택 (최대 10개)' })}
            </Text>
          </TouchableOpacity>

          {selectedMedia.length ? (
            <View className="mb-4 overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
              <View className="flex-row items-center justify-between px-3 py-2">
                <Text className="text-xs font-semibold text-surface-700 dark:text-surface-200">
                  {t('logsForm.photo.selectedCount', { defaultValue: '{{count}}개 선택됨', count: selectedMedia.length })}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedMedia([]);
                    setForm((prev) => ({ ...prev, photoUri: '' }));
                  }}
                >
                  <Text className="text-xs font-semibold text-red-500">
                    {t('logsForm.photo.clear', { defaultValue: '선택 해제' })}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}>
                {selectedMedia.map((item, index) => (
                  <View key={`${item.uri}-${index}`} className="mr-2 h-28 w-28 overflow-hidden rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                    {item.type === 'image' ? (
                      <Image source={{ uri: item.uri }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <Camera size={20} color="#64748b" />
                        <Text className="mt-1 text-[10px] font-semibold text-surface-600">VIDEO</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
              <View className="px-3 py-2">
                <Text className="text-xs text-surface-500 dark:text-surface-400">{t('logsForm.photo.gpsHint')}</Text>
              </View>
            </View>
          ) : null}

          <Text className="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-200">{t('logsForm.fields.titleLabel')}</Text>
          <TextInput
            className="mb-4 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-4 text-base text-surface-900 dark:text-surface-50"
            placeholder={t('logsForm.fields.titlePlaceholder')}
            placeholderTextColor="#9ca3af"
            value={form.title}
            onChangeText={(value) => update('title', value)}
          />

          <View className="mb-4 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4">
            <Text className="mb-3 text-xs font-semibold text-surface-500 dark:text-surface-400">{t('logsForm.fields.diveTypeLabel')}</Text>
            <View className="flex-row">
              <ChoiceChip
                active={form.diveType === 'freediving'}
                label={t('logsForm.diveTypes.freediving')}
                onPress={() => update('diveType', 'freediving')}
              />
              <ChoiceChip
                active={form.diveType === 'scuba'}
                label={t('logsForm.diveTypes.scuba')}
                onPress={() => update('diveType', 'scuba')}
              />
            </View>

            {form.diveType === 'scuba' ? (
              <>
                <Text className="mb-2 mt-4 text-xs font-semibold text-surface-500 dark:text-surface-400">{t('logsForm.fields.gasTypeLabel')}</Text>
                <View className="flex-row flex-wrap">
                  <ChoiceChip active={form.gasType === 'air'} label={t('logsForm.gasTypes.air')} onPress={() => update('gasType', 'air')} />
                  <ChoiceChip active={form.gasType === 'nitrox'} label={t('logsForm.gasTypes.nitrox')} onPress={() => update('gasType', 'nitrox')} />
                  <ChoiceChip active={form.gasType === 'heliox'} label={t('logsForm.gasTypes.heliox')} onPress={() => update('gasType', 'heliox')} />
                </View>

                {needsGasPercent ? (
                  <View className="mt-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-2">
                    <Text className="text-xs font-semibold text-surface-500 dark:text-surface-400">{t('logsForm.fields.gasPercentLabel')}</Text>
                    <View className="mt-1 flex-row items-center">
                      <Droplets size={15} color="#64748b" />
                      <TextInput
                        className="ml-2 flex-1 py-1 text-base font-semibold text-surface-900 dark:text-surface-50"
                        placeholder="32"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={form.gasPercent}
                        onChangeText={(value) => update('gasPercent', value)}
                      />
                      <Text className="text-sm text-surface-500 dark:text-surface-400">%</Text>
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          <View className="mb-4 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4">
            <Text className="mb-2 text-xs font-semibold text-surface-500 dark:text-surface-400">{t('logsForm.fields.pointNameLabel')}</Text>
            <TextInput
              className="mb-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-3 text-base text-surface-900 dark:text-surface-50"
              placeholder={t('logsForm.fields.pointNamePlaceholder')}
              placeholderTextColor="#9ca3af"
              value={form.pointName}
              onChangeText={(value) => update('pointName', value)}
            />

            <Text className="mb-2 text-xs font-semibold text-surface-500 dark:text-surface-400">{t('logsForm.fields.pointSearchLabel')}</Text>
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-3 text-base text-surface-900 dark:text-surface-50"
                placeholder={t('logsForm.fields.pointSearchPlaceholder')}
                placeholderTextColor="#9ca3af"
                value={pointQuery}
                onChangeText={setPointQuery}
                onSubmitEditing={runPointSearch}
              />
              <TouchableOpacity
                className="ml-2 h-12 w-12 items-center justify-center rounded-xl bg-brand-600"
                onPress={runPointSearch}
                activeOpacity={0.88}
              >
                {pointSearchPending ? <ActivityIndicator color="#ffffff" /> : <Search size={19} color="#ffffff" />}
              </TouchableOpacity>
            </View>

            {pointSearchError ? <Text className="mt-2 text-xs text-red-500">{pointSearchError}</Text> : null}

            {pointResults.length ? (
              <View className="mt-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                {pointResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.86}
                    onPress={() => choosePoint(item)}
                    className="border-b border-surface-200 dark:border-surface-700 px-3 py-3 last:border-b-0"
                  >
                    <Text className="text-sm font-semibold text-surface-900 dark:text-surface-50">{item.name}</Text>
                    <Text className="mt-1 text-xs text-surface-500 dark:text-surface-400">{item.address}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text className="mb-2 mt-4 text-xs font-semibold text-surface-500 dark:text-surface-400">{t('logsForm.fields.selectedPointLabel')}</Text>
            <View className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-3">
              <Text className="text-sm text-surface-700 dark:text-surface-200">{form.pointAddress || t('logsForm.fields.selectedPointPlaceholder')}</Text>
              {latNum != null && lngNum != null ? (
                <Text className="mt-1 text-xs text-surface-500 dark:text-surface-400">{latNum.toFixed(6)}, {lngNum.toFixed(6)}</Text>
              ) : null}
            </View>

            {mapPreview ? (
              <ExpoImage source={{ uri: mapPreview }} className="mt-3 h-40 w-full rounded-2xl" contentFit="cover" />
            ) : (
              <View className="mt-3 h-24 w-full items-center justify-center rounded-2xl bg-surface-50 dark:bg-surface-800">
                <MapPin size={22} color="#64748b" />
                <Text className="mt-1 text-xs text-surface-500 dark:text-surface-400">{t('logsForm.map.previewPlaceholder')}</Text>
              </View>
            )}
          </View>

          <View className="mb-4 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4">
            <Text className="mb-2 text-xs font-semibold text-surface-500 dark:text-surface-400">{t('logsForm.fields.resortLabel')}</Text>
            <TextInput
              className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-3 text-base text-surface-900 dark:text-surface-50"
              placeholder={t('logsForm.fields.resortPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={resortQuery}
              onFocus={() => setResortFocus(true)}
              onBlur={() => setTimeout(() => setResortFocus(false), 120)}
              onChangeText={(value) => {
                setResortQuery(value);
                update('resortName', value);
              }}
            />

            {resortFocus && resortCandidates.length ? (
              <View className="mt-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                {resortCandidates.map((item: any) => (
                  <TouchableOpacity
                    key={String(item.id)}
                    className="border-b border-surface-200 dark:border-surface-700 px-3 py-3 last:border-b-0"
                    onPress={() => {
                      const text = String(item.name || '').trim();
                      setResortQuery(text);
                      update('resortName', text);
                      setResortFocus(false);
                    }}
                  >
                    <Text className="text-sm font-semibold text-surface-900 dark:text-surface-50">{item.name}</Text>
                    <Text className="mt-1 text-xs text-surface-500 dark:text-surface-400">{item.area}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          <View className="flex-row flex-wrap -mx-1">
            <FieldCard
              icon={<Gauge size={16} color="#64748b" />}
              label={t('logsForm.fields.depthLabel')}
              value={form.depth}
              placeholder="18"
              suffix="m"
              keyboardType="numeric"
              onChangeText={(value) => update('depth', value)}
            />
            <FieldCard
              icon={<Timer size={16} color="#64748b" />}
              label={t('logsForm.fields.durationLabel')}
              value={form.duration}
              placeholder="45"
              suffix={t('logsForm.units.minute')}
              keyboardType="numeric"
              onChangeText={(value) => update('duration', value)}
            />
            <FieldCard
              icon={<Thermometer size={16} color="#64748b" />}
              label={t('logsForm.fields.temperatureLabel')}
              value={form.temperature}
              placeholder="18"
              suffix="°C"
              keyboardType="numeric"
              onChangeText={(value) => update('temperature', value)}
            />
            <FieldCard
              icon={<Waves size={16} color="#64748b" />}
              label={t('logsForm.fields.visibilityLabel')}
              value={form.visibility}
              placeholder="12"
              suffix="m"
              keyboardType="numeric"
              onChangeText={(value) => update('visibility', value)}
            />
            <FieldCard
              icon={<UserRound size={16} color="#64748b" />}
              label={t('logsForm.fields.buddyLabel')}
              value={form.buddy}
              placeholder={t('logsForm.fields.buddyPlaceholder')}
              keyboardType="default"
              onChangeText={(value) => update('buddy', value)}
            />
          </View>

          <Text className="mb-2 mt-4 text-sm font-semibold text-surface-700 dark:text-surface-200">{t('logsForm.fields.notesLabel')}</Text>
          <TextInput
            className="min-h-28 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-4 text-base text-surface-900 dark:text-surface-50"
            multiline
            textAlignVertical="top"
            placeholder={t('logsForm.fields.notesPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={form.notes}
            onChangeText={(value) => update('notes', value)}
          />

          {!isGoogleMapsApiConfigured() ? (
            <Text className="mt-3 text-xs text-amber-600">{t('logsForm.map.apiKeyGuide')}</Text>
          ) : null}

          <TouchableOpacity
            disabled={!canSubmit || mutation.isPending || loadingExistingPost}
            className={`mt-5 h-14 items-center justify-center rounded-2xl ${canSubmit && !mutation.isPending && !loadingExistingPost ? 'bg-brand-600' : 'bg-surface-300'}`}
            onPress={() => mutation.mutate()}
          >
            <Text className="font-semibold text-white">
              {loadingExistingPost
                ? t('common.loading', { defaultValue: '불러오는 중...' })
                : mutation.isPending
                  ? t('logsForm.buttons.saving')
                  : t('logsForm.buttons.save')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ChoiceChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      className={`mb-2 mr-2 rounded-full px-4 py-2 ${active ? 'bg-brand-600' : 'border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800'}`}
    >
      <Text className={`font-semibold ${active ? 'text-white' : 'text-surface-700 dark:text-surface-200'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function FieldCard({
  icon,
  label,
  value,
  placeholder,
  suffix,
  keyboardType = 'numeric',
  onChangeText,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  suffix?: string;
  keyboardType?: 'default' | 'numeric';
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="w-1/2 p-1">
      <View className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-3">
        <View className="mb-2 flex-row items-center">
          {icon}
          <Text className="ml-1 text-xs font-semibold text-surface-500 dark:text-surface-400">{label}</Text>
        </View>
        <View className="flex-row items-center">
          <TextInput
            className="flex-1 py-1 text-base font-semibold text-surface-900 dark:text-surface-50"
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            keyboardType={keyboardType}
            value={value}
            onChangeText={onChangeText}
          />
          {suffix ? <Text className="ml-1 text-sm text-surface-500 dark:text-surface-400">{suffix}</Text> : null}
        </View>
      </View>
    </View>
  );
}
