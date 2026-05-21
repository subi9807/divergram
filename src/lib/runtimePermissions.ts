import { PermissionsAndroid, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { BleManager } from 'react-native-ble-plx';

export type RuntimePermissionStatus = 'granted' | 'denied' | 'unavailable' | 'unknown';
export type RuntimePermissionResult = {
  status: RuntimePermissionStatus;
  granted: boolean;
};

function normalizeStatus(input: unknown): RuntimePermissionStatus {
  const value = String(input || '').toLowerCase();
  if (value.includes('grant')) return 'granted';
  if (value.includes('denied')) return 'denied';
  if (value.includes('block')) return 'denied';
  if (value.includes('allow')) return 'granted';
  if (value.includes('unavailable')) return 'unavailable';
  return 'unknown';
}

export async function checkLocationPermission(): Promise<RuntimePermissionResult> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    const normalized = normalizeStatus(status);
    return { status: normalized, granted: normalized === 'granted' };
  } catch {
    return { status: 'unknown', granted: false };
  }
}

export async function requestLocationPermission(): Promise<RuntimePermissionResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const normalized = normalizeStatus(status);
    return { status: normalized, granted: normalized === 'granted' };
  } catch {
    return { status: 'unknown', granted: false };
  }
}

export async function checkPushPermission(): Promise<RuntimePermissionResult> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    const normalized = normalizeStatus(status);
    return { status: normalized, granted: normalized === 'granted' };
  } catch {
    return { status: 'unknown', granted: false };
  }
}

export async function requestPushPermission(): Promise<RuntimePermissionResult> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    const normalized = normalizeStatus(status);
    return { status: normalized, granted: normalized === 'granted' };
  } catch {
    return { status: 'unknown', granted: false };
  }
}

async function requestAndroidBluetoothPermission(): Promise<RuntimePermissionResult> {
  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    const granted = Object.values(results).every((status) => status === 'granted');
    return { status: granted ? 'granted' : 'denied', granted };
  } catch {
    return { status: 'unknown', granted: false };
  }
}

async function checkIosBluetoothPermission(): Promise<RuntimePermissionResult> {
  const manager = new BleManager();
  try {
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const subscription = manager.onStateChange((state) => {
        try {
          manager.startDeviceScan(null, null, () => undefined);
          setTimeout(() => {
            manager.stopDeviceScan();
          }, 400);
        } catch {
          // ignore scan start errors while permission/state is unresolved
        }

        if (state === 'PoweredOn') {
          subscription.remove();
          finish();
          return;
        }
        if (state === 'PoweredOff' || state === 'Unauthorized' || state === 'Unsupported') {
          subscription.remove();
          finish();
        }
      }, true);

      setTimeout(() => {
        subscription.remove();
        finish();
      }, 1200);
    });

    const state = await manager.state();
    if (state === 'Unsupported') return { status: 'unavailable', granted: false };
    if (state === 'Unauthorized') return { status: 'denied', granted: false };
    if (state === 'PoweredOn' || state === 'PoweredOff' || state === 'Resetting') {
      return { status: 'granted', granted: true };
    }
    return { status: 'unknown', granted: false };
  } catch {
    return { status: 'unknown', granted: false };
  } finally {
    manager.destroy();
  }
}

export async function checkBluetoothPermission(): Promise<RuntimePermissionResult> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
    return { status: granted ? 'granted' : 'denied', granted };
  }
  if (Platform.OS === 'ios') {
    return checkIosBluetoothPermission();
  }
  return { status: 'unavailable', granted: false };
}

export async function requestBluetoothPermission(): Promise<RuntimePermissionResult> {
  if (Platform.OS === 'android') {
    return requestAndroidBluetoothPermission();
  }
  if (Platform.OS === 'ios') {
    return checkIosBluetoothPermission();
  }
  return { status: 'unavailable', granted: false };
}

export async function requestCoreRuntimePermissions() {
  const push = await requestPushPermission();
  const location = await requestLocationPermission();
  const bluetooth = await requestBluetoothPermission();
  return { push, location, bluetooth };
}
