import { Platform } from 'react-native';

type BlePlxModule = typeof import('react-native-ble-plx');

let cachedModule: BlePlxModule | null | undefined;

export function getBlePlxModule(): BlePlxModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  if (Platform.OS === 'web') {
    cachedModule = null;
    return cachedModule;
  }

  try {
    cachedModule = require('react-native-ble-plx') as BlePlxModule;
    return cachedModule;
  } catch (error) {
    console.warn('[BLE] react-native-ble-plx 로드 실패', error);
    cachedModule = null;
    return cachedModule;
  }
}

export function hasBlePlxModule() {
  return Boolean(getBlePlxModule()?.BleManager);
}
