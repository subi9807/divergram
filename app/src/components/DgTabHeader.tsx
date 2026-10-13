import React, { useLayoutEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Award, Bell, BookOpenText, CalendarCheck, Compass, CreditCard, Crown, Film, Fish, GraduationCap, Info, MapPin, Menu, MessageCircle, Search, Settings, Shield, Store, UserRoundCog } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { useAuth } from '../hooks/useAuth';
import { appRouteMap, type AppRouteId } from '../config/sitemap';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { headerMenuDefault, useSettingsStore } from '../stores/settingsStore';
import { HEADER_BOTTOM_RADIUS } from '../utils/navigationChrome';

const menuRouteIdsBase = headerMenuDefault as AppRouteId[];
const ADMIN_EMAILS = new Set(
  String(process.env.EXPO_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
);

const iconMap: Partial<Record<AppRouteId, React.ComponentType<any>>> = {
  explore: Search,
  settings: Settings,
  messages: MessageCircle,
  activity: UserRoundCog,
  reels: Film,
  resorts: Store,
  booking_history: CalendarCheck,
  location: MapPin,
  notifications: Bell,
  admin: Shield,
  license_management: CreditCard,
  dive_education: GraduationCap,
  dive_guide: BookOpenText,
  dive_discovery: Fish,
  stamps: Award,
  app_info: Info,
  membership: Crown,
};

const MENU_COLUMNS = 3;
const MENU_GAP = 8;
const MENU_CARD_HEIGHT = 104;

interface SortableMenuCardProps {
  id: AppRouteId;
  index: number;
  itemWidth: number;
  title: string;
  accessibilityHint: string;
  unreadCount: number;
  colors: { background: string; border: string; iconBackground: string; title: string };
  dragState: { from: number; hover: number } | null;
  itemCount: number;
  onOpen: () => void;
  onDragStart: (from: number) => void;
  onDragHover: (from: number, hover: number) => void;
  onDrop: (from: number, to: number) => void;
  onDragCancel: () => void;
}

function gridOffset(from: number, to: number, itemWidth: number) {
  const fromColumn = from % MENU_COLUMNS;
  const fromRow = Math.floor(from / MENU_COLUMNS);
  const toColumn = to % MENU_COLUMNS;
  const toRow = Math.floor(to / MENU_COLUMNS);
  return {
    x: (toColumn - fromColumn) * (itemWidth + MENU_GAP),
    y: (toRow - fromRow) * (MENU_CARD_HEIGHT + MENU_GAP),
  };
}

function shiftedIndex(index: number, dragState: { from: number; hover: number } | null) {
  if (!dragState || index === dragState.from) return index;
  if (dragState.from < dragState.hover && index > dragState.from && index <= dragState.hover) return index - 1;
  if (dragState.from > dragState.hover && index >= dragState.hover && index < dragState.from) return index + 1;
  return index;
}

function SortableMenuCard({
  id, index, itemWidth, title, accessibilityHint, unreadCount, colors, dragState, itemCount,
  onOpen, onDragStart, onDragHover, onDrop, onDragCancel,
}: SortableMenuCardProps) {
  const Icon = iconMap[id] || Compass;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const shiftX = useSharedValue(0);
  const shiftY = useSharedValue(0);
  const active = useSharedValue(false);
  const hoverIndex = useSharedValue(index);

  useLayoutEffect(() => {
    if (!dragState) {
      shiftX.value = 0;
      shiftY.value = 0;
      return;
    }
    const targetIndex = shiftedIndex(index, dragState);
    const target = gridOffset(index, targetIndex, itemWidth);
    const springConfig = { damping: 22, stiffness: 260, mass: 0.75 };
    shiftX.value = withSpring(target.x, springConfig);
    shiftY.value = withSpring(target.y, springConfig);
  }, [dragState, index, itemWidth, shiftX, shiftY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: active.value ? translateX.value : shiftX.value },
      { translateY: active.value ? translateY.value : shiftY.value },
      { scale: withSpring(active.value ? 1.055 : 1, { damping: 18, stiffness: 260 }) },
    ],
    zIndex: active.value ? 30 : 1,
    opacity: withSpring(active.value ? 0.96 : 1),
  }));

  const longPressGesture = useMemo(() => Gesture.LongPress()
    .minDuration(320)
    .maxDistance(10_000)
    .onStart(() => {
      active.value = true;
      hoverIndex.value = index;
      runOnJS(onDragStart)(index);
    }), [active, hoverIndex, index, onDragStart]);

  const dragGesture = useMemo(() => Gesture.Pan()
    .minDistance(2)
    .onUpdate((event) => {
      if (!active.value) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      const columnDelta = Math.round(event.translationX / Math.max(1, itemWidth + MENU_GAP));
      const rowDelta = Math.round(event.translationY / (MENU_CARD_HEIGHT + MENU_GAP));
      const nextHover = Math.max(0, Math.min(itemCount - 1, index + columnDelta + rowDelta * MENU_COLUMNS));
      if (nextHover !== hoverIndex.value) {
        hoverIndex.value = nextHover;
        runOnJS(onDragHover)(index, nextHover);
      }
    })
    .onEnd(() => {
      if (active.value) runOnJS(onDrop)(index, hoverIndex.value);
    })
    .onFinalize((_event, success) => {
      if (!success && active.value) runOnJS(onDragCancel)();
      active.value = false;
      translateX.value = withSpring(0, { damping: 20, stiffness: 260 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 260 });
    }), [active, hoverIndex, index, itemCount, itemWidth, onDragCancel, onDragHover, onDrop, translateX, translateY]);

  const tapGesture = useMemo(
    () => Gesture.Tap().maxDistance(8).onEnd((_event, success) => {
      if (success) runOnJS(onOpen)();
    }),
    [onOpen]
  );

  const gesture = useMemo(
    () => Gesture.Exclusive(Gesture.Simultaneous(longPressGesture, dragGesture), tapGesture),
    [dragGesture, longPressGesture, tapGesture]
  );
  const keyboardProps = Platform.OS === 'web' ? {
    tabIndex: 0 as const,
    onKeyDown: (event: { key: string; preventDefault: () => void }) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onOpen();
      }
    },
  } : {};

  return (
    <GestureDetector gesture={gesture}>
      <Reanimated.View
        {...keyboardProps}
        accessible
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={accessibilityHint}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityTap={onOpen}
        onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'activate') onOpen(); }}
        style={[
          animatedStyle,
          styles.menuCardShell,
          { width: itemWidth },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
          styles.menuCard,
          {
            backgroundColor: colors.background,
            borderColor: dragState?.from === index ? '#0d5fa8' : colors.border,
          },
        ]}
      >
        <View style={[styles.menuIconWrap, { backgroundColor: colors.iconBackground }]}>
          <Icon size={20} color="#0d5fa8" />
        </View>
        <Text numberOfLines={2} style={[styles.menuTitle, { color: colors.title }]}>{title}</Text>
        {id === 'notifications' && unreadCount > 0 ? (
          <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>
        ) : null}
        </View>
      </Reanimated.View>
    </GestureDetector>
  );
}

interface DgTabHeaderProps {
  title?: string;
}

export function DgTabHeader({ title }: DgTabHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuGridWidth, setMenuGridWidth] = useState(0);
  const [menuDragState, setMenuDragState] = useState<{ from: number; hover: number } | null>(null);
  const savedMenuItems = useSettingsStore((state) => state.headerMenuItems);
  const updateHeaderMenuItems = useSettingsStore((state) => state.updateHeaderMenuItems);
  const { data: notificationRows = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getNotifications(String(user?.id || '')),
    refetchInterval: menuOpen ? 30_000 : false,
  });
  const unreadCount = notificationRows.filter((row) => row.unread).length;
  const isAdminUser =
    String(user?.email || '').toLowerCase().startsWith('admin@') ||
    ADMIN_EMAILS.has(String(user?.email || '').toLowerCase());

  const palette = isDark
    ? {
        safeBg: '#0b1520',
        safeBorder: '#1f2f41',
        title: '#e2e8f0',
        subtitle: '#94a3b8',
        iconBg: '#111f2f',
        iconBorder: '#2a3d54',
        iconColor: '#dbeafe',
        sheetBg: '#0c1723',
        sectionTitle: '#94a3b8',
        menuCardBg: '#111f2f',
        menuCardBorder: '#2a3d54',
        menuTitle: '#e2e8f0',
        menuSub: '#94a3b8',
        menuIconBg: '#1c3046',
      }
    : {
        safeBg: '#ffffff',
        safeBorder: '#e4ecf4',
        title: '#0f172a',
        subtitle: '#64748b',
        iconBg: '#f8fbff',
        iconBorder: '#dde8f3',
        iconColor: '#1e293b',
        sheetBg: '#f7fbff',
        sectionTitle: '#7d93a8',
        menuCardBg: '#ffffff',
        menuCardBorder: '#dee8f2',
        menuTitle: '#0f172a',
        menuSub: '#64748b',
        menuIconBg: '#ecf5ff',
      };

  const menuItems = useMemo(() => {
    const available = isAdminUser ? [...menuRouteIdsBase, 'admin' as AppRouteId] : menuRouteIdsBase;
    const allowed = new Set<AppRouteId>(available);
    const ordered = (savedMenuItems || []).filter((id): id is AppRouteId => allowed.has(id as AppRouteId));
    for (const id of available) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }, [isAdminUser, savedMenuItems]);
  const menuItemWidth = menuGridWidth > 0 ? (menuGridWidth - MENU_GAP * (MENU_COLUMNS - 1)) / MENU_COLUMNS : 100;

  const moveMenuItem = (from: number, requestedTo: number) => {
    const to = Math.max(0, Math.min(menuItems.length - 1, requestedTo));
    if (from === to) return;
    const next = [...menuItems];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateHeaderMenuItems(next);
  };

  const updateMenuDragTarget = (from: number, requestedHover: number) => {
    const hover = Math.max(0, Math.min(menuItems.length - 1, requestedHover));
    setMenuDragState((current) =>
      current?.from === from && current.hover === hover ? current : { from, hover }
    );
  };

  const finishMenuDrag = (from: number, requestedTo: number) => {
    const to = Math.max(0, Math.min(menuItems.length - 1, requestedTo));
    setMenuDragState(null);
    moveMenuItem(from, to);
  };

  const go = (routeId: AppRouteId) => {
    setMenuOpen(false);
    router.push(appRouteMap[routeId].path as never);
  };

  return (
    <>
      <View style={{ backgroundColor: isDark ? '#09131d' : '#f8fbfe', paddingBottom: 8 }}>
      <View style={[styles.headerShadow, { backgroundColor: palette.safeBg }]}>
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.headerSafe, { backgroundColor: palette.safeBg, borderBottomColor: palette.safeBorder }]}>
        <View style={[styles.header, { backgroundColor: palette.safeBg }]}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('tabs.home')} style={styles.brandWrap} activeOpacity={0.85} onPress={() => router.replace(appRouteMap.home.path as never)}>
            <View style={styles.logoBox}>
              <ExpoImage
                source={require('../../assets/images/divergram-logo-blue.png')}
                style={styles.logoImage}
                contentFit="contain"
                transition={120}
              />
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={[styles.brandTitle, { color: palette.title }]}>Divergram</Text>
              <View style={styles.subtitleRow}>
                <Text numberOfLines={1} style={[styles.brandSubtitle, { color: palette.subtitle }]}>{title || t('brand.tagline')}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.actionWrap}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.search')} style={[styles.iconBtn, { backgroundColor: palette.iconBg, borderColor: palette.iconBorder }]} activeOpacity={0.85} onPress={() => router.push(appRouteMap.search.path as never)}>
              <Search size={18} color={palette.iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: palette.iconBg, borderColor: palette.iconBorder }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('menu.open')}
              onPress={() => setMenuOpen(true)}
            >
              <Menu size={20} color={palette.iconColor} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      </View>
      </View>

      <Modal transparent visible={menuOpen} animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: palette.sheetBg, paddingBottom: Math.max(20, insets.bottom) }]}>
            <View style={styles.sheetHandle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.menuScrollContent}
            >
              <Text style={[styles.reorderHint, { color: palette.sectionTitle }]}>{t('menu.reorderHint')}</Text>
              <View style={styles.menuGrid} onLayout={(event) => setMenuGridWidth(event.nativeEvent.layout.width)}>
                {menuItems.map((id, index) => (
                  <SortableMenuCard
                    key={id}
                    id={id}
                    index={index}
                    itemWidth={menuItemWidth}
                    title={t(appRouteMap[id].titleKey)}
                    accessibilityHint={t('menu.reorderHint')}
                    unreadCount={unreadCount}
                    dragState={menuDragState}
                    itemCount={menuItems.length}
                    colors={{
                      background: palette.menuCardBg,
                      border: palette.menuCardBorder,
                      iconBackground: palette.menuIconBg,
                      title: palette.menuTitle,
                    }}
                    onOpen={() => go(id)}
                    onDragStart={(from) => setMenuDragState({ from, hover: from })}
                    onDragHover={updateMenuDragTarget}
                    onDrop={finishMenuDrag}
                    onDragCancel={() => setMenuDragState(null)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  unreadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  headerSafe: {
    borderBottomLeftRadius: HEADER_BOTTOM_RADIUS,
    borderBottomRightRadius: HEADER_BOTTOM_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e4ecf4',
    borderBottomWidth: 1,
  },
  headerShadow: {
    borderBottomLeftRadius: HEADER_BOTTOM_RADIUS,
    borderBottomRightRadius: HEADER_BOTTOM_RADIUS,
    shadowColor: '#0b3555',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#0d5fa8',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTextWrap: {
    marginLeft: 10,
    flex: 1,
    paddingRight: 8,
  },
  brandTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  brandSubtitle: {
    color: '#64748b',
    fontSize: 12,
  },
  subtitleRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginRight: 6,
  },
  actionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#dde8f3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d5fa8',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9,16,27,0.36)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#f7fbff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 18,
    maxHeight: '82%',
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d6e1ee',
    alignSelf: 'center',
    marginBottom: 12,
  },
  menuScrollContent: {
    paddingBottom: 6,
  },
  reorderHint: {
    color: '#7d93a8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
  },
  menuCardShell: {
    height: MENU_CARD_HEIGHT,
  },
  menuCard: {
    position: 'relative',
    height: MENU_CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dee8f2',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 12,
    shadowColor: '#0d5fa8',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#ecf5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
});
