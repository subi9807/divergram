import type { DivePoint } from '../models';
import { mockDivePoints } from '../mock/divergramExpansionMock';

export async function getDivePoints(): Promise<DivePoint[]> {
  return mockDivePoints;
}

export async function searchNearbyDivePoints(_lat: number, _lng: number): Promise<DivePoint[]> {
  // TODO: Google Maps Places API 연동
  return mockDivePoints;
}

export async function searchNearbyDiveShops(_lat: number, _lng: number): Promise<{ id: string; name: string; lat: number; lng: number }[]> {
  // TODO: Google Maps Places API (dive shop) 연동
  return [
    { id: 'shop-1', name: 'Jeju Dive Center', lat: 33.24, lng: 126.55 },
    { id: 'shop-2', name: 'Blue Reef Shop', lat: 33.21, lng: 126.57 },
  ];
}
