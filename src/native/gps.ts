import { Geolocation } from '@capacitor/geolocation';
import { emitNativeState, emitRequestStart } from './bridge';
import type { NativeFeatureState } from './types';

export async function requestGpsNative(): Promise<NativeFeatureState> {
  const requestId = emitRequestStart('gps');

  try {
    const perms = await Geolocation.checkPermissions();
    let permission = perms.location || 'unknown';

    if (permission !== 'granted') {
      const req = await Geolocation.requestPermissions();
      permission = req.location || permission;
    }

    if (permission !== 'granted') {
      const denied: NativeFeatureState = {
        feature: 'gps',
        ok: false,
        available: true,
        permission,
        error: 'permission_denied',
        phase: 'response',
        requestId,
      };
      emitNativeState(denied);
      return denied;
    }

    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
    const result: NativeFeatureState = {
      feature: 'gps',
      ok: true,
      available: true,
      permission,
      payload: {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        },
        timestamp: position.timestamp,
      },
      phase: 'response',
      requestId,
    };

    emitNativeState(result);
    return result;
  } catch (error) {
    const failed: NativeFeatureState = {
      feature: 'gps',
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
