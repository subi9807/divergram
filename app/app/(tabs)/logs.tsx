import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Camera, Droplets, Gauge, MapPin, Search, Thermometer, Timer, UserRound, Waves } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { PhotoMetadataSummary } from '../../src/components/PhotoMetadataSummary';
import { optionalCoordinate } from '../../src/utils/optionalCoordinate';
import { countLogSupplement } from '../../src/utils/logSupplement';
import { buildFeedEditState, normalizePostIdParam } from '../../src/utils/feedEditState';
import { readPhotoMetadata, uniquePhotoLocations, type PhotoMetadata } from '../../src/utils/photoGps';
import { useToast } from '../../src/components/Toast';
import { apiClient } from '../../src/lib/api';
import { uploadImage, uploadVideo } from '../../src/services/cloudinaryService';
import { buildGoogleStaticMapUrl, isGoogleMapsApiConfigured, searchGooglePoint, type GooglePointResult } from '../../src/lib/googleMapSearch';
import { sharePostToSocialChannels, type SocialCrossPostTarget } from '../../src/services/socialCrossPostService';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useAuth } from '../../src/hooks/useAuth';
import {
  hasMainDiveLogDraftContent,
  mainDiveLogDraftKey,
  normalizeMainDiveLogDraft,
  type MainDiveLogDraft,
} from '../../src/services/mainDiveLogDraft';

type DiveType = 'scuba' | 'freediving' | 'daily';
type GasType = 'air' | 'nitrox' | 'heliox';
type ContentVisibility = 'inherit' | 'public' | 'followers' | 'private';
type SelectedMediaItem = { uri: string; type: 'image' | 'video'; photoMetadata?: PhotoMetadata };

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
  const params = useLocalSearchParams<{ postId?: string | string[] }>();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<DiveLogForm>(initialForm);
  const [pointQuery, setPointQuery] = useState('');
  const [pointSearchPending, setPointSearchPending] = useState(false);
  const [pointSearchError, setPointSearchError] = useState('');
  const [pointResults, setPointResults] = useState<GooglePointResult[]>([]);
  const [resortQuery, setResortQuery] = useState('');
  const [resortFocus, setResortFocus] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaItem[]>([]);
  const [publishToFeed, setPublishToFeed] = useState(true);
  const [publishToReels, setPublishToReels] = useState(false);
  const [contentVisibility, setContentVisibility] = useState<ContentVisibility>('inherit');
  const editingPostId = normalizePostIdParam(params.postId);
  const [prefilledPostId, setPrefilledPostId] = useState('');
  const [mapPreviewError, setMapPreviewError] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftServerId = 'main-new';
  const draftStorageKey = user?.id ? mainDiveLogDraftKey(user.id) : '';
  const shareToInstagramAfterPost = useSettingsStore((state) => state.shareToInstagramAfterPost);
  const shareToFacebookAfterPost = useSettingsStore((state) => state.shareToFacebookAfterPost);
  const shareToThreadsAfterPost = useSettingsStore((state) => state.shareToThreadsAfterPost);

  const { data: resorts = [] } = useQuery({ queryKey: ['logs-resorts'], queryFn: apiClient.getResorts });
  const { data: visibilitySettings } = useQuery({ queryKey: ['content-visibility'], queryFn: apiClient.getMyContentVisibility });
  const editingPostQuery = useQuery({
    queryKey: ['log-edit-post', editingPostId],
    enabled: Boolean(editingPostId) && !authLoading,
    queryFn: () => apiClient.getPostById(editingPostId),
    retry: 2,
  });
  const editingPost = editingPostQuery.data;
  const loadingExistingPost = Boolean(editingPostId) && (authLoading || editingPostQuery.isPending);

  const resortCandidates = useMemo(() => {
    const keyword = resortQuery.trim().toLowerCase();
    if (!keyword) return resorts.slice(0, 8);
    return resorts.filter((item: any) => `${item.name || ''} ${item.area || ''}`.toLowerCase().includes(keyword)).slice(0, 8);
  }, [resorts, resortQuery]);

  const needsGasPercent = form.diveType === 'scuba' && form.gasType !== 'air';
  const latNum = optionalCoordinate(form.locationLat, 90);
  const lngNum = optionalCoordinate(form.locationLng, 180);
  const mapPreview = buildGoogleStaticMapUrl(latNum ?? undefined, lngNum ?? undefined);
  const hasVideoMedia = selectedMedia.some((item) => item.type === 'video');
  const hasPublishTarget = publishToFeed || publishToReels;
  const isDailyPost = form.diveType === 'daily';
  const detailCount = countLogSupplement(form);
  const canSubmit = Boolean(
    form.title.trim() &&
    (!isDailyPost || (selectedMedia.length > 0 && form.notes.trim())) &&
    hasPublishTarget &&
    (!publishToReels || hasVideoMedia) &&
    (!needsGasPercent || form.gasPercent.trim())
  );

  useEffect(() => {
    setPrefilledPostId('');
    if (!editingPostId) return;
    setForm(initialForm);
    setSelectedMedia([]);
    setPointQuery('');
    setPointResults([]);
    setResortQuery('');
    setDetailsOpen(false);
  }, [editingPostId]);

  useEffect(() => {
    let cancelled = false;
    setDraftReady(false);
    if (!draftStorageKey || editingPostId) {
      setDraftReady(true);
      return () => { cancelled = true; };
    }

    void Promise.allSettled([
      AsyncStorage.getItem(draftStorageKey),
      apiClient.getDiveLogDraft(draftServerId),
    ]).then((results) => {
      if (cancelled) return;
      const localRaw = results[0].status === 'fulfilled' ? results[0].value : null;
      let local: MainDiveLogDraft | null = null;
      try { local = normalizeMainDiveLogDraft(localRaw ? JSON.parse(localRaw) : null); } catch { local = null; }
      const remote = results[1].status === 'fulfilled'
        ? normalizeMainDiveLogDraft(results[1].value.data)
        : null;
      const draft = [local, remote]
        .filter((item): item is MainDiveLogDraft => Boolean(item))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

      const finish = () => { if (!cancelled) setDraftReady(true); };
      if (!draft || !hasMainDiveLogDraftContent(draft)) {
        finish();
        return;
      }
      Alert.alert(t('diveEditor.restoreTitle'), t('diveEditor.restoreBody'), [
        {
          text: t('diveEditor.discard'),
          style: 'destructive',
          onPress: () => {
            void AsyncStorage.removeItem(draftStorageKey);
            void apiClient.deleteDiveLogDraft(draftServerId).catch(() => undefined);
            finish();
          },
        },
        {
          text: t('diveEditor.restore'),
          onPress: () => {
            setForm(draft.form as DiveLogForm);
            setSelectedMedia(draft.selectedMedia as SelectedMediaItem[]);
            setPointQuery(draft.pointQuery);
            setResortQuery(draft.resortQuery);
            setDetailsOpen(draft.detailsOpen);
            setPublishToFeed(draft.publishToFeed);
            setPublishToReels(draft.publishToReels);
            finish();
          },
        },
      ]);
    });

    return () => { cancelled = true; };
  }, [draftStorageKey, editingPostId, t]);

  useEffect(() => {
    if (!editingPostId || !editingPost || prefilledPostId === editingPostId) return;
    const restored = buildFeedEditState(editingPost as Record<string, any>);
    setForm(restored.form as DiveLogForm);
    setPointQuery(restored.pointQuery);
    setResortQuery(restored.resortQuery);
    setSelectedMedia(restored.media as SelectedMediaItem[]);
    setPublishToFeed(restored.publishToFeed);
    setPublishToReels(restored.publishToReels);
    setContentVisibility(restored.contentVisibility as ContentVisibility);
    setDetailsOpen(restored.detailsOpen);
    setPrefilledPostId(editingPostId);
  }, [editingPost, editingPostId, prefilledPostId]);

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
          return { uri: result.url, thumbnailUri: result.thumbnailUrl, type: item.type, order: index };
        })
      );
      const mediaAssets = uploadedMedia.filter(
        (item): item is { uri: string; thumbnailUri?: string; type: 'image' | 'video'; order: number } => Boolean(item?.uri)
      );
      const primaryImageUri =
        mediaAssets.find((item) => item.type === 'image')?.uri ||
        mediaAssets.find((item) => item.type === 'video')?.thumbnailUri ||
        (form.photoUri && !/\/video\/upload\/|\.(mp4|mov|m4v|webm)(?:[?#]|$)/i.test(form.photoUri) ? form.photoUri : null);

      const payload = {
        title: form.title.trim(),
        diveType: form.diveType,
        gasType: isDailyPost ? 'air' as const : form.gasType,
        gasPercent: isDailyPost ? '' : form.gasPercent.trim(),
        location: isDailyPost ? '' : form.pointAddress.trim() || form.pointName.trim(),
        diveSite: isDailyPost ? '' : form.pointName.trim(),
        pointName: isDailyPost ? '' : form.pointName.trim(),
        depth: isDailyPost ? '' : form.depth.trim(),
        duration: isDailyPost ? '' : form.duration.trim(),
        temperature: isDailyPost ? '' : form.temperature.trim(),
        visibility: isDailyPost ? '' : form.visibility.trim(),
        buddy: isDailyPost ? '' : form.buddy.trim(),
        notes: form.notes.trim(),
        resortName: isDailyPost ? '' : form.resortName.trim(),
        latitude: isDailyPost ? null : latNum,
        longitude: isDailyPost ? null : lngNum,
        imageUri: primaryImageUri,
        mediaAssets,
        publishToFeed,
        publishToReels,
        visibilityType: contentVisibility,
      };

      if (editingPostId) {
        await apiClient.updatePost(editingPostId, payload);
        return { mode: 'update' as const };
      }
      const created = await apiClient.createLog(payload);
      return {
        mode: 'create' as const,
        postId: String(created?.id || ''),
        caption: [payload.title, payload.notes].filter(Boolean).join('\n'),
      };
    },
    onSuccess: async (result) => {
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
      if (draftStorageKey && !editingPostId) {
        await Promise.allSettled([
          AsyncStorage.removeItem(draftStorageKey),
          apiClient.deleteDiveLogDraft(draftServerId),
        ]);
      }
      setForm(initialForm);
      setSelectedMedia([]);
      setPointQuery('');
      setPointResults([]);
      setResortQuery('');
      setPublishToFeed(true);
      setPublishToReels(false);
      setContentVisibility('inherit');
      const nextEditingPostId = editingPostId;
      const crossPostTargets: SocialCrossPostTarget[] = [];
      if (result.mode === 'create' && shareToInstagramAfterPost) crossPostTargets.push('instagram');
      if (result.mode === 'create' && shareToFacebookAfterPost) crossPostTargets.push('facebook');
      if (result.mode === 'create' && shareToThreadsAfterPost) crossPostTargets.push('threads');
      Alert.alert(t('logsForm.saveSuccessTitle'), t('logsForm.saveSuccessMessage'), [
        {
          text: t('common.confirm'),
          onPress: async () => {
            if (result.mode === 'create' && result.postId && crossPostTargets.length) {
              try {
                await sharePostToSocialChannels({
                  postId: result.postId,
                  caption: result.caption,
                  targets: crossPostTargets,
                  visibility: contentVisibility === 'inherit'
                    ? (publishToReels && !publishToFeed ? visibilitySettings?.reels : visibilitySettings?.feed) || 'private'
                    : contentVisibility,
                });
              } catch {
                showToast({
                  title: t('logsForm.socialShareFailed'),
                  type: 'error',
                });
              }
            }
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

  useEffect(() => {
    if (!draftReady || !draftStorageKey || editingPostId || mutation.isPending) return;
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    const snapshot = normalizeMainDiveLogDraft({
      version: 1,
      updatedAt: new Date().toISOString(),
      form,
      selectedMedia,
      pointQuery,
      resortQuery,
      detailsOpen,
      publishToFeed,
      publishToReels,
    });
    if (!snapshot) return;
    draftSaveTimer.current = setTimeout(() => {
      if (!hasMainDiveLogDraftContent(snapshot)) {
        void AsyncStorage.removeItem(draftStorageKey);
        void apiClient.deleteDiveLogDraft(draftServerId).catch(() => undefined);
        return;
      }
      void AsyncStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
      void apiClient.saveDiveLogDraft(draftServerId, snapshot).catch(() => undefined);
    }, 800);
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [detailsOpen, draftReady, draftStorageKey, editingPostId, form, mutation.isPending, pointQuery, publishToFeed, publishToReels, resortQuery, selectedMedia]);

  const update = <K extends keyof DiveLogForm>(key: K, value: DiveLogForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loadingExistingPost) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <ActivityIndicator color="#0d5fa8" />
          <Text className="mt-3 text-sm text-surface-500 dark:text-surface-400">{t('logsForm.editLoading')}</Text>
        </View>
      </Screen>
    );
  }

  if (editingPostId && (editingPostQuery.isError || editingPost === null)) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-lg font-bold text-surface-900 dark:text-surface-50">{t('logsForm.editLoadFailed')}</Text>
          <Text className="mt-2 text-center text-sm text-surface-500 dark:text-surface-400">{t('logsForm.editLoadFailedBody')}</Text>
          <TouchableOpacity className="mt-5 rounded-2xl bg-brand-600 px-6 py-3" onPress={() => editingPostQuery.refetch()}>
            <Text className="font-semibold text-white">{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

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
    const remainingSelectionCount = Math.max(0, 10 - selectedMedia.length);
    if (remainingSelectionCount <= 0) {
      Alert.alert(t('diveEditor.limitTitle'), t('diveEditor.mediaLimit', { max: 10 }));
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('logsForm.photo.permissionTitle'), t('logsForm.photo.permissionMessage'));
      return;
    }

    const allowsMultipleSelection = Platform.OS !== 'ios';
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        allowsMultipleSelection,
        ...(allowsMultipleSelection
          ? {
              selectionLimit: remainingSelectionCount,
              orderedSelection: true,
            }
          : {}),
        quality: 0.75,
        exif: true,
        shouldDownloadFromNetwork: true,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      });
    } catch {
      Alert.alert(t('logsForm.photo.selectFailedTitle'), t('logsForm.photo.selectFailedMessage'));
      return;
    }

    if (result.canceled || !result.assets?.length) return;
    const assets = result.assets.slice(0, remainingSelectionCount);
    const mediaItems: SelectedMediaItem[] = assets
      .map((asset): SelectedMediaItem => ({
        uri: normalizePickedUri(asset.uri),
        type: asset.type === 'video' ? 'video' : 'image',
        photoMetadata: asset.type === 'video' ? undefined : readPhotoMetadata(asset.exif),
      }))
      .filter((asset) => Boolean(asset.uri));
    if (!mediaItems.length) return;

    const existingUris = new Set(selectedMedia.map((item) => item.uri));
    const newMediaItems = mediaItems.filter((item) => !existingUris.has(item.uri));
    if (!newMediaItems.length) return;
    const nextMedia = [...selectedMedia, ...newMediaItems].slice(0, 10);

    setSelectedMedia(nextMedia);
    if (nextMedia.some((item) => item.type === 'video')) setPublishToReels(true);
    const primaryImage = nextMedia.find((item) => item.type === 'image')?.uri || nextMedia[0]?.uri || '';
    setForm((prev) => ({ ...prev, photoUri: primaryImage }));

    if (isDailyPost) return;
    const locations = uniquePhotoLocations(nextMedia.flatMap(item => item.photoMetadata ? [item.photoMetadata] : []));
    if (locations.length > 1) {
      Alert.alert(t('photoMetadata.title'), t('photoMetadata.multipleLocations'));
      return;
    }
    const gps = locations[0];
    if (!gps) {
      if (nextMedia.length === 1 && nextMedia[0]?.type === 'image') {
        Alert.alert(t('logsForm.photo.gpsNotFoundTitle'), t('logsForm.photo.gpsNotFoundMessage'));
      }
      return;
    }

    Alert.alert(t('photoMetadata.title'), t('photoMetadata.confirmLocation', { lat: gps.lat.toFixed(6), lng: gps.lng.toFixed(6) }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('photoMetadata.apply'), onPress: () => {
        const locationLabel = `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`;
        setForm(prev => ({ ...prev, pointName: '', pointAddress: locationLabel, locationLat: String(gps.lat), locationLng: String(gps.lng) }));
        setPointQuery(locationLabel);
      } },
    ]);
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pb-5 pt-4">
          <Text className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            {isDailyPost
              ? t('logsForm.dailyTitle')
              : editingPostId ? t('logsForm.editTitle') : t('logsForm.title')}
          </Text>
          <Text className="mt-1 text-surface-500 dark:text-surface-400">
            {isDailyPost
              ? t('logsForm.dailySubtitle')
              : editingPostId ? t('logsForm.editSubtitle') : t('logsForm.subtitle')}
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
              {t('logsForm.publish.title')}
            </Text>
            <Text className="mb-3 text-xs text-surface-500 dark:text-surface-400">
              {t('logsForm.publish.subtitle')}
            </Text>
            <View className="flex-row">
              <ChoiceChip
                active={publishToFeed}
                label={t('logsForm.publish.feed')}
                onPress={() => setPublishToFeed((prev) => !prev)}
              />
              <ChoiceChip
                active={publishToReels}
                label={t('logsForm.publish.reels')}
                onPress={() => setPublishToReels((prev) => !prev)}
              />
            </View>
            {!hasPublishTarget ? (
              <Text className="mt-2 text-xs text-red-500">{t('logsForm.publish.required')}</Text>
            ) : null}
            {publishToReels && !hasVideoMedia ? (
              <Text className="mt-2 text-xs text-amber-600">{t('logsForm.publish.reelsNeedsVideo')}</Text>
            ) : null}
            <Text className="mb-2 mt-4 text-xs font-semibold text-surface-500 dark:text-surface-400">
              {t('logsForm.publish.visibility')}
            </Text>
            <View className="flex-row flex-wrap">
              {(['inherit', 'public', 'followers', 'private'] as const).map((visibility) => (
                <ChoiceChip
                  key={visibility}
                  active={contentVisibility === visibility}
                  label={t(`logsForm.publish.visibilityOptions.${visibility}`)}
                  onPress={() => setContentVisibility(visibility)}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={pickPhoto}
            className="mb-4 flex-row items-center justify-center rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-4"
          >
            <Camera size={20} color="#0d5fa8" />
            <Text className="ml-2 font-semibold text-brand-700">
              {t('logsForm.photo.selectMultiple')}
            </Text>
          </TouchableOpacity>

          {selectedMedia.length ? (
            <View className="mb-4 overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
              <View className="flex-row items-center justify-between px-3 py-2">
                <Text className="text-xs font-semibold text-surface-700 dark:text-surface-200">
                  {t('logsForm.photo.selectedCount', { count: selectedMedia.length })}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedMedia([]);
                    setForm((prev) => ({ ...prev, photoUri: '' }));
                  }}
                >
                  <Text className="text-xs font-semibold text-red-500">
                    {t('logsForm.photo.clear')}
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
                {selectedMedia.map((item, index) => <PhotoMetadataSummary key={`${item.uri}-metadata-${index}`} metadata={item.photoMetadata} />)}
              </View>
            </View>
          ) : null}

          <Text className="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-200">{t('logsForm.fields.titleLabel')}</Text>
          <TextInput
            className="mb-4 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-4 text-base text-surface-900 dark:text-surface-50"
            placeholder={isDailyPost ? t('logsForm.fields.dailyTitlePlaceholder') : t('logsForm.fields.titlePlaceholder')}
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
              <ChoiceChip
                active={form.diveType === 'daily'}
                label={t('logsForm.diveTypes.daily')}
                onPress={() => update('diveType', 'daily')}
              />
            </View>

            {form.diveType === 'daily' ? (
              <Text className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {t('logsForm.dailyHint')}
              </Text>
            ) : null}

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

          {form.diveType !== 'daily' ? (
            <>
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

            {mapPreview && !mapPreviewError ? (
              <ExpoImage
                source={{ uri: mapPreview }}
                className="mt-3 h-40 w-full rounded-2xl"
                contentFit="cover"
                cachePolicy="disk"
                transition={0}
                onError={() => {
                  setMapPreviewError(t('logsForm.map.previewFailed'));
                }}
              />
            ) : (
              <View className="mt-3 h-24 w-full items-center justify-center rounded-2xl bg-surface-50 dark:bg-surface-800">
                <MapPin size={22} color="#64748b" />
                <Text className="mt-1 px-3 text-center text-xs text-surface-500 dark:text-surface-400">
                  {mapPreviewError || t('logsForm.map.previewPlaceholder')}
                </Text>
              </View>
            )}
            {mapPreviewError ? (
              <TouchableOpacity
                className="mt-2 self-start rounded-full bg-brand-600 px-3 py-2"
                onPress={() => setMapPreviewError('')}
              >
                <Text className="text-xs font-semibold text-white">{t('common.retry')}</Text>
              </TouchableOpacity>
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
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded: detailsOpen }}
            onPress={() => { Keyboard.dismiss(); setResortFocus(false); setDetailsOpen(open => !open); }}
            className="my-3 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4"
          >
            <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">{t(detailsOpen ? 'logDetails.hide' : 'logDetails.show')}</Text>
            <Text className="mt-1 text-xs text-surface-500 dark:text-surface-400">{t('logDetails.filled', { count: detailCount })}</Text>
          </TouchableOpacity>
          {detailsOpen && <View>
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
          </View>}
            </>
          ) : null}

          <Text className="mb-2 mt-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            {isDailyPost ? t('logsForm.fields.contentLabel') : t('logsForm.fields.notesLabel')}
          </Text>
          <TextInput
            className="min-h-28 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-4 text-base text-surface-900 dark:text-surface-50"
            multiline
            textAlignVertical="top"
            placeholder={isDailyPost ? t('logsForm.fields.dailyContentPlaceholder') : t('logsForm.fields.notesPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={form.notes}
            onChangeText={(value) => update('notes', value)}
          />
          <Text className="mt-2 text-xs text-surface-500 dark:text-surface-400">
            {isDailyPost
              ? t('logsForm.validation.dailyRequired')
              : t('logsForm.validation.mediaOptional')}
          </Text>

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
                ? t('common.loading')
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
            accessibilityLabel={label}
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
