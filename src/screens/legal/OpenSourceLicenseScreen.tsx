import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

const licenses = [
  { name: 'React Native', license: 'MIT' },
  { name: 'Expo', license: 'MIT' },
  { name: 'Zustand', license: 'MIT' },
  { name: 'TanStack Query', license: 'MIT' },
  { name: 'Lucide Icons', license: 'ISC' },
];

export default function OpenSourceLicenseScreen() {
  const router = useRouter();
  const { isDark } = useResolvedTheme();
  const colors = {
    backBorder: isDark ? '#2a3e52' : '#D6E2EE',
    backBg: isDark ? '#0f1b2a' : '#ffffff',
    backIcon: isDark ? '#e2e8f0' : '#0f172a',
    backText: isDark ? '#b6c6d8' : '#475569',
    title: isDark ? '#f1f5f9' : '#0F172A',
    subtitle: isDark ? '#9fb3c8' : '#64748B',
    cardBorder: isDark ? '#2a3e52' : '#D7E4F1',
    cardBg: isDark ? '#0f1b2a' : '#ffffff',
    cardTitle: isDark ? '#e2e8f0' : '#0F172A',
    cardMeta: isDark ? '#9fb3c8' : '#64748B',
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)/settings' as never);
            }}
            style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.backBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backBg }}
          >
            <ChevronLeft size={18} color={colors.backIcon} />
          </TouchableOpacity>
          <Text style={{ marginLeft: 10, color: colors.backText, fontWeight: '700' }}>뒤로가기</Text>
        </View>

        <Text style={{ fontSize: 27, fontWeight: '800', color: colors.title }}>오픈소스 라이선스</Text>
        <Text style={{ marginTop: 8, color: colors.subtitle }}>Divergram에서 사용 중인 주요 오픈소스 라이선스입니다.</Text>

        <View style={{ marginTop: 16 }}>
          {licenses.map((item) => (
            <View key={item.name} style={{ marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 14 }}>
              <Text style={{ color: colors.cardTitle, fontWeight: '700' }}>{item.name}</Text>
              <Text style={{ marginTop: 4, color: colors.cardMeta }}>{item.license}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
