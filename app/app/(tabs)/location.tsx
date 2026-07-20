import React, { useMemo } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { MapPinned, RefreshCw } from 'lucide-react-native';
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
  type: 'point' | 'resort' | 'current';
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

function buildMapHtml(apiKey: string, center: { lat: number; lng: number }, markers: MapMarkerItem[], currentLocation: { lat: number; lng: number } | null) {
  const markerJson = JSON.stringify(markers).replace(/</g, '\\u003c');
  const currentLocationJson = JSON.stringify(currentLocation).replace(/</g, '\\u003c');
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
      .dg-card { min-width: 198px; border-radius: 18px; overflow: hidden; background: #ffffff; border: 1px solid #dce8f4; box-shadow: 0 18px 42px rgba(9, 22, 37, 0.22); }
      .dg-card-inner { padding: 12px 14px 14px; }
      .dg-info-title { font-weight: 800; font-size: 15px; margin-bottom: 4px; color: #0f172a; }
      .dg-info-meta { font-size: 12px; line-height: 1.5; color: #475569; margin-top: 2px; }
      .dg-info-chip { display: inline-block; margin-top: 8px; padding: 4px 10px; border-radius: 999px; background: #eaf4ff; color: #0d5fa8; font-size: 11px; font-weight: 700; }
      .dg-info-header { height: 8px; background: linear-gradient(90deg, #0d5fa8, #12b5d0); }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const center = ${JSON.stringify(center)};
      const markers = ${markerJson};
      const currentLocation = ${currentLocationJson};
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

      function toDataUrl(svg) {
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
      }

      function escapeHtml(text) {
        return String(text || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function buildPinSvg(kind, label) {
        const isPoint = kind === 'point';
        const start = isPoint ? '#1d6fd9' : '#f59e0b';
        const end = isPoint ? '#0d5fa8' : '#d97706';
        const ring = isPoint ? '#dff2ff' : '#fff0d5';
        const symbol = isPoint
          ? [
              '<path d="M18 28.5C18 19.9 25 13 33.6 13h0.8C43 13 50 19.9 50 28.5c0 11.3-9 20.4-13.6 24.5-.9.8-2.3.8-3.2 0C27 48.9 18 39.8 18 28.5Z" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>',
              '<path d="M24 30.5c2.4-2.2 5.2-3.3 8.4-3.3 3.3 0 6.1 1.1 8.4 3.3" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>',
              '<path d="M24.5 35.2c2.1-1.3 4.5-2 7.1-2 2.7 0 5 .7 7.1 2" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>',
              '<circle cx="31" cy="28.5" r="2.6" fill="#ffffff" opacity="0.98"/>',
              '<circle cx="37" cy="28.5" r="2.6" fill="#ffffff" opacity="0.98"/>',
              '<path d="M34 33.2c1.7 0 3.1.7 4.3 2" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>',
              '<circle cx="23" cy="21" r="1.6" fill="#9fe7ff"/>',
              '<circle cx="19.5" cy="25" r="1.2" fill="#9fe7ff"/>',
              '<circle cx="17.5" cy="29.5" r="0.9" fill="#9fe7ff"/>',
            ].join('')
          : [
              '<path d="M20 26.5c0-5.5 5-10 11.2-10h5.6c6.2 0 11.2 4.5 11.2 10v9.3c0 5.5-5 10-11.2 10h-5.6C25 45.8 20 41.3 20 35.8v-9.3Z" fill="rgba(255,255,255,0.2)"/>',
              '<path d="M22.5 31h23" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round"/>',
              '<path d="M24.5 28.2h19l4 3.2H20.5l4-3.2Z" fill="#ffffff" opacity="0.96"/>',
              '<path d="M25 31.8h18.2v6.8H25z" fill="#ffffff" opacity="0.96"/>',
              '<path d="M28 31.8v6.8m10.2-6.8v6.8" stroke="#d97706" stroke-width="1.6" stroke-linecap="round"/>',
              '<circle cx="34" cy="24.8" r="2.7" fill="#fff0d5"/>',
            ].join('');
        return [
          '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 68 82">',
          '<defs>',
          '<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">',
          '<stop offset="0%" stop-color="' + start + '"/>',
          '<stop offset="100%" stop-color="' + end + '"/>',
          '</linearGradient>',
          '<filter id="shadow" x="-40%" y="-30%" width="180%" height="180%">',
          '<feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#0f172a" flood-opacity="0.25"/>',
          '</filter>',
          '</defs>',
          '<path d="M34 4C21.3 4 11 14.3 11 27c0 17.8 17.6 34.4 20.5 37.1.8.7 2.2.7 3 0C37.4 61.4 55 44.8 55 27 55 14.3 44.7 4 34 4Z" fill="url(#g)" stroke="' + ring + '" stroke-width="5" filter="url(#shadow)"/>',
          '<circle cx="34" cy="27" r="14" fill="rgba(255,255,255,0.92)"/>',
          symbol,
          '</svg>',
        ].join('');
      }

      function buildClusterSvg(count, tone) {
        const start = tone === 'point' ? '#0d5fa8' : tone === 'resort' ? '#f59e0b' : '#334155';
        const end = tone === 'point' ? '#12b5d0' : tone === 'resort' ? '#f97316' : '#64748b';
        const label = count > 99 ? '99+' : String(count);
        return [
          '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 72 72">',
          '<defs>',
          '<linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">',
          '<stop offset="0%" stop-color="' + start + '"/>',
          '<stop offset="100%" stop-color="' + end + '"/>',
          '</linearGradient>',
          '<filter id="shadow" x="-40%" y="-30%" width="180%" height="180%">',
          '<feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.22"/>',
          '</filter>',
          '</defs>',
          '<circle cx="36" cy="36" r="29" fill="url(#cg)" stroke="#ffffff" stroke-width="5" filter="url(#shadow)"/>',
          '<circle cx="36" cy="36" r="20" fill="rgba(255,255,255,0.18)"/>',
          '<text x="36" y="41" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="20" font-weight="900" fill="#ffffff">',
          escapeHtml(label),
          '</text>',
          '</svg>',
        ].join('');
      }

      function makeIconUrl(kind, count, tone) {
        if (count > 1) return toDataUrl(buildClusterSvg(count, tone));
        return toDataUrl(buildPinSvg(kind, kind === 'point' ? 'P' : 'R'));
      }

      function buildCurrentLocationSvg() {
        return [
          '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">',
          '<defs>',
          '<filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">',
          '<feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.2"/>',
          '</filter>',
          '</defs>',
          '<circle cx="17" cy="17" r="16" fill="#dff5ff" opacity="0.82" filter="url(#shadow)"/>',
          '<circle cx="17" cy="17" r="11" fill="#1188e6"/>',
          '<circle cx="17" cy="17" r="5.2" fill="#ffffff"/>',
          '</svg>',
        ].join('');
      }

      function initMap() {
        try {
          const map = new google.maps.Map(document.getElementById('map'), {
            center,
            zoom: 1,
            minZoom: 3,
            maxZoom: 16,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: 'greedy',
            mapTypeId: 'terrain',
          });

          const bounds = new google.maps.LatLngBounds();
          const infoWindow = new google.maps.InfoWindow();
          const renderedMarkers = [];

          function clearRenderedMarkers() {
            while (renderedMarkers.length) {
              const marker = renderedMarkers.pop();
              if (marker) marker.setMap(null);
            }
          }

          function getClusterTone(group) {
            const kinds = group.reduce((acc, item) => {
              acc[item.type] = (acc[item.type] || 0) + 1;
              return acc;
            }, {});
            if (kinds.point && kinds.resort) return 'mixed';
            return kinds.point ? 'point' : 'resort';
          }

          function renderClusters() {
            const projection = map.getProjection();
            if (!projection) return;

            clearRenderedMarkers();

            const zoom = map.getZoom() || 8;
            const scale = Math.pow(2, zoom);
            const gridSize = Math.max(44, 128 - zoom * 6);
            const buckets = new Map();

            markers.forEach((item) => {
              const latLng = new google.maps.LatLng(item.lat, item.lng);
              const point = projection.fromLatLngToPoint(latLng);
              const x = point.x * scale;
              const y = point.y * scale;
              const key = Math.floor(x / gridSize) + ':' + Math.floor(y / gridSize);
              if (!buckets.has(key)) buckets.set(key, []);
              buckets.get(key).push(item);
            });

            buckets.forEach((group) => {
              if (group.some((item) => item.type === 'current')) {
                return;
              }
              const tone = getClusterTone(group);
              const centerPoint = group.reduce((acc, item) => {
                acc.lat += item.lat;
                acc.lng += item.lng;
                return acc;
              }, { lat: 0, lng: 0 });
              centerPoint.lat /= group.length;
              centerPoint.lng /= group.length;

              if (group.length >= 5) {
                const spreadRadius = 0.0055 + Math.min(0.004, group.length * 0.0004);
                group.forEach((item, index) => {
                  const angle = (Math.PI * 2 * index) / group.length - Math.PI / 2;
                  const offsetLat = centerPoint.lat + Math.cos(angle) * spreadRadius;
                  const offsetLng = centerPoint.lng + Math.sin(angle) * spreadRadius;
                  const marker = new google.maps.Marker({
                    position: { lat: offsetLat, lng: offsetLng },
                    map,
                    title: item.name,
                  icon: {
                    url: makeIconUrl(item.type, 1, item.type === 'point' ? 'point' : 'resort'),
                    scaledSize: new google.maps.Size(36, 44),
                    anchor: new google.maps.Point(18, 40),
                  },
                    zIndex: 200 + index,
                    optimized: true,
                  });

                  marker.addListener('click', () => {
                    infoWindow.setContent(
                      '<div class="dg-card"><div class="dg-info-header"></div><div class="dg-card-inner"><div class="dg-info-title">' + escapeHtml(item.name) + '</div><div class="dg-info-meta">' + escapeHtml(item.description) + '</div><div class="dg-info-chip">' + (item.type === 'point' ? '다녀온 포인트' : '검증된 리조트') + '</div></div></div>'
                    );
                    infoWindow.open({ anchor: marker, map });
                  });

                  renderedMarkers.push(marker);
                });
                return;
              }

              const marker = new google.maps.Marker({
                position: { lat: centerPoint.lat, lng: centerPoint.lng },
                map,
                title: group.length > 1 ? group.length + '개 마커 그룹' : group[0].name,
                icon: {
                  url: makeIconUrl(group.length === 1 ? group[0].type : 'point', group.length, tone),
                  scaledSize: new google.maps.Size(group.length > 1 ? 40 : 36, group.length > 1 ? 40 : 44),
                  anchor: new google.maps.Point(group.length > 1 ? 20 : 18, group.length > 1 ? 20 : 40),
                },
                zIndex: group.length > 1 ? 1000 + group.length : 100 + (group[0].type === 'point' ? 20 : 10),
                optimized: true,
              });

              marker.addListener('click', () => {
                if (group.length > 1) {
                  const clusterBounds = new google.maps.LatLngBounds();
                  group.forEach((item) => clusterBounds.extend({ lat: item.lat, lng: item.lng }));
                  map.fitBounds(clusterBounds, 72);
                  return;
                }
                const item = group[0];
                infoWindow.setContent(
                  '<div class="dg-card"><div class="dg-info-header"></div><div class="dg-card-inner"><div class="dg-info-title">' + escapeHtml(item.name) + '</div><div class="dg-info-meta">' + escapeHtml(item.description) + '</div><div class="dg-info-chip">' + (item.type === 'point' ? '다녀온 포인트' : '검증된 리조트') + '</div></div></div>'
                );
                infoWindow.open({ anchor: marker, map });
              });

              renderedMarkers.push(marker);
            });

            if (currentLocation && Number.isFinite(Number(currentLocation.lat)) && Number.isFinite(Number(currentLocation.lng))) {
              const currentMarker = new google.maps.Marker({
                position: { lat: Number(currentLocation.lat), lng: Number(currentLocation.lng) },
                map,
                title: '내 위치',
                icon: {
                  url: toDataUrl(buildCurrentLocationSvg()),
                  scaledSize: new google.maps.Size(34, 34),
                  anchor: new google.maps.Point(17, 17),
                },
                zIndex: 5000,
                optimized: true,
              });

              const currentInfo = new google.maps.InfoWindow({
                content: '<div class="dg-card"><div class="dg-info-header"></div><div class="dg-card-inner"><div class="dg-info-title">내 현재 위치</div><div class="dg-info-meta">' + Number(currentLocation.lat).toFixed(5) + ', ' + Number(currentLocation.lng).toFixed(5) + '</div><div class="dg-info-chip">GPS 기준</div></div></div>',
              });
              currentMarker.addListener('click', () => {
                currentInfo.open({ anchor: currentMarker, map });
              });
              renderedMarkers.push(currentMarker);
            }
          }

          markers.forEach((item) => {
            bounds.extend({ lat: item.lat, lng: item.lng });
          });
          if (currentLocation && Number.isFinite(Number(currentLocation.lat)) && Number.isFinite(Number(currentLocation.lng))) {
            bounds.extend({ lat: Number(currentLocation.lat), lng: Number(currentLocation.lng) });
          }

          const lats = markers.map((item) => item.lat);
          const lngs = markers.map((item) => item.lng);
          const latSpan = Math.max.apply(null, lats) - Math.min.apply(null, lats);
          const lngSpan = Math.max.apply(null, lngs) - Math.min.apply(null, lngs);

          if (markers.length > 1 && latSpan <= 6 && lngSpan <= 6) {
            map.fitBounds(bounds, 48);
          } else {
            map.setCenter(center);
            map.setZoom(1);
          }

          google.maps.event.addListenerOnce(map, 'idle', renderClusters);
          map.addListener('idle', renderClusters);
          map.addListener('zoom_changed', function() {
            clearRenderedMarkers();
          });
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
  const isDark = useColorScheme() === 'dark';
  const selectedLocation = String(params.location || '').trim();
  const normalizedSelected = selectedLocation.toLowerCase();

  const { data: divePoints = [] } = useQuery({
    queryKey: ['dive-points', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => getDivePoints(String(user?.id || '')),
  });
  const { data: resorts = [] } = useQuery({ queryKey: ['resorts'], queryFn: apiClient.getResorts });
  const [currentLocation, setCurrentLocation] = React.useState<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
    let canceled = false;
    const loadCurrentLocation = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) {
          if (!canceled) setCurrentLocation(null);
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (canceled) return;
        setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      } catch {
        if (!canceled) setCurrentLocation(null);
      }
    };
    void loadCurrentLocation();
    return () => {
      canceled = true;
    };
  }, []);

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

  const focusMarker = currentLocation || markers.find((item) => item.type === 'point') || markers[0] || null;
  const center = useMemo(() => {
    if (currentLocation) return currentLocation;
    if (selectedFirst) return { lat: selectedFirst.lat, lng: selectedFirst.lng };
    if (focusMarker) return { lat: focusMarker.lat, lng: focusMarker.lng };
    return { lat: 33.2196, lng: 126.569 };
  }, [currentLocation, focusMarker, selectedFirst]);

  const hasGoogleMap = isGoogleMapsApiConfigured();
  const googleKey = getGoogleMapsApiKey();
  const mapHtml = useMemo(() => (hasGoogleMap ? buildMapHtml(googleKey, center, markers, currentLocation) : ''), [center, currentLocation, googleKey, hasGoogleMap, markers]);
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
    <View className="absolute inset-x-4 top-4 overflow-hidden rounded-3xl border border-white/20 bg-[#07111d]/90 px-4 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-semibold text-white">{title}</Text>
          <Text className="mt-1 text-xs leading-5 text-white/75">{body}</Text>
          {code ? <Text className="mt-2 text-[11px] font-semibold text-cyan-300">{code}</Text> : null}
        </View>
        <TouchableOpacity onPress={retryMap} className="rounded-full bg-white/12 px-3 py-2">
          <Text className="text-xs font-semibold text-white">다시</Text>
        </TouchableOpacity>
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
        <View style={{ flex: 1, backgroundColor: '#08121d' }}>
          {hasGoogleMap ? (
            <>
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
                  style={{ flex: 1, backgroundColor: '#08121d' }}
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
                  <View className="mb-4 rounded-full bg-white/10 p-4">
                    <MapPinned size={24} color="#8fd1ff" />
                  </View>
                  <ActivityIndicator color="#8fd1ff" />
                  <Text className="mt-3 text-center text-xs text-white/80">
                    {t('common.loading', { defaultValue: '지도를 불러오는 중...' })}
                  </Text>
                  <TouchableOpacity onPress={retryMap} className="mt-4 rounded-full bg-white/10 px-4 py-2">
                    <Text className="text-xs font-semibold text-white">로딩 다시 시도</Text>
                  </TouchableOpacity>
                </View>
              )}
              {selectedLocation ? (
                <View className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-2">
                  <Text className="text-[11px] font-semibold text-white">{t('pages.location.selectedRegion', { location: selectedLocation, defaultValue: `선택 지역: ${selectedLocation}` })}</Text>
                </View>
              ) : null}
              <View className="absolute right-4 top-4">
                <TouchableOpacity onPress={retryMap} className="rounded-full bg-white/92 px-3 py-3 shadow-md">
                  <RefreshCw size={14} color="#0d5fa8" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            renderMapFallback('지도 대체 보기', t('pages.location.mapPlaceholder'), 'GOOGLE_MAPS_KEY_MISSING')
          )}
        </View>
      </PermissionGate>
    </Screen>
  );
}
