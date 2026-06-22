import type { DivePoint } from '../models';
import { apiClient } from '../lib/api';

export async function getDivePoints(userId?: string): Promise<DivePoint[]> {
  const rows = await apiClient.getDivePoints(userId);
  return rows.map((item: any) => ({
    id: String(item.id),
    name: String(item.name || 'Dive Point'),
    country: item.country || undefined,
    region: item.region || undefined,
    lat: Number(item.lat || 0),
    lng: Number(item.lng || 0),
    address: item.address || undefined,
    depthRange: item.depthRange || undefined,
    visibilityAvg: item.visibilityAvg || undefined,
    waterTempAvg: item.waterTempAvg || undefined,
    diveTypes: item.diveTypes || undefined,
    marineLifeTags: item.marineLifeTags || undefined,
    isFavorite: item.isFavorite || false,
    createdAt: String(item.createdAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || new Date().toISOString()),
  }));
}

export async function searchNearbyDivePoints(_lat: number, _lng: number): Promise<DivePoint[]> {
  return getDivePoints();
}

export async function searchNearbyDiveShops(_lat: number, _lng: number): Promise<{ id: string; name: string; lat: number; lng: number }[]> {
  const resorts = await apiClient.getResorts();
  return resorts
    .filter((item: any) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
    .slice(0, 20)
    .map((item: any, index: number) => ({
      id: String(item.id || `shop-${index}`),
      name: String(item.name || `Dive Shop ${index + 1}`),
      lat: Number(item.lat),
      lng: Number(item.lng),
    }));
}
