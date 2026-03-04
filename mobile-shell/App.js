import React, { useMemo, useRef, useState } from 'react';
import { SafeAreaView, StatusBar, View, Text, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { BleManager } from 'react-native-ble-plx';

const DEFAULT_WEB_URL = 'https://divergram.com';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_WEB_URL;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const webRef = useRef(null);
  const bleManager = useMemo(() => new BleManager(), []);
  const [canGoBack, setCanGoBack] = useState(false);
  const [scanning, setScanning] = useState(false);

  const postToWeb = (payload) => {
    if (!webRef.current) return;
    webRef.current.postMessage(JSON.stringify(payload));
  };

  const sendError = (scope, message) => postToWeb({ type: 'native_error', scope, message: String(message || 'unknown_error') });

  const requestGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return sendError('gps', 'permission_denied');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      postToWeb({
        type: 'gps_result',
        ok: true,
        coords: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        },
      });
    } catch (e) {
      sendError('gps', e?.message);
    }
  };

  const requestPushToken = async () => {
    try {
      if (!Device.isDevice) return sendError('push', 'physical_device_required');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return sendError('push', 'permission_denied');

      const tokenRes = await Notifications.getDevicePushTokenAsync();
      const token = tokenRes?.data;
      if (!token) return sendError('push', 'token_not_available');

      postToWeb({
        type: 'push_token_result',
        ok: true,
        platform: Platform.OS,
        push_token: token,
      });
    } catch (e) {
      sendError('push', e?.message);
    }
  };

  const startBleScan = async () => {
    try {
      setScanning(true);
      bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          setScanning(false);
          sendError('ble', error.message);
          return;
        }
        if (!device) return;
        postToWeb({
          type: 'ble_device_found',
          id: device.id,
          name: device.name || device.localName || 'Unknown',
          rssi: device.rssi,
        });
      });
    } catch (e) {
      setScanning(false);
      sendError('ble', e?.message);
    }
  };

  const stopBleScan = () => {
    bleManager.stopDeviceScan();
    setScanning(false);
    postToWeb({ type: 'ble_scan_stopped', ok: true });
  };

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data || '{}');
      const action = data?.action;
      if (action === 'request_gps') return requestGps();
      if (action === 'request_push_token') return requestPushToken();
      if (action === 'start_ble_scan') return startBleScan();
      if (action === 'stop_ble_scan') return stopBleScan();
    } catch (e) {
      sendError('bridge', e?.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1 }}>
        <WebView
          ref={webRef}
          source={{ uri: WEB_URL }}
          onMessage={handleMessage}
          onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />

        <View style={{ position: 'absolute', left: 12, bottom: 16, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, maxWidth: '72%' }}>
          <Text style={{ color: '#9CA3AF', fontSize: 10 }} numberOfLines={1}>WEB_URL</Text>
          <Text style={{ color: '#fff', fontSize: 11 }} numberOfLines={1}>{WEB_URL}</Text>
        </View>

        <View style={{ position: 'absolute', right: 12, bottom: 16, flexDirection: 'row', gap: 8 }}>
          {canGoBack && (
            <TouchableOpacity onPress={() => webRef.current?.goBack()} style={{ backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>뒤로</Text>
            </TouchableOpacity>
          )}
          {scanning && (
            <TouchableOpacity onPress={stopBleScan} style={{ backgroundColor: '#7f1d1d', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>BLE 중지</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
