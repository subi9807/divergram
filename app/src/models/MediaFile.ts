import type { PhotoMetadata } from '../utils/photoGps';
import type { PhotoDiveMatch, PhotoDiveMatchStatus } from '../services/photoDiveMatcher';
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
  photoMetadata?: PhotoMetadata;
  diveMatch?: PhotoDiveMatch & { confirmed: boolean; reviewedAt?: string; rejected?: boolean; status: PhotoDiveMatchStatus };
  aiAnalysis?: {
    marineLifeCandidates: string[];
    environmentCandidates: string[];
    confidence: 'low' | 'medium' | 'high';
    notes: string;
    source: 'AI_SUGGESTION';
    confirmed: boolean;
    cached?: boolean;
  };
  uploadAttempts?: number;
  uploadStatus?: 'idle' | 'uploading' | 'uploaded' | 'failed';
  createdAt: string;
  updatedAt: string;
}
