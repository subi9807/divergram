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
          t('diveMode.bgPermissionDescription'),
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
        title: t('diveMode.startTitle'),
        message: t('diveMode.startMessage')
      });

    } catch (error) {
      console.error('Error starting location tracking:', error);
      analytics.error(error as Error, { context: 'dive_tracking_start' });
      showToast({
        type: 'error',
        title: t('diveMode.startFailTitle'),
        message: t('diveMode.startFailMessage')
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
        title: t('diveMode.stopTitle'),
        message: t('diveMode.stopMessage', { count: locationHistory.length })
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
      <LoadingOverlay visible={loading} text={t('diveMode.loading')} />
      
      <PermissionGate
        permission="location"
        title={t('permissions.location.title')}
        description={t('permissions.location.description')}
      >
        <View className="flex-1 p-6">
          <View className="mb-6">
            <Text className="text-3xl font-bold text-secondary-800 mb-2">
              {t('diveMode.title')}
            </Text>
            <Text className="text-secondary-600">
              {isTracking ? t('diveMode.tracking') : t('diveMode.idle')}
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
                {isTracking ? t('diveMode.stopButton') : t('diveMode.startButton')}
              </Button>
            </View>

            {isTracking && (
              <View className="space-y-3">
                <Text className="text-center text-secondary-600 mb-4">
                  {t('diveMode.points', { count: locationHistory.length })}
                </Text>
              </View>
            )}
          </Card>

          {currentLocation && (
            <Card className="p-6">
              <Text className="text-lg font-semibold text-secondary-800 mb-4">
                {t('diveMode.currentLocation')}
              </Text>
              
              <View className="space-y-4">
                <View className="flex-row items-center">
                  <MapPin size={20} color="#64748b" />
                  <View className="ml-3 flex-1">
                    <Text className="text-secondary-800 font-medium">{t('diveMode.coordinate')}</Text>
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
                    <Text className="text-secondary-800 font-medium">{t('diveMode.heading')}</Text>
                    <Text className="text-secondary-600 text-sm">
                      {formatHeading(currentLocation.heading)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Gauge size={20} color="#64748b" />
                  <View className="ml-3 flex-1">
                    <Text className="text-secondary-800 font-medium">{t('diveMode.speed')}</Text>
                    <Text className="text-secondary-600 text-sm">
                      {formatSpeed(currentLocation.speed)}
                    </Text>
                  </View>
                </View>

                {currentLocation.accuracy && (
                  <View className="pt-2 border-t border-secondary-200">
                    <Text className="text-secondary-600 text-sm">
                      {t('diveMode.accuracy', { value: currentLocation.accuracy.toFixed(1) })}
                    </Text>
                    {currentLocation.altitude && (
                      <Text className="text-secondary-600 text-sm">
                        {t('diveMode.altitude', { value: currentLocation.altitude.toFixed(1) })}
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
