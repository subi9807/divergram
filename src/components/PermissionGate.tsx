import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, Linking } from 'react-native';
import { EmptyState } from './EmptyState';
import { Shield } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  checkBluetoothPermission,
  checkLocationPermission,
  checkPushPermission,
  requestBluetoothPermission,
  requestLocationPermission,
  requestPushPermission,
} from '../lib/runtimePermissions';

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
        case 'location': {
          const result = await checkLocationPermission();
          setHasPermission(result.granted);
          break;
        }
        case 'bluetooth': {
          const result = await checkBluetoothPermission();
          setHasPermission(result.granted);
          break;
        }
        case 'notifications': {
          const result = await checkPushPermission();
          setHasPermission(result.granted);
          break;
        }
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
        case 'location': {
          const result = await requestLocationPermission();
          if (result.granted) {
            setHasPermission(true);
          } else {
            showSettingsAlert();
          }
          break;
        }
        case 'bluetooth': {
          const result = await requestBluetoothPermission();
          if (result.granted) {
            setHasPermission(true);
          } else {
            showSettingsAlert();
          }
          break;
        }
        case 'notifications': {
          const result = await requestPushPermission();
          if (result.granted) {
            setHasPermission(true);
          } else {
            showSettingsAlert();
          }
          break;
        }
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
