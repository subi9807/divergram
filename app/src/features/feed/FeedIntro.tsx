import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BookOpenText, Compass, Fish } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { appRouteMap } from '../../config/sitemap';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export function FeedIntro() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const actions = [
    { id: 'explore' as const, icon: Compass, label: 'releaseUx.discover', color: isDark ? '#7ac5ff' : '#1769c2' },
    { id: 'dive_guide' as const, icon: BookOpenText, label: 'releaseUx.guides', color: isDark ? '#80d3c7' : '#197969' },
    { id: 'dive_discovery' as const, icon: Fish, label: 'releaseUx.marineLife', color: isDark ? '#b5b1ff' : '#7060b7' },
  ];
  return <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20 }}>
    <Text accessibilityRole="header" style={{ color: isDark ? '#ecf3fb' : '#1e354f', fontSize: 24, lineHeight: 32, fontWeight: '700', letterSpacing: -.6 }}>{t('releaseUx.feedTitle')}</Text>
    <Text style={{ marginTop: 4, color: isDark ? '#a6b8cc' : '#71839a', fontSize: 14, lineHeight: 22 }}>{t('releaseUx.feedSubtitle')}</Text>
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
      {actions.map(({ id, icon: Icon, label, color }) => <TouchableOpacity key={id} accessibilityRole="button" onPress={() => router.push(appRouteMap[id].path as never)} activeOpacity={.75} style={{ flex: 1, minHeight: 76, gap: 8, padding: 12, borderRadius: 14, backgroundColor: isDark ? '#122336' : '#fff', borderWidth: 1, borderColor: isDark ? '#243950' : '#e4eaf2' }}><Icon size={21} color={color} /><Text style={{ color: isDark ? '#c8d6e6' : '#526b85', fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{t(label)}</Text></TouchableOpacity>)}
    </View>
  </View>;
}
