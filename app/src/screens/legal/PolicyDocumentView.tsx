import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { getPolicyDocumentByType, refreshRemotePolicyDocuments } from '../../services/policyService';
import type { PolicyType } from '../../models';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import i18n from '../../lib/i18n';
import { normalizePolicyLocale } from '../../legal/policyCatalog';
import { useTranslation } from 'react-i18next';

function splitPolicyContent(content: string, defaultHeading: string): { heading: string; body: string[] }[] {
  const parts = content.split(/\n\n/).map((chunk) => chunk.trim()).filter(Boolean);
  const sections: { heading: string; body: string[] }[] = [];
  let current: { heading: string; body: string[] } | null = null;

  for (const part of parts) {
    if (part.startsWith('## ')) {
      if (current) sections.push(current);
      current = { heading: part.replace(/^##\s+/, ''), body: [] };
    } else {
      if (!current) current = { heading: defaultHeading, body: [] };
      current.body.push(part);
    }
  }
  if (current) sections.push(current);
  return sections;
}

export function PolicyDocumentView({ type }: { type: PolicyType }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const locale = normalizePolicyLocale(i18n.resolvedLanguage || i18n.language);
  const [revision, setRevision] = useState(0);
  const doc = getPolicyDocumentByType(type, locale);
  useEffect(() => {
    let active = true;
    refreshRemotePolicyDocuments(locale).then(() => { if (active) setRevision((value) => value + 1); }).catch(() => undefined);
    return () => { active = false; };
  }, [locale, type]);
  void revision;
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
          <Text style={{ marginLeft: 10, color: colors.backText, fontWeight: '700' }}>{t('common.back')}</Text>
        </View>

        <Text style={{ fontSize: 27, fontWeight: '800', color: colors.title }}>{doc?.title || t('legalUi.document')}</Text>
        <Text style={{ marginTop: 8, color: colors.subtitle }}>{t('legalUi.version')} {doc?.version || '-'} · {t('legalUi.effective')} {doc?.effectiveFrom?.slice(0, 10) || '-'}</Text>

        {doc ? (
          splitPolicyContent(doc.content, t('legalUi.info')).map((section) => (
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
            <Text style={{ color: '#991B1B' }}>{t('legalUi.missing')}</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
