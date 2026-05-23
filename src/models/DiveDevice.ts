export interface DiveDevice {
  id: string;
  name: string;
  model?: string;
  brand?: 'garmin' | 'suunto' | 'shearwater' | 'other';
  rssi?: number;
  isConnectable?: boolean;
  protocol?: 'ble' | 'cloud';
  lastSeenAt?: string;
}
