import { requestNativeFeature } from './nativeBridgeService';

export async function requestBluetoothFromService() {
  return requestNativeFeature('bluetooth');
}
