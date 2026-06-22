import { Platform } from 'react-native';
import { apiClient } from '../lib/api';
import { requestNativeFeature } from './nativeBridgeService';
import type { NotificationSetting, NotificationType } from '../models';
import { mockNotificationSetting } from '../mock/divergramExpansionMock';
import { storage } from '../lib/storage';

const notificationKeys: NotificationType[] = [
  'like',
  'comment',
  'follow',
  'marine_weather_alert',
  'dive_schedule',
  'sync_complete',
  'sync_failed',
  'bluetooth_error',
  'certification_status',
];

const INSTALLATION_ID_KEY = 'divergram_installation_id';

function getInstallationId() {
  const existing = storage.getString(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const generated = `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  storage.set(INSTALLATION_ID_KEY, generated);
  return generated;
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase().trim();
    if (['1', 'true', 'yes', 'on'].includes(lowered)) return true;
    if (['0', 'false', 'no', 'off'].includes(lowered)) return false;
  }
  return fallback;
}

function normalizeNotificationSetting(payload: any, fallbackUserId = 'me'): NotificationSetting {
  const row = payload?.data || payload || {};
  const rawItems = row?.items || row?.notificationItems || {};
  const items = notificationKeys.reduce((acc, key) => {
    acc[key] = asBoolean(rawItems[key], mockNotificationSetting.items[key]);
    return acc;
  }, {} as NotificationSetting['items']);

  const userId = String(row?.userId || row?.user_id || fallbackUserId || 'me').trim() || 'me';
  return {
    userId,
    pushEnabled: asBoolean(row?.pushEnabled ?? row?.push_enabled, mockNotificationSetting.pushEnabled),
    items,
    updatedAt: String(row?.updatedAt || row?.updated_at || new Date().toISOString()),
  };
}

export async function requestPushFromService() {
  return requestNativeFeature('push');
}

export async function registerFcmToken(token: string, platform = Platform.OS): Promise<void> {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return;
  await apiClient.updatePushToken(platform, normalizedToken, { deviceId: getInstallationId() });
}

export async function sendPushTest(payload?: { title?: string; body?: string; data?: Record<string, any> }) {
  return apiClient.sendPushTest(payload);
}

export async function getNotificationSetting(): Promise<NotificationSetting> {
  try {
    const result = await apiClient.getNotificationSetting();
    return normalizeNotificationSetting(result);
  } catch {
    return mockNotificationSetting;
  }
}

export async function updateNotificationSetting(setting: NotificationSetting): Promise<NotificationSetting> {
  const next = {
    userId: setting.userId,
    pushEnabled: setting.pushEnabled,
    items: setting.items,
    updatedAt: new Date().toISOString(),
  };

  try {
    const result = await apiClient.updateNotificationSetting(next);
    return normalizeNotificationSetting(result, setting.userId);
  } catch {
    return next;
  }
}
