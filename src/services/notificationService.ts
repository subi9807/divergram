import { requestNativeFeature } from './nativeBridgeService';

export async function requestPushFromService() {
  return requestNativeFeature('push');
}
