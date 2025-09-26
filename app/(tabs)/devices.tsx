import React from 'react';
import { View, FlatList, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { PermissionGate } from '../../src/components/PermissionGate';
import { useBle } from '../../src/hooks/useBle';
import { DeviceCard } from '../../src/features/devices/DeviceCard';
import { DiveDataChart } from '../../src/features/devices/DiveDataChart';
import { Bluetooth, Search } from 'lucide-react-native';

export default function DevicesScreen() {
  const { t } = useTranslation();
  const {
    devices,
    connectedDevice,
    isScanning,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
    diveData
  } = useBle();

  const renderDevice = ({ item }) => (
    <DeviceCard
      device={item}
      onConnect={connectToDevice}
      onDisconnect={disconnectDevice}
      isConnected={connectedDevice?.id === item.id}
    />
  );

  return (
    <Screen>
      <PermissionGate
        permission="bluetooth"
        title={t('permissions.bluetooth.title')}
        description={t('permissions.bluetooth.description')}
      >
        <View className="flex-1">
          <View className="px-6 py-4 bg-white border-b border-secondary-200">
            <Text className="text-2xl font-bold text-secondary-800 mb-1">
              {t('devices.title')}
            </Text>
            <Text className="text-secondary-600">
              {t('devices.subtitle')}
            </Text>
          </View>

          {connectedDevice && diveData.length > 0 && (
            <View className="px-6 py-4">
              <Card className="mb-4">
                <Text className="text-lg font-semibold text-secondary-800 mb-2">
                  {t('devices.liveData')}
                </Text>
                <DiveDataChart data={diveData} />
              </Card>
            </View>
          )}

          <View className="px-6 py-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-secondary-800">
                {t('devices.nearby')}
              </Text>
              <Button
                onPress={isScanning ? stopScan : startScan}
                variant={isScanning ? "outline" : "primary"}
                size="sm"
                className="flex-row items-center"
              >
                <Search size={16} color={isScanning ? "#0ea5e9" : "white"} className="mr-2" />
                {isScanning ? t('devices.stopScan') : t('devices.startScan')}
              </Button>
            </View>

            <FlatList
              data={devices}
              renderItem={renderDevice}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <EmptyState
                  title={t('devices.empty')}
                  subtitle={t('devices.emptySubtitle')}
                  icon={<Bluetooth size={48} color="#64748b" />}
                  actionText={t('devices.startScan')}
                  onAction={startScan}
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
            />
          </View>
        </View>
      </PermissionGate>
    </Screen>
  );
}