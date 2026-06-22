import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';

type SwipeDirection = 'back' | 'forward';

type GlobalEdgeSwipeNavProps = {
  onSwipeProgress?: (translateX: number) => void;
  onSwipeCancel?: () => void;
  onSwipeCommit?: (direction: SwipeDirection, navigate: () => void) => void;
};

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

export function GlobalEdgeSwipeNav({ onSwipeProgress, onSwipeCancel, onSwipeCommit }: GlobalEdgeSwipeNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams();

  const routeKey = useMemo(
    () => buildRouteKey(pathname || '/', (globalParams || {}) as Record<string, unknown>),
    [pathname, globalParams]
  );

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
  const canNativeGoBack = typeof (router as any).canGoBack === 'function' ? (router as any).canGoBack() : false;

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

  const runSwipeCommit = useCallback(
    (direction: SwipeDirection, navigate: () => void) => {
      if (onSwipeCommit) {
        onSwipeCommit(direction, navigate);
        return;
      }
      navigate();
    },
    [onSwipeCommit]
  );

  const leftEdgePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          if (!(canGoBack || canNativeGoBack)) return false;
          const dx = gestureState.dx;
          const dy = gestureState.dy;
          return dx > 8 && Math.abs(dy) < 14;
        },
        onPanResponderMove: (_evt, gestureState) => {
          if (!onSwipeProgress) return;
          const dx = Math.max(0, gestureState.dx);
          onSwipeProgress(dx);
        },
        onPanResponderTerminate: () => {
          onSwipeCancel?.();
        },
        onPanResponderRelease: (_evt, gestureState) => {
          const horizontal = gestureState.dx > SWIPE_DISTANCE || gestureState.vx > MIN_HORIZONTAL_VELOCITY;
          const verticalSafe = Math.abs(gestureState.dy) <= MAX_VERTICAL_DRIFT;
          if (horizontal && verticalSafe) {
            if (canGoBack) {
              runSwipeCommit('back', () => navigateToHistory(historyState.index - 1));
            } else if (canNativeGoBack) {
              runSwipeCommit('back', () => router.back());
            }
            return;
          }
          onSwipeCancel?.();
        },
      }),
    [
      canGoBack,
      canNativeGoBack,
      historyState.index,
      navigateToHistory,
      onSwipeCancel,
      onSwipeProgress,
      router,
      runSwipeCommit,
    ]
  );

  const rightEdgePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          if (!canGoForward) return false;
          const dx = gestureState.dx;
          const dy = gestureState.dy;
          return dx < -8 && Math.abs(dy) < 14;
        },
        onPanResponderMove: (_evt, gestureState) => {
          if (!onSwipeProgress) return;
          const dx = Math.min(0, gestureState.dx);
          onSwipeProgress(dx);
        },
        onPanResponderTerminate: () => {
          onSwipeCancel?.();
        },
        onPanResponderRelease: (_evt, gestureState) => {
          const horizontal = gestureState.dx < -SWIPE_DISTANCE || gestureState.vx < -MIN_HORIZONTAL_VELOCITY;
          const verticalSafe = Math.abs(gestureState.dy) <= MAX_VERTICAL_DRIFT;
          if (horizontal && verticalSafe && canGoForward) {
            runSwipeCommit('forward', () => navigateToHistory(historyState.index + 1));
            return;
          }
          onSwipeCancel?.();
        },
      }),
    [canGoForward, historyState.index, navigateToHistory, onSwipeCancel, onSwipeProgress, runSwipeCommit]
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
