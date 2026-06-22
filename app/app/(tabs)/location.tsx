import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { PermissionGate } from '../../src/components/PermissionGate';
import { useAuth } from '../../src/hooks/useAuth';
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
  visitCount?: number;
  lastVisitedAt?: string;
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
      .gm-style .gm-style-iw-c { border-radius: 18px; padding: 0 !important; background: transparent !important; box-shadow: none !important; }
      .gm-style .gm-style-iw-t::after { display: none; }
      .gm-style .gm-style-iw-d { overflow: hidden !important; }
      .dg-card { min-width: 190px; border-radius: 18px; overflow: hidden; background: #ffffff; border: 1px solid #dce8f4; box-shadow: 0 18px 42px rgba(9, 22, 37, 0.22); }
      .dg-card-inner { padding: 12px 14px 14px; }
      .dg-info-title { font-weight: 800; font-size: 15px; margin-bottom: 4px; color: #0f172a; }
      .dg-info-meta { font-size: 12px; line-height: 1.5; color: #475569; margin-top: 2px; }
      .dg-info-chip { display: inline-block; margin-top: 8px; padding: 4px 10px; border-radius: 999px; background: #eaf4ff; color: #0d5fa8; font-size: 11px; font-weight: 700; }
      .dg-info-header { height: 6px; background: linear-gradient(90deg, #0d5fa8, #1198f5); }
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
                  scale: 10,
                  fillColor: '#0D5FA8',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 4,
                }
              : {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 8,
                  fillColor: '#F97316',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                },
            label: {
              text: item.type === 'point' ? 'P' : 'R',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '11px',
            },
          });

          marker.addListener('click', () => {
            infoWindow.setContent(
              '<div class="dg-card"><div class="dg-info-header"></div><div class="dg-card-inner"><div class="dg-info-title">' + item.name + '</div><div class="dg-info-meta">' + item.description + '</div><div class="dg-info-chip">' + (item.type === 'point' ? '다녀온 포인트' : '검증된 리조트') + '</div></div></div>'
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
  const { user } = useAuth();
  const selectedLocation = String(params.location || '').trim();
  const normalizedSelected = selectedLocation.toLowerCase();

  const { data: divePoints = [] } = useQuery({
    queryKey: ['dive-points', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => getDivePoints(String(user?.id || '')),
  });
  const { data: resorts = [] } = useQuery({ queryKey: ['resorts'], queryFn: apiClient.getResorts });

  const markers = useMemo<MapMarkerItem[]>(() => {
    const pointMarkers: MapMarkerItem[] = divePoints
      .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
      .map((item) => ({
          id: `point-${item.id}`,
          type: 'point',
          name: item.name,
          description: [
            item.country || '',
            item.region || '',
            item.address || '',
            item.visitCount ? `방문 ${item.visitCount}회` : '',
            item.lastVisitedAt ? `마지막 ${String(item.lastVisitedAt).slice(0, 10)}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
          lat: Number(item.lat),
          lng: Number(item.lng),
          visitCount: item.visitCount,
          lastVisitedAt: item.lastVisitedAt,
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
          description: [
            item.country || '',
            item.region || '',
            item.address || item.area || '',
            item.rating ? `평점 ${Number(item.rating).toFixed(1)}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
          lat: Number(lat),
          lng: Number(lng),
        };
      })
      .filter(Boolean) as MapMarkerItem[];

    return [...pointMarkers, ...resortMarkers];
  }, [divePoints, resorts]);

  const selectedFirst = normalizedSelected ? markers.find((item) => `${item.name} ${item.description}`.toLowerCase().includes(normalizedSelected)) || null : null;

  const center = useMemo(() => {
    if (selectedFirst) return { lat: selectedFirst.lat, lng: selectedFirst.lng };
    if (markers.length > 0) return { lat: markers[0].lat, lng: markers[0].lng };
    return { lat: 33.2196, lng: 126.569 };
  }, [markers, selectedFirst]);

  const hasGoogleMap = isGoogleMapsApiConfigured();
  const googleKey = getGoogleMapsApiKey();
  const mapHtml = useMemo(() => (hasGoogleMap ? buildMapHtml(googleKey, center, markers) : ''), [center, googleKey, hasGoogleMap, markers]);
  const [MapWebView, setMapWebView] = React.useState<any>(null);

  React.useEffect(() => {
    let canceled = false;
    if (!hasGoogleMap) {
      return undefined;
    }
    if (MapWebView) return undefined;
    import('react-native-webview')
      .then((module) => {
        if (canceled) return;
        setMapWebView(() => (module.WebView || module.default) as any);
      })
      .catch(() => {
        if (canceled) return;
        setMapWebView(null);
      });
    return () => {
      canceled = true;
    };
  }, [MapWebView, hasGoogleMap]);

  return (
    <Screen>
      <PermissionGate
        permission="location"
        title={t('permissions.location.title')}
        description={t('permissions.location.description')}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          <View className="border-b border-surface-200 dark:border-[#243447] px-5 py-4">
            <Text className="text-2xl font-semibold text-gray-950 dark:text-surface-50">{t('tabs.location')}</Text>
            <Text className="mt-1 text-surface-500 dark:text-[#9fb3c8]">{t('pages.location.subtitle')}</Text>
          </View>

          <View className="px-5 py-5">
            {selectedLocation ? (
              <View className="mb-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-[#2a4a67] dark:bg-[#12263a]">
                <Text className="text-xs font-semibold text-brand-700">
                  {t('pages.location.selectedRegion', { location: selectedLocation, defaultValue: `선택 지역: ${selectedLocation}` })}
                </Text>
              </View>
            ) : null}

            <View className="mb-4 overflow-hidden rounded-3xl border border-surface-200 bg-white p-3 dark:border-[#243447] dark:bg-[#0f1b2a]">
              <Text className="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-100">{t('pages.location.mapTitle')}</Text>
              {hasGoogleMap ? (
                <View style={{ height: 480, borderRadius: 22, overflow: 'hidden' }}>
                  {MapWebView ? (
                    <MapWebView
                      source={{ html: mapHtml }}
                      originWhitelist={['*']}
                      javaScriptEnabled
                      domStorageEnabled
                      style={{ flex: 1, backgroundColor: '#08121d' }}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-[#08121d]">
                      <Text className="text-xs text-white/80">{t('common.loading', { defaultValue: '지도를 불러오는 중...' })}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View className="h-72 items-center justify-center rounded-2xl bg-gray-900 px-4">
                  <MapPin size={34} color="#fff" />
                  <Text className="mt-2 text-center text-xs text-gray-300">{t('pages.location.mapPlaceholder')}</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </PermissionGate>
    </Screen>
  );
}
