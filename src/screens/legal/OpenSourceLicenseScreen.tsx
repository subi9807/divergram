import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '../../components/Screen';

const licenses = [
  { name: 'React Native', license: 'MIT' },
  { name: 'Expo', license: 'MIT' },
  { name: 'Zustand', license: 'MIT' },
  { name: 'TanStack Query', license: 'MIT' },
  { name: 'Lucide Icons', license: 'ISC' },
];

export default function OpenSourceLicenseScreen() {
  const router = useRouter();

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
            style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: '#D6E2EE', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}
          >
            <ChevronLeft size={18} color="#0f172a" />
          </TouchableOpacity>
          <Text style={{ marginLeft: 10, color: '#475569', fontWeight: '700' }}>뒤로가기</Text>
        </View>

        <Text style={{ fontSize: 27, fontWeight: '800', color: '#0F172A' }}>오픈소스 라이선스</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>Divergram에서 사용 중인 주요 오픈소스 라이선스입니다.</Text>

        <View style={{ marginTop: 16 }}>
          {licenses.map((item) => (
            <View key={item.name} style={{ marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14 }}>
              <Text style={{ color: '#0F172A', fontWeight: '700' }}>{item.name}</Text>
              <Text style={{ marginTop: 4, color: '#64748B' }}>{item.license}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
