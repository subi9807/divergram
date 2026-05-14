import { useState, useEffect } from 'react';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

interface Settings {
  pushNotifications: boolean;
  language: string;
}

const defaultSettings: Settings = {
  pushNotifications: true,
  language: 'ko',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = storage.getString('settings');
      return stored ? JSON.parse(stored) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    storage.set('settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return {
    settings,
    updateSetting
  };
}