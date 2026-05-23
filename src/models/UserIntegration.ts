export type IntegrationType =
  | 'google_maps'
  | 'stormglass'
  | 'garmin'
  | 'suunto'
  | 'shearwater'
  | 'bluetooth'
  | 'instagram_share'
  | 'cloudinary'
  | 'openai'
  | 'fcm';

export interface UserIntegration {
  id: string;
  userId: string;
  type: IntegrationType;
  connected: boolean;
  accountLabel?: string;
  lastSyncAt?: string;
  statusMessage?: string;
  createdAt: string;
  updatedAt: string;
}
