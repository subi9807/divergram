import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { PhotoMetadataSummary } from '../../components/PhotoMetadataSummary';
import { DiveSourceSummary } from '../../components/DiveSourceSummary';
import { PhotoMatchReview } from '../../components/dive/PhotoMatchReview';
import { VoiceMemoInput } from '../../components/dive/VoiceMemoInput';
import { DiveCopilotPanel } from '../../components/dive/DiveCopilotPanel';
import type { DiveLog, DiveLogVisibilityType, MediaFile } from '../../models';
import { correctedDiveSources, initialDiveSources, sourceForDiveImport } from '../../utils/diveProvenance';
import { withPhotoMatch } from '../../services/photoDiveMatcher';
import { loadEnvironmentForDive, type DiveEnvironmentResult } from '../../services/diveEnvironmentService';
import { buildDiveStoryPrompt } from '../../services/diveStoryPrompt';
import { buildDiveCopilotSuggestions, buildOneTapReadiness, type DiveCopilotSuggestion, type DiveCopilotSuggestionKind } from '../../services/diveCopilot';
import { useDiveLogStore } from '../../stores/diveLogStore';
import {
  deleteMedia,
  flushPendingMediaDeletes,
  getPendingDeleteCount,
  uploadImage,
  uploadVideo,
} from '../../services/cloudinaryService';
import { useSettingsStore } from '../../stores/settingsStore';
import { storage } from '../../lib/storage';
import { apiClient } from '../../lib/api';
import { readPhotoMetadata, uniquePhotoLocations } from '../../utils/photoGps';
import { privateDiveLogService } from '../../services/privateDiveLogService';

const MAX_MEDIA_COUNT = 10;
const MAX_PARALLEL_UPLOADS = 2;
const MAX_MEDIA_UPLOAD_ATTEMPTS = 3;

type DiveLogDraftSnapshot = {
  originalSource?: DiveLog['originalSource'];
  fieldSources?: DiveLog['fieldSources'];
  memo: string;
  buddyName: string;
  equipmentInfo: string;
  divePointName: string;
  visibilityType: DiveLogVisibilityType;
  tagsInput: string;
  media: MediaFile[];
  entryLatInput: string;
  entryLngInput: string;
  exitLatInput: string;
  exitLngInput: string;
  visibilityMetersInput: string;
  currentStrengthInput: string;
  weather?: DiveLog['weather'];
  aiEnabled: boolean;
  story?: { summary: string; caption: string };
  storyAccepted?: boolean;
  copilotIgnoredIds?: string[];
  updatedAt: string;
};

function draftStorageKey(logId: string) {
  return `divelog_edit_draft_${logId}`;
}

function normalizeRecoveredMedia(items: unknown): MediaFile[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => {
      const uploadStatus = item.uploadStatus === 'uploading' ? 'failed' : item.uploadStatus;
      return {
        ...item,
        uploadStatus,
        uploadAttempts: Number.isFinite(Number(item.uploadAttempts)) ? Number(item.uploadAttempts) : 0,
        updatedAt: new Date().toISOString(),
      } as MediaFile;
    });
}

function nextUploadAttemptCount(media: MediaFile | undefined) {
  const attempt = Number(media?.uploadAttempts || 0);
  if (!Number.isFinite(attempt) || attempt < 0) return 1;
  return attempt + 1;
}

function normalizeTags(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeNumberText(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return '';
  return String(value);
}

function normalizePickedUri(raw: unknown): string {
  const uri = String(raw || '').trim();
  if (!uri) return '';
  if (/^(file|content|ph|assets-library|https?):\/\//i.test(uri)) return uri;
  if (uri.startsWith('/')) return `file://${uri}`;
  return uri;
}

function parseOptionalFloat(
  label: string,
  input: string,
  messages: { invalid: string; min?: string; max?: string },
  options?: { min?: number; max?: number }
) {
  const raw = String(input || '').trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(messages.invalid);
  if (options?.min != null && value < options.min) throw new Error(messages.min || messages.invalid);
  if (options?.max != null && value > options.max) throw new Error(messages.max || messages.invalid);
  return value;
}

function detectMediaUploadSource(media: MediaFile) {
  const url = String(media.url || '').toLowerCase();
  if (!url) return '';
  if (url.includes('res.cloudinary.com/demo/')) return 'mock';
  if (url.includes('res.cloudinary.com/')) return 'cloudinary';
  return '';
}

function shouldDeleteFromCloudinary(media: MediaFile) {
  const url = String(media.url || '').toLowerCase();
  if (!url) return false;
  if (!url.includes('res.cloudinary.com/')) return false;
  if (url.includes('res.cloudinary.com/demo/')) return false;
  return true;
}

const uploadStatusColorMap: Record<NonNullable<MediaFile['uploadStatus']>, string> = {
  idle: '#64748B',
  uploading: '#0D5FA8',
  uploaded: '#166534',
  failed: '#DC2626',
};

export default function DiveLogEditScreen() {
  const { t, i18n } = useTranslation();
  const { logId } = useLocalSearchParams<{ logId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const safeLogId = String(logId || '');
  const log = useDiveLogStore((state) => state.getLogById(safeLogId));
  const allLogs = useDiveLogStore((state) => state.logs);
  const upsertLog = useDiveLogStore((state) => state.upsertLog);
  const aiSummaryEnabled = useSettingsStore((state) => state.aiSummaryEnabled);
  const aiCaptionEnabled = useSettingsStore((state) => state.aiCaptionEnabled);

  const [memo, setMemo] = useState(log?.memo || '');
  const [buddyName, setBuddyName] = useState(log?.buddyName || '');
  const [equipmentInfo, setEquipmentInfo] = useState(log?.equipmentInfo || '');
  const [divePointName, setDivePointName] = useState(log?.divePointName || '');
  const [visibilityType, setVisibilityType] = useState<DiveLogVisibilityType>(log?.visibilityType || 'followers');
  const [aiEnabled, setAiEnabled] = useState(aiSummaryEnabled || aiCaptionEnabled);
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analyzingMediaIds, setAnalyzingMediaIds] = useState<string[]>([]);
  const [environment, setEnvironment] = useState(log?.weather);
  const [environmentStatus, setEnvironmentStatus] = useState<DiveEnvironmentResult['status'] | 'idle'>(log?.weather ? 'available' : 'idle');
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [story, setStory] = useState({ summary: log?.aiSummary || '', caption: log?.aiCaption || '' });
  const [storyAccepted, setStoryAccepted] = useState(true);
  const [copilotIgnoredIds, setCopilotIgnoredIds] = useState<string[]>(log?.copilotIgnoredSuggestionIds || []);
  const generationLock = useRef(false);
  const editorMounted = useRef(true);
  useEffect(() => {
    editorMounted.current = true;
    return () => { editorMounted.current = false; };
  }, []);
  const serverDraftQueue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueueServerDraft = useCallback((id: string, snapshot: DiveLogDraftSnapshot) => {
    const confirmed = { ...snapshot, story: snapshot.storyAccepted ? snapshot.story : undefined };
    const next = serverDraftQueue.current.catch(() => undefined).then(() => {
      if (!editorMounted.current) throw new Error('editor_closed');
      return apiClient.saveDiveLogDraft(id, confirmed as unknown as Record<string, unknown>);
    });
    serverDraftQueue.current = next;
    return next;
  }, []);
  const [tagsInput, setTagsInput] = useState((log?.tags || []).join(', '));
  const [media, setMedia] = useState<MediaFile[]>(log?.media || []);
  const [libraryPicking, setLibraryPicking] = useState(false);
  const [entryLatInput, setEntryLatInput] = useState(safeNumberText(log?.entryLocation?.lat));
  const [entryLngInput, setEntryLngInput] = useState(safeNumberText(log?.entryLocation?.lng));
  const [exitLatInput, setExitLatInput] = useState(safeNumberText(log?.exitLocation?.lat));
  const [exitLngInput, setExitLngInput] = useState(safeNumberText(log?.exitLocation?.lng));
  const [visibilityMetersInput, setVisibilityMetersInput] = useState(safeNumberText(log?.visibility));
  const [currentStrengthInput, setCurrentStrengthInput] = useState(safeNumberText(log?.currentStrength));
  const [draftRecoveryReady, setDraftRecoveryReady] = useState(false);
  const [pendingDeleteCount, setPendingDeleteCount] = useState(0);
  const [queuedUploadCount, setQueuedUploadCount] = useState(0);
  const mediaRef = useRef<MediaFile[]>(media);
  const uploadQueueRef = useRef<{ mediaId: string; seed?: MediaFile }[]>([]);
  const queuedUploadIdsRef = useRef<Set<string>>(new Set());
  const inFlightUploadIdsRef = useRef<Set<string>>(new Set());
  const activeUploadCountRef = useRef(0);

  useEffect(() => {
    if (!log) return;
    setMemo(log.memo || '');
    setStory({ summary: log.aiSummary || '', caption: log.aiCaption || '' });
    setStoryAccepted(true);
    setBuddyName(log.buddyName || '');
    setEquipmentInfo(log.equipmentInfo || '');
    setDivePointName(log.divePointName || '');
    setVisibilityType(log.visibilityType || 'followers');
    setTagsInput((log.tags || []).join(', '));
    setMedia(log.media || []);
    setEntryLatInput(safeNumberText(log.entryLocation?.lat));
    setEntryLngInput(safeNumberText(log.entryLocation?.lng));
    setExitLatInput(safeNumberText(log.exitLocation?.lat));
    setExitLngInput(safeNumberText(log.exitLocation?.lng));
    setVisibilityMetersInput(safeNumberText(log.visibility));
    setCurrentStrengthInput(safeNumberText(log.currentStrength));
    setCopilotIgnoredIds(log.copilotIgnoredSuggestionIds || []);
  }, [log]);

  useEffect(() => {
    if (!aiSummaryEnabled && !aiCaptionEnabled) {
      setAiEnabled(false);
      return;
    }
    setAiEnabled((prev) => prev || aiSummaryEnabled || aiCaptionEnabled);
  }, [aiSummaryEnabled, aiCaptionEnabled]);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    let cancelled = false;
    const syncPendingDeletes = async () => {
      const before = getPendingDeleteCount();
      if (!cancelled) setPendingDeleteCount(before);
      if (!before) return;
      const result = await flushPendingMediaDeletes();
      if (!cancelled) setPendingDeleteCount(result.remaining);
    };
    syncPendingDeletes();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!safeLogId) {
      setDraftRecoveryReady(true);
      return;
    }
    const key = draftStorageKey(safeLogId);
    let cancelled = false;
    const restoreDraft = async () => {
      const raw = storage.getString(key);
      let localSnapshot: DiveLogDraftSnapshot | null = null;
      try { localSnapshot = raw ? JSON.parse(raw) as DiveLogDraftSnapshot : null; } catch { storage.delete(key); }
      let remoteSnapshot: DiveLogDraftSnapshot | null = null;
      try { remoteSnapshot = (await apiClient.getDiveLogDraft(safeLogId)).data as DiveLogDraftSnapshot | null; } catch { /* local cache remains available offline */ }
      if (cancelled) return;
      const localTime = Date.parse(String(localSnapshot?.updatedAt || '')) || 0;
      const remoteTime = Date.parse(String(remoteSnapshot?.updatedAt || '')) || 0;
      const snapshot = remoteTime > localTime ? remoteSnapshot : localSnapshot;
      if (!snapshot || typeof snapshot !== 'object') {
        setDraftRecoveryReady(true);
        return;
      }

      Alert.alert(t('diveEditor.restoreTitle'), t('diveEditor.restoreBody'), [
      {
        text: t('diveEditor.discard'),
        style: 'destructive',
        onPress: () => {
          storage.delete(key);
          void apiClient.deleteDiveLogDraft(safeLogId).catch(() => undefined);
          setDraftRecoveryReady(true);
        },
      },
      {
        text: t('diveEditor.restore'),
        onPress: () => {
          setMemo(String(snapshot?.memo || ''));
          setBuddyName(String(snapshot?.buddyName || ''));
          setEquipmentInfo(String(snapshot?.equipmentInfo || ''));
          setDivePointName(String(snapshot?.divePointName || ''));
          setVisibilityType((['public', 'followers', 'private'] as const).includes(snapshot?.visibilityType as any) ? snapshot.visibilityType : 'followers');
          setTagsInput(String(snapshot?.tagsInput || ''));
          setMedia(normalizeRecoveredMedia(snapshot?.media));
          setEntryLatInput(String(snapshot?.entryLatInput || ''));
          setEntryLngInput(String(snapshot?.entryLngInput || ''));
          setExitLatInput(String(snapshot?.exitLatInput || ''));
          setExitLngInput(String(snapshot?.exitLngInput || ''));
          setVisibilityMetersInput(String(snapshot?.visibilityMetersInput || ''));
          setCurrentStrengthInput(String(snapshot?.currentStrengthInput || ''));
          setEnvironment(snapshot?.weather);
          setEnvironmentStatus(snapshot?.weather ? 'available' : 'idle');
          setAiEnabled(Boolean(snapshot?.aiEnabled));
          if (snapshot?.story && typeof snapshot.story.summary === 'string' && typeof snapshot.story.caption === 'string') {
            setStory(snapshot.story);
            setStoryAccepted(Boolean(snapshot.storyAccepted));
          }
          setCopilotIgnoredIds(Array.isArray(snapshot?.copilotIgnoredIds) ? snapshot.copilotIgnoredIds.map(String) : []);
          setDraftRecoveryReady(true);
        },
      },
      ]);
    };
    void restoreDraft();
    return () => { cancelled = true; };
  }, [safeLogId, t]);

  const baseline = useMemo(
    () =>
      JSON.stringify({
        memo: log?.memo || '',
        buddyName: log?.buddyName || '',
        equipmentInfo: log?.equipmentInfo || '',
        divePointName: log?.divePointName || '',
        visibilityType: log?.visibilityType || 'followers',
        tagsInput: (log?.tags || []).join(', '),
        mediaCount: log?.media.length || 0,
        entryLatInput: safeNumberText(log?.entryLocation?.lat),
        entryLngInput: safeNumberText(log?.entryLocation?.lng),
        exitLatInput: safeNumberText(log?.exitLocation?.lat),
        exitLngInput: safeNumberText(log?.exitLocation?.lng),
        visibilityMetersInput: safeNumberText(log?.visibility),
        currentStrengthInput: safeNumberText(log?.currentStrength),
        weather: log?.weather,
        story: { summary: log?.aiSummary || '', caption: log?.aiCaption || '' },
        storyAccepted: true,
        copilotIgnoredIds: log?.copilotIgnoredSuggestionIds || [],
        mediaSignature: (log?.media || []).map((item, index) => `${index}:${item.id}:${item.type}:${item.localUri || item.url || ''}:${item.uploadStatus || 'idle'}`).join('|'),
      }),
    [log]
  );

  const draft = useMemo(
    () =>
      JSON.stringify({
        memo,
        buddyName,
        equipmentInfo,
        divePointName,
        visibilityType,
        tagsInput,
        mediaCount: media.length,
        entryLatInput,
        entryLngInput,
        exitLatInput,
        exitLngInput,
        visibilityMetersInput,
        currentStrengthInput,
        weather: environment,
        story,
        storyAccepted,
        copilotIgnoredIds,
        mediaSignature: media.map((item, index) => `${index}:${item.id}:${item.type}:${item.localUri || item.url || ''}:${item.uploadStatus || 'idle'}`).join('|'),
      }),
    [
      memo,
      buddyName,
      equipmentInfo,
      divePointName,
      visibilityType,
      tagsInput,
      media,
      entryLatInput,
      entryLngInput,
      exitLatInput,
      exitLngInput,
      visibilityMetersInput,
      currentStrengthInput,
      environment,
      story,
      storyAccepted,
      copilotIgnoredIds,
    ]
  );

  const hasUnsavedChanges = baseline !== draft;

  useEffect(() => {
    if (!draftRecoveryReady || !safeLogId) return;
    const key = draftStorageKey(safeLogId);
    if (!hasUnsavedChanges) {
      return;
    }
    const snapshot: DiveLogDraftSnapshot = {
      originalSource: log?.originalSource,
      fieldSources: log?.fieldSources,
      memo,
      buddyName,
      equipmentInfo,
      divePointName,
      visibilityType,
      tagsInput,
      media,
      entryLatInput,
      entryLngInput,
      exitLatInput,
      exitLngInput,
      visibilityMetersInput,
      currentStrengthInput,
      weather: environment,
      aiEnabled,
      story,
      storyAccepted,
      copilotIgnoredIds,
      updatedAt: new Date().toISOString(),
    };
    storage.set(key, JSON.stringify(snapshot));
    const timer = setTimeout(() => {
      void enqueueServerDraft(safeLogId, snapshot).catch(() => undefined);
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    draftRecoveryReady,
    safeLogId,
    hasUnsavedChanges,
    memo,
    buddyName,
    equipmentInfo,
    divePointName,
    visibilityType,
    tagsInput,
    media,
    entryLatInput,
    entryLngInput,
    exitLatInput,
    exitLngInput,
    visibilityMetersInput,
    currentStrengthInput,
    environment,
    aiEnabled,
    story,
    storyAccepted,
    copilotIgnoredIds,
    enqueueServerDraft,
    log?.originalSource,
    log?.fieldSources,
  ]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      Alert.alert(t('diveEditor.leaveTitle'), t('diveEditor.leaveBody'), [
        { text: t('diveEditor.continueEditing'), style: 'cancel' },
        {
          text: t('diveEditor.leave'),
          style: 'destructive',
          onPress: () => navigation.dispatch(event.data.action),
        },
      ]);
    });
    return unsub;
  }, [hasUnsavedChanges, navigation, t]);

  const applyGpsFromExif = (gps: { lat: number; lng: number }) => {
    if (entryLatInput.trim() || entryLngInput.trim()) return;
    Alert.alert(t('diveReview.photoGps'), t('diveReview.photoGpsConfirm', { lat: gps.lat.toFixed(6), lng: gps.lng.toFixed(6) }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('diveReview.useLocation'), onPress: () => {
        setEntryLatInput(gps.lat.toFixed(6));
        setEntryLngInput(gps.lng.toFixed(6));
      } },
    ]);
  };

  const openPointMap = () => {
    const locationQuery = (divePointName || `${entryLatInput},${entryLngInput}`).trim();
    router.push(`/(tabs)/location?location=${encodeURIComponent(locationQuery)}` as never);
  };

  const runMediaUploadNow = useCallback(async (mediaId: string, seed?: MediaFile) => {
    const target = seed || mediaRef.current.find((item) => item.id === mediaId);
    const attempt = nextUploadAttemptCount(mediaRef.current.find((item) => item.id === mediaId) || target);
    if (!target || !target.localUri) {
      setMedia((prev) =>
        prev.map((item) =>
          item.id === mediaId
            ? {
                ...item,
                uploadStatus: 'failed',
                uploadAttempts: attempt,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
      return;
    }

    setMedia((prev) =>
      prev.map((item) =>
        item.id === mediaId
          ? {
              ...item,
              uploadStatus: 'uploading',
              uploadAttempts: attempt,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );

    try {
      const result =
        target.type === 'video'
          ? await uploadVideo(target.localUri)
          : await uploadImage(target.localUri);
      setMedia((prev) =>
        prev.map((item) =>
          item.id === mediaId
            ? {
                ...item,
                url: result.url || item.url,
                thumbnailUrl: result.thumbnailUrl || item.thumbnailUrl,
                uploadStatus: 'uploaded',
                uploadAttempts: attempt,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
    } catch {
      setMedia((prev) =>
        prev.map((item) =>
          item.id === mediaId
            ? {
                ...item,
                uploadStatus: 'failed',
                uploadAttempts: attempt,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
    }
  }, []);

  const flushUploadQueue = useCallback(() => {
    while (activeUploadCountRef.current < MAX_PARALLEL_UPLOADS && uploadQueueRef.current.length > 0) {
      const next = uploadQueueRef.current.shift();
      if (!next) break;
      queuedUploadIdsRef.current.delete(next.mediaId);
      inFlightUploadIdsRef.current.add(next.mediaId);
      activeUploadCountRef.current += 1;
      setQueuedUploadCount(uploadQueueRef.current.length);

      void runMediaUploadNow(next.mediaId, next.seed).finally(() => {
        inFlightUploadIdsRef.current.delete(next.mediaId);
        activeUploadCountRef.current = Math.max(0, activeUploadCountRef.current - 1);
        setQueuedUploadCount(uploadQueueRef.current.length);
        flushUploadQueue();
      });
    }
  }, [runMediaUploadNow]);

  const queueMediaUpload = useCallback(
    (mediaId: string, seed?: MediaFile) => {
      if (queuedUploadIdsRef.current.has(mediaId) || inFlightUploadIdsRef.current.has(mediaId)) {
        return;
      }
      queuedUploadIdsRef.current.add(mediaId);
      uploadQueueRef.current.push({ mediaId, seed });
      setQueuedUploadCount(uploadQueueRef.current.length);
      flushUploadQueue();
    },
    [flushUploadQueue]
  );

  const appendPickedAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const remaining = Math.max(0, MAX_MEDIA_COUNT - media.length);
    if (remaining <= 0) {
      Alert.alert(t('diveEditor.limitTitle'), t('diveEditor.mediaLimit', { max: MAX_MEDIA_COUNT }));
      return;
    }
    const existingUriSet = new Set(
      media
        .map((item) => normalizePickedUri(item.localUri || item.url))
        .filter(Boolean) as string[]
    );
    const pickedUriSet = new Set<string>();
    const uniqueAssets = assets.filter((asset) => {
      const uri = normalizePickedUri(asset.uri);
      if (!uri) return false;
      if (existingUriSet.has(uri)) return false;
      if (pickedUriSet.has(uri)) return false;
      pickedUriSet.add(uri);
      return true;
    });
    const selected = uniqueAssets.slice(0, remaining);
    if (!selected.length) {
      Alert.alert(t('diveEditor.duplicateTitle'), t('diveEditor.duplicateBody'));
      return;
    }
    if (uniqueAssets.length < assets.length) {
      Alert.alert(t('diveEditor.duplicateTitle'), t('diveEditor.duplicatesSkipped', { count: assets.length - uniqueAssets.length }));
    }
    if (uniqueAssets.length > remaining) {
      Alert.alert(t('diveEditor.limitTitle'), t('diveEditor.selectionLimit', { max: MAX_MEDIA_COUNT, count: uniqueAssets.length - remaining }));
    }

    const now = new Date().toISOString();
    const nextMedia: MediaFile[] = selected
      .map((asset, index) => {
        const uri = normalizePickedUri(asset.uri);
        if (!uri) return null;
        const isVideo = asset.type === 'video';
        return {
          id: `picked-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
          type: isVideo ? 'video' : 'image',
          localUri: uri,
          durationSec: typeof asset.duration === 'number' ? asset.duration / 1000 : undefined,
          photoMetadata: isVideo ? undefined : readPhotoMetadata(asset.exif),
          uploadAttempts: 0,
          uploadStatus: 'idle' as const,
          createdAt: now,
          updatedAt: now,
        };
      })
      .filter(Boolean)
      .map(item => withPhotoMatch(item as MediaFile, allLogs)) as MediaFile[];

    if (!nextMedia.length) return;

    setMedia((prev) => [...prev, ...nextMedia]);
    nextMedia.forEach((item) => {
      void queueMediaUpload(item.id, item);
    });

    const locations = uniquePhotoLocations(nextMedia.flatMap(item => item.photoMetadata ? [item.photoMetadata] : []));
    if (locations.length === 1) applyGpsFromExif(locations[0]);
    else if (locations.length > 1) Alert.alert(t('photoMetadata.title'), t('photoMetadata.multipleLocations'));
  };

  const pickFromLibrary = async (mediaType: 'image' | 'video' | 'all') => {
    if (libraryPicking) return;
    if (media.length >= MAX_MEDIA_COUNT) {
      Alert.alert(t('diveEditor.limitTitle'), t('diveEditor.mediaLimit', { max: MAX_MEDIA_COUNT }));
      return;
    }

    setLibraryPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('diveEditor.permissionTitle'), t('diveEditor.permissionBody'));
        return;
      }

      const pickerMediaTypes: ImagePicker.MediaType[] =
        mediaType === 'image'
          ? ['images']
          : mediaType === 'video'
            ? ['videos']
            : ['images', 'videos'];
      const allowsMultipleSelection = Platform.OS !== 'ios';

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: pickerMediaTypes,
        allowsEditing: false,
        allowsMultipleSelection,
        ...(allowsMultipleSelection
          ? {
              selectionLimit: Math.max(1, MAX_MEDIA_COUNT - media.length),
              orderedSelection: true,
            }
          : {}),
        quality: 0.8,
        exif: true,
        shouldDownloadFromNetwork: true,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      });

      if (result.canceled || !result.assets?.length) return;
      appendPickedAssets(result.assets);
    } catch (error: any) {
      Alert.alert(t('diveEditor.pickFailed'), String(error?.message || error));
    } finally {
      setLibraryPicking(false);
    }
  };

  const removeMedia = (mediaId: string) => {
    const target = media.find((item) => item.id === mediaId);
    if (!target) return;
    const removeFromQueue = () => {
      uploadQueueRef.current = uploadQueueRef.current.filter((item) => item.mediaId !== mediaId);
      queuedUploadIdsRef.current.delete(mediaId);
      setQueuedUploadCount(uploadQueueRef.current.length);
    };
    if (target.uploadStatus === 'uploading') {
      Alert.alert(t('diveEditor.deleteUploadingTitle'), t('diveEditor.deleteUploadingBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            removeFromQueue();
            setMedia((prev) => prev.filter((item) => item.id !== mediaId));
          },
        },
      ]);
      return;
    }
    if (shouldDeleteFromCloudinary(target)) {
      void deleteMedia(target.url || '').finally(() => {
        setPendingDeleteCount(getPendingDeleteCount());
      });
    }
    removeFromQueue();
    setMedia((prev) => prev.filter((item) => item.id !== mediaId));
  };

  const retryMediaUpload = (mediaId: string) => {
    const target = media.find((item) => item.id === mediaId);
    if ((target?.uploadAttempts || 0) >= MAX_MEDIA_UPLOAD_ATTEMPTS) {
      Alert.alert(
        t('diveEditor.retryLimitTitle'),
        t('diveEditor.retryLimitBody', { max: MAX_MEDIA_UPLOAD_ATTEMPTS })
      );
      return;
    }
    const queueIndex = uploadQueueRef.current.findIndex((item) => item.mediaId === mediaId);
    if (queueIndex >= 0) {
      uploadQueueRef.current.splice(queueIndex, 1);
      queuedUploadIdsRef.current.delete(mediaId);
      setQueuedUploadCount(uploadQueueRef.current.length);
    }
    setMedia((prev) =>
      prev.map((item) =>
        item.id === mediaId
          ? {
              ...item,
              uploadStatus: 'idle',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
    void queueMediaUpload(mediaId);
  };

  const analyzePhoto = (item: MediaFile) => {
    if (!item.url || item.uploadStatus !== 'uploaded') {
      Alert.alert(t('photoAi.title'), t('photoAi.uploadFirst'));
      return;
    }
    Alert.alert(t('photoAi.consentTitle'), t('photoAi.consentMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('photoAi.analyze'), onPress: async () => {
        setAnalyzingMediaIds(ids => [...new Set([...ids, item.id])]);
        try {
          await enqueueServerDraft(safeLogId, {
            originalSource: log?.originalSource, fieldSources: log?.fieldSources,
            memo, buddyName, equipmentInfo, divePointName, visibilityType, tagsInput, media,
            entryLatInput, entryLngInput, exitLatInput, exitLngInput, visibilityMetersInput,
            currentStrengthInput, aiEnabled, story, storyAccepted, updatedAt: new Date().toISOString(),
            copilotIgnoredIds,
          });
          const result = await apiClient.analyzeDivePhoto(safeLogId, item.id);
          setMedia(rows => rows.map(row => row.id === item.id ? { ...row, aiAnalysis: result } : row));
        } catch (error: any) {
          const code = String(error?.response?.data?.error || error?.message || '');
          Alert.alert(t('photoAi.failedTitle'), t(code === 'ai_not_configured' ? 'photoAi.notConfigured' : 'photoAi.failed'));
        } finally {
          setAnalyzingMediaIds(ids => ids.filter(id => id !== item.id));
        }
      } },
    ]);
  };

  const acceptPhotoTags = (item: MediaFile) => {
    const suggestions = [...(item.aiAnalysis?.marineLifeCandidates || []), ...(item.aiAnalysis?.environmentCandidates || [])];
    setTagsInput(current => [...new Set([...normalizeTags(current), ...suggestions])].join(', '));
    setMedia(rows => rows.map(row => row.id === item.id && row.aiAnalysis ? { ...row, aiAnalysis: { ...row.aiAnalysis, confirmed: true } } : row));
  };

  const retryFailedUploads = () => {
    const failedTargets = media.filter((item) => item.uploadStatus === 'failed');
    const retryTargets = failedTargets.filter(
      (item) => item.uploadStatus === 'failed' && (item.uploadAttempts || 0) < MAX_MEDIA_UPLOAD_ATTEMPTS
    );
    const failedIds = retryTargets.map((item) => item.id);
    if (!failedIds.length) return;
    if (failedTargets.length > retryTargets.length) {
      Alert.alert(
        t('diveEditor.retrySkippedTitle'),
        t('diveEditor.retrySkippedBody', { max: MAX_MEDIA_UPLOAD_ATTEMPTS })
      );
    }
    setMedia((prev) =>
      prev.map((item) =>
        failedIds.includes(item.id)
          ? {
              ...item,
              uploadStatus: 'idle',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
    failedIds.forEach((id) => {
      void queueMediaUpload(id);
    });
  };

  const removeFailedUploads = () => {
    setMedia((prev) => prev.filter((item) => item.uploadStatus !== 'failed'));
  };

  const removeAllMedia = () => {
    if (!media.length) return;
    Alert.alert(t('diveEditor.deleteAllTitle'), t('diveEditor.deleteAllBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          uploadQueueRef.current = [];
          queuedUploadIdsRef.current.clear();
          setQueuedUploadCount(0);
          media.forEach((item) => {
            if (shouldDeleteFromCloudinary(item)) {
              void deleteMedia(item.url || '').finally(() => {
                setPendingDeleteCount(getPendingDeleteCount());
              });
            }
          });
          setMedia([]);
        },
      },
    ]);
  };

  const moveMedia = (mediaId: string, direction: 'up' | 'down') => {
    setMedia((prev) => {
      const index = prev.findIndex((item) => item.id === mediaId);
      if (index < 0) return prev;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const hold = next[index];
      next[index] = next[target];
      next[target] = hold;
      return next;
    });
  };

  const setPrimaryMedia = (mediaId: string) => {
    setMedia((prev) => {
      const index = prev.findIndex((item) => item.id === mediaId);
      if (index <= 0) return prev;
      const target = prev[index];
      const rest = prev.filter((item) => item.id !== mediaId);
      return [target, ...rest];
    });
  };

  const resetDraft = () => {
    if (!log) return;
    Alert.alert(t('diveEditor.resetTitle'), t('diveEditor.resetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.reset'),
        style: 'destructive',
        onPress: () => {
          uploadQueueRef.current = [];
          queuedUploadIdsRef.current.clear();
          setQueuedUploadCount(0);
          setMemo(log.memo || '');
          setStory({ summary: log.aiSummary || '', caption: log.aiCaption || '' });
          setStoryAccepted(true);
          setBuddyName(log.buddyName || '');
          setEquipmentInfo(log.equipmentInfo || '');
          setDivePointName(log.divePointName || '');
          setVisibilityType(log.visibilityType || 'followers');
          setTagsInput((log.tags || []).join(', '));
          setMedia(log.media || []);
          setEntryLatInput(safeNumberText(log.entryLocation?.lat));
          setEntryLngInput(safeNumberText(log.entryLocation?.lng));
          setExitLatInput(safeNumberText(log.exitLocation?.lat));
          setExitLngInput(safeNumberText(log.exitLocation?.lng));
          setVisibilityMetersInput(safeNumberText(log.visibility));
          setCurrentStrengthInput(safeNumberText(log.currentStrength));
          setCopilotIgnoredIds(log.copilotIgnoredSuggestionIds || []);
        },
      },
    ]);
  };

  const onSave = async () => {
    if (saving || generationLock.current) return;
    if (!safeLogId || !log) {
      Alert.alert(t('diveEditor.errorTitle'), t('diveEditor.missingId'));
      return;
    }
    if (queuedUploadCount > 0) {
      Alert.alert(t('diveEditor.uploadQueuedTitle'), t('diveEditor.uploadQueuedBody'));
      return;
    }
    if (media.some((item) => item.uploadStatus === 'uploading')) {
      Alert.alert(t('diveEditor.uploadingTitle'), t('diveEditor.uploadingBody'));
      return;
    }
    if (media.some((item) => item.uploadStatus === 'failed')) {
      Alert.alert(t('diveEditor.uploadFailedTitle'), t('diveEditor.uploadFailedBody'));
      return;
    }

    try {
      setSaving(true);
      const numberMessages = (label: string, min: number, max: number) => ({
        invalid: t('diveEditor.numberInvalid', { label }),
        min: t('diveEditor.numberMin', { label, min }),
        max: t('diveEditor.numberMax', { label, max }),
      });
      const entryLatLabel = t('diveEditor.entryLat');
      const entryLngLabel = t('diveEditor.entryLng');
      const exitLatLabel = t('diveEditor.exitLat');
      const exitLngLabel = t('diveEditor.exitLng');
      const entryLat = parseOptionalFloat(entryLatLabel, entryLatInput, numberMessages(entryLatLabel, -90, 90), { min: -90, max: 90 });
      const entryLng = parseOptionalFloat(entryLngLabel, entryLngInput, numberMessages(entryLngLabel, -180, 180), { min: -180, max: 180 });
      const exitLat = parseOptionalFloat(exitLatLabel, exitLatInput, numberMessages(exitLatLabel, -90, 90), { min: -90, max: 90 });
      const exitLng = parseOptionalFloat(exitLngLabel, exitLngInput, numberMessages(exitLngLabel, -180, 180), { min: -180, max: 180 });

      if ((entryLat !== undefined && entryLng === undefined) || (entryLat === undefined && entryLng !== undefined)) {
        throw new Error(t('diveEditor.coordinatePair', { location: t('diveEditor.entry') }));
      }
      if ((exitLat !== undefined && exitLng === undefined) || (exitLat === undefined && exitLng !== undefined)) {
        throw new Error(t('diveEditor.coordinatePair', { location: t('diveEditor.exit') }));
      }

      const visibilityLabel = t('diveEditor.visibility');
      const currentLabel = t('diveEditor.current');
      const visibilityMeters = parseOptionalFloat(visibilityLabel, visibilityMetersInput, numberMessages(visibilityLabel, 0, 100), { min: 0, max: 100 });
      const currentStrength = parseOptionalFloat(currentLabel, currentStrengthInput, numberMessages(currentLabel, 0, 10), { min: 0, max: 10 });
      const basePatch = {
        memo: memo.trim(),
        buddyName: buddyName.trim(),
        equipmentInfo: equipmentInfo.trim(),
        divePointName: divePointName.trim(),
        visibilityType,
        isPublic: visibilityType === 'public',
        tags: normalizeTags(tagsInput),
        media,
        entryLocation: entryLat !== undefined && entryLng !== undefined ? { lat: entryLat, lng: entryLng } : undefined,
        exitLocation: exitLat !== undefined && exitLng !== undefined ? { lat: exitLat, lng: exitLng } : undefined,
        visibility: visibilityMeters,
        currentStrength,
        weather: environment,
      };

      const effectivePatch = {
        ...basePatch,
        aiSummary: storyAccepted ? story.summary : log.aiSummary,
        aiCaption: storyAccepted ? story.caption : log.aiCaption,
        copilotIgnoredSuggestionIds: copilotIgnoredIds,
      };
      const savedDraft: DiveLogDraftSnapshot = {
        originalSource: log.originalSource,
        fieldSources: correctedDiveSources(log, effectivePatch, log.fieldSources ?? initialDiveSources(log, sourceForDiveImport(log.sourceType))),
        memo, buddyName, equipmentInfo, divePointName, visibilityType, tagsInput, media,
        entryLatInput, entryLngInput, exitLatInput, exitLngInput, visibilityMetersInput,
        currentStrengthInput, weather: environment, aiEnabled, story, storyAccepted, copilotIgnoredIds, updatedAt: new Date().toISOString(),
      };
      storage.set(draftStorageKey(safeLogId), JSON.stringify(savedDraft));
      await enqueueServerDraft(safeLogId, savedDraft);
      const { isPublic: _derivedPublicValue, ...canonicalPatch } = effectivePatch;
      const canonical = log.revision
        ? await privateDiveLogService.patch({ id: log.id, revision: log.revision }, canonicalPatch)
        : await privateDiveLogService.create({ ...log, ...effectivePatch } as unknown as Record<string, unknown>);
      upsertLog(canonical);
      storage.delete(draftStorageKey(safeLogId));
      await apiClient.deleteDiveLogDraft(safeLogId).catch(() => undefined);
    } catch (error: any) {
      Alert.alert(t('diveEditor.validationTitle'), String(error?.message || error));
      return;
    } finally {
      setSaving(false);
    }

    Alert.alert(t('common.save'), t('diveReview.savedDraft'), [
      {
        text: t('common.confirm'),
        onPress: () => router.replace(`/(tabs)/dive-log-detail?logId=${encodeURIComponent(safeLogId)}` as never),
      },
    ]);
  };

  const totalVideoCount = media.filter((item) => item.type === 'video').length;
  const totalImageCount = media.filter((item) => item.type === 'image').length;
  const uploadingCount = media.filter((item) => item.uploadStatus === 'uploading').length;
  const failedCount = media.filter((item) => item.uploadStatus === 'failed').length;
  const saveBlockedReason = useMemo(() => {
    if (!log) return t('diveReview.missing');
    if (queuedUploadCount > 0) return t('diveEditor.saveBlockedQueued', { count: queuedUploadCount });
    if (uploadingCount > 0) return t('diveEditor.saveBlockedUploading', { count: uploadingCount });
    if (failedCount > 0) return t('diveEditor.uploadFailedBody');
    return '';
  }, [log, t, queuedUploadCount, uploadingCount, failedCount]);
  const saveDisabled = Boolean(saveBlockedReason) || saving || generating;
  const copilotEntryLocation = useMemo(() => {
    const lat = Number(entryLatInput);
    const lng = Number(entryLngInput);
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      ? { lat, lng }
      : log?.entryLocation;
  }, [entryLatInput, entryLngInput, log?.entryLocation]);
  const copilotContext = useMemo(() => ({
    sourceType: log?.sourceType || 'manual' as const,
    diveDate: log?.diveDate || '',
    entryTime: log?.entryTime,
    entryLocation: copilotEntryLocation,
    gpsLocation: log?.gpsLocation,
    maxDepth: log?.maxDepth,
    totalDiveTime: log?.totalDiveTime,
    weather: environment,
    memo,
    aiSummary: storyAccepted ? story.summary : log?.aiSummary,
    media,
  }), [log?.sourceType, log?.diveDate, log?.entryTime, log?.gpsLocation, log?.maxDepth, log?.totalDiveTime, log?.aiSummary, copilotEntryLocation, environment, memo, story.summary, storyAccepted, media]);
  const copilotSuggestions = useMemo(
    () => buildDiveCopilotSuggestions(copilotContext, safeLogId).filter(item => !copilotIgnoredIds.includes(item.id)),
    [copilotContext, safeLogId, copilotIgnoredIds]
  );
  const oneTapReadiness = useMemo(() => buildOneTapReadiness(copilotContext), [copilotContext]);

  const loadEnvironment = async () => {
    if (!log || environmentLoading) return;
    const lat = Number(entryLatInput);
    const lng = Number(entryLngInput);
    const entryLocation = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : undefined;
    setEnvironmentLoading(true);
    try {
      const result = await loadEnvironmentForDive({ ...log, entryLocation });
      setEnvironmentStatus(result.status);
      if (result.status === 'available') setEnvironment(result.data);
    } finally {
      setEnvironmentLoading(false);
    }
  };

  const acceptCopilotSuggestion = (suggestion: DiveCopilotSuggestion) => {
    if (suggestion.kind === 'photo_tags' && suggestion.mediaId) {
      const item = media.find(row => row.id === suggestion.mediaId);
      if (item) acceptPhotoTags(item);
      return;
    }
    if (suggestion.kind === 'photo_match' && suggestion.mediaId) {
      setMedia(rows => rows.map(row => row.id === suggestion.mediaId && row.diveMatch
        ? { ...row, diveMatch: { ...row.diveMatch, confirmed: true, rejected: false, reviewedAt: new Date().toISOString() } }
        : row));
      return;
    }
    if (suggestion.kind === 'environment') void loadEnvironment();
  };

  const editCopilotSuggestion = (_kind: DiveCopilotSuggestionKind) => {
    setDetailsOpen(true);
  };

  const generateStory = async () => {
    if (!log || generationLock.current || !aiEnabled) return;
    generationLock.current = true;
    setGenerating(true);
    try {
      const prompt = buildDiveStoryPrompt({ ...log, site: divePointName, memo, media, weather: environment }, i18n.resolvedLanguage || 'en');
      const [summary, caption] = await Promise.all([
        aiSummaryEnabled ? apiClient.generateAiText('dive_summary', `${prompt}\nWrite a two-sentence draft.`) : Promise.resolve(story.summary),
        aiCaptionEnabled ? apiClient.generateAiText('dive_caption', `${prompt}\nWrite a short social caption.`) : Promise.resolve(story.caption),
      ]);
      if ((aiSummaryEnabled && !summary?.trim()) || (aiCaptionEnabled && !caption?.trim())) throw new Error('empty_ai_response');
      setStory({ summary, caption });
      setStoryAccepted(false);
    } catch {
      Alert.alert(t('diveReview.aiTitle'), t('diveReview.aiError'));
    } finally {
      generationLock.current = false;
      setGenerating(false);
    }
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 56 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>{t('diveEditor.title')}</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>{t('diveEditor.logId', { id: safeLogId || '-' })}</Text>
        <View style={{ marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: '#EFF6FF', gap: 10 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>{divePointName || t('diveReview.siteUnknown')}</Text>
          <Text>{log?.diveDate || t('diveReview.unknown')} {log?.entryTime || ''}</Text>
          {media[0]?.type === 'image' && (media[0].localUri || media[0].url) ? <ExpoImage source={{ uri: media[0].localUri || media[0].url }} contentFit="cover" style={{ width: '100%', aspectRatio: 1.6, borderRadius: 12 }} /> : null}
          <Text style={{ color: '#475569' }}>{t(log?.sourceType === 'manual' ? 'diveReview.userSource' : 'diveReview.importSource')}</Text>
          <DiveSourceSummary log={log} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {([['depth', log?.maxDepth, 'm'], ['average', log?.avgDepth, 'm'], ['duration', log?.totalDiveTime, 'min'], ['temperature', log?.waterTemperature, '°C']] as const).map(([label, value, unit]) => (
              <View key={label} style={{ width: '46%', paddingVertical: 8 }}>
                <Text style={{ color: '#475569' }}>{t(`diveReview.${label}`)}</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A' }}>{value == null ? t('diveReview.unknown') : `${value} ${unit}`}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: '#475569' }}>{t('diveReview.photos', { count: totalImageCount })}</Text>
          <Text style={{ color: '#475569' }}>{t('diveReview.optional')}</Text>
        </View>
        <View style={{ marginTop: 12, gap: 8 }}>
          <TextInput accessibilityLabel={t('diveReview.siteUnknown')} value={divePointName} onChangeText={setDivePointName} placeholder={t('diveReview.siteUnknown')} style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }} />
          <TouchableOpacity accessibilityRole="button" onPress={openPointMap} style={{ paddingVertical: 12 }}>
            <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{t('diveReview.map')}</Text>
          </TouchableOpacity>
        </View>
        {hasUnsavedChanges ? (
          <View style={{ marginTop: 10, alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: '#FCD34D', backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '700' }}>{t('diveEditor.unsaved')}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 16, gap: 10 }}>
          <Text style={{ color: '#334155', fontWeight: '700' }}>{t('diveEditor.mediaAdd')}</Text>
          <Text style={{ color: '#64748B', fontSize: 12 }}>
            {t('diveEditor.mediaCount', { total: media.length, max: MAX_MEDIA_COUNT, images: totalImageCount, videos: totalVideoCount })}
          </Text>
          {pendingDeleteCount > 0 ? (
            <Text style={{ color: '#B45309', fontSize: 12, fontWeight: '700' }}>
              {t('diveEditor.cloudDeletePending', { count: pendingDeleteCount })}
            </Text>
          ) : null}
          {media.length > 0 ? (
            <View style={{ alignItems: 'flex-start' }}>
              <TouchableOpacity onPress={removeAllMedia}>
                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '800' }}>{t('diveEditor.deleteAll')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {uploadingCount > 0 ? (
            <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: '700' }}>{t('diveEditor.uploadingCount', { count: uploadingCount })}</Text>
          ) : null}
          {queuedUploadCount > 0 ? (
            <Text style={{ color: '#0F766E', fontSize: 12, fontWeight: '700' }}>
              {t('diveEditor.queuedCount', { count: queuedUploadCount, parallel: MAX_PARALLEL_UPLOADS })}
            </Text>
          ) : null}
          {failedCount > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#B91C1C', fontSize: 12, fontWeight: '700' }}>{t('diveEditor.failedCount', { count: failedCount })}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={retryFailedUploads}>
                  <Text style={{ color: '#B45309', fontSize: 12, fontWeight: '800' }}>{t('diveEditor.retryAll')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={removeFailedUploads}>
                  <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '800' }}>{t('diveEditor.deleteFailed')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1.2,
                borderRadius: 12,
                backgroundColor: '#EAF4FF',
                paddingVertical: 10,
                alignItems: 'center',
                opacity: media.length >= MAX_MEDIA_COUNT || libraryPicking ? 0.55 : 1,
              }}
              onPress={() => pickFromLibrary('all')}
              disabled={media.length >= MAX_MEDIA_COUNT || libraryPicking}
            >
              {libraryPicking ? (
                <ActivityIndicator color="#0D5FA8" />
              ) : (
                <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>{t('diveEditor.pickAll')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 0.9,
                borderRadius: 12,
                backgroundColor: '#ECFEFF',
                paddingVertical: 10,
                alignItems: 'center',
                opacity: media.length >= MAX_MEDIA_COUNT || libraryPicking ? 0.55 : 1,
              }}
              onPress={() => pickFromLibrary('image')}
              disabled={media.length >= MAX_MEDIA_COUNT || libraryPicking}
            >
              <Text style={{ color: '#0F766E', fontWeight: '800' }}>{t('diveEditor.pickImages')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 0.9,
                borderRadius: 12,
                backgroundColor: '#EEF2FF',
                paddingVertical: 10,
                alignItems: 'center',
                opacity: media.length >= MAX_MEDIA_COUNT || libraryPicking ? 0.55 : 1,
              }}
              onPress={() => pickFromLibrary('video')}
              disabled={media.length >= MAX_MEDIA_COUNT || libraryPicking}
            >
              <Text style={{ color: '#4F46E5', fontWeight: '800' }}>{t('diveEditor.pickVideos')}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ borderWidth: 1, borderColor: '#D9E4F1', borderRadius: 12, backgroundColor: '#fff', padding: 10 }}>
            {media.length === 0 ? (
              <Text style={{ color: '#94A3B8' }}>{t('diveEditor.mediaEmpty')}</Text>
            ) : (
              media.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    paddingVertical: 7,
                    borderBottomWidth: index === media.length - 1 ? 0 : 1,
                    borderBottomColor: '#EEF2F7',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#334155', flex: 1 }}>
                      {index === 0 ? t('diveEditor.primary') : t('diveEditor.itemNumber', { number: index + 1 })} · {t(`diveEditor.${item.type}`)}
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: uploadStatusColorMap[item.uploadStatus || 'idle'], fontWeight: '700', fontSize: 12 }}>
                        {t(`diveEditor.status.${item.uploadStatus || 'idle'}`)}
                      </Text>
                      {!!item.uploadAttempts ? (
                        <Text style={{ marginTop: 1, color: '#64748B', fontSize: 10 }}>
                          {t('diveEditor.attempt', { current: Math.min(item.uploadAttempts, MAX_MEDIA_UPLOAD_ATTEMPTS), max: MAX_MEDIA_UPLOAD_ATTEMPTS })}
                        </Text>
                      ) : null}
                      {detectMediaUploadSource(item) ? (
                        <Text style={{ marginTop: 2, color: '#64748B', fontSize: 10 }}>
                          {detectMediaUploadSource(item)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <PhotoMetadataSummary metadata={item.photoMetadata} />
                  <PhotoMatchReview media={item} currentLogId={safeLogId} onReview={(confirmed) => setMedia(current => current.map(row => row.id === item.id ? { ...row, diveMatch: row.diveMatch ? { ...row.diveMatch, confirmed, rejected: !confirmed, reviewedAt: new Date().toISOString() } : undefined } : row))} />
                  {item.aiAnalysis ? <View style={{ marginTop: 6, borderRadius: 10, backgroundColor: '#f0fdfa', padding: 8, gap: 5 }}>
                    <Text style={{ color: '#0f766e', fontSize: 12, fontWeight: '700' }}>{t('photoAi.suggestions')} · {t(`photoAi.confidence.${item.aiAnalysis.confidence}`)}{item.aiAnalysis.cached ? ` · ${t('photoAi.cached')}` : ''}</Text>
                    <Text style={{ color: '#475569', fontSize: 12 }}>{[...item.aiAnalysis.marineLifeCandidates, ...item.aiAnalysis.environmentCandidates].join(', ') || t('photoAi.none')}</Text>
                    {!item.aiAnalysis.confirmed ? <TouchableOpacity accessibilityRole="button" onPress={() => acceptPhotoTags(item)}><Text style={{ color: '#0d5fa8', fontWeight: '700' }}>{t('photoAi.addTags')}</Text></TouchableOpacity> : <Text style={{ color: '#166534', fontSize: 12 }}>{t('photoAi.accepted')}</Text>}
                  </View> : null}
                  <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center' }}>
                    {item.type === 'image' && (item.localUri || item.url) ? (
                      <ExpoImage
                        source={{ uri: item.localUri || item.url || '' }}
                        style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#E2E8F0' }}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '800' }}>VIDEO</Text>
                      </View>
                    )}
                    <Text numberOfLines={2} style={{ marginLeft: 8, color: '#64748B', fontSize: 12, flex: 1 }}>
                      {item.localUri || item.url || '-'}
                    </Text>
                  </View>
                  {item.type === 'video' && typeof item.durationSec === 'number' ? (
                    <Text style={{ marginTop: 4, color: '#64748B', fontSize: 11 }}>
                      {t('diveEditor.duration', { seconds: Math.max(1, Math.round(item.durationSec)) })}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: 6, flexDirection: 'row', gap: 10 }}>
                    {index > 0 ? (
                      <TouchableOpacity onPress={() => setPrimaryMedia(item.id)}>
                        <Text style={{ color: '#0F766E', fontWeight: '700' }}>{t('diveEditor.setPrimary')}</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity disabled={index === 0} onPress={() => moveMedia(item.id, 'up')}>
                      <Text style={{ color: index === 0 ? '#94A3B8' : '#0D5FA8', fontWeight: '700' }}>{t('diveEditor.moveForward')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={index === media.length - 1} onPress={() => moveMedia(item.id, 'down')}>
                      <Text style={{ color: index === media.length - 1 ? '#94A3B8' : '#0D5FA8', fontWeight: '700' }}>{t('diveEditor.moveBack')}</Text>
                    </TouchableOpacity>
                    {item.uploadStatus === 'failed' ? (
                      <TouchableOpacity onPress={() => retryMediaUpload(item.id)}>
                        <Text style={{ color: '#D97706', fontWeight: '700' }}>{t('common.retry')}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {item.type === 'image' && item.uploadStatus === 'uploaded' ? <TouchableOpacity disabled={analyzingMediaIds.includes(item.id)} onPress={() => analyzePhoto(item)}><Text style={{ color: '#7c3aed', fontWeight: '700' }}>{analyzingMediaIds.includes(item.id) ? t('photoAi.analyzing') : t('photoAi.analyze')}</Text></TouchableOpacity> : null}
                    <TouchableOpacity onPress={() => removeMedia(item.id)}>
                      <Text style={{ color: '#DC2626', fontWeight: '700' }}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <DiveCopilotPanel
            suggestions={copilotSuggestions}
            readiness={oneTapReadiness}
            ignoredCount={copilotIgnoredIds.length}
            onAccept={acceptCopilotSuggestion}
            onEdit={editCopilotSuggestion}
            onIgnore={(id) => setCopilotIgnoredIds(current => [...new Set([...current, id])])}
          />

          <View style={{ marginTop: 12, borderWidth: 1, borderColor: '#D7E4F1', borderRadius: 14, backgroundColor: '#F8FAFC', padding: 12, gap: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}><Text style={{ color: '#0F172A', fontWeight: '800' }}>{t('diveEnvironment.title')}</Text><Text style={{ marginTop: 3, color: '#64748B', fontSize: 12 }}>{t('diveEnvironment.sourceNote')}</Text></View>
              <TouchableOpacity accessibilityRole="button" disabled={environmentLoading} onPress={() => void loadEnvironment()} style={{ borderRadius: 10, backgroundColor: '#0D5FA8', paddingHorizontal: 12, paddingVertical: 9, opacity: environmentLoading ? 0.5 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t(environmentLoading ? 'common.loading' : 'diveEnvironment.load')}</Text>
              </TouchableOpacity>
            </View>
            {environmentStatus !== 'idle' && environmentStatus !== 'available' && <Text accessibilityRole="alert" style={{ color: environmentStatus === 'provider_unavailable' ? '#B91C1C' : '#92400E' }}>{t(`diveEnvironment.status.${environmentStatus}`)}</Text>}
            {environment && <>
              <Text style={{ color: '#334155' }}>{t('diveEnvironment.values', { water: environment.waterTempC ?? '-', wave: environment.waveHeightM ?? '-', wind: environment.windSpeedMps ?? '-' })}</Text>
              <Text style={{ color: '#64748B', fontSize: 12 }}>{t('diveEnvironment.provider', { provider: environment.source, time: environment.observedAt || '-' })}</Text>
            </>}
          </View>

          <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }} onPress={() => setDetailsOpen(!detailsOpen)} style={{ paddingVertical: 14 }}>
            <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{t(detailsOpen ? 'diveReview.less' : 'diveReview.more')}</Text>
          </TouchableOpacity>
          {detailsOpen && <View style={{ gap: 10 }}>
          <Text style={{ color: '#334155', fontWeight: '700' }}>{t('diveEditor.entryCoordinates')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={entryLatInput}
              onChangeText={setEntryLatInput}
              placeholder={t('diveEditor.latitudeExample')}
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
            <TextInput
              value={entryLngInput}
              onChangeText={setEntryLngInput}
              placeholder={t('diveEditor.longitudeExample')}
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
          </View>

          <Text style={{ color: '#334155', fontWeight: '700' }}>{t('diveEditor.exitCoordinates')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={exitLatInput}
              onChangeText={setExitLatInput}
              placeholder={t('diveEditor.latitude')}
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
            <TextInput
              value={exitLngInput}
              onChangeText={setExitLngInput}
              placeholder={t('diveEditor.longitude')}
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
          </View>

          <Text style={{ color: '#334155', fontWeight: '700' }}>{t('diveEditor.visibilityCurrent')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={visibilityMetersInput}
              onChangeText={setVisibilityMetersInput}
              placeholder={t('diveEditor.visibilityExample')}
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
            <TextInput
              value={currentStrengthInput}
              onChangeText={setCurrentStrengthInput}
              placeholder={t('diveEditor.currentExample')}
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
          </View>

          <Text style={{ color: '#334155', fontWeight: '700' }}>{t('diveEditor.buddy')}</Text>
          <TextInput value={buddyName} onChangeText={setBuddyName} placeholder={t('diveEditor.buddyPlaceholder')} style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }} />

          <Text style={{ color: '#334155', fontWeight: '700' }}>{t('diveEditor.equipment')}</Text>
          <TextInput value={equipmentInfo} onChangeText={setEquipmentInfo} placeholder={t('diveEditor.equipmentPlaceholder')} style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }} />

          <Text style={{ color: '#334155', fontWeight: '700' }}>{t('diveEditor.tags')}</Text>
          <TextInput value={tagsInput} onChangeText={setTagsInput} placeholder={t('diveEditor.tagsPlaceholder')} style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }} />
          </View>}

          <Text style={{ color: '#334155', fontWeight: '700' }}>{t('diveEditor.memo')}</Text>
          <TextInput value={memo} onChangeText={setMemo} placeholder={t('diveEditor.memo')} multiline style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', minHeight: 120, padding: 12, textAlignVertical: 'top' }} />
          <VoiceMemoInput onAccept={(text) => setMemo(current => [current.trim(), text.trim()].filter(Boolean).join('\n'))} />

          <Text style={{ color: '#334155', fontWeight: '700' }}>{t('diveEditor.visibilityScope')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['public', 'followers', 'private'] as const).map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setVisibilityType(item)}
                style={{ borderRadius: 999, borderWidth: 1, borderColor: visibilityType === item ? '#0D5FA8' : '#CBD5E1', backgroundColor: visibilityType === item ? '#EAF4FF' : '#fff', paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ color: visibilityType === item ? '#0D5FA8' : '#475569', fontWeight: '700' }}>{t(`diveEditor.scope.${item}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#334155', fontWeight: '700' }}>{t('diveEditor.aiToggle')}</Text>
            <Switch
              value={aiEnabled}
              onValueChange={setAiEnabled}
              disabled={!aiSummaryEnabled && !aiCaptionEnabled}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
            />
          </View>
          {!aiSummaryEnabled && !aiCaptionEnabled ? (
            <Text style={{ color: '#64748B', fontSize: 12 }}>{t('diveEditor.aiDisabled')}</Text>
          ) : null}
          <TouchableOpacity accessibilityRole="button" disabled={!aiEnabled || generating || saving || !log} onPress={generateStory} style={{ paddingVertical: 12, opacity: !aiEnabled || generating ? 0.5 : 1 }}>
            <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{t(generating ? 'common.loading' : 'diveReview.generate')}</Text>
          </TouchableOpacity>
          {!!(story.summary || story.caption) && <View style={{ padding: 12, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, gap: 10 }}>
            <Text>{t('diveReview.aiTitle')}</Text>
            <TextInput accessibilityLabel={t('diveReview.summary')} multiline editable={!generating && !saving} value={story.summary} onChangeText={summary => { setStory({ ...story, summary }); setStoryAccepted(false); }} style={{ minHeight: 70 }} />
            <TextInput accessibilityLabel={t('diveReview.caption')} multiline editable={!generating && !saving} value={story.caption} onChangeText={caption => { setStory({ ...story, caption }); setStoryAccepted(false); }} style={{ minHeight: 60 }} />
            <TouchableOpacity accessibilityRole="button" disabled={generating || saving} onPress={() => setStoryAccepted(true)} style={{ paddingVertical: 10 }}>
              <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{t(storyAccepted ? 'diveReview.accepted' : 'diveReview.accept')}</Text>
            </TouchableOpacity>
          </View>}

          <TouchableOpacity
            style={{
              marginTop: 10,
              borderRadius: 12,
              backgroundColor: saveDisabled ? '#94A3B8' : '#0D5FA8',
              paddingVertical: 12,
              alignItems: 'center',
            }}
            onPress={onSave}
            disabled={saveDisabled}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>{t('common.save')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              marginTop: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#CBD5E1',
              backgroundColor: '#fff',
              paddingVertical: 11,
              alignItems: 'center',
            }}
            onPress={resetDraft}
            disabled={generating || saving}
          >
            <Text style={{ color: '#334155', fontWeight: '800' }}>{t('diveEditor.reset')}</Text>
          </TouchableOpacity>
          {saveBlockedReason ? <Text style={{ marginTop: 6, color: '#B91C1C', fontSize: 12 }}>{saveBlockedReason}</Text> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
