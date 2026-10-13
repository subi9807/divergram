import React from 'react';
import { ActivityIndicator, Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, ExternalLink, Fish, MapPin, Play, Share2, Sparkles, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { apiClient } from '../../src/lib/api';
import { buildShareUrl } from '../../src/lib/shareLinks';

export default function MarineLifeDetailScreen() {
  const { sightingId = '' } = useLocalSearchParams<{ sightingId?: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isDark } = useResolvedTheme();
  const query = useQuery({
    queryKey: ['marine-life-sighting', sightingId],
    enabled: Boolean(sightingId),
    queryFn: () => apiClient.getMarineLifeSighting(String(sightingId)),
  });
  const item = query.data;
  const foreground = isDark ? '#f5f9fc' : '#102639';
  const muted = isDark ? '#a9bbcb' : '#60758a';
  const observedValue = item?.observedAt || item?.createdAt;
  const observedDate = observedValue ? new Date(observedValue) : null;
  const dateLabel = observedDate && Number.isFinite(observedDate.getTime())
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, { year: 'numeric', month: 'long', day: 'numeric' }).format(observedDate)
    : '';
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/dive-discovery');
  const backButton = (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.backButton} onPress={goBack}>
      <ArrowLeft size={22} color={foreground} />
      <Text style={[styles.backText, { color: foreground }]}>{t('common.back')}</Text>
    </TouchableOpacity>
  );

  if (query.isLoading) return <Screen>{backButton}<ActivityIndicator style={styles.loader} color="#0d75bd" /></Screen>;
  if (!item || query.isError) return <Screen>{backButton}<EmptyState title={t('marineLife.detail.notFoundTitle')} subtitle={t('marineLife.detail.notFoundBody')} actionText={t('common.retry')} onAction={() => query.refetch()} /></Screen>;

  const shareItem = async () => {
    const url = buildShareUrl('marine-life', item.id);
    await Share.share({ title: item.speciesName, message: [item.speciesName, item.summary, item.locationName, url].filter(Boolean).join('\n\n'), url });
  };

  return (
    <Screen>
      {backButton}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <View style={[styles.article, isDark && styles.articleDark]}>
          <View style={styles.mediaWrap}>
            <Image source={{ uri: item.imageUrl }} style={styles.cover} contentFit="cover" transition={180} accessibilityLabel={t('marineLife.feedCard.imageAlt', { species: item.speciesName })} />
            {item.mediaType === 'video' ? <View style={styles.videoBadge}><Play size={16} color="#fff" fill="#fff" /><Text style={styles.videoBadgeText}>{t('marineLife.video')}</Text></View> : null}
          </View>
          <View style={styles.content}>
            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <Text style={styles.category}>{t(`marineLife.category.${item.category}`)}</Text>
                <Text style={[styles.title, { color: foreground }]}>{item.speciesName}</Text>
                {item.scientificName ? <Text style={[styles.scientific, { color: muted }]}>{item.scientificName}</Text> : null}
              </View>
              {item.visibilityType === 'public' ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.share')} style={styles.shareButton} onPress={() => void shareItem()}><Share2 size={17} color="#0d75bd" /></TouchableOpacity> : null}
            </View>

            <View style={styles.metaList}>
              {dateLabel ? <View style={styles.metaRow}><CalendarDays size={17} color="#0d75bd" /><Text style={[styles.metaText, { color: muted }]}>{dateLabel}</Text></View> : null}
              {item.locationName ? <View style={styles.metaRow}><MapPin size={17} color="#0d75bd" /><Text style={[styles.metaText, { color: muted }]}>{item.locationName}</Text></View> : null}
              {item.user ? <View style={styles.metaRow}><UserRound size={17} color="#0d75bd" /><Text style={[styles.metaText, { color: muted }]}>{t('marineLife.detail.discoveredBy', { name: item.user.name })}</Text></View> : null}
              <View style={styles.metaRow}>{item.source === 'AI_CONFIRMED' ? <Sparkles size={17} color="#0d75bd" /> : <Fish size={17} color="#0d75bd" />}<Text style={[styles.metaText, { color: muted }]}>{t(`marineLife.source.${item.source}`)}</Text></View>
            </View>

            {item.summary ? <InfoSection title={t('marineLife.detail.summary')} body={item.summary} isDark={isDark} /> : null}
            {item.habitat ? <InfoSection title={t('marineLife.habitat')} body={item.habitat} isDark={isDark} /> : null}
            {item.identificationTips.length ? <InfoSection title={t('marineLife.identificationTips')} body={item.identificationTips.map(tip => `• ${tip}`).join('\n')} isDark={isDark} /> : null}
            {item.notes ? <InfoSection title={t('marineLife.notes')} body={item.notes} isDark={isDark} /> : null}
            {item.source === 'AI_CONFIRMED' ? <View style={styles.notice}><Text style={styles.noticeText}>{t('marineLife.aiInfoNotice')}</Text></View> : null}
            {item.mediaType === 'video' && item.mediaUrl ? <TouchableOpacity accessibilityRole="button" style={styles.videoButton} onPress={() => void Linking.openURL(item.mediaUrl)}><Play size={18} color="#fff" fill="#fff" /><Text style={styles.videoButtonText}>{t('marineLife.detail.openVideo')}</Text><ExternalLink size={16} color="#fff" /></TouchableOpacity> : null}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function InfoSection({ title, body, isDark }: { title: string; body: string; isDark: boolean }) {
  return <View style={[styles.infoSection, isDark && styles.infoSectionDark]}><Text style={styles.infoTitle}>{title}</Text><Text style={[styles.infoBody, isDark && styles.infoBodyDark]}>{body}</Text></View>;
}

const styles = StyleSheet.create({
  backButton: { minHeight: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  backText: { fontSize: 15, fontWeight: '800' },
  loader: { marginTop: 100 },
  page: { padding: 16, paddingBottom: 40 },
  article: { borderRadius: 24, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce8f2' },
  articleDark: { backgroundColor: '#102031', borderColor: '#294057' },
  mediaWrap: { position: 'relative', backgroundColor: '#d9edf8' },
  cover: { width: '100%', aspectRatio: 1.08 },
  videoBadge: { position: 'absolute', right: 14, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(3,43,71,0.82)', paddingHorizontal: 12, paddingVertical: 8 },
  videoBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  content: { padding: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headingCopy: { flex: 1 },
  category: { color: '#0d75bd', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  title: { marginTop: 7, fontSize: 28, lineHeight: 35, fontWeight: '900' },
  scientific: { marginTop: 5, fontSize: 14, fontStyle: 'italic' },
  shareButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef7fd', borderWidth: 1, borderColor: '#c6dfef' },
  metaList: { marginTop: 18, gap: 10, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#dce8f2' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  metaText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  infoSection: { marginTop: 16, borderRadius: 16, backgroundColor: '#f5f9fc', padding: 16 },
  infoSectionDark: { backgroundColor: '#172b3d' },
  infoTitle: { color: '#0d75bd', fontSize: 12, fontWeight: '900' },
  infoBody: { marginTop: 7, color: '#294155', fontSize: 14, lineHeight: 23 },
  infoBodyDark: { color: '#d8e4ee' },
  notice: { marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: '#fff6d9' },
  noticeText: { color: '#735b10', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  videoButton: { marginTop: 20, minHeight: 50, borderRadius: 15, backgroundColor: '#0d75bd', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  videoButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
