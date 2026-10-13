import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { BookOpenText, ChevronRight, Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/EmptyState';
import { apiClient, type DiveGuide } from '../../src/lib/api';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';

const CATEGORIES = ['', 'safety', 'equipment', 'skills', 'environment', 'travel', 'marine_life', 'news'] as const;

function supportedLocale(language: string): 'ko' | 'en' | 'ja' | 'zh' {
  const locale = String(language || '').split('-')[0];
  return locale === 'ko' || locale === 'ja' || locale === 'zh' ? locale : 'en';
}

function GuideCard({ guide, onPress, dark }: { guide: DiveGuide; onPress: () => void; dark: boolean }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, dark && styles.cardDark]}>
      <View style={styles.publisherRow}>
        <View style={styles.publisherIcon}><BookOpenText size={17} color="#ffffff" /></View>
        <View style={styles.publisherCopy}><Text style={[styles.publisher, dark && styles.textLight]}>Divergram</Text><Text style={styles.official}>{t('diveGuide.official')}</Text></View>
        {guide.featured ? <Text style={styles.featured}>{t('diveGuide.featured')}</Text> : null}
      </View>
      <View style={[styles.media, dark && styles.mediaDark]}>
        {guide.coverImageUrl ? <Image source={{ uri: guide.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} /> : <Play size={42} color="#8fd8ff" />}
        {guide.videoUrl ? <View style={styles.videoBadge}><Play size={14} fill="#fff" color="#fff" /><Text style={styles.videoBadgeText}>{t('diveGuide.video')}</Text></View> : null}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.category}>{t(`diveGuide.categories.${guide.category}`)}</Text>
        <Text numberOfLines={2} style={[styles.title, dark && styles.textLight]}>{guide.title}</Text>
        {guide.summary ? <Text numberOfLines={3} style={[styles.summary, dark && styles.summaryDark]}>{guide.summary}</Text> : null}
        <View style={styles.readRow}><Text style={styles.readMore}>{t('diveGuide.readMore')}</Text><ChevronRight size={16} color="#0d75bd" /></View>
      </View>
    </TouchableOpacity>
  );
}

export default function DiveGuideScreen() {
  const { t, i18n } = useTranslation();
  const { isDark } = useResolvedTheme();
  const router = useRouter();
  const locale = supportedLocale(i18n.resolvedLanguage || i18n.language);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('');
  const query = useInfiniteQuery({
    queryKey: ['dive-guides', locale, category],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => apiClient.getDiveGuides(locale, Number(pageParam || 0), category),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
  const rows = useMemo(() => {
    const seen = new Set<string>();
    return (query.data?.pages.flatMap((page) => page.data) || []).filter((guide) => {
      if (seen.has(guide.id)) return false;
      seen.add(guide.id);
      return true;
    });
  }, [query.data]);

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <GuideCard guide={item} dark={isDark} onPress={() => router.push(`/(tabs)/dive-guide-detail?id=${encodeURIComponent(item.id)}` as never)} />}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor="#0d75bd" />}
        onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={<>
          <View style={styles.hero}><Text style={styles.eyebrow}>{t('diveGuide.eyebrow')}</Text><Text style={styles.heroTitle}>{t('diveGuide.title')}</Text><Text style={styles.heroBody}>{t('diveGuide.subtitle')}</Text></View>
          <FlatList horizontal data={CATEGORIES} keyExtractor={(item) => item || 'all'} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories} renderItem={({ item }) => <TouchableOpacity onPress={() => setCategory(item)} style={[styles.categoryButton, category === item && styles.categoryButtonActive]}><Text style={[styles.categoryButtonText, category === item && styles.categoryButtonTextActive]}>{t(item ? `diveGuide.categories.${item}` : 'diveGuide.categories.all')}</Text></TouchableOpacity>} />
        </>}
        ListEmptyComponent={query.isLoading ? <ActivityIndicator style={styles.loader} color="#0d75bd" /> : <EmptyState icon={<BookOpenText size={28} color="#0d75bd" />} title={query.isError ? t('diveGuide.errorTitle') : t('diveGuide.emptyTitle')} subtitle={query.isError ? t('diveGuide.errorBody') : t('diveGuide.emptyBody')} actionText={query.isError ? t('common.retry') : undefined} onAction={query.isError ? () => query.refetch() : undefined} />}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.footerLoader} color="#0d75bd" /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32 },
  hero: { margin: 16, marginBottom: 10, borderRadius: 24, padding: 22, backgroundColor: '#073b64', overflow: 'hidden' },
  eyebrow: { color: '#7dd3fc', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginTop: 7 },
  heroBody: { color: '#d8efff', fontSize: 14, lineHeight: 21, marginTop: 7 },
  categories: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  categoryButton: { paddingHorizontal: 14, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e7f2fb' },
  categoryButtonActive: { backgroundColor: '#0d75bd' },
  categoryButtonText: { color: '#466075', fontSize: 12, fontWeight: '800' },
  categoryButtonTextActive: { color: '#ffffff' },
  card: { marginHorizontal: 16, marginBottom: 18, borderRadius: 22, backgroundColor: '#ffffff', overflow: 'hidden', borderWidth: 1, borderColor: '#dce8f2', shadowColor: '#082f49', shadowOpacity: 0.09, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  cardDark: { backgroundColor: '#102031', borderColor: '#294057' },
  publisherRow: { height: 60, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' },
  publisherIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#0d75bd', alignItems: 'center', justifyContent: 'center' },
  publisherCopy: { flex: 1, marginLeft: 10 },
  publisher: { color: '#14283b', fontSize: 14, fontWeight: '900' },
  official: { color: '#1683c6', fontSize: 10, fontWeight: '800', marginTop: 2 },
  featured: { color: '#9a5b00', backgroundColor: '#fff1c7', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '900' },
  media: { aspectRatio: 1.16, backgroundColor: '#083b64', alignItems: 'center', justifyContent: 'center' },
  mediaDark: { backgroundColor: '#071a2a' },
  videoBadge: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(3,16,28,0.74)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7 },
  videoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  cardBody: { padding: 17 },
  category: { color: '#0d75bd', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  title: { color: '#11273a', fontSize: 20, lineHeight: 27, fontWeight: '900', marginTop: 7 },
  summary: { color: '#60758a', fontSize: 14, lineHeight: 21, marginTop: 7 },
  summaryDark: { color: '#9fb1c4' },
  textLight: { color: '#f1f7fb' },
  readRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 14 },
  readMore: { color: '#0d75bd', fontSize: 12, fontWeight: '900' },
  loader: { marginTop: 70 },
  footerLoader: { marginVertical: 22 },
});
