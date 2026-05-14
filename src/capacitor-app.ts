import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { registerNativeBridge } from './native/bridge';
import { requestGpsNative } from './native/gps';
import { requestBluetoothNative } from './native/ble';
import { requestPushNative } from './native/push';

export function setupCapacitorApp() {
  if (!Capacitor.isNativePlatform()) return;

  StatusBar.show().catch(() => undefined);
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);
  StatusBar.setStyle({ style: Style.Default }).catch(() => undefined);
  StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => undefined);
  Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => undefined);

  registerNativeBridge({
    getCapabilities: async () => ({
      native: true,
      platform: Capacitor.getPlatform(),
      gps: true,
      bluetooth: true,
      push: true,
    }),
    requestGps: requestGpsNative,
    requestBluetooth: requestBluetoothNative,
    requestPush: requestPushNative,
  });

  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    const activeModal = document.querySelector('[data-app-modal="true"]');
    if (activeModal) {
      window.dispatchEvent(new CustomEvent('divergram:close-top-modal'));
      return;
    }

    if (canGoBack) {
      window.history.back();
      return;
    }

    CapacitorApp.exitApp();
  }).catch(() => undefined);
}
