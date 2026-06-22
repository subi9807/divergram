import type { DiveDevice, DiveLog } from '../models';
import bluetoothScanFilters from '../config/bluetoothScanFilters.json';
import {
  checkBluetoothPermission as checkBluetoothRuntimePermission,
  requestBluetoothPermission as requestBluetoothRuntimePermission,
} from '../lib/runtimePermissions';
import { requestBluetoothFromService } from './bleService';
import { createDiveComputerAdapter } from './diveComputerAdapter';
import {
  connectNativeBleDiveDevice,
  disconnectNativeBleDiveDevice,
  getDiscoveredNativeBleDevices,
  getLastNativeBleScanError,
  getNativeBleScanDiagnostics,
  hasDiscoveredNativeBleDevice,
  scanNativeBleDiveDevices,
  stopNativeBleDiveScan,
} from './nativeBleDiveService';

const adapterByDeviceId = new Map<string, ReturnType<typeof createDiveComputerAdapter>>();
let connectedDiveComputerId: string | null = null;
let lastScanWatchdogError: string | null = null;

type BluetoothScanFilterConfig = {
  keywords?: unknown[];
};

function nowIso() {
  return new Date().toISOString();
}

function fallbackNameFromId(deviceId: string) {
  const shortId = String(deviceId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase();
  return shortId ? `BLE Device ${shortId}` : 'BLE Device';
}

function getAdapterForDevice(device: DiveDevice) {
  const cached = adapterByDeviceId.get(device.id);
  if (cached) return cached;
  const created = createDiveComputerAdapter(device);
  adapterByDeviceId.set(device.id, created);
  return created;
}

function normalizeDeviceRows(rows: DiveDevice[]): DiveDevice[] {
  const merged = new Map<string, DiveDevice>();
  for (const row of rows) {
    if (!row?.id) continue;
    merged.set(row.id, {
      ...row,
      protocol: row.protocol || 'ble',
      isConnectable: row.isConnectable !== false,
      lastSeenAt: row.lastSeenAt || nowIso(),
    });
  }
  return [...merged.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
}

function normalizeFilterKeyword(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function getBluetoothScanFilterKeywords() {
  const config = bluetoothScanFilters as BluetoothScanFilterConfig;
  const rawKeywords = Array.isArray(config.keywords) ? config.keywords : [];
  return [...new Set(rawKeywords.map(normalizeFilterKeyword).filter(Boolean))];
}

function buildDeviceSearchText(device: DiveDevice) {
  return [
    device.id,
    device.name,
    device.localName,
    device.model,
    device.brand,
    device.manufacturerData,
    ...(device.serviceUUIDs || []),
    ...(device.overflowServiceUUIDs || []),
    ...(device.solicitedServiceUUIDs || []),
    ...(device.serviceDataKeys || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function applyBluetoothScanFilters(rows: DiveDevice[]) {
  const normalizedRows = normalizeDeviceRows(rows);
  const keywords = getBluetoothScanFilterKeywords();
  if (!keywords.length) return normalizedRows;
  return normalizedRows.filter((device) => {
    const searchText = buildDeviceSearchText(device);
    return keywords.some((keyword) => searchText.includes(keyword));
  });
}

export async function requestBluetoothPermission(): Promise<boolean> {
  const runtime = await requestBluetoothRuntimePermission();
  if (runtime.granted) return true;

  const bridge = await requestBluetoothFromService();
  return Boolean(bridge?.ok);
}

export async function checkBluetoothPermission(): Promise<boolean> {
  const runtime = await checkBluetoothRuntimePermission();
  if (runtime.granted) return true;

  const bridge = await requestBluetoothFromService();
  return Boolean(bridge?.ok);
}

async function scanNativeWithWatchdog(timeoutMs: number): Promise<DiveDevice[]> {
  const watchdogMs = Math.max(6000, timeoutMs + 7000);
  lastScanWatchdogError = null;

  return new Promise<DiveDevice[]>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (rows: DiveDevice[], error?: string) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (error) lastScanWatchdogError = error;
      resolve(rows);
    };
    timer = setTimeout(() => {
      stopNativeBleDiveScan();
      finish(getDiscoveredNativeBleDevices(), `scan_watchdog_timeout:${watchdogMs}`);
    }, watchdogMs);

    scanNativeBleDiveDevices(timeoutMs)
      .then((rows) => finish(rows))
      .catch((error) => finish([], `scan_failed:${String(error?.message || error)}`));
  });
}

export async function scanDiveComputers(timeoutMs = 180000): Promise<DiveDevice[]> {
  const allowed = await checkBluetoothPermission();
  if (!allowed) return [];
  const nativeScanned = await scanNativeWithWatchdog(timeoutMs);
  if (nativeScanned.length > 0) return applyBluetoothScanFilters(nativeScanned);
  const cached = getDiscoveredNativeBleDevices();
  if (cached.length > 0) return applyBluetoothScanFilters(cached);
  return [];
}

export function stopDiveComputerScan() {
  stopNativeBleDiveScan();
}

export function getBluetoothScanDiagnostics() {
  const nativeDiagnostics = getNativeBleScanDiagnostics();
  return {
    lastNativeError: getLastNativeBleScanError(),
    lastNativeState: nativeDiagnostics.lastNativeScanState,
    lastNativeCallbackCount: nativeDiagnostics.lastNativeScanCallbackCount,
    lastScanWatchdogError,
    discoveredCount: getDiscoveredNativeBleDevices().length,
    activeFilterKeywords: getBluetoothScanFilterKeywords(),
  };
}

async function retry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === attempts) break;
    }
  }
  throw lastError;
}

export async function connectDiveComputer(deviceId: string) {
  const cachedDevices = normalizeDeviceRows(getDiscoveredNativeBleDevices());
  const scannedDevices = await scanDiveComputers(12000);
  const devices = normalizeDeviceRows([...cachedDevices, ...scannedDevices]);
  const scannedDevice = devices.find((item) => item.id === deviceId);
  const fallbackDiscoveredDevice: DiveDevice | null = hasDiscoveredNativeBleDevice(deviceId)
    ? {
        id: deviceId,
        name: fallbackNameFromId(deviceId),
        model: '',
        brand: 'other',
        protocol: 'ble',
        isConnectable: true,
        lastSeenAt: nowIso(),
      }
    : null;
  const device = scannedDevice || fallbackDiscoveredDevice;
  if (!device) throw new Error('bluetooth_device_not_found');
  if (device.isConnectable === false) throw new Error('bluetooth_device_not_connectable');

  let info;
  if (hasDiscoveredNativeBleDevice(device.id)) {
    info = await connectNativeBleDiveDevice(device.id);
  } else {
    const adapter = getAdapterForDevice(device);
    await adapter.connect(device.id);
    info = await adapter.getDeviceInfo();
  }
  connectedDiveComputerId = device.id;
  return { device, info };
}

export async function disconnectDiveComputer(deviceId?: string) {
  const targetId = deviceId || connectedDiveComputerId;
  if (!targetId) return;
  if (hasDiscoveredNativeBleDevice(targetId)) {
    await disconnectNativeBleDiveDevice(targetId);
  } else {
    const adapter = adapterByDeviceId.get(targetId);
    if (adapter) {
      await adapter.disconnect();
    }
  }
  if (connectedDiveComputerId === targetId) connectedDiveComputerId = null;
}

export function getConnectedDiveComputerId() {
  return connectedDiveComputerId;
}

export async function syncDiveLogsByBluetooth(deviceId?: string): Promise<DiveLog[]> {
  const devices = await scanDiveComputers(12000);
  const requestedId = deviceId || connectedDiveComputerId;
  const targetFromScan = requestedId ? devices.find((item) => item.id === requestedId) : null;
  const targetFromDiscovered =
    requestedId && hasDiscoveredNativeBleDevice(requestedId)
      ? {
          id: requestedId,
          name: fallbackNameFromId(requestedId),
          model: '',
          brand: 'other' as const,
          protocol: 'ble' as const,
          isConnectable: true,
          lastSeenAt: nowIso(),
        }
      : null;
  const target =
    targetFromScan ||
    targetFromDiscovered ||
    devices.find((item) => item.isConnectable !== false);
  if (!target) throw new Error('bluetooth_device_not_found');
  if (target.isConnectable === false) throw new Error('bluetooth_device_not_connectable');

  const adapter = getAdapterForDevice(target);
  return retry(async () => {
    await adapter.connect(target.id);
    connectedDiveComputerId = target.id;
    const logs = await adapter.syncLogs('me');
    await adapter.disconnect();
    if (logs.length) {
      return logs.map((item, index) => ({
        ...item,
        sourceType: 'bluetooth',
        deviceId: target.id,
        deviceName: target.name,
        externalLogId: item.externalLogId || `bt-${target.id}-${Date.now()}-${index}`,
        syncStatus: 'done',
        updatedAt: nowIso(),
      }));
    }
    return [];
  }, 1);
}
