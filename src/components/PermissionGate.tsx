import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, Linking } from 'react-native';
import { EmptyState } from './EmptyState';
import { Shield } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

interface PermissionGateProps {
  children: React.ReactNode;
  permission: 'location' | 'bluetooth' | 'notifications';
  title: string;
  description: string;
}

export function PermissionGate({ children, permission, title, description }: PermissionGateProps) {
  const { t } = useTranslation();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkPermission = useCallback(async () => {
    setIsLoading(true);
    try {
      switch (permission) {
        case 'location':
          const { status } = await Location.getForegroundPermissionsAsync();
          setHasPermission(status === 'granted');
          break;
        case 'bluetooth':
          // TODO: Implement BLE permission check
          setHasPermission(true); // Mock for now
          break;
        case 'notifications':
          // TODO: Implement notification permission check
          setHasPermission(true); // Mock for now
          break;
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  }, [permission]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const requestPermission = async () => {
    try {
      switch (permission) {
        case 'location':
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            setHasPermission(true);
          } else {
            showSettingsAlert();
          }
          break;
        case 'bluetooth':
          // TODO: Implement BLE permission request
          setHasPermission(true);
          break;
        case 'notifications':
          // TODO: Implement notification permission request
          setHasPermission(true);
          break;
      }
    } catch (error) {
      console.error('Permission request error:', error);
    }
  };

  const showSettingsAlert = () => {
    Alert.alert(
      t('permissions.settingsTitle'),
      t('permissions.settingsMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('permissions.openSettings'), 
          onPress: () => Linking.openSettings() 
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-secondary-600">{t('common.loading')}</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <EmptyState
        icon={<Shield size={48} color="#64748b" />}
        title={title}
        subtitle={description}
        actionText={t('permissions.grant')}
        onAction={requestPermission}
      />
    );
  }

  return <>{children}</>;
}
