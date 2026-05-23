import type { DiveDevice, DiveLog } from '../models';
import { mockDiveDevices, mockDiveLogs } from '../mock/divergramExpansionMock';
import { requestBluetoothFromService } from './bleService';
import { createDiveComputerAdapter, scanAllDiveComputerAdapters } from './diveComputerAdapter';

const adapterByDeviceId = new Map<string, ReturnType<typeof createDiveComputerAdapter>>();
let connectedDiveComputerId: string | null = null;

function nowIso() {
  return new Date().toISOString();
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
  for (const row of [...mockDiveDevices, ...rows]) {
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

export async function requestBluetoothPermission(): Promise<boolean> {
  const result = await requestBluetoothFromService();
  return Boolean(result?.ok);
}

export async function scanDiveComputers(): Promise<DiveDevice[]> {
  try {
    const scanned = await scanAllDiveComputerAdapters();
    return normalizeDeviceRows(scanned);
  } catch {
    return normalizeDeviceRows([]);
  }
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
  const devices = await scanDiveComputers();
  const device = devices.find((item) => item.id === deviceId);
  if (!device) throw new Error('bluetooth_device_not_found');
  if (device.isConnectable === false) throw new Error('bluetooth_device_not_connectable');

  const adapter = getAdapterForDevice(device);
  await adapter.connect(device.id);
  connectedDiveComputerId = device.id;
  const info = await adapter.getDeviceInfo();
  return { device, info };
}

export async function disconnectDiveComputer(deviceId?: string) {
  const targetId = deviceId || connectedDiveComputerId;
  if (!targetId) return;
  const adapter = adapterByDeviceId.get(targetId);
  if (!adapter) {
    if (connectedDiveComputerId === targetId) connectedDiveComputerId = null;
    return;
  }
  await adapter.disconnect();
  if (connectedDiveComputerId === targetId) connectedDiveComputerId = null;
}

export function getConnectedDiveComputerId() {
  return connectedDiveComputerId;
}

export async function syncDiveLogsByBluetooth(deviceId?: string): Promise<DiveLog[]> {
  const devices = await scanDiveComputers();
  const target =
    devices.find((item) => item.id === (deviceId || connectedDiveComputerId)) ||
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
    return mockDiveLogs
      .filter((item) => item.sourceType === 'bluetooth')
      .map((item, index) => ({
        ...item,
        deviceId: item.deviceId || target.id,
        deviceName: item.deviceName || target.name,
        externalLogId: item.externalLogId || `bt-mock-${target.id}-${index}`,
        syncStatus: 'done',
        updatedAt: nowIso(),
      }));
  }, 1);
}
