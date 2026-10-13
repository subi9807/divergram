import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Anchor,
  ArrowDown,
  Award,
  BadgeCheck,
  Binoculars,
  Building2,
  CalendarCheck,
  Check,
  ChevronLeft,
  CircleGauge,
  Clapperboard,
  Clock3,
  Compass,
  Crown,
  Earth,
  Film,
  Fish,
  FishSymbol,
  Flag,
  Footprints,
  GalleryHorizontalEnd,
  Globe2,
  Handshake,
  Heart,
  HeartHandshake,
  HeartPulse,
  History,
  Hourglass,
  ImagePlus,
  Images,
  Infinity as InfinityIcon,
  Library,
  LockKeyhole,
  Map as MapIcon,
  Medal,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  MessageSquareMore,
  Network,
  NotebookPen,
  Plane,
  Route,
  Ruler,
  Shell,
  ShieldCheck,
  ShipWheel,
  Signpost,
  Sparkles,
  SquarePlay,
  TicketCheck,
  Timer,
  Trophy,
  Turtle,
  UserPlus,
  UserRoundCheck,
  Users,
  Video,
  Waves,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/hooks/useAuth';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { apiClient } from '../../src/lib/api';
import {
  stampCatalog,
  stampProgress,
  type StampCategory,
  type StampDefinition,
  type StampMetrics,
} from '../../src/features/stamps/stampCatalog';

const emptyMetrics: StampMetrics = {
  dives: 0,
  verifiedResortVisits: 0,
  uniquePoints: 0,
  maxDepth: 0,
  diveHours: 0,
  posts: 0,
  reels: 0,
  following: 0,
  followers: 0,
  likesReceived: 0,
  commentsReceived: 0,
  marineSightings: 0,
  marineSpecies: 0,
};

const stampColors = [
  ['#0D6FB8', '#8FD3FF', 'rgba(13,111,184,0.12)'],
  ['#0F766E', '#86EFCD', 'rgba(15,118,110,0.12)'],
  ['#7C3AED', '#C4B5FD', 'rgba(124,58,237,0.12)'],
  ['#C2410C', '#FDBA74', 'rgba(194,65,12,0.12)'],
  ['#BE185D', '#F9A8D4', 'rgba(190,24,93,0.12)'],
  ['#15803D', '#86EFAC', 'rgba(21,128,61,0.12)'],
  ['#0369A1', '#7DD3FC', 'rgba(3,105,161,0.12)'],
  ['#A16207', '#FDE68A', 'rgba(161,98,7,0.12)'],
  ['#4338CA', '#A5B4FC', 'rgba(67,56,202,0.12)'],
  ['#B91C1C', '#FCA5A5', 'rgba(185,28,28,0.12)'],
  ['#0E7490', '#67E8F9', 'rgba(14,116,144,0.12)'],
  ['#6D28D9', '#D8B4FE', 'rgba(109,40,217,0.12)'],
] as const;

const stampColorById = new Map(
  stampCatalog.map((stamp, index) => [stamp.id, stampColors[index % stampColors.length]])
);

function colorsForStamp(stamp: StampDefinition) {
  return stampColorById.get(stamp.id) || stampColors[0];
}

const stampIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  waves: Waves,
  footprints: Footprints,
  calendar: CalendarCheck,
  gauge: CircleGauge,
  award: Award,
  shield: ShieldCheck,
  crown: Crown,
  infinity: InfinityIcon,
  building: Building2,
  signpost: Signpost,
  ticket: TicketCheck,
  plane: Plane,
  badge: BadgeCheck,
  globe: Globe2,
  flag: Flag,
  compass: Compass,
  map: MapIcon,
  route: Route,
  earth: Earth,
  ruler: Ruler,
  'arrow-down': ArrowDown,
  anchor: Anchor,
  'ship-wheel': ShipWheel,
  clock: Clock3,
  timer: Timer,
  hourglass: Hourglass,
  history: History,
  'image-plus': ImagePlus,
  images: Images,
  video: Video,
  'user-plus': UserPlus,
  users: Users,
  handshake: Handshake,
  'user-check': UserRoundCheck,
  network: Network,
  sparkles: Sparkles,
  'heart-handshake': HeartHandshake,
  megaphone: Megaphone,
  notebook: NotebookPen,
  gallery: GalleryHorizontalEnd,
  library: Library,
  clapperboard: Clapperboard,
  'play-square': SquarePlay,
  film: Film,
  heart: Heart,
  'heart-pulse': HeartPulse,
  trophy: Trophy,
  message: MessageCircle,
  messages: MessagesSquare,
  'message-more': MessageSquareMore,
  fish: Fish,
  'fish-symbol': FishSymbol,
  binoculars: Binoculars,
  shell: Shell,
  turtle: Turtle,
} as const;

const categories: (StampCategory | 'all')[] = ['all', 'diving', 'marineLife', 'resort', 'explore', 'depth', 'time', 'buddy', 'community'];

export default function StampsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
  const [category, setCategory] = useState<StampCategory | 'all'>('all');
  const [selectedStamp, setSelectedStamp] = useState<StampDefinition | null>(null);
  const { data: metrics = emptyMetrics, isLoading } = useQuery({
    queryKey: ['stamp-metrics', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getStampMetrics(String(user?.id || '')),
  });

  const rows = useMemo(
    () => stampCatalog.filter((stamp) => category === 'all' || stamp.category === category),
    [category]
  );
  const achievedCount = stampCatalog.filter((stamp) => stampProgress(stamp, metrics).achieved).length;
  const stampTitle = (stamp: StampDefinition) =>
    t('stampPage.catalogTitle', { metric: t(`stampPage.metrics.${stamp.metric}`), target: stamp.target });
  const stampDescription = (stamp: StampDefinition) =>
    t('stampPage.catalogDescription', { metric: t(`stampPage.metrics.${stamp.metric}`), target: stamp.target });
  const palette = isDark
    ? { page: '#07131F', card: '#0F2030', border: '#223A4D', title: '#F8FAFC', muted: '#91A8BC', chip: '#142A3D' }
    : { page: '#F1F8FD', card: '#FFFFFF', border: '#D9E8F4', title: '#0B1F33', muted: '#667F95', chip: '#E8F3FC' };

  return (
    <Screen style={{ backgroundColor: palette.page }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <TouchableOpacity accessibilityLabel={t('common.back')} onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ChevronLeft size={22} color={palette.title} />
          </TouchableOpacity>
          <View style={styles.titleCopy}>
            <Text style={[styles.eyebrow, { color: '#0D7CD6' }]}>DIVERGRAM COLLECTION</Text>
            <Text style={[styles.title, { color: palette.title }]}>{t('stampPage.title')}</Text>
            <Text style={[styles.subtitle, { color: palette.muted }]}>{t('stampPage.subtitle')}</Text>
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: isDark ? '#0B3856' : '#0D5FA8' }]}>
          <View style={styles.heroGlow} />
          <View>
            <Text style={styles.heroLabel}>COLLECTION PROGRESS</Text>
            <Text style={styles.heroCount}>{achievedCount}<Text style={styles.heroTotal}> / {stampCatalog.length}</Text></Text>
            <Text style={styles.heroHint}>{t('stampPage.achieved')}</Text>
          </View>
          <View style={styles.heroMedal}>
            <Medal size={42} color="#FFFFFF" />
          </View>
          <View style={styles.heroProgressTrack}>
            <View style={[styles.heroProgressFill, { width: `${(achievedCount / stampCatalog.length) * 100}%` }]} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {categories.map((item) => {
            const active = item === category;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setCategory(item)}
                style={[
                  styles.categoryChip,
                  { backgroundColor: active ? '#0D6FB8' : palette.card, borderColor: active ? '#0D6FB8' : palette.border },
                ]}
              >
                <Text style={[styles.categoryText, { color: active ? '#FFFFFF' : palette.muted }]}>{t(`stampPage.categories.${item}`)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <View style={styles.loading}><ActivityIndicator color="#0D7CD6" /></View>
        ) : (
          <View style={styles.grid}>
            {rows.map((stamp) => {
              const progress = stampProgress(stamp, metrics);
              const Icon = stampIcons[stamp.icon] || Award;
              const colors = colorsForStamp(stamp);
              return (
                <TouchableOpacity
                  key={stamp.id}
                  activeOpacity={0.84}
                  onPress={() => setSelectedStamp(stamp)}
                  style={[styles.stampCard, { backgroundColor: palette.card, borderColor: progress.achieved ? colors[0] : palette.border }]}
                >
                  <View style={[styles.stampSeal, { backgroundColor: progress.achieved ? colors[0] : colors[2] }]}>
                    <View style={[styles.stampSealInner, { borderColor: colors[1] }]}>
                      <Icon size={22} color={progress.achieved ? '#FFFFFF' : colors[0]} />
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: progress.achieved ? '#16A34A' : '#64748B' }]}>
                      {progress.achieved ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : <LockKeyhole size={11} color="#FFFFFF" />}
                    </View>
                  </View>
                  <Text style={[styles.stampTitle, { color: palette.title }]} numberOfLines={2}>{stampTitle(stamp)}</Text>
                  <Text style={[styles.stampProgress, { color: palette.muted }]}>
                    {Math.min(progress.current, stamp.target).toLocaleString()} / {stamp.target.toLocaleString()}
                  </Text>
                  <View style={[styles.track, { backgroundColor: palette.chip }]}>
                    <View style={[styles.fill, { width: `${progress.ratio * 100}%`, backgroundColor: colors[0] }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={Boolean(selectedStamp)} animationType="fade" onRequestClose={() => setSelectedStamp(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedStamp(null)}>
          {selectedStamp ? (
            <Pressable style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={(event) => event.stopPropagation()}>
              {(() => {
                const progress = stampProgress(selectedStamp, metrics);
                const Icon = stampIcons[selectedStamp.icon] || Award;
                const colors = colorsForStamp(selectedStamp);
                return (
                  <>
                    <View style={[styles.detailSeal, { backgroundColor: progress.achieved ? colors[0] : colors[2] }]}>
                      <Icon size={42} color={progress.achieved ? '#FFFFFF' : colors[0]} />
                    </View>
                    <Text style={[styles.modalTitle, { color: palette.title }]}>{stampTitle(selectedStamp)}</Text>
                    <Text style={[styles.modalDescription, { color: palette.muted }]}>{stampDescription(selectedStamp)}</Text>
                    <Text style={[styles.modalMetric, { color: colors[0] }]}>
                      {progress.current.toLocaleString()} / {selectedStamp.target.toLocaleString()}
                    </Text>
                    <View style={[styles.modalTrack, { backgroundColor: palette.chip }]}>
                      <View style={[styles.fill, { width: `${progress.ratio * 100}%`, backgroundColor: colors[0] }]} />
                    </View>
                    <View style={[styles.modalStatus, { backgroundColor: progress.achieved ? '#DCFCE7' : palette.chip }]}>
                      <Text style={{ color: progress.achieved ? '#15803D' : palette.muted, fontWeight: '800' }}>
                        {progress.achieved ? t('stampPage.completed') : t('stampPage.inProgress')}
                      </Text>
                    </View>
                  </>
                );
              })()}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  titleCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { marginTop: 4, fontSize: 31, lineHeight: 37, fontWeight: '900' },
  subtitle: { marginTop: 5, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  hero: { marginTop: 20, minHeight: 148, borderRadius: 28, padding: 22, overflow: 'hidden' },
  heroGlow: { position: 'absolute', right: -38, top: -68, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(70,211,255,0.22)' },
  heroLabel: { color: '#BAE6FD', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  heroCount: { marginTop: 7, color: '#FFFFFF', fontSize: 36, fontWeight: '900' },
  heroTotal: { color: '#BAE6FD', fontSize: 18, fontWeight: '700' },
  heroHint: { color: '#DDF5FF', fontSize: 12, fontWeight: '600' },
  heroMedal: { position: 'absolute', right: 24, top: 24, width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroProgressTrack: { position: 'absolute', left: 22, right: 22, bottom: 20, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 4, backgroundColor: '#67E8F9' },
  categoryRow: { paddingVertical: 18, gap: 8 },
  categoryChip: { height: 36, paddingHorizontal: 15, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  categoryText: { fontSize: 12, fontWeight: '800' },
  loading: { paddingVertical: 60 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stampCard: { width: '23.75%', minHeight: 138, borderRadius: 16, borderWidth: 1.2, paddingHorizontal: 5, paddingVertical: 11, alignItems: 'center' },
  stampSeal: { width: 51, height: 51, borderRadius: 25.5, alignItems: 'center', justifyContent: 'center' },
  stampSealInner: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { position: 'absolute', right: -3, bottom: -1, width: 19, height: 19, borderRadius: 9.5, alignItems: 'center', justifyContent: 'center', borderWidth: 1.6, borderColor: '#FFFFFF' },
  stampTitle: { marginTop: 9, minHeight: 29, textAlign: 'center', fontSize: 9.5, lineHeight: 13, fontWeight: '900' },
  stampProgress: { marginTop: 3, fontSize: 8.5, fontWeight: '800' },
  track: { marginTop: 6, width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2,8,18,0.64)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 380, borderRadius: 30, borderWidth: 1, padding: 26, alignItems: 'center' },
  detailSeal: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { marginTop: 18, fontSize: 23, fontWeight: '900', textAlign: 'center' },
  modalDescription: { marginTop: 8, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  modalMetric: { marginTop: 20, fontSize: 25, fontWeight: '900' },
  modalTrack: { marginTop: 10, width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
  modalStatus: { marginTop: 18, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 11 },
});
