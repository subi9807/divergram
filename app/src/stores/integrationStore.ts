import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DiveDevice, IntegrationType, UserIntegration } from '../models';
import { storage } from '../lib/storage';
import { getCloudinaryConfig } from '../services/cloudinaryService';

const zustandStorage = {
  setItem: (name: string, value: string) => storage.set(name, value),
  getItem: (name: string) => storage.getString(name) ?? null,
  removeItem: (name: string) => storage.delete(name),
};

const hasGoogleMapsKey = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY);
const hasStormglassKey = Boolean(process.env.EXPO_PUBLIC_STORMGLASS_API_KEY || process.env.STORMGLASS_API_KEY);
const hasOpenAIKey = Boolean(process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
const cloudinaryConfig = getCloudinaryConfig();
const hasCloudinaryConfig = cloudinaryConfig.canUnsignedUpload;
const cloudinaryStatusMessage = hasCloudinaryConfig
  ? '무서명 업로드 가능'
  : cloudinaryConfig.hasCloudName
    ? '업로드 preset 필요'
    : '설정 필요';

export type SyncFailureLog = {
  id: string;
  integrationType: IntegrationType;
  message: string;
  at: string;
};

export type RegisteredDiveDevice = {
  id: string;
  deviceId: string;
  name: string;
  model?: string;
  brand?: DiveDevice['brand'];
  protocol?: DiveDevice['protocol'];
  registeredAt: string;
  lastSeenAt?: string;
  lastConnectedAt?: string;
  lastSyncedAt?: string;
  lastSyncExternalLogIds?: string[];
  statusMessage?: string;
};

const defaultIntegrations: UserIntegration[] = [
  { id: 'it-google-maps', userId: 'me', type: 'google_maps', connected: hasGoogleMapsKey, statusMessage: hasGoogleMapsKey ? '활성' : 'API Key 필요', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'it-stormglass', userId: 'me', type: 'stormglass', connected: hasStormglassKey, statusMessage: hasStormglassKey ? '활성' : 'API Key 필요', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'it-garmin', userId: 'me', type: 'garmin', connected: false, statusMessage: '연결 대기', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'it-suunto', userId: 'me', type: 'suunto', connected: false, statusMessage: '연결 대기', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'it-shearwater', userId: 'me', type: 'shearwater', connected: false, statusMessage: '연결 대기', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'it-bluetooth', userId: 'me', type: 'bluetooth', connected: false, statusMessage: '기기 미연결', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'it-instagram', userId: 'me', type: 'instagram_share', connected: false, statusMessage: '공유만 지원', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'it-cloudinary', userId: 'me', type: 'cloudinary', connected: hasCloudinaryConfig, statusMessage: cloudinaryStatusMessage, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'it-openai', userId: 'me', type: 'openai', connected: hasOpenAIKey, statusMessage: hasOpenAIKey ? '활성' : '설정 필요', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'it-fcm', userId: 'me', type: 'fcm', connected: false, statusMessage: '설정 필요', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

interface IntegrationStoreState {
  integrations: UserIntegration[];
  syncFailures: SyncFailureLog[];
  autoSyncEnabled: boolean;
  registeredDiveDevices: RegisteredDiveDevice[];
  updateIntegration: (type: IntegrationType, patch: Partial<UserIntegration>) => void;
  setAutoSyncEnabled: (value: boolean) => void;
  markSyncStart: (type: IntegrationType) => void;
  markSyncSuccess: (type: IntegrationType, message?: string) => void;
  markSyncFailure: (type: IntegrationType, errorMessage: string) => void;
  clearSyncFailures: () => void;
  registerDiveDevice: (device: DiveDevice) => RegisteredDiveDevice;
  unregisterDiveDevice: (registeredId: string) => void;
  markDiveDeviceSeen: (deviceId: string, seenAt?: string) => void;
  markDiveDeviceConnected: (deviceId: string, connectedAt?: string, message?: string) => void;
  markDiveDeviceSynced: (deviceId: string, payload: { syncedAt?: string; externalLogIds?: string[]; message?: string }) => void;
  getRegisteredDiveDeviceByDeviceId: (deviceId: string) => RegisteredDiveDevice | undefined;
}

function makeFailureId() {
  return `sync_failure_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeRegisteredDeviceId(deviceId: string) {
  return `reg_${deviceId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export const useIntegrationStore = create<IntegrationStoreState>()(
  persist(
    (set, get) => ({
      integrations: defaultIntegrations,
      syncFailures: [],
      autoSyncEnabled: true,
      registeredDiveDevices: [],

      updateIntegration: (type, patch) =>
        set((state) => ({
          integrations: state.integrations.map((item) =>
            item.type === type
              ? {
                  ...item,
                  ...patch,
                  updatedAt: new Date().toISOString(),
                }
              : item
          ),
        })),

      setAutoSyncEnabled: (value) => set({ autoSyncEnabled: value }),

      markSyncStart: (type) => {
        get().updateIntegration(type, {
          statusMessage: '동기화중',
        });
      },

      markSyncSuccess: (type, message = '동기화 완료') => {
        get().updateIntegration(type, {
          connected: true,
          statusMessage: message,
          lastSyncAt: new Date().toISOString(),
        });
      },

      markSyncFailure: (type, errorMessage) => {
        get().updateIntegration(type, {
          statusMessage: `동기화 실패: ${errorMessage}`,
        });
        set((state) => ({
          syncFailures: (() => {
            const nowIso = new Date().toISOString();
            const nowMs = Date.parse(nowIso);
            const existingIndex = state.syncFailures.findIndex((row) => {
              if (row.integrationType !== type) return false;
              if (row.message !== errorMessage) return false;
              const atMs = Date.parse(String(row.at || ''));
              if (!Number.isFinite(atMs)) return false;
              return nowMs - atMs < 2 * 60 * 1000;
            });

            if (existingIndex >= 0) {
              return state.syncFailures
                .map((row, index) =>
                  index === existingIndex
                    ? {
                        ...row,
                        at: nowIso,
                      }
                    : row
                )
                .sort((a, b) => Date.parse(String(b.at || '')) - Date.parse(String(a.at || '')))
                .slice(0, 120);
            }

            return [
              {
                id: makeFailureId(),
                integrationType: type,
                message: errorMessage,
                at: nowIso,
              },
              ...state.syncFailures,
            ].slice(0, 120);
          })(),
        }));
      },

      clearSyncFailures: () => set({ syncFailures: [] }),

      registerDiveDevice: (device) => {
        const existing = get().registeredDiveDevices.find((item) => item.deviceId === device.id);
        const now = new Date().toISOString();
        if (existing) {
          const updated: RegisteredDiveDevice = {
            ...existing,
            name: device.name || existing.name,
            model: device.model || existing.model,
            brand: device.brand || existing.brand,
            protocol: device.protocol || existing.protocol,
            lastSeenAt: device.lastSeenAt || now,
            statusMessage: '등록됨',
          };
          set((state) => ({
            registeredDiveDevices: state.registeredDiveDevices.map((item) => (item.id === existing.id ? updated : item)),
          }));
          return updated;
        }

        const created: RegisteredDiveDevice = {
          id: makeRegisteredDeviceId(device.id),
          deviceId: device.id,
          name: device.name || 'Dive Device',
          model: device.model,
          brand: device.brand,
          protocol: device.protocol || 'ble',
          registeredAt: now,
          lastSeenAt: device.lastSeenAt || now,
          statusMessage: '등록됨',
        };
        set((state) => ({
          registeredDiveDevices: [created, ...state.registeredDiveDevices],
        }));
        return created;
      },

      unregisterDiveDevice: (registeredId) =>
        set((state) => ({
          registeredDiveDevices: state.registeredDiveDevices.filter((item) => item.id !== registeredId),
        })),

      markDiveDeviceSeen: (deviceId, seenAt) =>
        set((state) => ({
          registeredDiveDevices: state.registeredDiveDevices.map((item) =>
            item.deviceId === deviceId
              ? {
                  ...item,
                  lastSeenAt: seenAt || new Date().toISOString(),
                }
              : item
          ),
        })),

      markDiveDeviceConnected: (deviceId, connectedAt, message) =>
        set((state) => ({
          registeredDiveDevices: state.registeredDiveDevices.map((item) =>
            item.deviceId === deviceId
              ? {
                  ...item,
                  lastConnectedAt: connectedAt || new Date().toISOString(),
                  statusMessage: message || '연결됨',
                }
              : item
          ),
        })),

      markDiveDeviceSynced: (deviceId, payload) =>
        set((state) => ({
          registeredDiveDevices: state.registeredDiveDevices.map((item) =>
            item.deviceId === deviceId
              ? {
                  ...item,
                  lastSyncedAt: payload.syncedAt || new Date().toISOString(),
                  lastSyncExternalLogIds: payload.externalLogIds && payload.externalLogIds.length
                    ? payload.externalLogIds.slice(-40)
                    : item.lastSyncExternalLogIds,
                  statusMessage: payload.message || item.statusMessage,
                }
              : item
          ),
        })),

      getRegisteredDiveDeviceByDeviceId: (deviceId) =>
        get().registeredDiveDevices.find((item) => item.deviceId === deviceId),
    }),
    {
      name: 'integration-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        integrations: state.integrations,
        syncFailures: state.syncFailures,
        autoSyncEnabled: state.autoSyncEnabled,
        registeredDiveDevices: state.registeredDiveDevices,
      }),
    }
  )
);
