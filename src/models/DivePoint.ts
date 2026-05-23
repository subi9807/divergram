export interface DivePoint {
  id: string;
  name: string;
  country?: string;
  region?: string;
  lat: number;
  lng: number;
  address?: string;
  depthRange?: { min: number; max: number };
  visibilityAvg?: number;
  waterTempAvg?: number;
  diveTypes?: ('scuba' | 'freediving' | 'snorkeling')[];
  marineLifeTags?: string[];
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}
