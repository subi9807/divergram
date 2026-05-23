import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Screen } from '../../src/components/Screen';
import { PermissionGate } from '../../src/components/PermissionGate';
import { apiClient } from '../../src/lib/api';
import { getGoogleMapsApiKey, isGoogleMapsApiConfigured } from '../../src/lib/googleMapSearch';
import { getDivePoints } from '../../src/services/googleMapService';

const FALLBACK_AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  jeju: { lat: 33.245, lng: 126.56 },
  bali: { lat: -8.34, lng: 115.66 },
  cebu: { lat: 10.3157, lng: 123.8854 },
  bohol: { lat: 9.6497, lng: 123.853 },
  okinawa: { lat: 26.2124, lng: 127.6809 },
  anilao: { lat: 13.765, lng: 120.914 },
  palau: { lat: 7.51498, lng: 134.58252 },
};

type MapMarkerItem = {
  id: string;
  type: 'point' | 'resort';
  name: string;
  description: string;
  lat: number;
  lng: number;
};

function findAreaCoord(areaRaw: unknown): { lat: number; lng: number } | null {
  const area = String(areaRaw || '').trim().toLowerCase();
  if (!area) return null;
  const keys = Object.keys(FALLBACK_AREA_COORDS);
  const key = keys.find((item) => area.includes(item));
  return key ? FALLBACK_AREA_COORDS[key] : null;
}

function toFinite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildMapHtml(apiKey: string, center: { lat: number; lng: number }, markers: MapMarkerItem[]) {
  const markerJson = JSON.stringify(markers).replace(/</g, '\\u003c');
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #08121d; }
      .gm-style .gm-style-iw-c { border-radius: 12px; padding: 10px !important; }
      .dg-info-title { font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #0f172a; }
      .dg-info-meta { font-size: 12px; color: #475569; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const center = ${JSON.stringify(center)};
      const markers = ${markerJson};

      function initMap() {
        const map = new google.maps.Map(document.getElementById('map'), {
          center,
          zoom: 8,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });

        const bounds = new google.maps.LatLngBounds();
        const infoWindow = new google.maps.InfoWindow();

        markers.forEach((item) => {
          const marker = new google.maps.Marker({
            position: { lat: item.lat, lng: item.lng },
            map,
            title: item.name,
            icon: item.type === 'point'
              ? {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 7,
                  fillColor: '#0D5FA8',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                }
              : {
                  path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                  scale: 6,
                  fillColor: '#F97316',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 1.5,
                },
          });

          marker.addListener('click', () => {
            infoWindow.setContent(
              '<div><div class="dg-info-title">' + item.name + '</div><div class="dg-info-meta">' + item.description + '</div></div>'
            );
            infoWindow.open({ anchor: marker, map });
          });

          bounds.extend(marker.getPosition());
        });

        if (markers.length > 1) {
          map.fitBounds(bounds, 48);
        }
      }
    </script>
    <script async defer src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=initMap"></script>
  </body>
</html>`;
}

export default function LocationScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ location?: string }>();
  const selectedLocation = String(params.location || '').trim();
  const normalizedSelected = selectedLocation.toLowerCase();

  const { data: divePoints = [] } = useQuery({ queryKey: ['dive-points'], queryFn: getDivePoints });
  const { data: resorts = [] } = useQuery({ queryKey: ['resorts'], queryFn: apiClient.getResorts });

  const markers = useMemo<MapMarkerItem[]>(() => {
    const pointMarkers: MapMarkerItem[] = divePoints
      .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
      .map((item) => ({
        id: `point-${item.id}`,
        type: 'point',
        name: item.name,
        description: `포인트 · ${item.region || item.country || item.address || '-'}`,
        lat: Number(item.lat),
        lng: Number(item.lng),
      }));

    const resortMarkers: MapMarkerItem[] = resorts
      .map((item: any, index: number) => {
        const directLat = toFinite(item?.lat ?? item?.latitude ?? item?.location_lat);
        const directLng = toFinite(item?.lng ?? item?.longitude ?? item?.location_lng);
        const areaFallback = findAreaCoord(item?.area || item?.region || item?.name || '');
        const baseFallback = divePoints[index % Math.max(1, divePoints.length)];
        const lat = directLat ?? areaFallback?.lat ?? (baseFallback ? Number(baseFallback.lat) + index * 0.002 : null);
        const lng = directLng ?? areaFallback?.lng ?? (baseFallback ? Number(baseFallback.lng) + index * 0.002 : null);
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
        return {
          id: `resort-${item.id || index}`,
          type: 'resort' as const,
          name: String(item.name || `Resort ${index + 1}`),
          description: `리조트 · ${String(item.area || item.region || '-')}`,
          lat: Number(lat),
          lng: Number(lng),
        };
      })
      .filter(Boolean) as MapMarkerItem[];

    return [...pointMarkers, ...resortMarkers];
  }, [divePoints, resorts]);

  const selectedFirst = useMemo(() => {
    if (!normalizedSelected) return null;
    return markers.find((item) => `${item.name} ${item.description}`.toLowerCase().includes(normalizedSelected)) || null;
  }, [markers, normalizedSelected]);

  const center = useMemo(() => {
    if (selectedFirst) return { lat: selectedFirst.lat, lng: selectedFirst.lng };
    if (markers.length > 0) return { lat: markers[0].lat, lng: markers[0].lng };
    return { lat: 33.2196, lng: 126.569 };
  }, [markers, selectedFirst]);

  const hasGoogleMap = isGoogleMapsApiConfigured();
  const googleKey = getGoogleMapsApiKey();
  const mapHtml = useMemo(() => (hasGoogleMap ? buildMapHtml(googleKey, center, markers) : ''), [center, googleKey, hasGoogleMap, markers]);

  return (
    <Screen>
      <PermissionGate
        permission="location"
        title={t('permissions.location.title')}
        description={t('permissions.location.description')}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          <View className="px-5 py-4 border-b border-gray-100">
            <Text className="text-2xl font-semibold text-gray-950">{t('tabs.location')}</Text>
            <Text className="mt-1 text-gray-500">{t('pages.location.subtitle')}</Text>
          </View>

          <View className="px-5 py-5">
            {selectedLocation ? (
              <View className="mb-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
                <Text className="text-xs font-semibold text-brand-700">
                  {t('pages.location.selectedRegion', { location: selectedLocation, defaultValue: `선택 지역: ${selectedLocation}` })}
                </Text>
              </View>
            ) : null}

            <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-3 overflow-hidden">
              <Text className="mb-2 text-sm font-semibold text-gray-700">{t('pages.location.mapTitle')}</Text>
              {hasGoogleMap ? (
                <View style={{ height: 260, borderRadius: 16, overflow: 'hidden' }}>
                  <WebView
                    source={{ html: mapHtml }}
                    originWhitelist={['*']}
                    javaScriptEnabled
                    domStorageEnabled
                    style={{ flex: 1, backgroundColor: '#08121d' }}
                  />
                </View>
              ) : (
                <View className="h-64 items-center justify-center rounded-2xl bg-gray-900 px-4">
                  <MapPin size={34} color="#fff" />
                  <Text className="mt-2 text-center text-xs text-gray-300">{t('pages.location.mapPlaceholder')}</Text>
                </View>
              )}
              <View className="mt-3 flex-row items-center">
                <View className="mr-3 flex-row items-center">
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0D5FA8', marginRight: 6 }} />
                  <Text className="text-xs text-gray-600">포인트 마커</Text>
                </View>
                <View className="flex-row items-center">
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#F97316', marginRight: 6 }} />
                  <Text className="text-xs text-gray-600">리조트 마커</Text>
                </View>
              </View>
            </View>

            <View className="rounded-3xl border border-gray-200 bg-white p-4">
              <Text className="mb-3 text-sm font-semibold text-gray-700">표시된 마커</Text>
              {markers.map((item) => (
                <View key={item.id} className="mb-2 flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: item.type === 'point' ? 999 : 1,
                      backgroundColor: item.type === 'point' ? '#0D5FA8' : '#F97316',
                      marginRight: 8,
                    }}
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900">{item.name}</Text>
                    <Text className="text-xs text-gray-500">{item.description}</Text>
                  </View>
                </View>
              ))}
              {!markers.length ? <Text className="text-sm text-gray-500">표시할 마커가 없습니다.</Text> : null}
            </View>
          </View>
        </ScrollView>
      </PermissionGate>
    </Screen>
  );
}
