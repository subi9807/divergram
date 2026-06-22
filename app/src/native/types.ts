export type NativeFeature = 'gps' | 'bluetooth' | 'push';
export type NativePhase = 'request' | 'response';

export type NativeFeatureState = {
  feature: NativeFeature;
  ok: boolean;
  available: boolean;
  permission?: string;
  payload?: Record<string, unknown>;
  error?: string;
  phase?: NativePhase;
  requestId?: string;
  at?: string;
};

export type NativeCapabilities = {
  native: boolean;
  platform: string;
  gps: boolean;
  bluetooth: boolean;
  push: boolean;
  error?: string;
};

export type NativeStateHandler = (state: NativeFeatureState) => void;

export interface DivergramNativeBridge {
  getCapabilities: () => Promise<NativeCapabilities>;
  requestGps: () => Promise<NativeFeatureState>;
  requestBluetooth: () => Promise<NativeFeatureState>;
  requestPush: () => Promise<NativeFeatureState>;
}
