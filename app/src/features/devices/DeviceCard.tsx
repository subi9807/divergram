import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Signal } from 'lucide-react-native';

interface DeviceCardProps {
  device: {
    id: string;
    name: string;
    rssi?: number;
  };
  isConnected: boolean;
  onConnect: (device: any) => void;
  onDisconnect: () => void;
}

export function DeviceCard({ device, isConnected, onConnect, onDisconnect }: DeviceCardProps) {
  const getSignalStrength = (rssi?: number) => {
    if (!rssi) return 'Unknown';
    if (rssi > -50) return 'Excellent';
    if (rssi > -70) return 'Good';
    if (rssi > -90) return 'Fair';
    return 'Poor';
  };

  const getSignalColor = (rssi?: number) => {
    if (!rssi) return '#64748b';
    if (rssi > -50) return '#10b981';
    if (rssi > -70) return '#f59e0b';
    if (rssi > -90) return '#f97316';
    return '#ef4444';
  };

  return (
    <Card className="mx-4 mb-3 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-secondary-800 mb-1">
            {device.name}
          </Text>
          
          <View className="flex-row items-center">
            <Signal size={16} color={getSignalColor(device.rssi)} />
            <Text className="text-secondary-600 ml-2">
              {getSignalStrength(device.rssi)}
              {device.rssi && ` (${device.rssi} dBm)`}
            </Text>
          </View>
        </View>

        <Button
          onPress={isConnected ? onDisconnect : () => onConnect(device)}
          variant={isConnected ? "outline" : "primary"}
          size="sm"
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </Button>
      </View>
    </Card>
  );
}