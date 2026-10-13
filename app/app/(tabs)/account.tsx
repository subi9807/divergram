import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  Film,
  Fish,
  Grid3X3,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  UserPlus,
  Users,
  Waves,
  X,
} from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { appRouteMap } from '../../src/config/sitemap';
import { useAuth } from '../../src/hooks/useAuth';
import { buildShareUrl } from '../../src/lib/shareLinks';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { apiClient } from '../../src/lib/api';

type ProfileTab = 'posts' | 'reels' | 'dives' | 'marine';
type ProfileListType = 'dives' | 'posts' | 'reels' | 'following' | 'followers';

type ProfilePost = {
  id: string;
  imageUrl: string;
  isVideo: boolean;
  kind?: ProfileTab;
  title?: string;
  detail?: string;
  summary?: string;
  habitat?: string;
  notes?: string;
  identificationTips?: string[];
};

const GRID_GAP = 2;
function youtubeThumbnail(url: string) {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/))([a-zA-Z0-9_-]{6,})/,
  );
  return match?.[1]
    ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    : '';
}

function normalizeProfilePost(row: any): ProfilePost {
  const media = Array.isArray(row?.media) ? row.media : [];
  const firstImage = media.find(
    (item: any) => item?.type === 'image' && String(item?.url || '').trim(),
  );
  const firstMedia = media.find((item: any) => String(item?.url || '').trim());
  const isVideo =
    firstMedia?.type === 'video' ||
    row?.publishToReels === true ||
    /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(
      String(firstMedia?.url || row?.image || ''),
    );

  const sourceUrl = String(
    firstMedia?.url || row?.video_url || row?.video || row?.image || '',
  ).trim();
  const rowImage = String(row?.image_url || row?.image || '').trim();
  const safeRowImage = /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(rowImage)
    ? ''
    : rowImage;
  return {
    id: String(row?.id || '').trim(),
    imageUrl: String(
      firstImage?.url || safeRowImage || youtubeThumbnail(sourceUrl),
    ).trim(),
    isVideo,
  };
}

function readableLevel(value: unknown, t: (key: string) => string) {
  const key = String(value || '')
    .trim()
    .toLowerCase();
  const knownLevels = new Set([
    'none',
    'open_water',
    'advanced',
    'rescue',
    'master',
    'instructor',
    'trainer',
    'course_director',
    'level_1',
    'level_2',
    'level_3',
    'level_4',
  ]);
  return knownLevels.has(key)
    ? t(`publicProfile.levels.${key}`)
    : key.replaceAll('_', ' ').trim();
}

export default function AccountScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
  const params = useLocalSearchParams<{ userId?: string }>();
  const targetUserId = String(params.userId || '').trim();
  const isOwnProfile = Boolean(
    targetUserId && user?.id && targetUserId === String(user.id),
  );
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [moreOpen, setMoreOpen] = useState(false);
  const [listType, setListType] = useState<ProfileListType | null>(null);
  const [selectedContent, setSelectedContent] = useState<ProfilePost | null>(
    null,
  );

  useEffect(() => {
    if (isOwnProfile) router.replace(appRouteMap.profile.path as never);
  }, [isOwnProfile, router]);

  const profileQuery = useQuery({
    queryKey: ['account-profile-summary', targetUserId],
    queryFn: () => apiClient.getProfileSummary(targetUserId),
    enabled: Boolean(targetUserId && !isOwnProfile),
  });

  const contentQuery = useQuery({
    queryKey: ['account-profile-content', targetUserId],
    enabled: Boolean(targetUserId && !isOwnProfile),
    queryFn: () => apiClient.getProfileContent(targetUserId),
  });

  const followingQuery = useQuery({
    queryKey: ['account-following', user?.id, targetUserId],
    enabled: Boolean(user?.id && targetUserId && !isOwnProfile),
    queryFn: () =>
      apiClient.isFollowingUser(String(user?.id || ''), targetUserId),
  });
  const connectionsQuery = useQuery({
    queryKey: ['account-profile-connections', targetUserId, listType],
    enabled: Boolean(
      targetUserId && (listType === 'following' || listType === 'followers'),
    ),
    queryFn: () =>
      apiClient.getProfileConnections(
        targetUserId,
        listType === 'following' ? 'following' : 'followers',
      ),
  });

  const followMutation = useMutation({
    mutationFn: () =>
      apiClient.toggleFollowUser(String(user?.id || ''), targetUserId),
    onSuccess: (result) => {
      queryClient.setQueryData(
        ['account-following', user?.id, targetUserId],
        result.following,
      );
    },
  });

  const directRoomMutation = useMutation({
    mutationFn: () => apiClient.getOrCreateDirectRoom(targetUserId),
    onSuccess: (room) => {
      if (!room?.id) return;
      router.push(
        `${appRouteMap.messages.path}?roomId=${encodeURIComponent(String(room.id))}&userId=${encodeURIComponent(targetUserId)}` as never,
      );
    },
    onError: () =>
      Alert.alert(
        t('publicProfile.message'),
        t('publicProfile.messageOpenFailed'),
      ),
  });

  const posts = useMemo(() => {
    return (contentQuery.data?.posts || [])
      .map(normalizeProfilePost)
      .map((item) => ({ ...item, kind: 'posts' as const }))
      .filter((row) => row.id);
  }, [contentQuery.data?.posts]);

  const reels = useMemo(() => {
    const rows = contentQuery.data?.reels || [];
    const seen = new Set<string>();
    return rows
      .map(normalizeProfilePost)
      .map((item) => ({ ...item, kind: 'reels' as const }))
      .filter((row) => {
        if (!row.id || seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      });
  }, [contentQuery.data?.reels]);

  const dives = useMemo<ProfilePost[]>(
    () =>
      (contentQuery.data?.diveLogs || [])
        .map((row: any) => {
          const media = Array.isArray(row?.media) ? row.media : [];
          const imageUrl = String(
            media.find(
              (item: any) => item?.type !== 'video' && (item?.url || item?.uri),
            )?.url ||
              media.find((item: any) => item?.type !== 'video' && item?.uri)
                ?.uri ||
              '',
          ).trim();
          return {
            id: String(row?.id || ''),
            imageUrl,
            isVideo: false,
            kind: 'dives' as const,
            title: String(row?.divePointName || t('publicProfile.diveRecord')),
            detail: [
              row?.maxDepth != null
                ? t('publicProfile.maxDepth', { depth: row.maxDepth })
                : '',
              row?.totalDiveTime != null
                ? t('publicProfile.durationMinutes', {
                    minutes: row.totalDiveTime,
                  })
                : '',
              row?.diveDate
                ? new Date(row.diveDate).toLocaleDateString(i18n.language)
                : '',
            ]
              .filter(Boolean)
              .join(' · '),
          };
        })
        .filter((row: ProfilePost) => row.id),
    [contentQuery.data?.diveLogs, i18n.language, t],
  );

  const marineLife = useMemo<ProfilePost[]>(
    () =>
      (contentQuery.data?.marineLife || [])
        .map((row: any) => ({
          id: String(row?.id || ''),
          imageUrl: String(row?.imageUrl || ''),
          isVideo: false,
          kind: 'marine' as const,
          title: String(row?.speciesName || t('publicProfile.marineLife')),
          detail: String(row?.scientificName || row?.locationName || ''),
          summary: String(row?.summary || ''),
          habitat: String(row?.habitat || ''),
          notes: String(row?.notes || ''),
          identificationTips: Array.isArray(row?.identificationTips)
            ? row.identificationTips
                .map((item: unknown) => String(item || '').trim())
                .filter(Boolean)
            : [],
        }))
        .filter((row: ProfilePost) => row.id),
    [contentQuery.data?.marineLife, t],
  );

  const profile = profileQuery.data;
  const displayName = String(
    profile?.full_name || profile?.username || 'Diver',
  );
  const username = String(profile?.username || 'diver');
  const avatarUrl = String(profile?.avatar_url || '');
  const bio = String(profile?.bio || '').trim();
  const location = String(profile?.location || '').trim();
  const certificationRows = useMemo(() => {
    const rows = Array.isArray(profile?.certifications)
      ? profile.certifications
          .map((item: any) => ({
            agency: String(item?.agency || '').trim(),
            level: readableLevel(item?.level, t),
          }))
          .filter((item: any) => item.level)
      : [];
    const profileLevels = [
      {
        agency: t('publicProfile.scubaDiving'),
        level: readableLevel(profile?.scuba_level, t),
      },
      {
        agency: t('publicProfile.freediving'),
        level: readableLevel(profile?.freediving_level, t),
      },
      {
        agency: String(profile?.license_agency || t('publicProfile.diving')),
        level: readableLevel(profile?.license_type || profile?.diving_level, t),
      },
    ].filter(
      (item) => item.level && item.level !== t('publicProfile.levels.none'),
    );
    const combined = [...rows, ...profileLevels];
    return combined.filter(
      (item, index) =>
        combined.findIndex(
          (candidate) =>
            `${candidate.agency}:${candidate.level}` ===
            `${item.agency}:${item.level}`,
        ) === index,
    );
  }, [profile, t]);
  const totalDives = dives.length;
  const followingCount = Number(profile?.followingCount || 0);
  const followerCount = Number(profile?.followerCount || 0);
  const isFollowing = followingQuery.data === true;
  const activeItems =
    activeTab === 'posts'
      ? posts
      : activeTab === 'reels'
        ? reels
        : activeTab === 'dives'
          ? dives
          : marineLife;
  const listTitle =
    listType === 'dives'
      ? t('publicProfile.diving')
      : listType === 'posts'
        ? t('publicProfile.posts')
        : listType === 'reels'
          ? t('publicProfile.reels')
          : listType === 'following'
            ? t('publicProfile.following')
            : t('publicProfile.followers');
  const contentList =
    listType === 'reels'
      ? reels
      : listType === 'posts'
        ? posts
        : listType === 'dives'
          ? dives
          : [];
  const gridSize = (width - GRID_GAP * 2) / 3;
  const isLoading = profileQuery.isLoading || contentQuery.isLoading;

  const palette = isDark
    ? {
        page: '#08111D',
        surface: '#0F1B2A',
        text: '#F8FAFC',
        muted: '#91A4BA',
        border: '#243447',
        soft: '#172638',
      }
    : {
        page: '#FFFFFF',
        surface: '#FFFFFF',
        text: '#0F172A',
        muted: '#64748B',
        border: '#E2E8F0',
        soft: '#F1F5F9',
      };

  if (!targetUserId || isOwnProfile) {
    return (
      <Screen>
        <View />
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: palette.page }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.topBar,
            {
              borderBottomColor: palette.border,
              backgroundColor: palette.surface,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.78}
            style={styles.topBarButton}
          >
            <ChevronLeft size={27} color={palette.text} />
          </TouchableOpacity>
          <Text
            numberOfLines={1}
            style={[styles.topBarTitle, { color: palette.text }]}
          >
            @{username}
          </Text>
          <TouchableOpacity
            onPress={() => setMoreOpen(true)}
            activeOpacity={0.78}
            style={styles.topBarButton}
          >
            <MoreHorizontal size={25} color={palette.text} />
          </TouchableOpacity>
        </View>

        {profileQuery.isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0D7CD6" />
          </View>
        ) : (
          <>
            <View style={styles.profileHeader}>
              <View style={styles.summaryRow}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={[styles.avatar, { borderColor: palette.border }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: '#0D7CD6' },
                    ]}
                  >
                    <Text style={styles.avatarFallbackText}>
                      {displayName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={styles.statsRow}>
                  <View style={styles.statsLine}>
                    {[
                      {
                        type: 'dives' as const,
                        value: totalDives,
                        label: t('publicProfile.diving'),
                      },
                      {
                        type: 'posts' as const,
                        value: posts.length,
                        label: t('publicProfile.posts'),
                      },
                      {
                        type: 'reels' as const,
                        value: reels.length,
                        label: t('publicProfile.reels'),
                      },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.type}
                        activeOpacity={0.78}
                        onPress={() => setListType(item.type)}
                        style={styles.statItem}
                      >
                        <Text
                          style={[styles.statValue, { color: palette.text }]}
                        >
                          {item.value}
                        </Text>
                        <Text
                          style={[styles.statLabel, { color: palette.muted }]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.statsLine}>
                    {[
                      {
                        type: 'following' as const,
                        value: followingCount,
                        label: t('publicProfile.following'),
                      },
                      {
                        type: 'followers' as const,
                        value: followerCount,
                        label: t('publicProfile.followers'),
                      },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.type}
                        activeOpacity={0.78}
                        onPress={() => setListType(item.type)}
                        style={styles.statItem}
                      >
                        <Text
                          style={[styles.statValue, { color: palette.text }]}
                        >
                          {item.value}
                        </Text>
                        <Text
                          style={[styles.statLabel, { color: palette.muted }]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.aboutWrap}>
                <Text style={[styles.name, { color: palette.text }]}>
                  {displayName}
                </Text>
                <Text style={[styles.handle, { color: palette.muted }]}>
                  @{username}
                </Text>
                {location ? (
                  <View style={styles.locationRow}>
                    <MapPin size={13} color={palette.muted} />
                    <Text
                      style={[styles.locationText, { color: palette.muted }]}
                    >
                      {location}
                    </Text>
                  </View>
                ) : null}
                {bio ? (
                  <Text style={[styles.bio, { color: palette.text }]}>
                    {bio}
                  </Text>
                ) : null}
                <View style={styles.licenseWrap}>
                  <Text style={[styles.licenseTitle, { color: palette.muted }]}>
                    {t('publicProfile.licenses')}
                  </Text>
                  {certificationRows.length ? (
                    <View style={styles.licenseList}>
                      {certificationRows.map((item) => (
                        <View
                          key={`${item.agency}-${item.level}`}
                          style={[
                            styles.levelPill,
                            {
                              borderColor: palette.border,
                              backgroundColor: palette.soft,
                            },
                          ]}
                        >
                          <Text style={styles.levelPillText}>
                            {item.agency ? `${item.agency} · ` : ''}
                            {item.level}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text
                      style={[styles.noLicenseText, { color: palette.muted }]}
                    >
                      {t('publicProfile.noLicenses')}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  disabled={followMutation.isPending}
                  activeOpacity={0.84}
                  onPress={() => followMutation.mutate()}
                  style={[
                    styles.actionButton,
                    isFollowing
                      ? {
                          borderColor: palette.border,
                          backgroundColor: palette.soft,
                        }
                      : { borderColor: '#0D7CD6', backgroundColor: '#0D7CD6' },
                  ]}
                >
                  {followMutation.isPending ? (
                    <ActivityIndicator
                      size="small"
                      color={isFollowing ? palette.text : '#FFFFFF'}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: isFollowing ? palette.text : '#FFFFFF' },
                      ]}
                    >
                      {isFollowing
                        ? t('publicProfile.followingState')
                        : t('publicProfile.follow')}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={directRoomMutation.isPending}
                  activeOpacity={0.84}
                  onPress={() => directRoomMutation.mutate()}
                  style={[
                    styles.actionButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.soft,
                    },
                  ]}
                >
                  {directRoomMutation.isPending ? (
                    <ActivityIndicator size="small" color={palette.text} />
                  ) : (
                    <MessageCircle size={15} color={palette.text} />
                  )}
                  <Text
                    style={[styles.actionButtonText, { color: palette.text }]}
                  >
                    {t('publicProfile.message')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.tabBar,
                {
                  borderTopColor: palette.border,
                  borderBottomColor: palette.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setActiveTab('posts')}
                activeOpacity={0.8}
                style={[
                  styles.tabButton,
                  activeTab === 'posts'
                    ? { borderBottomColor: palette.text }
                    : null,
                ]}
              >
                <Grid3X3
                  size={22}
                  color={activeTab === 'posts' ? palette.text : palette.muted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('reels')}
                activeOpacity={0.8}
                style={[
                  styles.tabButton,
                  activeTab === 'reels'
                    ? { borderBottomColor: palette.text }
                    : null,
                ]}
              >
                <Film
                  size={23}
                  color={activeTab === 'reels' ? palette.text : palette.muted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('dives')}
                activeOpacity={0.8}
                style={[
                  styles.tabButton,
                  activeTab === 'dives'
                    ? { borderBottomColor: palette.text }
                    : null,
                ]}
              >
                <Waves
                  size={23}
                  color={activeTab === 'dives' ? palette.text : palette.muted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('marine')}
                activeOpacity={0.8}
                style={[
                  styles.tabButton,
                  activeTab === 'marine'
                    ? { borderBottomColor: palette.text }
                    : null,
                ]}
              >
                <Fish
                  size={23}
                  color={activeTab === 'marine' ? palette.text : palette.muted}
                />
              </TouchableOpacity>
            </View>

            {contentQuery.data?.restricted ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: palette.text }]}>
                  {t('publicProfile.contentRestricted')}
                </Text>
              </View>
            ) : isLoading ? (
              <View style={styles.gridLoadingWrap}>
                <ActivityIndicator color="#0D7CD6" />
              </View>
            ) : activeItems.length ? (
              <View style={styles.grid}>
                {activeItems.map((item) => (
                  <TouchableOpacity
                    key={`${activeTab}-${item.id}`}
                    activeOpacity={0.88}
                    onPress={() => {
                      if (item.kind === 'posts' || item.kind === 'reels')
                        router.push(
                          `${appRouteMap.post.path}?post=${encodeURIComponent(item.id)}` as never,
                        );
                      else setSelectedContent(item);
                    }}
                    style={[
                      styles.gridItem,
                      {
                        width: gridSize,
                        height: gridSize,
                        backgroundColor: palette.soft,
                      },
                    ]}
                  >
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        resizeMode="cover"
                        style={styles.gridImage}
                      />
                    ) : (
                      <View style={styles.videoPoster}>
                        <Film size={34} color="#FFFFFF" />
                        <Text style={styles.videoPosterText}>DIVERGRAM</Text>
                      </View>
                    )}
                    {item.isVideo ? (
                      <View style={styles.videoIcon}>
                        <Film size={18} color="#FFFFFF" />
                      </View>
                    ) : null}
                    {item.title ? (
                      <View style={styles.gridCaption}>
                        <Text numberOfLines={1} style={styles.gridCaptionText}>
                          {item.title}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                {activeTab === 'posts' ? (
                  <Grid3X3 size={36} color={palette.muted} />
                ) : activeTab === 'reels' ? (
                  <Film size={38} color={palette.muted} />
                ) : activeTab === 'dives' ? (
                  <Waves size={38} color={palette.muted} />
                ) : (
                  <Fish size={38} color={palette.muted} />
                )}
                <Text style={[styles.emptyTitle, { color: palette.text }]}>
                  {activeTab === 'posts'
                    ? t('publicProfile.noPosts')
                    : activeTab === 'reels'
                      ? t('publicProfile.noReels')
                      : activeTab === 'dives'
                        ? t('publicProfile.noPublicDives')
                        : t('publicProfile.noMarineLife')}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        transparent
        visible={Boolean(listType)}
        animationType="slide"
        onRequestClose={() => setListType(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setListType(null)}
        >
          <Pressable
            style={[styles.listSheet, { backgroundColor: palette.surface }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View
              style={[
                styles.listSheetHeader,
                { borderBottomColor: palette.border },
              ]}
            >
              <Text style={[styles.listSheetTitle, { color: palette.text }]}>
                {listTitle}
              </Text>
              <TouchableOpacity
                onPress={() => setListType(null)}
                style={styles.listCloseButton}
              >
                <X size={22} color={palette.text} />
              </TouchableOpacity>
            </View>

            {listType === 'following' || listType === 'followers' ? (
              connectionsQuery.isLoading ? (
                <View style={styles.listLoading}>
                  <ActivityIndicator color="#0D7CD6" />
                </View>
              ) : (
                <FlatList
                  data={connectionsQuery.data || []}
                  keyExtractor={(item: any) => String(item.id)}
                  contentContainerStyle={styles.peopleList}
                  ListEmptyComponent={
                    <View style={styles.listEmpty}>
                      {listType === 'following' ? (
                        <UserPlus size={36} color={palette.muted} />
                      ) : (
                        <Users size={36} color={palette.muted} />
                      )}
                      <Text
                        style={[styles.listEmptyText, { color: palette.muted }]}
                      >
                        {listType === 'following'
                          ? t('publicProfile.noFollowing')
                          : t('publicProfile.noFollowers')}
                      </Text>
                    </View>
                  }
                  renderItem={({ item }: { item: any }) => {
                    const connectionName = String(
                      item.full_name || item.username || 'Diver',
                    );
                    return (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          setListType(null);
                          router.replace(
                            `${appRouteMap.account.path}?userId=${encodeURIComponent(String(item.id))}` as never,
                          );
                        }}
                        style={[
                          styles.personRow,
                          { borderBottomColor: palette.border },
                        ]}
                      >
                        {item.avatar_url ? (
                          <Image
                            source={{ uri: String(item.avatar_url) }}
                            style={styles.personAvatar}
                          />
                        ) : (
                          <View style={styles.personAvatarFallback}>
                            <Text style={styles.personAvatarText}>
                              {connectionName.slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={styles.personBody}>
                          <Text
                            numberOfLines={1}
                            style={[styles.personName, { color: palette.text }]}
                          >
                            {connectionName}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.personHandle,
                              { color: palette.muted },
                            ]}
                          >
                            @{item.username || 'diver'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )
            ) : listType === 'dives' ? (
              <FlatList
                data={contentList}
                keyExtractor={(item: any) => String(item.id)}
                contentContainerStyle={styles.diveList}
                ListEmptyComponent={
                  <View style={styles.listEmpty}>
                    <Waves size={38} color={palette.muted} />
                    <Text
                      style={[styles.listEmptyText, { color: palette.muted }]}
                    >
                      {t('publicProfile.noPublicDives')}
                    </Text>
                  </View>
                }
                renderItem={({ item }: { item: any }) => (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => {
                      setListType(null);
                      setSelectedContent(item);
                    }}
                    style={[
                      styles.diveRow,
                      { borderBottomColor: palette.border },
                    ]}
                  >
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.diveImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.diveImageFallback,
                          { backgroundColor: palette.soft },
                        ]}
                      >
                        <Waves size={24} color="#0D7CD6" />
                      </View>
                    )}
                    <View style={styles.diveBody}>
                      <Text
                        numberOfLines={1}
                        style={[styles.diveTitle, { color: palette.text }]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.diveDetail, { color: palette.muted }]}
                      >
                        {item.detail || t('publicProfile.diveRecord')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <FlatList
                key={listType}
                data={contentList}
                numColumns={3}
                keyExtractor={(item: any) => String(item.id)}
                contentContainerStyle={styles.contentGridList}
                ListEmptyComponent={
                  <View style={styles.listEmpty}>
                    {listType === 'reels' ? (
                      <Film size={38} color={palette.muted} />
                    ) : (
                      <Grid3X3 size={36} color={palette.muted} />
                    )}
                    <Text
                      style={[styles.listEmptyText, { color: palette.muted }]}
                    >
                      {listType === 'reels'
                        ? t('publicProfile.noReels')
                        : t('publicProfile.noPosts')}
                    </Text>
                  </View>
                }
                renderItem={({ item }: { item: ProfilePost }) => (
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => {
                      setListType(null);
                      router.push(
                        `${appRouteMap.post.path}?post=${encodeURIComponent(item.id)}` as never,
                      );
                    }}
                    style={[
                      styles.listGridItem,
                      { backgroundColor: palette.soft },
                    ]}
                  >
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.listGridImage}
                      />
                    ) : (
                      <View style={styles.listGridFallback}>
                        {item.isVideo ? (
                          <Film size={26} color="#FFFFFF" />
                        ) : (
                          <Grid3X3 size={24} color="#FFFFFF" />
                        )}
                      </View>
                    )}
                    {item.isVideo ? (
                      <View style={styles.listVideoIcon}>
                        <Film size={14} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={Boolean(selectedContent)}
        animationType="slide"
        onRequestClose={() => setSelectedContent(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedContent(null)}
        >
          <Pressable
            style={[styles.detailSheet, { backgroundColor: palette.surface }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View
              style={[
                styles.listSheetHeader,
                { borderBottomColor: palette.border },
              ]}
            >
              <Text style={[styles.listSheetTitle, { color: palette.text }]}>
                {selectedContent?.kind === 'marine'
                  ? t('publicProfile.marineLifeDetail')
                  : t('publicProfile.diveDetail')}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedContent(null)}
                style={styles.listCloseButton}
              >
                <X size={22} color={palette.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.detailContent}>
              {selectedContent?.imageUrl ? (
                <Image
                  source={{ uri: selectedContent.imageUrl }}
                  style={styles.detailImage}
                />
              ) : (
                <View
                  style={[
                    styles.detailImageFallback,
                    { backgroundColor: palette.soft },
                  ]}
                >
                  {selectedContent?.kind === 'marine' ? (
                    <Fish size={48} color="#0D7CD6" />
                  ) : (
                    <Waves size={48} color="#0D7CD6" />
                  )}
                </View>
              )}
              <Text style={[styles.detailTitle, { color: palette.text }]}>
                {selectedContent?.title}
              </Text>
              {selectedContent?.detail ? (
                <Text style={[styles.detailMeta, { color: palette.muted }]}>
                  {selectedContent.detail}
                </Text>
              ) : null}
              {selectedContent?.summary ? (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: palette.text }]}>
                    {t('publicProfile.description')}
                  </Text>
                  <Text style={[styles.detailText, { color: palette.text }]}>
                    {selectedContent.summary}
                  </Text>
                </View>
              ) : null}
              {selectedContent?.habitat ? (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: palette.text }]}>
                    {t('publicProfile.habitat')}
                  </Text>
                  <Text style={[styles.detailText, { color: palette.text }]}>
                    {selectedContent.habitat}
                  </Text>
                </View>
              ) : null}
              {selectedContent?.identificationTips?.length ? (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: palette.text }]}>
                    {t('publicProfile.identificationTips')}
                  </Text>
                  <Text style={[styles.detailText, { color: palette.text }]}>
                    {selectedContent.identificationTips.join(' · ')}
                  </Text>
                </View>
              ) : null}
              {selectedContent?.notes ? (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: palette.text }]}>
                    {t('publicProfile.observationNotes')}
                  </Text>
                  <Text style={[styles.detailText, { color: palette.text }]}>
                    {selectedContent.notes}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={moreOpen}
        animationType="slide"
        onRequestClose={() => setMoreOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMoreOpen(false)}
        >
          <Pressable
            style={[styles.moreSheet, { backgroundColor: palette.surface }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: palette.border }]}
            />
            <Text style={[styles.sheetTitle, { color: palette.text }]}>
              @{username}
            </Text>
            <TouchableOpacity
              style={[
                styles.sheetAction,
                { borderBottomColor: palette.border },
              ]}
              onPress={async () => {
                setMoreOpen(false);
                await Share.share({
                  message: t('publicProfile.shareMessage', {
                    name: displayName,
                    url: buildShareUrl('profile', targetUserId),
                  }),
                });
              }}
            >
              <Text style={[styles.sheetActionText, { color: palette.text }]}>
                {t('publicProfile.share')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sheetAction,
                { borderBottomColor: palette.border },
              ]}
              onPress={() => {
                setMoreOpen(false);
                router.push(
                  `${appRouteMap.report.path}?targetType=user&reportedUserId=${encodeURIComponent(targetUserId)}` as never,
                );
              }}
            >
              <Text style={[styles.sheetActionText, { color: '#DC2626' }]}>
                {t('publicProfile.reportUser')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setMoreOpen(false)}
            >
              <Text style={[styles.sheetActionText, { color: palette.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 36,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
  },
  topBarButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
  },
  loadingWrap: {
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeader: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 1,
  },
  avatarFallback: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  statsRow: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
    gap: 11,
  },
  statsLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '600',
  },
  aboutWrap: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
  },
  handle: {
    marginTop: 2,
    fontSize: 13,
  },
  locationRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  bio: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  levelPill: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  licenseWrap: {
    marginTop: 12,
  },
  licenseTitle: {
    marginBottom: 7,
    fontSize: 12,
    fontWeight: '700',
  },
  licenseList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  noLicenseText: {
    fontSize: 12,
  },
  levelPillText: {
    color: '#0D7CD6',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  actionsRow: {
    marginTop: 17,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minHeight: 39,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 9,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  tabBar: {
    height: 51,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  gridLoadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    position: 'relative',
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  videoPoster: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B3A63',
  },
  videoPosterText: {
    marginTop: 7,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  videoIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.66)',
  },
  gridCaption: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: 'rgba(3, 20, 34, 0.7)',
  },
  gridCaptionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyWrap: {
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 13,
    fontSize: 16,
    fontWeight: '700',
  },
  listSheet: {
    minHeight: '67%',
    maxHeight: '90%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  detailSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  detailContent: {
    padding: 20,
    paddingBottom: 38,
  },
  detailImage: {
    width: '100%',
    aspectRatio: 1.35,
    borderRadius: 18,
  },
  detailImageFallback: {
    width: '100%',
    aspectRatio: 1.35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '900',
  },
  detailMeta: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
  },
  detailSection: {
    marginTop: 18,
  },
  detailLabel: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '900',
  },
  detailText: {
    fontSize: 14,
    lineHeight: 21,
  },
  listSheetHeader: {
    height: 62,
    paddingLeft: 21,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listSheetTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
  },
  listCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listLoading: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listEmpty: {
    minHeight: 310,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  listEmptyText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  peopleList: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  personRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  personAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
  },
  personAvatarText: {
    color: '#0D7CD6',
    fontSize: 17,
    fontWeight: '900',
  },
  personBody: {
    flex: 1,
    marginLeft: 12,
  },
  personName: {
    fontSize: 14,
    fontWeight: '800',
  },
  personHandle: {
    marginTop: 3,
    fontSize: 11,
  },
  diveList: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  diveRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  diveImage: {
    width: 62,
    height: 62,
    borderRadius: 10,
  },
  diveImageFallback: {
    width: 62,
    height: 62,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diveBody: {
    flex: 1,
    marginLeft: 12,
  },
  diveTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  diveDetail: {
    marginTop: 5,
    fontSize: 11,
  },
  contentGridList: {
    paddingBottom: 28,
  },
  listGridItem: {
    width: '33.333%',
    aspectRatio: 1,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  listGridImage: {
    width: '100%',
    height: '100%',
  },
  listGridFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B3A63',
  },
  listVideoIcon: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.66)',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 8, 23, 0.48)',
  },
  moreSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 17,
  },
  sheetTitle: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
  },
  sheetAction: {
    minHeight: 54,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetActionText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  sheetCancel: {
    minHeight: 50,
    justifyContent: 'center',
    marginTop: 8,
  },
});
