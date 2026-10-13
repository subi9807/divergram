import type { DiveComputerCapability } from './types';
const capabilities: DiveComputerCapability[] = [
  { provider: 'garmin', transport: 'official_api', discovery: 'unsupported', logSync: 'requires_vendor_approval', reason: 'Official API credentials and approval required' },
  { provider: 'suunto', transport: 'official_api', discovery: 'unsupported', logSync: 'requires_vendor_approval', reason: 'Official API credentials and approval required' },
  { provider: 'shearwater', transport: 'file_import', discovery: 'unsupported', logSync: 'unsupported', reason: 'No verified parser is configured' },
  { provider: 'generic', transport: 'bluetooth', discovery: 'supported', logSync: 'unsupported', reason: 'BLE discovery does not imply a verified dive-log protocol' },
];
export function listDiveComputerCapabilities() { return capabilities.map(item => ({ ...item })); }
export function getDiveComputerCapability(provider: DiveComputerCapability['provider'], transport: DiveComputerCapability['transport']) { return listDiveComputerCapabilities().find(item => item.provider === provider && item.transport === transport); }
