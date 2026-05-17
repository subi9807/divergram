import { useEffect, useState } from 'react';
import type { NativeFeature, NativeFeatureState } from '../native/types';
import { requestBluetoothFromService } from '../services/bleService';
import { requestGpsFromService } from '../services/locationService';
import { loadNativeCapabilities, subscribeNativeState } from '../services/nativeBridgeService';
import { requestPushFromService } from '../services/notificationService';

export default function NativeBridgeTest() {
  const [caps, setCaps] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<NativeFeature | null>(null);
  const [logs, setLogs] = useState<NativeFeatureState[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const [lastAction, setLastAction] = useState<string>('none');

  useEffect(() => {
    loadNativeCapabilities()
      .then((data) => setCaps(data as Record<string, unknown>))
      .catch(() => setCaps({ error: 'capabilities_failed' }));

    return subscribeNativeState((state) => {
      setLogs((prev) => [state, ...prev].slice(0, 20));
      setLoading(null);
    });
  }, []);

  const call = async (feature: NativeFeature) => {
    setTapCount((prev) => prev + 1);
    setLastAction(`${feature} tapped @ ${new Date().toLocaleTimeString()}`);
    setLoading(feature);

    try {
      if (feature === 'gps') {
        await requestGpsFromService();
      } else if (feature === 'bluetooth') {
        await requestBluetoothFromService();
      } else {
        await requestPushFromService();
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl text-gray-900 dark:text-gray-100 space-y-4">
      <h1 className="text-2xl font-bold">Native Bridge Test</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">GPS / Bluetooth / Push 브리지 테스트 페이지</p>

      <div className="rounded-lg border p-4 text-sm bg-white dark:bg-zinc-900">
        <p className="font-semibold mb-2">Capabilities</p>
        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(caps, null, 2)}</pre>
        <p className="mt-2 text-xs text-gray-500">tapCount: {tapCount}</p>
        <p className="text-xs text-gray-500">lastAction: {lastAction}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50" onClick={() => call('gps')} disabled={loading !== null}>
          {loading === 'gps' ? 'GPS 요청 중...' : 'GPS 요청'}
        </button>
        <button className="px-4 py-2 rounded-md bg-emerald-600 text-white disabled:opacity-50" onClick={() => call('bluetooth')} disabled={loading !== null}>
          {loading === 'bluetooth' ? 'Bluetooth 요청 중...' : 'Bluetooth 요청'}
        </button>
        <button className="px-4 py-2 rounded-md bg-violet-600 text-white disabled:opacity-50" onClick={() => call('push')} disabled={loading !== null}>
          {loading === 'push' ? 'Push 요청 중...' : 'Push 요청'}
        </button>
      </div>

      <div className="rounded-lg border p-4 text-sm bg-white dark:bg-zinc-900">
        <p className="font-semibold mb-2">Event Logs (latest 20)</p>
        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(logs, null, 2)}</pre>
      </div>
    </div>
  );
}
