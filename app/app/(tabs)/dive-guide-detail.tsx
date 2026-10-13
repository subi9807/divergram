import React from 'react';
import { ActivityIndicator, Linking, ScrollView, Share as NativeShare, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Play, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/EmptyState';
import { apiClient } from '../../src/lib/api';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { getGuideNeighbors } from '../../src/utils/guideNavigation';
import { buildShareUrl } from '../../src/lib/shareLinks';

function supportedLocale(language: string): 'ko' | 'en' | 'ja' | 'zh' {
  const locale = String(language || '').split('-')[0];
  return locale === 'ko' || locale === 'ja' || locale === 'zh' ? locale : 'en';
}

export default function DiveGuideDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isDark } = useResolvedTheme();
  const locale = supportedLocale(i18n.resolvedLanguage || i18n.language);
  const query = useQuery({ queryKey: ['dive-guide', id, locale], enabled: Boolean(id), queryFn: () => apiClient.getDiveGuide(String(id), locale) });
  const guide = query.data;
  const neighbors = useQuery({
    queryKey: ['dive-guide-neighbors', id, locale], enabled: Boolean(guide),
    queryFn: () => getGuideNeighbors(String(id), offset => apiClient.getDiveGuides(locale, offset)),
  });
  const backButton = (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.backButton}
      onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dive-guide')}>
      <ArrowLeft size={22} color={isDark ? '#f4f8fb' : '#102639'} />
      <Text style={[styles.backText, isDark && styles.light]}>{t('common.back')}</Text>
    </TouchableOpacity>
  );
  if (query.isLoading) return <Screen>{backButton}<ActivityIndicator style={styles.loader} color="#0d75bd" /></Screen>;
  if (!guide || query.isError) return <Screen>{backButton}<EmptyState title={t('diveGuide.notFoundTitle')} subtitle={t('diveGuide.notFoundBody')} actionText={t('common.retry')} onAction={() => query.refetch()} /></Screen>;
  return (
    <Screen>
      {backButton}
      <ScrollView key={`${id}:${locale}`} showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <View style={[styles.article, isDark && styles.articleDark]}>
          {guide.coverImageUrl ? <Image source={{ uri: guide.coverImageUrl }} style={styles.cover} contentFit="cover" transition={180} /> : <View style={styles.videoCover}><Play size={46} color="#91ddff" /></View>}
          <View style={styles.content}>
            <Text style={styles.category}>{t(`diveGuide.categories.${guide.category}`)}</Text>
            <Text style={[styles.title, isDark && styles.light]}>{guide.title}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.share')} style={styles.shareButton} onPress={() => void NativeShare.share({ title: guide.title, message: `${guide.title}\n${buildShareUrl('guide', String(id))}`, url: buildShareUrl('guide', String(id)) })}><Share2 size={16} color="#0d75bd" /><Text style={styles.shareButtonText}>{t('common.share')}</Text></TouchableOpacity>
            {guide.summary ? <Text style={[styles.lead, isDark && styles.mutedDark]}>{guide.summary}</Text> : null}
            <View style={styles.rule} />
            <Text style={[styles.body, isDark && styles.bodyDark]}>{guide.body}</Text>
            {guide.videoUrl ? <TouchableOpacity style={styles.videoButton} onPress={() => Linking.openURL(guide.videoUrl)}><Play size={17} fill="#fff" color="#fff" /><Text style={styles.videoButtonText}>{t('diveGuide.watchVideo')}</Text><ExternalLink size={15} color="#fff" /></TouchableOpacity> : null}
            <View style={styles.disclaimer}><Text style={styles.disclaimerTitle}>{t('diveGuide.disclaimerTitle')}</Text><Text style={styles.disclaimerBody}>{t('diveGuide.disclaimerBody')}</Text></View>
          </View>
        </View>
        <View style={[styles.navigation, isDark && styles.articleDark]}>
          {neighbors.isLoading ? <ActivityIndicator color="#0d75bd" /> : neighbors.isError ? (
            <TouchableOpacity accessibilityRole="button" onPress={() => neighbors.refetch()}><Text style={styles.category}>{t('diveGuide.navigationRetry')}</Text></TouchableOpacity>
          ) : (['previous', 'next'] as const).map(direction => {
            const item = neighbors.data?.[direction];
            return <TouchableOpacity key={direction} accessibilityRole="button" disabled={!item}
              style={styles.navigationRow} onPress={() => item && router.replace({ pathname: '/(tabs)/dive-guide-detail', params: { id: item.id } })}>
              {direction === 'previous' ? <ChevronLeft size={20} color="#0d75bd" /> : <ChevronRight size={20} color="#0d75bd" />}
              <View style={styles.navigationCopy}>
                <Text style={styles.category}>{t(`diveGuide.${direction}Article`)}</Text>
                <Text style={[styles.navigationTitle, isDark && styles.light, !item && styles.mutedDark]}>{item?.title || t(`diveGuide.no${direction === 'previous' ? 'Previous' : 'Next'}Article`)}</Text>
              </View>
            </TouchableOpacity>;
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: { minHeight: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  backText: { color: '#102639', fontSize: 15, fontWeight: '700' },
  navigation: { marginTop: 20, padding: 16, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce8f2', gap: 12 },
  navigationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 62 },
  navigationCopy: { flex: 1, gap: 6 },
  navigationTitle: { fontSize: 15, lineHeight: 22, color: '#102639', fontWeight: '600' },
  page: { padding: 16, paddingBottom: 36 },
  loader: { marginTop: 100 },
  article: { borderRadius: 24, overflow: 'hidden', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dce8f2' },
  articleDark: { backgroundColor: '#102031', borderColor: '#294057' },
  cover: { width: '100%', aspectRatio: 1.2 },
  videoCover: { width: '100%', aspectRatio: 1.2, backgroundColor: '#073b64', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 21 },
  category: { color: '#0d75bd', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: '#102639', fontSize: 27, lineHeight: 35, fontWeight: '900', marginTop: 8 },
  lead: { color: '#60758a', fontSize: 16, lineHeight: 25, marginTop: 12 },
  mutedDark: { color: '#a9bbcb' },
  rule: { height: 1, backgroundColor: '#dce8f2', marginVertical: 20 },
  body: { color: '#263d50', fontSize: 15, lineHeight: 26 },
  bodyDark: { color: '#d8e4ee' },
  light: { color: '#f4f8fb' },
  videoButton: { marginTop: 24, minHeight: 48, borderRadius: 14, backgroundColor: '#0d75bd', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  videoButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  shareButton: { marginTop: 12, minHeight: 40, alignSelf: 'flex-start', paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: '#b9d9ec', backgroundColor: '#eef7fd', flexDirection: 'row', gap: 7, alignItems: 'center' },
  shareButtonText: { color: '#0d75bd', fontSize: 12, fontWeight: '900' },
  disclaimer: { marginTop: 24, borderRadius: 15, padding: 15, backgroundColor: '#eef7fd' },
  disclaimerTitle: { color: '#0d5f98', fontSize: 12, fontWeight: '900' },
  disclaimerBody: { color: '#587084', fontSize: 12, lineHeight: 18, marginTop: 5 },
});
