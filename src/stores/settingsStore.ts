import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '../lib/storage';

const zustandStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.delete(name);
  },
};

export type BottomTabRoute = 'index' | 'explore' | 'location' | 'logs' | 'profile' | 'messages' | 'notifications' | 'saved' | 'resorts';

export const bottomTabCandidates: BottomTabRoute[] = ['index', 'explore', 'location', 'logs', 'profile', 'messages', 'notifications', 'saved', 'resorts'];
export const bottomTabDefault: BottomTabRoute[] = ['index', 'explore', 'location', 'logs', 'profile'];

function normalizeBottomTabItems(input: BottomTabRoute[]): BottomTabRoute[] {
  const seen = new Set<BottomTabRoute>();
  const ordered: BottomTabRoute[] = [];

  for (const item of input) {
    if (!bottomTabCandidates.includes(item)) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    ordered.push(item);
  }

  if (!seen.has('index')) {
    ordered.unshift('index');
    seen.add('index');
  }

  if (ordered.length < 3) {
    for (const fallback of bottomTabDefault) {
      if (seen.has(fallback)) continue;
      ordered.push(fallback);
      seen.add(fallback);
      if (ordered.length >= 3) break;
    }
  }

  if (ordered.length > 5) return ordered.slice(0, 5);
  return ordered;
}

interface SettingsState {
  language: 'ko' | 'en' | 'ja' | 'zh';
  theme: 'light' | 'dark' | 'system';

  pushNotifications: boolean;
  likeNotifications: boolean;
  commentNotifications: boolean;
  followNotifications: boolean;
  eventNotifications: boolean;
  diveAlerts: boolean;
  communityUpdates: boolean;

  profilePublic: boolean;
  postVisibility: 'public' | 'followers' | 'private';
  diveLogVisibility: 'public' | 'followers' | 'private';
  locationSharing: boolean;
  locationTracking: boolean;
  analyticsEnabled: boolean;

  preferredDiveType: 'scuba' | 'freediving' | 'snorkeling';
  depthUnit: 'm' | 'ft';
  temperatureUnit: 'c' | 'f';
  units: 'metric' | 'imperial';
  defaultDiveMode: 'recreational' | 'technical';

  emergencyShareEnabled: boolean;
  bottomTabItems: BottomTabRoute[];

  updateLanguage: (language: 'ko' | 'en' | 'ja' | 'zh') => void;
  updateTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateNotificationSetting: (
    key: 'pushNotifications' | 'likeNotifications' | 'commentNotifications' | 'followNotifications' | 'eventNotifications' | 'diveAlerts' | 'communityUpdates',
    value: boolean
  ) => void;
  updatePrivacySetting: (
    key: 'profilePublic' | 'locationSharing' | 'locationTracking' | 'analyticsEnabled',
    value: boolean
  ) => void;
  updateSafetySetting: (key: 'emergencyShareEnabled', value: boolean) => void;
  updatePostVisibility: (value: 'public' | 'followers' | 'private') => void;
  updateDiveLogVisibility: (value: 'public' | 'followers' | 'private') => void;
  updatePreferredDiveType: (value: 'scuba' | 'freediving' | 'snorkeling') => void;
  updateDepthUnit: (value: 'm' | 'ft') => void;
  updateTemperatureUnit: (value: 'c' | 'f') => void;
  updateBottomTabItems: (items: BottomTabRoute[]) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  language: 'ko' as const,
  theme: 'system' as const,
  pushNotifications: true,
  likeNotifications: true,
  commentNotifications: true,
  followNotifications: true,
  eventNotifications: true,
  diveAlerts: true,
  communityUpdates: true,
  profilePublic: true,
  postVisibility: 'public' as const,
  diveLogVisibility: 'public' as const,
  locationSharing: true,
  locationTracking: true,
  analyticsEnabled: true,
  preferredDiveType: 'scuba' as const,
  depthUnit: 'm' as const,
  temperatureUnit: 'c' as const,
  units: 'metric' as const,
  defaultDiveMode: 'recreational' as const,
  emergencyShareEnabled: false,
  bottomTabItems: bottomTabDefault,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      updateLanguage: (language) => set({ language }),
      
      updateTheme: (theme) => set({ theme }),

      updateNotificationSetting: (key, value) => set({ [key]: value }),

      updatePrivacySetting: (key, value) => set({ [key]: value }),

      updateSafetySetting: (key, value) => set({ [key]: value }),

      updatePostVisibility: (value) => set({ postVisibility: value }),

      updateDiveLogVisibility: (value) => set({ diveLogVisibility: value }),

      updatePreferredDiveType: (value) => set({ preferredDiveType: value }),

      updateDepthUnit: (value) => set({ depthUnit: value, units: value === 'm' ? 'metric' : 'imperial' }),

      updateTemperatureUnit: (value) => set({ temperatureUnit: value }),

      updateBottomTabItems: (items) => set({ bottomTabItems: normalizeBottomTabItems(items) }),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
