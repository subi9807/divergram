import { Platform } from 'react-native';
import { getBlePlxModule } from '../lib/blePlx';
import { ScanCallbackType, ScanMode } from 'react-native-ble-plx';
import type { Device } from 'react-native-ble-plx';
import type { DeviceInfo, DiveDevice } from '../models';

let manager: any | null = null;
const discoveredDevices = new Map<string, Device>();
const connectedDevices = new Map<string, Device>();
let lastNativeScanError: string | null = null;
let lastNativeScanState: string | null = null;
let lastNativeScanCallbackCount = 0;
let activeScanStop: (() => void) | null = null;

const keywordByBrand: { brand: DiveDevice['brand']; keywords: string[] }[] = [
  { brand: 'shearwater', keywords: ['shearwater', 'teric', 'perdix', 'petrel', 'nerd'] },
  { brand: 'garmin', keywords: ['garmin', 'descent'] },
  { brand: 'suunto', keywords: ['suunto', 'd5', 'eon', 'zoop', 'viper'] },
];

function nowIso() {
  return new Date().toISOString();
}

function getBleManager() {
  if (manager) {
    return manager;
  }
  const BlePlx = getBlePlxModule();
  if (!BlePlx?.BleManager) {
    return null;
  }
  manager = new BlePlx.BleManager();
  return manager;
}

function recreateBleManagerForScan() {
  const currentManager = getBleManager();
  if (connectedDevices.size > 0 || !currentManager) return currentManager;
  try {
    manager?.stopDeviceScan();
  } catch {
    // no-op
  }
  try {
    manager?.destroy();
  } catch {
    // no-op
  }
  const BlePlx = getBlePlxModule();
  if (!BlePlx?.BleManager) {
    manager = null;
    return null;
  }
  manager = new BlePlx.BleManager();
  return manager;
}

function formatBleError(error: any) {
  if (!error) return 'unknown';
  const code = String(error?.errorCode || error?.code || 'scan_error');
  const message = String(error?.message || error?.reason || 'unknown');
  return `${code}:${message}`;
}

function normalizeName(device: Device) {
  return String(device.name || device.localName || '').trim();
}

function fallbackNameFromId(deviceId: string) {
  const shortId = String(deviceId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase();
  return shortId ? `BLE Device ${shortId}` : 'BLE Device';
}

function normalizeLabel(value: string, maxLen = 32) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\s+/g, ' ').slice(0, maxLen);
}

function createStableAnonymousId(device: Device) {
  const parts = [
    normalizeLabel(String((device as any).localName || device.name || ''), 64),
    normalizeLabel(String((device as any).manufacturerData || ''), 64),
    toStringList((device as any).serviceUUIDs).slice(0, 3).join('|'),
    toStringList((device as any).serviceData ? Object.keys((device as any).serviceData) : []).slice(0, 3).join('|'),
  ].filter(Boolean);
  const seed = parts.join('||') || `noid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `anon-${Math.abs(hash).toString(16)}`;
}

function guessBrandLabel(name: string): DiveDevice['brand'] {
  const lower = name.toLowerCase();
  for (const row of keywordByBrand) {
    if (row.keywords.some((keyword) => lower.includes(keyword))) return row.brand;
  }
  const token = normalizeLabel(name).split(' ')[0] || '';
  return token || 'other';
}

function toStringList(rows: unknown): string[] {
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const row of rows) {
    const value = normalizeLabel(String(row || ''), 80);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function resolveScanDeviceId(device: Device) {
  const raw = String((device as any)?.id || '').trim();
  if (raw) return raw;
  return createStableAnonymousId(device);
}

function toDiveDevice(device: Device, resolvedId?: string): DiveDevice {
  const id = resolvedId || resolveScanDeviceId(device);
  const name = normalizeName(device) || fallbackNameFromId(device.id);
  const serviceData =
    device && typeof (device as any).serviceData === 'object' && (device as any).serviceData
      ? (device as any).serviceData
      : null;
  const serviceDataKeys = serviceData ? Object.keys(serviceData).filter(Boolean) : [];
  const serviceUUIDs = toStringList((device as any).serviceUUIDs);
  const overflowServiceUUIDs = toStringList((device as any).overflowServiceUUIDs);
  const solicitedServiceUUIDs = toStringList((device as any).solicitedServiceUUIDs);
  const manufacturerData = typeof (device as any).manufacturerData === 'string' ? String((device as any).manufacturerData) : undefined;
  const txPowerRaw = Number((device as any).txPowerLevel);
  const mtuRaw = Number((device as any).mtu);

  return {
    id,
    name,
    model: normalizeName(device) || '',
    brand: guessBrandLabel(name),
    protocol: 'ble',
    isConnectable: device.isConnectable !== false,
    rssi: Number.isFinite(Number(device.rssi)) ? Number(device.rssi) : undefined,
    lastSeenAt: nowIso(),
    localName: normalizeLabel(String((device as any).localName || ''), 80) || undefined,
    txPowerLevel: Number.isFinite(txPowerRaw) ? txPowerRaw : undefined,
    mtu: Number.isFinite(mtuRaw) ? mtuRaw : undefined,
    serviceUUIDs: serviceUUIDs.length ? serviceUUIDs : undefined,
    overflowServiceUUIDs: overflowServiceUUIDs.length ? overflowServiceUUIDs : undefined,
    solicitedServiceUUIDs: solicitedServiceUUIDs.length ? solicitedServiceUUIDs : undefined,
    serviceDataKeys: serviceDataKeys.length ? serviceDataKeys : undefined,
    manufacturerData: manufacturerData || undefined,
  };
}

function collectDiscoveredRows(): DiveDevice[] {
  return [...discoveredDevices.values()].map((device) => toDiveDevice(device));
}

async function waitForBluetoothState(scanManager: any, timeoutMs = 8000): Promise<boolean> {
  if (!scanManager) return false;
  try {
    const state = await scanManager.state();
    lastNativeScanState = state;
    if (state === 'PoweredOn') return true;
    if (state === 'Unauthorized' || state === 'Unsupported') return false;
  } catch {
    // no-op
  }

  return new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (value: boolean) => {
      if (done) return;
      done = true;
      sub.remove();
      clearTimeout(timer);
      resolve(value);
    };
    const sub = scanManager.onStateChange((state: string) => {
      lastNativeScanState = state;
      if (state === 'PoweredOn') finish(true);
      if (state === 'Unauthorized' || state === 'Unsupported' || state === 'PoweredOff') finish(false);
    }, true);
    const timer = setTimeout(() => finish(false), timeoutMs);
  });
}

function getScanOptions() {
  if (Platform.OS === 'ios') {
    return {
      // iOS에서는 광고 패킷 수집량 확보를 위해 중복 허용 후 앱 단에서 dedupe 처리
      allowDuplicates: true,
    } as const;
  }
  return {
    allowDuplicates: true,
    scanMode: ScanMode.LowLatency,
    callbackType: ScanCallbackType.AllMatches,
    legacyScan: true,
  } as const;
}

async function runRecoveryScan(timeoutMs = 3200): Promise<DiveDevice[]> {
  const BlePlx = getBlePlxModule();
  if (!BlePlx?.BleManager) return [];
  const recoveryManager: any = new BlePlx.BleManager();
  const found = new Map<string, DiveDevice>();

  return new Promise<DiveDevice[]>((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (done) return;
      done = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      Promise.resolve(recoveryManager.stopDeviceScan()).catch(() => undefined);
      recoveryManager.destroy();
      resolve([...found.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)));
    };

    try {
      const maybeStart = recoveryManager.startDeviceScan(
        null,
        Platform.OS === 'ios' ? ({ allowDuplicates: true } as any) : (getScanOptions() as any),
        (error: unknown, device: Device | null) => {
          if (error) {
            lastNativeScanError = `recovery_${formatBleError(error)}`;
            return;
          }
          if (!device) return;
          const resolvedId = resolveScanDeviceId(device);
          found.set(resolvedId, toDiveDevice(device, resolvedId));
        }
      );
      Promise.resolve(maybeStart).catch((error) => {
        lastNativeScanError = `recovery_start_failed:${String(error?.message || error)}`;
        finish();
      });
    } catch (error: any) {
      lastNativeScanError = `recovery_start_failed:${String(error?.message || error)}`;
      finish();
      return;
    }

    timer = setTimeout(finish, timeoutMs);
  });
}

export async function scanNativeBleDiveDevices(timeoutMs = 12000): Promise<DiveDevice[]> {
  const scanManager = Platform.OS === 'ios' ? recreateBleManagerForScan() : getBleManager();
  if (!scanManager) {
    lastNativeScanError = 'ble_module_unavailable';
    return [];
  }
  lastNativeScanCallbackCount = 0;
  const poweredOn = await waitForBluetoothState(scanManager).catch(() => false);
  if (!poweredOn) {
    // iOS에서 권한 팝업 이전에는 state가 불안정할 수 있어, 조기 종료하지 않고 스캔을 시도한다.
    lastNativeScanError = 'bluetooth_state_not_powered_on_scan_attempted';
  }

  if (activeScanStop) {
    activeScanStop();
  }

  return new Promise<DiveDevice[]>((resolve) => {
    const found = new Map<string, DiveDevice>();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stop = async () => {
      if (stopped) return;
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      Promise.resolve(scanManager.stopDeviceScan()).catch(() => undefined);
      activeScanStop = null;
      let rows = (found.size > 0 ? [...found.values()] : collectDiscoveredRows()).sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
      if (!rows.length) {
        const recoveryRows = await runRecoveryScan(Math.max(2200, Math.min(4200, Math.floor(timeoutMs / 3))));
        if (recoveryRows.length > 0) {
          rows = recoveryRows;
        }
      }
      resolve(rows);
    };
    activeScanStop = () => {
      void stop();
    };

    try {
      Promise.resolve(scanManager.stopDeviceScan()).catch(() => undefined);
    } catch {
      // no-op
    }

    try {
      lastNativeScanError = null;
      const maybeStart = scanManager.startDeviceScan(null, getScanOptions() as any, (error: unknown, device: Device | null) => {
        if (error) {
          lastNativeScanError = formatBleError(error);
          // 에러가 발생해도 타임아웃까지 계속 수집 시도한다.
          return;
        }
        if (!device) return;
        lastNativeScanCallbackCount += 1;
        const resolvedId = resolveScanDeviceId(device);
        lastNativeScanError = null;
        discoveredDevices.set(resolvedId, device);
        found.set(resolvedId, toDiveDevice(device, resolvedId));
      });
      Promise.resolve(maybeStart).catch((error) => {
        lastNativeScanError = `scan_start_failed:${String(error?.message || error)}`;
      });
    } catch (error: any) {
      lastNativeScanError = `scan_start_failed:${String(error?.message || error)}`;
      void stop();
      return;
    }

    timer = setTimeout(() => {
      void stop();
    }, timeoutMs);
  });
}

export function hasDiscoveredNativeBleDevice(deviceId: string) {
  return discoveredDevices.has(deviceId);
}

export function getDiscoveredNativeBleDevices(): DiveDevice[] {
  return collectDiscoveredRows().sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
}

export function getLastNativeBleScanError(): string | null {
  return lastNativeScanError;
}

export function getNativeBleScanDiagnostics() {
  return {
    lastNativeScanError,
    lastNativeScanState,
    lastNativeScanCallbackCount,
    discoveredCount: getDiscoveredNativeBleDevices().length,
  };
}

export function stopNativeBleDiveScan() {
  if (activeScanStop) {
    activeScanStop();
    return;
  }
  try {
    const bleManager = getBleManager();
    if (!bleManager) return;
    Promise.resolve(bleManager.stopDeviceScan()).catch(() => undefined);
  } catch {
    // no-op
  }
}

function getKnownDevice(deviceId: string) {
  return connectedDevices.get(deviceId) || discoveredDevices.get(deviceId) || null;
}

export async function connectNativeBleDiveDevice(deviceId: string): Promise<DeviceInfo> {
  const known = getKnownDevice(deviceId);
  if (!known) throw new Error('native_ble_device_not_found');

  let connected = known;
  const alreadyConnected = await known.isConnected().catch(() => false);
  if (!alreadyConnected) {
    connected = await known.connect();
  }
  await connected.discoverAllServicesAndCharacteristics().catch(() => undefined);
  connectedDevices.set(deviceId, connected);

  return {
    id: connected.id,
    name: normalizeName(connected) || 'BLE Device',
    connectedAt: nowIso(),
  };
}

export async function disconnectNativeBleDiveDevice(deviceId: string): Promise<void> {
  const bleManager = getBleManager();
  if (!bleManager) return;
  await bleManager.cancelDeviceConnection(deviceId).catch(() => undefined);
  connectedDevices.delete(deviceId);
}
