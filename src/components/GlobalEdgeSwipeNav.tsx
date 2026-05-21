import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';

type HistoryState = {
  items: string[];
  index: number;
};

const EDGE_WIDTH = 18;
const SWIPE_DISTANCE = 64;
const MAX_VERTICAL_DRIFT = 48;
const MIN_HORIZONTAL_VELOCITY = 0.18;

function normalizeParam(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  return [String(value)];
}

function buildRouteKey(pathname: string, params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  const keys = Object.keys(params || {}).sort((a, b) => a.localeCompare(b));

  for (const key of keys) {
    const values = normalizeParam((params as any)[key]).map((v) => v.trim()).filter(Boolean);
    if (!values.length) continue;
    for (const value of values) search.append(key, value);
  }

  const qs = search.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function GlobalEdgeSwipeNav() {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<Record<string, string | string[] | undefined>>();

  const routeKey = useMemo(() => buildRouteKey(pathname || '/', globalParams || {}), [pathname, globalParams]);

  const [historyState, setHistoryState] = useState<HistoryState>({ items: [], index: -1 });
  const pendingNavRef = useRef<string | null>(null);

  useEffect(() => {
    setHistoryState((prev) => {
      if (prev.items.length === 0) {
        return { items: [routeKey], index: 0 };
      }

      const current = prev.items[prev.index] || '';
      if (routeKey === current) return prev;

      if (pendingNavRef.current) {
        const nextIndex = prev.items.lastIndexOf(routeKey);
        pendingNavRef.current = null;
        if (nextIndex >= 0) {
          return { ...prev, index: nextIndex };
        }
      }

      const prevIndex = prev.index;
      if (prevIndex > 0 && prev.items[prevIndex - 1] === routeKey) {
        return { ...prev, index: prevIndex - 1 };
      }
      if (prevIndex < prev.items.length - 1 && prev.items[prevIndex + 1] === routeKey) {
        return { ...prev, index: prevIndex + 1 };
      }

      const nextItems = [...prev.items.slice(0, prevIndex + 1), routeKey];
      return { items: nextItems, index: nextItems.length - 1 };
    });
  }, [routeKey]);

  const canGoBack = historyState.index > 0;
  const canGoForward = historyState.index >= 0 && historyState.index < historyState.items.length - 1;

  const navigateToHistory = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= historyState.items.length) return;
      const target = historyState.items[targetIndex];
      if (!target || target === routeKey) return;
      pendingNavRef.current = target;
      router.replace(target as never);
    },
    [historyState.items, routeKey, router]
  );

  const leftEdgePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          const dx = gestureState.dx;
          const dy = gestureState.dy;
          return dx > 8 && Math.abs(dy) < 14;
        },
        onPanResponderRelease: (_evt, gestureState) => {
          if (!canGoBack) return;
          const horizontal = gestureState.dx > SWIPE_DISTANCE;
          const verticalSafe = Math.abs(gestureState.dy) <= MAX_VERTICAL_DRIFT;
          const velocitySafe = gestureState.vx > MIN_HORIZONTAL_VELOCITY;
          if (horizontal && verticalSafe && velocitySafe) {
            navigateToHistory(historyState.index - 1);
          }
        },
      }),
    [canGoBack, historyState.index, navigateToHistory]
  );

  const rightEdgePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          const dx = gestureState.dx;
          const dy = gestureState.dy;
          return dx < -8 && Math.abs(dy) < 14;
        },
        onPanResponderRelease: (_evt, gestureState) => {
          if (!canGoForward) return;
          const horizontal = gestureState.dx < -SWIPE_DISTANCE;
          const verticalSafe = Math.abs(gestureState.dy) <= MAX_VERTICAL_DRIFT;
          const velocitySafe = Math.abs(gestureState.vx) > MIN_HORIZONTAL_VELOCITY;
          if (horizontal && verticalSafe && velocitySafe) {
            navigateToHistory(historyState.index + 1);
          }
        },
      }),
    [canGoForward, historyState.index, navigateToHistory]
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="box-none" style={styles.row}>
        <View style={styles.leftEdge} {...leftEdgePanResponder.panHandlers} />
        <View style={styles.spacer} />
        <View style={styles.rightEdge} {...rightEdgePanResponder.panHandlers} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  leftEdge: {
    width: EDGE_WIDTH,
    height: '100%',
    backgroundColor: 'transparent',
  },
  rightEdge: {
    width: EDGE_WIDTH,
    height: '100%',
    backgroundColor: 'transparent',
  },
  spacer: {
    flex: 1,
  },
});
