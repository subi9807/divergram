import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';

export function useResolvedTheme() {
  const theme = useSettingsStore((state) => state.theme);
  const systemScheme = useColorScheme();
  const resolvedTheme = theme === 'system' ? systemScheme || 'light' : theme;
  const isDark = resolvedTheme === 'dark';
  return { theme, resolvedTheme, isDark };
}

