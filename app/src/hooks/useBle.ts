import { useState, useEffect, useRef } from 'react';
import type { Device } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';
import { getBlePlxModule } from '../lib/blePlx';

interface DiveData {
  timestamp: number;
  depth: number;
  temperature: number;
}

export function useBle() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [diveData, setDiveData] = useState<DiveData[]>([]);
  const bleManagerRef = useRef<any | null>(null);

  const getBleManager = () => {
    if (bleManagerRef.current) return bleManagerRef.current;
    const BlePlx = getBlePlxModule();
    if (!BlePlx?.BleManager) return null;
    bleManagerRef.current = new BlePlx.BleManager();
    return bleManagerRef.current;
  };

  useEffect(() => {
    const bleManager = getBleManager();
    if (!bleManager) return undefined;
    
    const subscription = bleManager.onStateChange((state: string) => {
      if (state === 'PoweredOn') {
        console.log('BLE is ready');
      }
    }, true);

    return () => {
      subscription.remove();
      void bleManager.destroy();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      
      return Object.values(granted).every((permission: string) => permission === 'granted');
    }
    return true;
  };

  const startScan = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      showToast({
        type: 'error',
        title: t('ble.permissionDenied'),
        message: t('ble.permissionDeniedMessage')
      });
      return;
    }

    setIsScanning(true);
    setDevices([]);
    
    const bleManager = getBleManager();
    if (!bleManager) {
      setIsScanning(false);
      showToast({
        type: 'error',
        title: t('ble.permissionDenied'),
        message: t('ble.permissionDeniedMessage')
      });
      return;
    }
    
    bleManager.startDeviceScan(null, null, (error: unknown, device: Device | null) => {
      if (error) {
        console.error('Scan error:', error);
        setIsScanning(false);
        return;
      }
      
      if (device && device.name) {
        setDevices(prev => {
          const exists = prev.find(d => d.id === device.id);
          if (exists) return prev;
          return [...prev, device];
        });
      }
    });

    // Stop scanning after 10 seconds
    setTimeout(() => {
      stopScan();
    }, 10000);
  };

  const stopScan = () => {
    const bleManager = bleManagerRef.current;
    if (!bleManager) {
      setIsScanning(false);
      return;
    }
    bleManager.stopDeviceScan();
    setIsScanning(false);
  };

  const connectToDevice = async (device: Device) => {
    try {
      stopScan();
      
      const connectedDev = await device.connect();
      await connectedDev.discoverAllServicesAndCharacteristics();
      
      setConnectedDevice(connectedDev);
      
      // Start monitoring dive data (mock implementation)
      startDiveDataMonitoring(connectedDev);
      
      showToast({
        type: 'success',
        title: t('ble.connected'),
        message: t('ble.connectedMessage', { name: device.name })
      });
      
    } catch (error) {
      console.error('Connection error:', error);
      showToast({
        type: 'error',
        title: t('ble.connectionFailed'),
        message: t('ble.connectionFailedMessage')
      });
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      try {
        const bleManager = bleManagerRef.current;
        await bleManager.cancelDeviceConnection(connectedDevice.id);
        setConnectedDevice(null);
        setDiveData([]);
        
        showToast({
          type: 'info',
          title: t('ble.disconnected'),
          message: t('ble.disconnectedMessage')
        });
      } catch (error) {
        console.error('Disconnection error:', error);
      }
    }
  };

  const startDiveDataMonitoring = (device: Device) => {
    // Mock dive data generation
    const interval = setInterval(() => {
      const newData: DiveData = {
        timestamp: Date.now(),
        depth: Math.random() * 30, // 0-30m depth
        temperature: 20 + Math.random() * 10, // 20-30°C
      };
      
      setDiveData(prev => [...prev.slice(-19), newData]); // Keep last 20 points
    }, 1000);

    // Clean up interval when device disconnects
    const cleanup = () => clearInterval(interval);
    device.onDisconnected(cleanup);
    
    return cleanup;
  };

  return {
    devices,
    connectedDevice,
    isScanning,
    diveData,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
  };
}
