import { requestNativeFeature } from './nativeBridgeService';

export async function requestGpsFromService() {
  return requestNativeFeature('gps');
}
