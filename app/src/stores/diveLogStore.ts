import { create } from 'zustand';
import type { DiveLog, DiveLogVisibilityType, MediaFile, MediaType } from '../models';
import { mockDiveLogs } from '../mock/divergramExpansionMock';
import { correctedDiveSources, initialDiveSources, sourceForDiveImport } from '../utils/diveProvenance';

function nowIso() {
  return new Date().toISOString();
}

function buildMockMedia(type: MediaType): MediaFile {
  const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const stamp = nowIso();
  if (type === 'video') {
    return {
      id,
      type: 'video',
      localUri: `mock://video/${id}.mp4`,
      thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/divergram-video-thumb.jpg',
      durationSec: 24,
      uploadStatus: 'idle',
      createdAt: stamp,
      updatedAt: stamp,
    };
  }
  return {
    id,
    type: 'image',
    localUri: `mock://image/${id}.jpg`,
    uploadStatus: 'idle',
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export type DiveLogEditablePatch = Partial<
  Pick<
    DiveLog,
    | 'memo'
    | 'buddyName'
    | 'equipmentInfo'
    | 'divePointName'
    | 'entryLocation'
    | 'exitLocation'
    | 'visibilityType'
    | 'isPublic'
    | 'tags'
    | 'weather'
    | 'currentStrength'
    | 'visibility'
    | 'aiSummary'
    | 'aiCaption'
    | 'copilotIgnoredSuggestionIds'
  >
> & { media?: MediaFile[] };

interface DiveLogStoreState {
  logs: DiveLog[];
  loading: boolean;
  error: string | null;
  replaceLogs: (items: DiveLog[]) => void;
  upsertLog: (item: DiveLog) => void;
  setLoadState: (loading: boolean, error?: string | null) => void;
  getLogById: (logId: string) => DiveLog | undefined;
  updateDiveLog: (logId: string, patch: DiveLogEditablePatch) => void;
  setVisibilityType: (logId: string, value: DiveLogVisibilityType) => void;
  addMockMedia: (logId: string, type: MediaType) => void;
  removeMedia: (logId: string, mediaId: string) => void;
  appendImportedLogs: (items: DiveLog[]) => void;
}

export const useDiveLogStore = create<DiveLogStoreState>((set, get) => ({
  logs: __DEV__ ? mockDiveLogs : [],
  loading: false,
  error: null,

  replaceLogs: (items) => set({ logs: items, loading: false, error: null }),

  upsertLog: (item) => set((state) => ({
    logs: [item, ...state.logs.filter((row) => row.id !== item.id)],
    error: null,
  })),

  setLoadState: (loading, error = null) => set({ loading, error }),

  getLogById: (logId) => get().logs.find((item) => item.id === logId),

  updateDiveLog: (logId, patch) =>
    set((state) => ({
      logs: state.logs.map((item) =>
        item.id !== logId
          ? item
          : {
              ...item,
              ...patch,
              fieldSources: correctedDiveSources(item, patch, item.fieldSources ?? initialDiveSources(item, sourceForDiveImport(item.sourceType))),
              media: patch.media ?? item.media,
              updatedAt: nowIso(),
            }
      ),
    })),

  setVisibilityType: (logId, value) =>
    set((state) => ({
      logs: state.logs.map((item) =>
        item.id !== logId
          ? item
          : {
              ...item,
              visibilityType: value,
              isPublic: value === 'public',
              updatedAt: nowIso(),
            }
      ),
    })),

  addMockMedia: (logId, type) =>
    set((state) => ({
      logs: state.logs.map((item) =>
        item.id !== logId
          ? item
          : {
              ...item,
              media: [...item.media, buildMockMedia(type)],
              updatedAt: nowIso(),
            }
      ),
    })),

  removeMedia: (logId, mediaId) =>
    set((state) => ({
      logs: state.logs.map((item) =>
        item.id !== logId
          ? item
          : {
              ...item,
              media: item.media.filter((media) => media.id !== mediaId),
              updatedAt: nowIso(),
            }
      ),
    })),

  appendImportedLogs: (items) =>
    set((state) => {
      const existingIds = new Set(state.logs.map((item) => item.id));
      const filtered = items.filter((item) => !existingIds.has(item.id));
      return { logs: [...filtered, ...state.logs] };
    }),
}));
