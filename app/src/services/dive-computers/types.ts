import type { ExternalDiveLog } from '../../models';
export type DiveComputerTransport = 'official_api' | 'file_import' | 'bluetooth';
export interface DiveComputerCapability { provider: 'garmin' | 'suunto' | 'shearwater' | 'generic'; transport: DiveComputerTransport; discovery: 'supported' | 'unsupported'; logSync: 'supported' | 'unsupported' | 'requires_vendor_approval'; reason?: string; }
export interface DiveComputerProvider { capability: DiveComputerCapability; fetchLogs(): Promise<ExternalDiveLog[]>; }
