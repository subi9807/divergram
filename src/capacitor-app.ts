import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Geolocation } from '@capacitor/geolocation';
import { BluetoothLe } from '@capacitor-community/bluetooth-le';
import { PushNotifications } from '@capacitor/push-notifications';

type NativeFeatureState = {
  feature: 'gps' | 'bluetooth' | 'push';
  ok: boolean;
  available: boolean;
  permission?: string;
  payload?: Record<string, unknown>;
  error?: string;
};

declare global {
  interface Window {
    DivergramNative?: {
      getCapabilities: () => Promise<Record<string, unknown>>;
      requestGps: () => Promise<NativeFeatureState>;
      requestBluetooth: () => Promise<NativeFeatureState>;
      requestPush: () => Promise<NativeFeatureState>;
    };
  }
}

function emitNativeState(state: NativeFeatureState) {
  window.dispatchEvent(new CustomEvent('divergram:native-state', { detail: state }));
}

async function requestGps(): Promise<NativeFeatureState> {
  try {
    const perms = await Geolocation.checkPermissions();
    let permission = perms.location || 'unknown';
    if (permission !== 'granted') {
      const req = await Geolocation.requestPermissions();
      permission = req.location || permission;
    }
    if (permission !== 'granted') {
      const denied = { feature: 'gps', ok: false, available: true, permission, error: 'permission_denied' } satisfies NativeFeatureState;
      emitNativeState(denied);
      return denied;
    }
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
    const result = {
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
    } satisfies NativeFeatureState;
    emitNativeState(result);
    return result;
  } catch (error) {
    const failed = { feature: 'gps', ok: false, available: true, error: String(error) } satisfies NativeFeatureState;
    emitNativeState(failed);
    return failed;
  }
}

async function requestBluetooth(): Promise<NativeFeatureState> {
  try {
    await BluetoothLe.initialize();
    const enabled = await BluetoothLe.isEnabled();
    const result = {
      feature: 'bluetooth',
      ok: true,
      available: true,
      payload: {
        enabled: !!enabled?.value,
      },
    } satisfies NativeFeatureState;
    emitNativeState(result);
    return result;
  } catch (error) {
    const failed = { feature: 'bluetooth', ok: false, available: true, error: String(error) } satisfies NativeFeatureState;
    emitNativeState(failed);
    return failed;
  }
}

async function requestPush(): Promise<NativeFeatureState> {
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive !== 'granted') {
      const denied = {
        feature: 'push',
        ok: false,
        available: true,
        permission: perm.receive,
        error: 'permission_denied',
      } satisfies NativeFeatureState;
      emitNativeState(denied);
      return denied;
    }

    const token = await new Promise<string>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('push_register_timeout')), 15000);

      PushNotifications.addListener('registration', (data) => {
        window.clearTimeout(timeout);
        resolve(data.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        window.clearTimeout(timeout);
        reject(error);
      });

      PushNotifications.register();
    });

    const result = {
      feature: 'push',
      ok: true,
      available: true,
      permission: perm.receive,
      payload: { token },
    } satisfies NativeFeatureState;
    emitNativeState(result);
    return result;
  } catch (error) {
    const failed = { feature: 'push', ok: false, available: true, error: String(error) } satisfies NativeFeatureState;
    emitNativeState(failed);
    return failed;
  }
}

export function setupCapacitorApp() {
  if (!Capacitor.isNativePlatform()) return;

  StatusBar.show().catch(() => undefined);
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);
  StatusBar.setStyle({ style: Style.Default }).catch(() => undefined);
  StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => undefined);
  Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => undefined);

  window.DivergramNative = {
    getCapabilities: async () => ({
      platform: Capacitor.getPlatform(),
      gps: true,
      bluetooth: true,
      push: true,
    }),
    requestGps,
    requestBluetooth,
    requestPush,
  };

  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    const activeModal = document.querySelector('[data-app-modal="true"]');
    if (activeModal) {
      window.dispatchEvent(new CustomEvent('divergram:close-top-modal'));
      return;
    }
    if (canGoBack) {
      window.history.back();
      return;
    }
    CapacitorApp.exitApp();
  }).catch(() => undefined);
}
