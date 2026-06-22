import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { getAllPolicyDocuments } from '../../services/policyService';
import type { PolicyType } from '../../models';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

const routeByType: Partial<Record<PolicyType, string>> = {
  terms: '/(tabs)/terms-policy',
  privacy: '/(tabs)/privacy-policy',
  location_terms: '/(tabs)/location-policy',
  community: '/(tabs)/community-policy',
  safety_disclaimer: '/(tabs)/safety-disclaimer',
  ai_notice: '/(tabs)/ai-usage-policy',
};

export default function PolicyCenterScreen() {
  const router = useRouter();
  const { isDark } = useResolvedTheme();
  const documents = getAllPolicyDocuments('ko');
  const colors = {
    title: isDark ? '#f1f5f9' : '#0F172A',
    subtitle: isDark ? '#9fb3c8' : '#64748B',
    cardBorder: isDark ? '#2a3e52' : '#D7E4F1',
    cardBg: isDark ? '#0f1b2a' : '#ffffff',
    cardTitle: isDark ? '#e2e8f0' : '#0F172A',
    cardMeta: isDark ? '#9fb3c8' : '#64748B',
    chevron: isDark ? '#8fa5bc' : '#94A3B8',
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <Text style={{ fontSize: 27, fontWeight: '800', color: colors.title }}>정책 문서 센터</Text>
        <Text style={{ marginTop: 8, color: colors.subtitle }}>서비스 운영에 필요한 정책 문서를 확인할 수 있습니다.</Text>

        <View style={{ marginTop: 14 }}>
          {documents.map((doc) => {
            const route = routeByType[doc.type];
            return (
              <TouchableOpacity
                key={doc.id}
                activeOpacity={0.85}
                onPress={() => {
                  if (route) router.push(route as never);
                  else router.push(`/(tabs)/policy-document?type=${encodeURIComponent(doc.type)}` as never);
                }}
                style={{ marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 14, flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.cardTitle, fontWeight: '700' }}>{doc.title}</Text>
                  <Text style={{ marginTop: 4, color: colors.cardMeta, fontSize: 12 }}>버전 {doc.version}</Text>
                </View>
                <ChevronRight size={16} color={colors.chevron} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
