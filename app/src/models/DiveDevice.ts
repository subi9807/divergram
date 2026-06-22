export interface DiveDevice {
  id: string;
  name: string;
  model?: string;
  brand?: 'garmin' | 'suunto' | 'shearwater' | 'other' | string;
  rssi?: number;
  isConnectable?: boolean;
  protocol?: 'ble' | 'cloud';
  lastSeenAt?: string;
  localName?: string;
  txPowerLevel?: number;
  mtu?: number;
  serviceUUIDs?: string[];
  overflowServiceUUIDs?: string[];
  solicitedServiceUUIDs?: string[];
  serviceDataKeys?: string[];
  manufacturerData?: string;
}
