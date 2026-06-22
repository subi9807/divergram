import type {
  DivergramNativeBridge,
  NativeCapabilities,
  NativeFeature,
  NativeFeatureState,
  NativeStateHandler,
} from './types';

export const NATIVE_STATE_EVENT = 'divergram:native-state';
const nativeStateHandlers = new Set<NativeStateHandler>();

declare global {
  interface Window {
    DivergramNative?: DivergramNativeBridge;
  }
}

function withTimestamp(state: NativeFeatureState): NativeFeatureState {
  if (state.at) return state;
  return { ...state, at: new Date().toISOString() };
}

export function emitNativeState(state: NativeFeatureState) {
  const nextState = withTimestamp(state);
  nativeStateHandlers.forEach((handler) => handler(nextState));

  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') {
    return;
  }
  window.dispatchEvent(new CustomEvent<NativeFeatureState>(NATIVE_STATE_EVENT, { detail: nextState }));
}

export function createRequestId(feature: NativeFeature) {
  return `${feature}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emitRequestStart(feature: NativeFeature) {
  const requestId = createRequestId(feature);
  emitNativeState({ feature, ok: true, available: true, phase: 'request', requestId });
  return requestId;
}

export function registerNativeBridge(bridge: DivergramNativeBridge) {
  if (typeof window === 'undefined') return;
  window.DivergramNative = bridge;
}

export function getNativeBridge() {
  if (typeof window === 'undefined') return undefined;
  return window.DivergramNative;
}

export async function getNativeCapabilities(): Promise<NativeCapabilities> {
  const bridge = getNativeBridge();
  if (!bridge) {
    return {
      native: false,
      platform: 'web',
      gps: false,
      bluetooth: false,
      push: false,
      error: 'bridge_missing',
    };
  }

  try {
    return await bridge.getCapabilities();
  } catch (error) {
    return {
      native: false,
      platform: 'unknown',
      gps: false,
      bluetooth: false,
      push: false,
      error: String(error),
    };
  }
}

export function onNativeState(handler: NativeStateHandler) {
  nativeStateHandlers.add(handler);
  return () => nativeStateHandlers.delete(handler);
}
