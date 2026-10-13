import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Fish, MapPin, Play } from 'lucide-react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import type { MarineLifeFeedItem } from '../../lib/api';
import { feedCardStyle } from './feedCardStyle';

type Props = { sighting: MarineLifeFeedItem };

export function MarineLifeFeedCard({ sighting }: Props) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isDark } = useResolvedTheme();
  const foreground = isDark ? '#f8fafc' : '#0f2741';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const observedAt = sighting.observedAt || sighting.createdAt;
  const observedDate = observedAt ? new Date(observedAt) : null;
  const dateLabel = observedDate && Number.isFinite(observedDate.getTime())
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, { year: 'numeric', month: 'short', day: 'numeric' }).format(observedDate)
    : '';
  const openGuide = () => router.push({ pathname: '/(tabs)/marine-life-detail', params: { sightingId: sighting.id } } as never);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={openGuide}
      style={[styles.card, { backgroundColor: isDark ? '#0f1f2f' : '#ffffff', borderColor: isDark ? '#25445d' : '#d7e5ee' }]}
      accessibilityRole="button"
      accessibilityLabel={`${t('marineLife.feedCard.eyebrow')}: ${sighting.speciesName}`}
    >
      <View style={styles.imageWrap}>
        <ExpoImage
          source={{ uri: sighting.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={180}
          accessibilityLabel={t('marineLife.feedCard.imageAlt', { species: sighting.speciesName })}
        />
        <View style={styles.eyebrow}>
          <Fish size={14} color="#ffffff" />
          <Text style={styles.eyebrowText}>{t('marineLife.feedCard.eyebrow')}</Text>
        </View>
        {sighting.mediaType === 'video' ? (
          <View style={styles.playBadge}><Play size={18} color="#ffffff" fill="#ffffff" /></View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: foreground }]} numberOfLines={1}>{sighting.speciesName}</Text>
            {sighting.scientificName ? <Text style={[styles.scientific, { color: muted }]} numberOfLines={1}>{sighting.scientificName}</Text> : null}
          </View>
          <View style={[styles.category, { backgroundColor: isDark ? '#153e45' : '#e5f7f3' }]}>
            <Text style={[styles.categoryText, { color: isDark ? '#7ee7d4' : '#08786e' }]}>{t(`marineLife.category.${sighting.category}`)}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {sighting.locationName ? <View style={styles.meta}><MapPin size={14} color={muted} /><Text style={[styles.metaText, { color: muted }]} numberOfLines={1}>{sighting.locationName}</Text></View> : null}
          {dateLabel ? <View style={styles.meta}><CalendarDays size={14} color={muted} /><Text style={[styles.metaText, { color: muted }]}>{dateLabel}</Text></View> : null}
        </View>

        <View style={[styles.footer, { borderTopColor: isDark ? '#20384b' : '#e7eff4' }]}>
          <View style={styles.author}>
            {sighting.user.avatar ? <ExpoImage source={{ uri: sighting.user.avatar }} style={styles.avatar} contentFit="cover" /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{sighting.user.name.slice(0, 1).toUpperCase()}</Text></View>}
            <Text style={[styles.authorText, { color: muted }]} numberOfLines={1}>{t('marineLife.feedCard.discoveredBy', { name: sighting.user.name })}</Text>
          </View>
          <Text style={styles.link}>{t('marineLife.feedCard.openGuide')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { ...feedCardStyle },
  imageWrap: { position: 'relative', height: 286, backgroundColor: '#dbeafe' },
  image: { width: '100%', height: '100%' },
  eyebrow: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(3, 94, 105, 0.88)' },
  eyebrowText: { color: '#ffffff', fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  playBadge: { position: 'absolute', right: 14, bottom: 14, width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: 'rgba(15, 39, 65, 0.82)' },
  body: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titleBlock: { flex: 1 },
  title: { fontSize: 22, lineHeight: 27, fontWeight: '900' },
  scientific: { marginTop: 3, fontSize: 13, fontStyle: 'italic' },
  category: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  categoryText: { fontSize: 11, fontWeight: '800' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 13 },
  meta: { maxWidth: '68%', flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { flexShrink: 1, fontSize: 12, fontWeight: '600' },
  footer: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0e7490' },
  avatarInitial: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  authorText: { flex: 1, fontSize: 12, fontWeight: '600' },
  link: { color: '#087f8c', fontSize: 13, fontWeight: '900' },
});
