import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { storage } from './storage';
import { getBlePlxModule } from './blePlx';

export type RuntimePermissionStatus = 'granted' | 'denied' | 'unavailable' | 'unknown';
export type RuntimePermissionResult = {
  status: RuntimePermissionStatus;
  granted: boolean;
};

const CORE_RUNTIME_PERMISSION_REQUESTED_KEY = 'divergram_core_runtime_permission_requested_v1';

function getAndroidSdkVersion() {
  if (Platform.OS !== 'android') return 0;
  if (typeof Platform.Version === 'number') return Platform.Version;
  const parsed = Number.parseInt(String(Platform.Version), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
    if (Platform.OS === 'ios' && !Device.isDevice) {
      return { status: 'unavailable', granted: false };
    }
    const { status } = await Notifications.requestPermissionsAsync();
    const normalized = normalizeStatus(status);
    return { status: normalized, granted: normalized === 'granted' };
  } catch {
    return { status: 'unknown', granted: false };
  }
}

async function requestAndroidBluetoothPermission(): Promise<RuntimePermissionResult> {
  try {
    const sdk = getAndroidSdkVersion();
    if (sdk >= 31) {
      const corePermissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];
      const coreResults = await PermissionsAndroid.requestMultiple(corePermissions);
      const coreGranted = corePermissions.every((permission) => coreResults[permission] === 'granted');
      if (!coreGranted) return { status: 'denied', granted: false };

      // 제조사 편차 대응을 위해 위치 권한은 요청하되, 미허용이어도 BLE 권한 자체는 허용으로 본다.
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).catch(() => undefined);

      return { status: 'granted', granted: true };
    }

    const locationGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    const locationServiceEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
    const granted = locationGranted === 'granted' && locationServiceEnabled;
    return { status: granted ? 'granted' : 'denied', granted };
  } catch {
    return { status: 'unknown', granted: false };
  }
}

function mapIosBluetoothStateToResult(state: string): RuntimePermissionResult | null {
  if (state === 'Unsupported') return { status: 'unavailable', granted: false };
  if (state === 'Unauthorized') return { status: 'denied', granted: false };
  if (state === 'PoweredOn' || state === 'PoweredOff' || state === 'Resetting') return { status: 'granted', granted: true };
  return null;
}

async function checkIosBluetoothPermission(): Promise<RuntimePermissionResult> {
  const BlePlx = getBlePlxModule();
  if (!BlePlx?.BleManager) {
    return { status: 'unavailable', granted: false };
  }

  const manager = new BlePlx.BleManager();
  try {
    const initialState = await manager.state().catch(() => 'Unknown');
    const initialMapped = mapIosBluetoothStateToResult(initialState);
    if (initialMapped) return initialMapped;

    const resolvedState = await new Promise<string>((resolve) => {
      let settled = false;
      const finish = (state: string) => {
        if (settled) return;
        settled = true;
        resolve(state);
      };

      const subscription = manager.onStateChange((state) => {
        const mapped = mapIosBluetoothStateToResult(state);
        if (mapped) {
          subscription.remove();
          finish(state);
        }
      }, true);

      setTimeout(() => {
        subscription.remove();
        finish('Unknown');
      }, 2200);
    });

    const mapped = mapIosBluetoothStateToResult(resolvedState);
    if (mapped) return mapped;
    return { status: 'unknown', granted: false };
  } catch {
    return { status: 'unknown', granted: false };
  } finally {
    try {
      manager.destroy();
    } catch {
      // ignore destroy failures
    }
  }
}

export async function checkBluetoothPermission(): Promise<RuntimePermissionResult> {
  if (Platform.OS === 'android') {
    const sdk = getAndroidSdkVersion();
    if (sdk >= 31) {
      const checks = await Promise.all([
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN),
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT),
      ]);
      const granted = checks.every(Boolean);
      return { status: granted ? 'granted' : 'denied', granted };
    }
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
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
  const push = Platform.OS === 'ios' && !Device.isDevice
    ? { status: 'unavailable' as const, granted: false }
    : await requestPushPermission();
  const location = await requestLocationPermission();
  const bluetooth = await requestBluetoothPermission();
  return { push, location, bluetooth };
}

export function hasRequestedCoreRuntimePermissionsOnce() {
  return storage.getString(CORE_RUNTIME_PERMISSION_REQUESTED_KEY) === '1';
}

export async function hydrateCoreRuntimePermissionsRequestedOnce() {
  if (hasRequestedCoreRuntimePermissionsOnce()) return true;

  try {
    const persisted = await AsyncStorage.getItem(CORE_RUNTIME_PERMISSION_REQUESTED_KEY);
    if (persisted === '1') {
      storage.set(CORE_RUNTIME_PERMISSION_REQUESTED_KEY, '1');
      return true;
    }
  } catch {
    // ignore fallback lookup failures
  }

  return false;
}

export async function requestCoreRuntimePermissionsOnce(options?: { force?: boolean }) {
  const force = Boolean(options?.force);
  if (!force && hasRequestedCoreRuntimePermissionsOnce()) {
    return null;
  }
  const result = await requestCoreRuntimePermissions();
  storage.set(CORE_RUNTIME_PERMISSION_REQUESTED_KEY, '1');
  try {
    await AsyncStorage.setItem(CORE_RUNTIME_PERMISSION_REQUESTED_KEY, '1');
  } catch {
    // ignore backup write failures
  }
  return result;
}
