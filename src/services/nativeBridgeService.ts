import { emitNativeState, getNativeBridge, getNativeCapabilities, onNativeState } from '../native/bridge';
import type { NativeCapabilities, NativeFeature, NativeFeatureState, NativeStateHandler } from '../native/types';

function buildBridgeMissingState(feature: NativeFeature): NativeFeatureState {
  return {
    feature,
    ok: false,
    available: false,
    error: 'DivergramNative bridge missing',
    phase: 'response',
  };
}

export async function requestNativeFeature(feature: NativeFeature): Promise<NativeFeatureState> {
  const bridge = getNativeBridge();

  if (!bridge) {
    const failed = buildBridgeMissingState(feature);
    emitNativeState(failed);
    return failed;
  }

  try {
    if (feature === 'gps') return await bridge.requestGps();
    if (feature === 'bluetooth') return await bridge.requestBluetooth();
    return await bridge.requestPush();
  } catch (error) {
    const failed: NativeFeatureState = {
      feature,
      ok: false,
      available: true,
      error: String(error),
      phase: 'response',
    };
    emitNativeState(failed);
    return failed;
  }
}

export async function loadNativeCapabilities(): Promise<NativeCapabilities> {
  return getNativeCapabilities();
}

export function subscribeNativeState(handler: NativeStateHandler) {
  return onNativeState(handler);
}
