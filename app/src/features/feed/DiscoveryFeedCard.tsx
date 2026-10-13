import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BookOpenText, Building2 } from 'lucide-react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { appRouteMap } from '../../config/sitemap';
import type { DiveGuide } from '../../lib/api';
import { feedCardStyle } from './feedCardStyle';

export type FeedResort = { id: string; name: string; coverUrl: string; area: string };
type Props = { guide: DiveGuide; resort?: never } | { resort: FeedResort; guide?: never };

export function DiscoveryFeedCard({ guide, resort }: Props) {
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const router = useRouter();
  const title = guide ? guide.title : resort.name;
  const cover = guide ? guide.coverImageUrl : resort.coverUrl;
  const description = guide ? guide.summary : resort.area;
  const label = t(guide ? 'diveGuide.title' : 'tabs.resorts');
  const open = () => router.push((guide
    ? `/(tabs)/dive-guide-detail?id=${encodeURIComponent(guide.id)}`
    : `${appRouteMap.resort_detail.path}?resortId=${encodeURIComponent(resort.id)}`) as never);
  return (
    <TouchableOpacity onPress={open} activeOpacity={0.92} accessibilityRole="button" accessibilityLabel={`${label}: ${title}`}
      style={[feedCardStyle, { backgroundColor: isDark ? '#0f1f2f' : '#fff', borderColor: isDark ? '#25445d' : '#d7e5ee' }]}>
      <View style={styles.header}>
        {guide ? <BookOpenText size={18} color="#0d75bd" /> : <Building2 size={18} color="#0d75bd" />}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.media}>
        {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} /> : <BookOpenText size={40} color="#0d75bd" />}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={[styles.title, { color: isDark ? '#f8fafc' : '#0f2741' }]}>{title}</Text>
        {!!description && <Text numberOfLines={2} style={[styles.description, { color: isDark ? '#94a3b8' : '#64748b' }]}>{description}</Text>}
      </View>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 13, fontWeight: '800', color: '#0d75bd' },
  media: { aspectRatio: 1.25, backgroundColor: '#e2edf4', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18 },
  title: { fontSize: 21, lineHeight: 28, fontWeight: '800' },
  description: { marginTop: 8, fontSize: 14, lineHeight: 21 },
});
