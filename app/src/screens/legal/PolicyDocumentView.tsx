import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { getPolicyDocumentByType } from '../../services/policyService';
import type { PolicyType } from '../../models';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

function splitPolicyContent(content: string): { heading: string; body: string[] }[] {
  const parts = content.split(/\n\n/).map((chunk) => chunk.trim()).filter(Boolean);
  const sections: { heading: string; body: string[] }[] = [];
  let current: { heading: string; body: string[] } | null = null;

  for (const part of parts) {
    if (part.startsWith('## ')) {
      if (current) sections.push(current);
      current = { heading: part.replace(/^##\s+/, ''), body: [] };
    } else {
      if (!current) current = { heading: '안내', body: [] };
      current.body.push(part);
    }
  }
  if (current) sections.push(current);
  return sections;
}

export function PolicyDocumentView({ type, titleOverride }: { type: PolicyType; titleOverride?: string }) {
  const router = useRouter();
  const { isDark } = useResolvedTheme();
  const doc = getPolicyDocumentByType(type, 'ko');
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
    cardBody: isDark ? '#cbd5e1' : '#334155',
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
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

        <Text style={{ fontSize: 27, fontWeight: '800', color: colors.title }}>{titleOverride || doc?.title || '정책 문서'}</Text>
        <Text style={{ marginTop: 8, color: colors.subtitle }}>버전 {doc?.version || '-'} · 시행일 {doc?.effectiveFrom?.slice(0, 10) || '-'}</Text>

        {doc ? (
          splitPolicyContent(doc.content).map((section) => (
            <View key={section.heading} style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.cardTitle }}>{section.heading}</Text>
              {section.body.map((line, index) => (
                <Text key={`${section.heading}-${index}`} style={{ marginTop: 8, color: colors.cardBody, lineHeight: 21 }}>
                  {line}
                </Text>
              ))}
            </View>
          ))
        ) : (
          <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', padding: 14 }}>
            <Text style={{ color: '#991B1B' }}>정책 문서를 찾을 수 없습니다.</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
