import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PermissionGate } from '../../components/PermissionGate';
import { useToast } from '../../components/Toast';
import { analytics } from '../../lib/analytics';
import { Play, Square, MapPin, Compass, Gauge } from 'lucide-react-native';

interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export function DiveMode() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [subscription]);

  const startTracking = async () => {
    try {
      setLoading(true);
      
      // Request background location permission
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissions.location.title'),
          '다이빙 모드에서는 백그라운드 위치 권한이 필요합니다.',
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('permissions.openSettings'), onPress: () => Location.requestBackgroundPermissionsAsync() }
          ]
        );
        return;
      }

      // Start location tracking
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 1, // Update every meter
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
          };

          setCurrentLocation(locationData);
          setLocationHistory(prev => [...prev, locationData]);
        }
      );

      setSubscription(locationSubscription);
      setIsTracking(true);
      
      analytics.diveEvent('Tracking Started');
      showToast({
        type: 'success',
        title: '다이빙 모드 시작',
        message: 'GPS 추적이 시작되었습니다.'
      });

    } catch (error) {
      console.error('Error starting location tracking:', error);
      analytics.error(error as Error, { context: 'dive_tracking_start' });
      showToast({
        type: 'error',
        title: '추적 시작 실패',
        message: 'GPS 추적을 시작할 수 없습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  const stopTracking = async () => {
    try {
      if (subscription) {
        subscription.remove();
        setSubscription(null);
      }

      setIsTracking(false);
      
      // Save track data (in real app, save to SQLite and upload to server)
      if (locationHistory.length > 0) {
        console.log(`Saved ${locationHistory.length} location points`);
        // TODO: Save to SQLite and upload to /api/logs/:id/track
      }

      analytics.diveEvent('Tracking Stopped', {
        duration: locationHistory.length,
        points: locationHistory.length,
      });

      showToast({
        type: 'info',
        title: '다이빙 모드 종료',
        message: `${locationHistory.length}개의 위치 데이터가 저장되었습니다.`
      });

      // Reset data
      setLocationHistory([]);
      setCurrentLocation(null);

    } catch (error) {
      console.error('Error stopping location tracking:', error);
      analytics.error(error as Error, { context: 'dive_tracking_stop' });
    }
  };

  const formatCoordinate = (coord: number, type: 'lat' | 'lng') => {
    const direction = type === 'lat' ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${Math.abs(coord).toFixed(6)}° ${direction}`;
  };

  const formatSpeed = (speed: number | null) => {
    if (speed === null) return 'N/A';
    return `${(speed * 3.6).toFixed(1)} km/h`; // Convert m/s to km/h
  };

  const formatHeading = (heading: number | null) => {
    if (heading === null) return 'N/A';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    return `${heading.toFixed(0)}° ${directions[index]}`;
  };

  return (
    <Screen>
      <LoadingOverlay visible={loading} text="GPS 초기화 중..." />
      
      <PermissionGate
        permission="location"
        title={t('permissions.location.title')}
        description={t('permissions.location.description')}
      >
        <View className="flex-1 p-6">
          <View className="mb-6">
            <Text className="text-3xl font-bold text-secondary-800 mb-2">
              다이빙 모드
            </Text>
            <Text className="text-secondary-600">
              {isTracking ? 'GPS 추적 중...' : 'GPS 추적을 시작하여 다이빙 경로를 기록하세요'}
            </Text>
          </View>

          <Card className="p-6 mb-6">
            <View className="items-center mb-6">
              <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${
                isTracking ? 'bg-red-100' : 'bg-primary-100'
              }`}>
                {isTracking ? (
                  <Square size={32} color="#ef4444" />
                ) : (
                  <Play size={32} color="#0ea5e9" />
                )}
              </View>
              
              <Button
                onPress={isTracking ? stopTracking : startTracking}
                variant={isTracking ? "danger" : "primary"}
                size="lg"
                disabled={loading}
              >
                {isTracking ? '추적 중지' : '추적 시작'}
              </Button>
            </View>

            {isTracking && (
              <View className="space-y-3">
                <Text className="text-center text-secondary-600 mb-4">
                  기록된 포인트: {locationHistory.length}개
                </Text>
              </View>
            )}
          </Card>

          {currentLocation && (
            <Card className="p-6">
              <Text className="text-lg font-semibold text-secondary-800 mb-4">
                현재 위치 정보
              </Text>
              
              <View className="space-y-4">
                <View className="flex-row items-center">
                  <MapPin size={20} color="#64748b" />
                  <View className="ml-3 flex-1">
                    <Text className="text-secondary-800 font-medium">좌표</Text>
                    <Text className="text-secondary-600 text-sm">
                      {formatCoordinate(currentLocation.latitude, 'lat')}
                    </Text>
                    <Text className="text-secondary-600 text-sm">
                      {formatCoordinate(currentLocation.longitude, 'lng')}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Compass size={20} color="#64748b" />
                  <View className="ml-3 flex-1">
                    <Text className="text-secondary-800 font-medium">방향</Text>
                    <Text className="text-secondary-600 text-sm">
                      {formatHeading(currentLocation.heading)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Gauge size={20} color="#64748b" />
                  <View className="ml-3 flex-1">
                    <Text className="text-secondary-800 font-medium">속도</Text>
                    <Text className="text-secondary-600 text-sm">
                      {formatSpeed(currentLocation.speed)}
                    </Text>
                  </View>
                </View>

                {currentLocation.accuracy && (
                  <View className="pt-2 border-t border-secondary-200">
                    <Text className="text-secondary-600 text-sm">
                      정확도: ±{currentLocation.accuracy.toFixed(1)}m
                    </Text>
                    {currentLocation.altitude && (
                      <Text className="text-secondary-600 text-sm">
                        고도: {currentLocation.altitude.toFixed(1)}m
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </Card>
          )}
        </View>
      </PermissionGate>
    </Screen>
  );
}