import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { Screen } from '../../components/Screen';
import type { DiveLogVisibilityType, MediaFile } from '../../models';
import { useDiveLogStore } from '../../stores/diveLogStore';
import {
  deleteMedia,
  flushPendingMediaDeletes,
  getPendingDeleteCount,
  uploadImage,
  uploadVideo,
} from '../../services/cloudinaryService';
import { generateDiveCaption, generateDiveLogSummary } from '../../services/aiService';
import { useSettingsStore } from '../../stores/settingsStore';
import { storage } from '../../lib/storage';
import { apiClient } from '../../lib/api';

const MAX_MEDIA_COUNT = 10;
const MAX_PARALLEL_UPLOADS = 2;
const MAX_MEDIA_UPLOAD_ATTEMPTS = 3;

type DiveLogDraftSnapshot = {
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
  aiEnabled: boolean;
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
    const values = raw
      .split(/[,\s/]+/)
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
    if (!values.length) return null;
    if (values.length === 1) return exifSignedValue(values[0], ref, positiveRef, negativeRef);
    return exifSignedValue(values[0] + (values[1] || 0) / 60 + (values[2] || 0) / 3600, ref, positiveRef, negativeRef);
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

function parseOptionalFloat(label: string, input: string, options?: { min?: number; max?: number }) {
  const raw = String(input || '').trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${label} 값을 확인해주세요.`);
  if (options?.min != null && value < options.min) throw new Error(`${label}는 ${options.min} 이상이어야 합니다.`);
  if (options?.max != null && value > options.max) throw new Error(`${label}는 ${options.max} 이하여야 합니다.`);
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

const visibilityLabelMap: Record<DiveLogVisibilityType, string> = {
  public: '전체 공개',
  followers: '팔로워 공개',
  private: '나만 보기',
};

const uploadStatusLabelMap: Record<NonNullable<MediaFile['uploadStatus']>, string> = {
  idle: '대기',
  uploading: '업로드중',
  uploaded: '완료',
  failed: '실패',
};

const uploadStatusColorMap: Record<NonNullable<MediaFile['uploadStatus']>, string> = {
  idle: '#64748B',
  uploading: '#0D5FA8',
  uploaded: '#166534',
  failed: '#DC2626',
};

export default function DiveLogEditScreen() {
  const { logId } = useLocalSearchParams<{ logId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const safeLogId = String(logId || '');
  const log = useDiveLogStore((state) => state.getLogById(safeLogId));
  const updateDiveLog = useDiveLogStore((state) => state.updateDiveLog);
  const aiSummaryEnabled = useSettingsStore((state) => state.aiSummaryEnabled);
  const aiCaptionEnabled = useSettingsStore((state) => state.aiCaptionEnabled);

  const [memo, setMemo] = useState(log?.memo || '');
  const [buddyName, setBuddyName] = useState(log?.buddyName || '');
  const [equipmentInfo, setEquipmentInfo] = useState(log?.equipmentInfo || '');
  const [divePointName, setDivePointName] = useState(log?.divePointName || '');
  const [visibilityType, setVisibilityType] = useState<DiveLogVisibilityType>(log?.visibilityType || 'followers');
  const [aiEnabled, setAiEnabled] = useState(aiSummaryEnabled || aiCaptionEnabled);
  const [saving, setSaving] = useState(false);
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
      const snapshot = remoteTime >= localTime ? remoteSnapshot : localSnapshot;
      if (!snapshot || typeof snapshot !== 'object') {
        setDraftRecoveryReady(true);
        return;
      }

      Alert.alert('임시 저장된 편집 내용', '이전에 저장하지 못한 편집 내용을 복원할까요?', [
      {
        text: '버리기',
        style: 'destructive',
        onPress: () => {
          storage.delete(key);
          void apiClient.deleteDiveLogDraft(safeLogId).catch(() => undefined);
          setDraftRecoveryReady(true);
        },
      },
      {
        text: '복원',
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
          setAiEnabled(Boolean(snapshot?.aiEnabled));
          setDraftRecoveryReady(true);
        },
      },
      ]);
    };
    void restoreDraft();
    return () => { cancelled = true; };
  }, [safeLogId]);

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
        entryLat: safeNumberText(log?.entryLocation?.lat),
        entryLng: safeNumberText(log?.entryLocation?.lng),
        exitLat: safeNumberText(log?.exitLocation?.lat),
        exitLng: safeNumberText(log?.exitLocation?.lng),
        visibilityMeters: safeNumberText(log?.visibility),
        currentStrength: safeNumberText(log?.currentStrength),
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
    ]
  );

  const hasUnsavedChanges = baseline !== draft;

  useEffect(() => {
    if (!draftRecoveryReady || !safeLogId) return;
    const key = draftStorageKey(safeLogId);
    if (!hasUnsavedChanges) {
      storage.delete(key);
      void apiClient.deleteDiveLogDraft(safeLogId).catch(() => undefined);
      return;
    }
    const snapshot: DiveLogDraftSnapshot = {
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
      aiEnabled,
      updatedAt: new Date().toISOString(),
    };
    storage.set(key, JSON.stringify(snapshot));
    const timer = setTimeout(() => {
      void apiClient.saveDiveLogDraft(safeLogId, snapshot as unknown as Record<string, unknown>).catch(() => undefined);
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
    aiEnabled,
  ]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      Alert.alert('저장되지 않은 변경사항', '이 화면을 나가면 편집 내용이 사라집니다.', [
        { text: '계속 편집', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => navigation.dispatch(event.data.action),
        },
      ]);
    });
    return unsub;
  }, [hasUnsavedChanges, navigation]);

  const applyGpsFromExif = (gps: { lat: number; lng: number }) => {
    if (!entryLatInput.trim()) setEntryLatInput(gps.lat.toFixed(6));
    if (!entryLngInput.trim()) setEntryLngInput(gps.lng.toFixed(6));
    if (!exitLatInput.trim()) setExitLatInput(gps.lat.toFixed(6));
    if (!exitLngInput.trim()) setExitLngInput(gps.lng.toFixed(6));
    if (!divePointName.trim()) setDivePointName(`${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`);
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
      Alert.alert('제한 초과', `미디어는 최대 ${MAX_MEDIA_COUNT}개까지 추가할 수 있습니다.`);
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
      Alert.alert('중복 선택', '이미 추가된 미디어입니다.');
      return;
    }
    if (uniqueAssets.length < assets.length) {
      Alert.alert('중복 제외', `${assets.length - uniqueAssets.length}개 항목은 이미 추가되어 제외되었습니다.`);
    }
    if (uniqueAssets.length > remaining) {
      Alert.alert('선택 제한', `최대 ${MAX_MEDIA_COUNT}개까지 등록할 수 있어 ${uniqueAssets.length - remaining}개는 제외되었습니다.`);
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
          durationSec: typeof asset.duration === 'number' ? asset.duration : undefined,
          uploadAttempts: 0,
          uploadStatus: 'idle' as const,
          createdAt: now,
          updatedAt: now,
        };
      })
      .filter(Boolean) as MediaFile[];

    if (!nextMedia.length) return;

    setMedia((prev) => [...prev, ...nextMedia]);
    nextMedia.forEach((item) => {
      void queueMediaUpload(item.id, item);
    });

    for (const asset of selected) {
      const gps = parseExifGps(asset.exif as Record<string, unknown> | null | undefined);
      if (gps) {
        applyGpsFromExif(gps);
        break;
      }
    }
  };

  const pickFromLibrary = async (mediaType: 'image' | 'video' | 'all') => {
    if (libraryPicking) return;
    if (media.length >= MAX_MEDIA_COUNT) {
      Alert.alert('제한 초과', `미디어는 최대 ${MAX_MEDIA_COUNT}개까지 추가할 수 있습니다.`);
      return;
    }

    setLibraryPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('권한 필요', '사진/동영상 접근 권한이 필요합니다.');
        return;
      }

      const pickerMediaType =
        mediaType === 'image'
          ? ImagePicker.MediaTypeOptions.Images
          : mediaType === 'video'
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.All;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: pickerMediaType,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, MAX_MEDIA_COUNT - media.length),
        orderedSelection: true,
        quality: 0.8,
        exif: true,
      });

      if (result.canceled || !result.assets?.length) return;
      appendPickedAssets(result.assets);
    } catch (error: any) {
      Alert.alert('미디어 선택 실패', String(error?.message || error));
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
      Alert.alert('업로드 중 삭제', '업로드 중인 미디어를 삭제하면 진행 상태가 사라집니다. 삭제할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
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
        '재시도 제한',
        `자동/수동 재시도는 최대 ${MAX_MEDIA_UPLOAD_ATTEMPTS}회까지만 지원됩니다. 해당 미디어를 삭제 후 다시 추가해주세요.`
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

  const retryFailedUploads = () => {
    const failedTargets = media.filter((item) => item.uploadStatus === 'failed');
    const retryTargets = failedTargets.filter(
      (item) => item.uploadStatus === 'failed' && (item.uploadAttempts || 0) < MAX_MEDIA_UPLOAD_ATTEMPTS
    );
    const failedIds = retryTargets.map((item) => item.id);
    if (!failedIds.length) return;
    if (failedTargets.length > retryTargets.length) {
      Alert.alert(
        '재시도 제한 항목 포함',
        `실패 항목 중 일부는 최대 재시도(${MAX_MEDIA_UPLOAD_ATTEMPTS}회)를 초과해 제외되었습니다.`
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
    Alert.alert('전체 삭제', '선택한 미디어를 모두 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
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
    Alert.alert('편집 초기화', '현재 편집 내용을 마지막 저장 상태로 되돌릴까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: () => {
          uploadQueueRef.current = [];
          queuedUploadIdsRef.current.clear();
          setQueuedUploadCount(0);
          setMemo(log.memo || '');
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
        },
      },
    ]);
  };

  const onSave = async () => {
    if (!safeLogId) {
      Alert.alert('오류', '로그 식별자가 없습니다.');
      return;
    }
    if (!divePointName.trim()) {
      Alert.alert('입력 필요', '다이빙 포인트를 입력해주세요.');
      return;
    }
    if (queuedUploadCount > 0) {
      Alert.alert('업로드 대기중', '대기 중인 업로드가 완료된 뒤 저장해주세요.');
      return;
    }
    if (media.some((item) => item.uploadStatus === 'uploading')) {
      Alert.alert('업로드 진행중', '업로드가 완료된 뒤 저장해주세요.');
      return;
    }
    if (media.some((item) => item.uploadStatus === 'failed')) {
      Alert.alert('업로드 실패', '실패한 미디어를 재시도하거나 삭제한 뒤 저장해주세요.');
      return;
    }

    try {
      setSaving(true);
      const entryLat = parseOptionalFloat('입수 위치 위도', entryLatInput, { min: -90, max: 90 });
      const entryLng = parseOptionalFloat('입수 위치 경도', entryLngInput, { min: -180, max: 180 });
      const exitLat = parseOptionalFloat('출수 위치 위도', exitLatInput, { min: -90, max: 90 });
      const exitLng = parseOptionalFloat('출수 위치 경도', exitLngInput, { min: -180, max: 180 });

      if ((entryLat !== undefined && entryLng === undefined) || (entryLat === undefined && entryLng !== undefined)) {
        throw new Error('입수 위치는 위도/경도를 모두 입력해주세요.');
      }
      if ((exitLat !== undefined && exitLng === undefined) || (exitLat === undefined && exitLng !== undefined)) {
        throw new Error('출수 위치는 위도/경도를 모두 입력해주세요.');
      }

      const visibilityMeters = parseOptionalFloat('시야', visibilityMetersInput, { min: 0, max: 100 });
      const currentStrength = parseOptionalFloat('조류 강도', currentStrengthInput, { min: 0, max: 10 });
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
      };

      const aiTargetLog: any = {
        ...(log || {}),
        ...basePatch,
        id: safeLogId,
        userId: log?.userId || 'me',
        sourceType: log?.sourceType || 'manual',
        diveDate: log?.diveDate || new Date().toISOString().slice(0, 10),
        media,
        tags: normalizeTags(tagsInput),
        isPublic: visibilityType === 'public',
        visibilityType,
        syncStatus: log?.syncStatus || 'pending',
        createdAt: log?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const shouldGenerateSummary = aiEnabled && aiSummaryEnabled;
      const shouldGenerateCaption = aiEnabled && aiCaptionEnabled;
      const [nextSummary, nextCaption] = await Promise.all([
        shouldGenerateSummary ? generateDiveLogSummary(aiTargetLog) : Promise.resolve(undefined),
        shouldGenerateCaption ? generateDiveCaption(aiTargetLog) : Promise.resolve(undefined),
      ]);

      updateDiveLog(safeLogId, {
        ...basePatch,
        aiSummary: shouldGenerateSummary ? nextSummary : log?.aiSummary,
        aiCaption: shouldGenerateCaption ? nextCaption : log?.aiCaption,
      });
      storage.delete(draftStorageKey(safeLogId));
      await apiClient.deleteDiveLogDraft(safeLogId);
    } catch (error: any) {
      Alert.alert('입력 확인', String(error?.message || error));
      return;
    } finally {
      setSaving(false);
    }

    Alert.alert('저장 완료', 'DiveLog 편집 내용이 저장되었습니다.', [
      {
        text: '확인',
        onPress: () => router.replace(`/(tabs)/dive-log-detail?logId=${encodeURIComponent(safeLogId)}` as never),
      },
    ]);
  };

  const totalVideoCount = media.filter((item) => item.type === 'video').length;
  const totalImageCount = media.filter((item) => item.type === 'image').length;
  const uploadingCount = media.filter((item) => item.uploadStatus === 'uploading').length;
  const failedCount = media.filter((item) => item.uploadStatus === 'failed').length;
  const saveBlockedReason = useMemo(() => {
    if (!divePointName.trim()) return '다이빙 포인트를 입력해주세요.';
    if (queuedUploadCount > 0) return `업로드 대기 ${queuedUploadCount}개가 시작/완료되어야 저장할 수 있습니다.`;
    if (uploadingCount > 0) return `업로드 진행중 ${uploadingCount}개가 완료되어야 저장할 수 있습니다.`;
    if (failedCount > 0) return '실패한 미디어를 재시도하거나 삭제한 뒤 저장해주세요.';
    return '';
  }, [divePointName, queuedUploadCount, uploadingCount, failedCount]);
  const saveDisabled = Boolean(saveBlockedReason) || saving;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 56 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>DiveLog 편집</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>로그 ID: {safeLogId || '-'}</Text>
        {hasUnsavedChanges ? (
          <View style={{ marginTop: 10, alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: '#FCD34D', backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '700' }}>저장되지 않은 변경사항</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 16, gap: 10 }}>
          <Text style={{ color: '#334155', fontWeight: '700' }}>미디어 추가</Text>
          <Text style={{ color: '#64748B', fontSize: 12 }}>
            총 {media.length}/{MAX_MEDIA_COUNT} · 사진 {totalImageCount} · 영상 {totalVideoCount}
          </Text>
          {pendingDeleteCount > 0 ? (
            <Text style={{ color: '#B45309', fontSize: 12, fontWeight: '700' }}>
              클라우드 삭제 대기 {pendingDeleteCount}개 (네트워크/연동 상태 복구 시 자동 정리)
            </Text>
          ) : null}
          {media.length > 0 ? (
            <View style={{ alignItems: 'flex-start' }}>
              <TouchableOpacity onPress={removeAllMedia}>
                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '800' }}>미디어 전체 삭제</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {uploadingCount > 0 ? (
            <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: '700' }}>업로드 진행중 {uploadingCount}개</Text>
          ) : null}
          {queuedUploadCount > 0 ? (
            <Text style={{ color: '#0F766E', fontSize: 12, fontWeight: '700' }}>
              업로드 대기 {queuedUploadCount}개 (동시 {MAX_PARALLEL_UPLOADS}개 처리)
            </Text>
          ) : null}
          {failedCount > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#B91C1C', fontSize: 12, fontWeight: '700' }}>업로드 실패 {failedCount}개 (재시도 필요)</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={retryFailedUploads}>
                  <Text style={{ color: '#B45309', fontSize: 12, fontWeight: '800' }}>실패 전체 재시도</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={removeFailedUploads}>
                  <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '800' }}>실패 항목 삭제</Text>
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
                <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>사진/영상 선택</Text>
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
              <Text style={{ color: '#0F766E', fontWeight: '800' }}>사진만</Text>
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
              <Text style={{ color: '#4F46E5', fontWeight: '800' }}>영상만</Text>
            </TouchableOpacity>
          </View>

          <View style={{ borderWidth: 1, borderColor: '#D9E4F1', borderRadius: 12, backgroundColor: '#fff', padding: 10 }}>
            {media.length === 0 ? (
              <Text style={{ color: '#94A3B8' }}>선택된 미디어가 없습니다.</Text>
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
                      {index === 0 ? '대표' : `${index + 1}번`} · {item.type === 'image' ? '사진' : '영상'}
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: uploadStatusColorMap[item.uploadStatus || 'idle'], fontWeight: '700', fontSize: 12 }}>
                        {uploadStatusLabelMap[item.uploadStatus || 'idle']}
                      </Text>
                      {!!item.uploadAttempts ? (
                        <Text style={{ marginTop: 1, color: '#64748B', fontSize: 10 }}>
                          시도 {Math.min(item.uploadAttempts, MAX_MEDIA_UPLOAD_ATTEMPTS)}/{MAX_MEDIA_UPLOAD_ATTEMPTS}
                        </Text>
                      ) : null}
                      {detectMediaUploadSource(item) ? (
                        <Text style={{ marginTop: 2, color: '#64748B', fontSize: 10 }}>
                          {detectMediaUploadSource(item)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
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
                      재생시간: {Math.max(1, Math.round(item.durationSec))}초
                    </Text>
                  ) : null}
                  <View style={{ marginTop: 6, flexDirection: 'row', gap: 10 }}>
                    {index > 0 ? (
                      <TouchableOpacity onPress={() => setPrimaryMedia(item.id)}>
                        <Text style={{ color: '#0F766E', fontWeight: '700' }}>대표 설정</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity disabled={index === 0} onPress={() => moveMedia(item.id, 'up')}>
                      <Text style={{ color: index === 0 ? '#94A3B8' : '#0D5FA8', fontWeight: '700' }}>앞으로</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={index === media.length - 1} onPress={() => moveMedia(item.id, 'down')}>
                      <Text style={{ color: index === media.length - 1 ? '#94A3B8' : '#0D5FA8', fontWeight: '700' }}>뒤로</Text>
                    </TouchableOpacity>
                    {item.uploadStatus === 'failed' ? (
                      <TouchableOpacity onPress={() => retryMediaUpload(item.id)}>
                        <Text style={{ color: '#D97706', fontWeight: '700' }}>재시도</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity onPress={() => removeMedia(item.id)}>
                      <Text style={{ color: '#DC2626', fontWeight: '700' }}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <Text style={{ color: '#334155', fontWeight: '700' }}>다이빙 포인트</Text>
          <TextInput value={divePointName} onChangeText={setDivePointName} placeholder="포인트명 입력" style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }} />
          <TouchableOpacity
            style={{ marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: '#93C5FD', backgroundColor: '#EFF6FF', paddingVertical: 10, alignItems: 'center' }}
            onPress={openPointMap}
          >
            <Text style={{ color: '#1D4ED8', fontWeight: '800' }}>포인트 위치 찾기 (지도)</Text>
          </TouchableOpacity>

          <Text style={{ color: '#334155', fontWeight: '700' }}>입수 위치 (위도/경도)</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={entryLatInput}
              onChangeText={setEntryLatInput}
              placeholder="위도 (예: 33.2196)"
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
            <TextInput
              value={entryLngInput}
              onChangeText={setEntryLngInput}
              placeholder="경도 (예: 126.5690)"
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
          </View>

          <Text style={{ color: '#334155', fontWeight: '700' }}>출수 위치 (위도/경도)</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={exitLatInput}
              onChangeText={setExitLatInput}
              placeholder="위도"
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
            <TextInput
              value={exitLngInput}
              onChangeText={setExitLngInput}
              placeholder="경도"
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
          </View>

          <Text style={{ color: '#334155', fontWeight: '700' }}>시야(m) / 조류 강도(kn)</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={visibilityMetersInput}
              onChangeText={setVisibilityMetersInput}
              placeholder="시야 (예: 12)"
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
            <TextInput
              value={currentStrengthInput}
              onChangeText={setCurrentStrengthInput}
              placeholder="조류 강도 (예: 1.2)"
              keyboardType="decimal-pad"
              style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }}
            />
          </View>

          <Text style={{ color: '#334155', fontWeight: '700' }}>버디</Text>
          <TextInput value={buddyName} onChangeText={setBuddyName} placeholder="버디 이름" style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }} />

          <Text style={{ color: '#334155', fontWeight: '700' }}>장비 정보</Text>
          <TextInput value={equipmentInfo} onChangeText={setEquipmentInfo} placeholder="예: 5mm wetsuit, twin fins" style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }} />

          <Text style={{ color: '#334155', fontWeight: '700' }}>태그</Text>
          <TextInput value={tagsInput} onChangeText={setTagsInput} placeholder="wreck, turtle, night-dive (콤마로 구분)" style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }} />

          <Text style={{ color: '#334155', fontWeight: '700' }}>메모</Text>
          <TextInput value={memo} onChangeText={setMemo} placeholder="메모" multiline style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', minHeight: 120, padding: 12, textAlignVertical: 'top' }} />

          <Text style={{ color: '#334155', fontWeight: '700' }}>공개 범위</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['public', 'followers', 'private'] as const).map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setVisibilityType(item)}
                style={{ borderRadius: 999, borderWidth: 1, borderColor: visibilityType === item ? '#0D5FA8' : '#CBD5E1', backgroundColor: visibilityType === item ? '#EAF4FF' : '#fff', paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ color: visibilityType === item ? '#0D5FA8' : '#475569', fontWeight: '700' }}>{visibilityLabelMap[item]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#334155', fontWeight: '700' }}>AI 요약/캡션 사용</Text>
            <Switch
              value={aiEnabled}
              onValueChange={setAiEnabled}
              disabled={!aiSummaryEnabled && !aiCaptionEnabled}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
            />
          </View>
          {!aiSummaryEnabled && !aiCaptionEnabled ? (
            <Text style={{ color: '#64748B', fontSize: 12 }}>AI 설정에서 요약/캡션 기능을 먼저 활성화해주세요.</Text>
          ) : null}

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
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>저장</Text>}
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
          >
            <Text style={{ color: '#334155', fontWeight: '800' }}>편집 초기화</Text>
          </TouchableOpacity>
          {saveBlockedReason ? <Text style={{ marginTop: 6, color: '#B91C1C', fontSize: 12 }}>{saveBlockedReason}</Text> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
