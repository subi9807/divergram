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

interface SettingsState {
  // App Settings
  language: 'ko' | 'en' | 'ja' | 'zh';
  theme: 'light' | 'dark' | 'system';
  
  // Notifications
  pushNotifications: boolean;
  diveAlerts: boolean;
  communityUpdates: boolean;
  
  // Privacy
  locationTracking: boolean;
  analyticsEnabled: boolean;
  
  // Dive Settings
  units: 'metric' | 'imperial';
  defaultDiveMode: 'recreational' | 'technical';
  
  // Actions
  updateLanguage: (language: 'ko' | 'en' | 'ja' | 'zh') => void;
  updateTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateNotificationSetting: (key: string, value: boolean) => void;
  updatePrivacySetting: (key: string, value: boolean) => void;
  updateDiveSetting: (key: string, value: any) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  language: 'ko' as const,
  theme: 'system' as const,
  pushNotifications: true,
  diveAlerts: true,
  communityUpdates: true,
  locationTracking: true,
  analyticsEnabled: true,
  units: 'metric' as const,
  defaultDiveMode: 'recreational' as const,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      updateLanguage: (language) => set({ language }),
      
      updateTheme: (theme) => set({ theme }),
      
      updateNotificationSetting: (key, value) => set({ [key]: value }),
      
      updatePrivacySetting: (key, value) => set({ [key]: value }),
      
      updateDiveSetting: (key, value) => set({ [key]: value }),
      
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
