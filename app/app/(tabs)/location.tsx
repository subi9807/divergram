import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { PermissionGate } from '../../src/components/PermissionGate';
import { useAuth } from '../../src/hooks/useAuth';
import { apiClient } from '../../src/lib/api';
import { describeGoogleMapsIssue, getGoogleMapsApiKey, isGoogleMapsApiConfigured } from '../../src/lib/googleMapSearch';
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
      body.error { display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .error-box { width: 100%; max-width: 420px; border-radius: 24px; background: rgba(9, 20, 33, 0.92); border: 1px solid rgba(255,255,255,0.12); padding: 20px; text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,0.32); }
      .error-title { font-size: 18px; font-weight: 800; margin-bottom: 8px; }
      .error-body { font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.82); }
      .error-chip { display: inline-block; margin-top: 14px; padding: 6px 12px; border-radius: 999px; background: rgba(17, 152, 245, 0.15); color: #8fd1ff; font-size: 11px; font-weight: 700; }
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
      let mapInitialized = false;

      function postError(code, detail) {
        try {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map-error', code, detail: detail || '' }));
        } catch (e) {}
      }

      function showFallback(title, body, code) {
        document.body.className = 'error';
        document.body.innerHTML = '<div class="error-box"><div class="error-title">' + title + '</div><div class="error-body">' + body + '</div><div class="error-chip">' + code + '</div></div>';
      }

      function initMap() {
        try {
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
                    scale: 11,
                    fillColor: '#0D5FA8',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 4,
                  }
                : {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 9,
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
          mapInitialized = true;
        } catch (error) {
          postError('map_init_failed', String(error && error.message ? error.message : error || 'unknown'));
          showFallback('지도를 불러오지 못했습니다', 'Google Maps 초기화에 실패했습니다. 사용량 초과 또는 네트워크 문제일 수 있습니다.', 'MAP_INIT_FAILED');
        }
      }

      window.onerror = function(message, source, lineno, colno) {
        postError('map_runtime_error', String(message || 'unknown') + ' @ ' + String(lineno || 0) + ':' + String(colno || 0));
        showFallback('지도를 불러오지 못했습니다', 'Google Maps 실행 중 오류가 발생했습니다. 다른 화면은 계속 이용할 수 있습니다.', 'MAP_RUNTIME_ERROR');
        return true;
      };

      setTimeout(function() {
        if (!mapInitialized) {
          postError('map_init_timeout', 'Google Maps callback timeout');
          showFallback('지도를 불러오는 중입니다', 'Google Maps 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.', 'MAP_INIT_TIMEOUT');
        }
      }, 8000);
    </script>
    <script>
      const s = document.createElement('script');
      s.async = true;
      s.defer = true;
      s.src = 'https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=initMap';
      s.onerror = function() {
        postError('map_script_failed', 'Google Maps script load failed');
        showFallback('지도를 불러오지 못했습니다', '지도 스크립트 로드에 실패했습니다. 사용량 초과 또는 네트워크 문제를 확인해주세요.', 'MAP_SCRIPT_FAILED');
      };
      document.head.appendChild(s);
    </script>
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
  const [mapLoadReady, setMapLoadReady] = React.useState(false);
  const [mapRuntimeError, setMapRuntimeError] = React.useState('');
  const [mapLoadAttempt, setMapLoadAttempt] = React.useState(0);

  React.useEffect(() => {
    let canceled = false;
    if (!hasGoogleMap) {
      setMapLoadReady(false);
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
        setMapRuntimeError('인터랙티브 지도 컴포넌트를 불러오지 못했습니다.');
      });
    return () => {
      canceled = true;
    };
  }, [MapWebView, hasGoogleMap]);

  React.useEffect(() => {
    if (!hasGoogleMap) return undefined;
    setMapLoadReady(false);
    setMapRuntimeError('');
    const timer = setTimeout(() => setMapLoadReady(true), 850);
    return () => clearTimeout(timer);
  }, [hasGoogleMap, mapLoadAttempt, markers.length, center.lat, center.lng]);

  const retryMap = () => {
    setMapRuntimeError('');
    setMapLoadReady(false);
    setMapLoadAttempt((prev) => prev + 1);
  };

  const renderMapFallback = (title: string, body: string, code?: string) => (
    <View className="overflow-hidden rounded-3xl border border-surface-200 bg-white p-4 dark:border-[#243447] dark:bg-[#0f1b2a]">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-surface-700 dark:text-surface-100">{title}</Text>
        <TouchableOpacity onPress={retryMap} className="rounded-full bg-brand-600 px-3 py-2">
          <Text className="text-xs font-semibold text-white">다시 불러오기</Text>
        </TouchableOpacity>
      </View>
      <View className="rounded-2xl bg-[#08121d] px-4 py-5">
        <Text className="text-center text-xs leading-5 text-white/85">{body}</Text>
        {code ? <Text className="mt-2 text-center text-[11px] font-semibold text-cyan-300">{code}</Text> : null}
      </View>
      <View className="mt-4">
        <Text className="mb-2 text-xs font-semibold text-surface-500 dark:text-surface-300">대체 목록</Text>
        {markers.slice(0, 6).map((item) => (
          <View key={item.id} className="mb-2 rounded-2xl border border-surface-200 bg-surface-50 px-3 py-3 dark:border-[#243447] dark:bg-[#101b2a]">
            <Text className="text-sm font-semibold text-surface-900 dark:text-surface-50">{item.name}</Text>
            <Text className="mt-1 text-xs text-surface-500 dark:text-surface-300">{item.description || `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`}</Text>
          </View>
        ))}
      </View>
    </View>
  );

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
                <View style={{ minHeight: 520, borderRadius: 22, overflow: 'hidden' }}>
                  {mapRuntimeError ? (
                    renderMapFallback(
                      '지도 연결 실패',
                      mapRuntimeError || 'Google Maps 사용량 초과 또는 네트워크 문제로 지도를 열지 못했습니다.',
                      'MAP_FALLBACK'
                    )
                  ) : mapLoadReady && MapWebView ? (
                    <MapWebView
                      key={`map-${mapLoadAttempt}`}
                      source={{ html: mapHtml }}
                      originWhitelist={['*']}
                      javaScriptEnabled
                      domStorageEnabled
                      style={{ flex: 1, backgroundColor: '#08121d', minHeight: 520 }}
                      onMessage={(event: any) => {
                        try {
                          const data = JSON.parse(String(event?.nativeEvent?.data || '{}'));
                          if (data?.type === 'map-error') {
                            const detail = describeGoogleMapsIssue(String(data?.code || ''), 'map_js');
                            setMapRuntimeError(detail);
                          }
                        } catch {
                          setMapRuntimeError('Google Maps 실행 중 오류가 발생했습니다.');
                        }
                      }}
                      onError={(event: any) => {
                        setMapRuntimeError(
                          describeGoogleMapsIssue(String(event?.nativeEvent?.description || event?.nativeEvent?.title || ''), 'map_js')
                        );
                      }}
                      onHttpError={() => {
                        setMapRuntimeError('Google Maps 네트워크 응답 오류가 발생했습니다.');
                      }}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-[#08121d] px-4 py-10">
                      <ActivityIndicator color="#8fd1ff" />
                      <Text className="mt-3 text-center text-xs text-white/80">
                        {t('common.loading', { defaultValue: '지도를 불러오는 중...' })}
                      </Text>
                      <TouchableOpacity onPress={retryMap} className="mt-4 rounded-full bg-white/10 px-4 py-2">
                        <Text className="text-xs font-semibold text-white">로딩 다시 시도</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                renderMapFallback(
                  '지도 대체 보기',
                  t('pages.location.mapPlaceholder'),
                  'GOOGLE_MAPS_KEY_MISSING'
                )
              )}
            </View>
          </View>
        </ScrollView>
      </PermissionGate>
    </Screen>
  );
}
