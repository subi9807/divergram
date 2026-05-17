import { BluetoothLe } from '@capacitor-community/bluetooth-le';
import { emitNativeState, emitRequestStart } from './bridge';
import type { NativeFeatureState } from './types';

export async function requestBluetoothNative(): Promise<NativeFeatureState> {
  const requestId = emitRequestStart('bluetooth');

  try {
    await BluetoothLe.initialize();
    const enabled = await BluetoothLe.isEnabled();

    const result: NativeFeatureState = {
      feature: 'bluetooth',
      ok: true,
      available: true,
      payload: {
        enabled: !!enabled?.value,
      },
      phase: 'response',
      requestId,
    };

    emitNativeState(result);
    return result;
  } catch (error) {
    const failed: NativeFeatureState = {
      feature: 'bluetooth',
      ok: false,
      available: true,
      error: String(error),
      phase: 'response',
      requestId,
    };
    emitNativeState(failed);
    return failed;
  }
}
