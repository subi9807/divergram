import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { getAllPolicyDocuments } from '../../services/policyService';
import type { PolicyType } from '../../models';

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
  const documents = getAllPolicyDocuments('ko');

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <Text style={{ fontSize: 27, fontWeight: '800', color: '#0F172A' }}>정책 문서 센터</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>서비스 운영에 필요한 정책 문서를 확인할 수 있습니다.</Text>

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
                style={{ marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14, flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#0F172A', fontWeight: '700' }}>{doc.title}</Text>
                  <Text style={{ marginTop: 4, color: '#64748B', fontSize: 12 }}>버전 {doc.version}</Text>
                </View>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
