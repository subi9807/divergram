export type MediaType = 'image' | 'video';

export interface MediaFile {
  id: string;
  type: MediaType;
  localUri?: string;
  url?: string;
  thumbnailUrl?: string;
  sizeBytes?: number;
  durationSec?: number;
  width?: number;
  height?: number;
  uploadStatus?: 'idle' | 'uploading' | 'uploaded' | 'failed';
  createdAt: string;
  updatedAt: string;
}
