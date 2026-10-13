import React, { useLayoutEffect, useMemo, useState } from 'react';
import { Activity, Award, Bell, BookOpen, Bookmark, CalendarDays, Crown, Fish, GraduationCap, GripVertical, HandCoins, House, Info, LockKeyhole, MapPin, MessageCircle, Minus, Play, Plus, Search, Settings, ShieldCheck, Store, User } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { bottomTabCandidates, type BottomTabRoute } from '../stores/settingsStore';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { TAB_BAR_RADIUS } from '../utils/navigationChrome';

const icons: Record<BottomTabRoute, typeof House> = {
  index: House, explore: Search, location: MapPin, logs: BookOpen, profile: User,
  messages: MessageCircle, notifications: Bell, resorts: Store, reels: Play,
  saved: Bookmark, stamps: Award, 'license-management': ShieldCheck, activity: Activity,
  settings: Settings, donate: HandCoins,
  'booking-history': CalendarDays,
  'dive-education': GraduationCap,
  'dive-guide': BookOpen,
  'dive-discovery': Fish,
  'app-info': Info,
  'membership': Crown,
};
type Props = {
  items: BottomTabRoute[];
  titleKeys: Record<BottomTabRoute, string>;
  onToggle: (route: BottomTabRoute) => void;
  onReorder: (from: number, to: number) => void;
  onDragActiveChange?: (active: boolean) => void;
  onReset: () => void;
  onSave: () => void;
};

const ROW_HEIGHT = 64;

function shiftedRowIndex(index: number, dragState: { from: number; hover: number } | null) {
  if (!dragState || index === dragState.from) return index;
  if (dragState.from < dragState.hover && index > dragState.from && index <= dragState.hover) return index - 1;
  if (dragState.from > dragState.hover && index >= dragState.hover && index < dragState.from) return index + 1;
  return index;
}

type SortableRowProps = {
  route: BottomTabRoute;
  index: number;
  itemCount: number;
  label: string;
  icon: typeof House;
  removable: boolean;
  ink: string;
  muted: string;
  accent: string;
  borderColor: string;
  dragState: { from: number; hover: number } | null;
  onDragState: (state: { from: number; hover: number } | null) => void;
  onDragActiveChange?: (active: boolean) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: () => void;
};

function SortableBottomMenuRow({
  route, index, itemCount, label, icon: Icon, removable, ink, muted, accent, borderColor,
  dragState, onDragState, onDragActiveChange, onReorder, onRemove,
}: SortableRowProps) {
  const { t } = useTranslation();
  const translateY = useSharedValue(0);
  const shiftY = useSharedValue(0);
  const active = useSharedValue(false);
  const hoverIndex = useSharedValue(index);

  useLayoutEffect(() => {
    const targetIndex = shiftedRowIndex(index, dragState);
    shiftY.value = withSpring((targetIndex - index) * ROW_HEIGHT, { damping: 22, stiffness: 260, mass: 0.75 });
  }, [dragState, index, shiftY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: active.value ? translateY.value : shiftY.value },
      { scale: withSpring(active.value ? 1.025 : 1, { damping: 18, stiffness: 260 }) },
    ],
    zIndex: active.value ? 20 : 1,
    opacity: withSpring(active.value ? 0.96 : 1),
  }));

  const dragGesture = useMemo(() => Gesture.Pan()
    .minDistance(2)
    .failOffsetX([-32, 32])
    .onStart(() => {
      active.value = true;
      hoverIndex.value = index;
      if (onDragActiveChange) runOnJS(onDragActiveChange)(true);
      runOnJS(onDragState)({ from: index, hover: index });
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
      const next = Math.max(0, Math.min(itemCount - 1, index + Math.round(event.translationY / ROW_HEIGHT)));
      if (next !== hoverIndex.value) {
        hoverIndex.value = next;
        runOnJS(onDragState)({ from: index, hover: next });
      }
    })
    .onEnd(() => {
      if (active.value) runOnJS(onReorder)(index, hoverIndex.value);
    })
    .onFinalize(() => {
      active.value = false;
      translateY.value = withSpring(0, { damping: 20, stiffness: 260 });
      if (onDragActiveChange) runOnJS(onDragActiveChange)(false);
      runOnJS(onDragState)(null);
    }), [active, hoverIndex, index, itemCount, onDragActiveChange, onDragState, onReorder, translateY]);
  const moveByAccessibility = (direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target >= 0 && target < itemCount) onReorder(index, target);
  };

  return (
    <GestureDetector gesture={dragGesture}>
      <Reanimated.View style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: borderColor }, dragState?.from === index && styles.draggingRow, animatedStyle]}>
        <Text style={[styles.order, { color: accent }]}>{index + 1}</Text>
        <Icon size={20} color={accent} />
        <View style={styles.labelBlock}>
          <Text style={[styles.label, { color: ink }]}>{label}</Text>
          {route === 'index' && <Text style={[styles.required, { color: muted }]}>{t('bottomMenuEditor.required')}</Text>}
        </View>
        <View accessible accessibilityRole="adjustable" accessibilityLabel={t('bottomMenuEditor.drag', { name: label })} accessibilityHint={t('bottomMenuEditor.dragHint')} accessibilityActions={[{ name: 'increment', label: t('bottomMenuEditor.down', { name: label }) }, { name: 'decrement', label: t('bottomMenuEditor.up', { name: label }) }]} onAccessibilityAction={(event) => moveByAccessibility(event.nativeEvent.actionName === 'decrement' ? 'up' : 'down')} style={styles.dragHandle}>
          <GripVertical size={22} color={muted} />
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('bottomMenuEditor.remove', { name: label })} accessibilityState={{ disabled: !removable }} disabled={!removable} onPress={onRemove} style={[styles.control, !removable && styles.disabled]}>
          {route === 'index' ? <LockKeyhole size={17} color={muted} /> : <Minus size={19} color={muted} />}
        </TouchableOpacity>
      </Reanimated.View>
    </GestureDetector>
  );
}

export function BottomMenuEditor({ items, titleKeys, onToggle, onReorder, onDragActiveChange, onReset, onSave }: Props) {
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const ink = isDark ? '#edf5ff' : '#142c40';
  const muted = isDark ? '#a4b7ca' : '#61758a';
  const accent = isDark ? '#7dd3fc' : '#0d5fa8';
  const surface = { backgroundColor: isDark ? '#0b1520' : '#fff', borderColor: isDark ? '#283d50' : '#d7e4f1' };
  const available = bottomTabCandidates.filter(route => !items.includes(route));
  const [dragState, setDragState] = useState<{ from: number; hover: number } | null>(null);
  return <View style={styles.root}>
    <View style={[styles.panel, surface]}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: ink }]}>{t('bottomMenuEditor.preview')}</Text>
        <Text style={[styles.count, { color: accent }]}>{items.length}/6</Text>
      </View>
      <Text style={[styles.hint, { color: muted }]}>{t('bottomMenuEditor.hint')}</Text>
      <View style={[styles.preview, surface]} accessibilityLabel={t('bottomMenuEditor.preview')}>
        {items.map((route, index) => {
          const Icon = icons[route];
          return <View key={route} style={styles.previewItem}>
            <View style={[styles.previewIcon, index === 0 && { backgroundColor: isDark ? '#1e3a57' : '#e8f4ff' }]}><Icon size={21} color={index === 0 ? accent : muted} /></View>
            <Text numberOfLines={2} style={[styles.previewLabel, { color: index === 0 ? accent : muted }]}>{t(titleKeys[route])}</Text>
          </View>;
        })}
      </View>
    </View>

    <Text style={[styles.heading, { color: ink }]}>{t('bottomMenuEditor.selected')}</Text>
    <View style={[styles.panel, surface]}>
      {items.map((route, index) => {
        const Icon = icons[route];
        const label = t(titleKeys[route]);
        const removable = route !== 'index' && items.length > 4;
        return <SortableBottomMenuRow key={route} route={route} index={index} itemCount={items.length} label={label} icon={Icon} removable={removable} ink={ink} muted={muted} accent={accent} borderColor={surface.borderColor} dragState={dragState} onDragState={setDragState} onDragActiveChange={onDragActiveChange} onReorder={onReorder} onRemove={() => onToggle(route)} />;
      })}
    </View>

    <Text style={[styles.heading, { color: ink }]}>{t('bottomMenuEditor.available')}</Text>
    <Text style={[styles.hint, { color: muted }]}>{t('settingsPage.app.bottomMenuGuide')}</Text>
    <View style={styles.grid}>
      {available.map(route => {
        const Icon = icons[route];
        const disabled = items.length >= 6;
        const label = t(titleKeys[route]);
        return <TouchableOpacity key={route} accessibilityRole="button" accessibilityLabel={t('bottomMenuEditor.add', { name: label })} accessibilityState={{ disabled }} disabled={disabled} onPress={() => onToggle(route)} style={[styles.option, surface, disabled && styles.disabled]}>
          <Plus size={13} color={muted} style={styles.plus} />
          <Icon size={22} color={accent} />
          <Text numberOfLines={2} style={[styles.optionLabel, { color: ink }]}>{label}</Text>
        </TouchableOpacity>;
      })}
    </View>
    <View style={styles.actions}>
      <TouchableOpacity accessibilityRole="button" onPress={onReset} style={[styles.reset, surface]}><Text style={[styles.label, { color: ink }]}>{t('common.reset')}</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={onSave} style={styles.save}><Text style={[styles.label, { color: '#fff' }]}>{t('pages.profileEdit.save')}</Text></TouchableOpacity>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  panel: { borderWidth: 1, borderRadius: 22, padding: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 15, fontWeight: '800' },
  count: { fontSize: 14, fontWeight: '800' },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  preview: { borderRadius: TAB_BAR_RADIUS, borderWidth: 1, flexDirection: 'row', paddingVertical: 10, marginTop: 14 },
  previewItem: { flex: 1, alignItems: 'center', minWidth: 0 },
  previewIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  previewLabel: { fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64 },
  draggingRow: { borderRadius: 16, borderWidth: 1, borderColor: '#0d5fa8', backgroundColor: 'rgba(13, 95, 168, 0.08)', paddingHorizontal: 4 },
  order: { width: 19, fontSize: 12, fontWeight: '800' },
  labelBlock: { flex: 1, paddingHorizontal: 8 },
  label: { fontSize: 13, fontWeight: '700' },
  required: { fontSize: 10, marginTop: 3 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dragHandle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { width: '31.5%', minHeight: 92, borderWidth: 1, borderRadius: 18, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  plus: { position: 'absolute', right: 8, top: 8 },
  optionLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  reset: { minHeight: 48, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center', justifyContent: 'center' },
  save: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: '#0d5fa8', padding: 14, alignItems: 'center', justifyContent: 'center' },
});
