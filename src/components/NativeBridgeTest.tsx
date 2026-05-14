import { useEffect, useState } from 'react';

type NativeState = {
  feature: 'gps' | 'bluetooth' | 'push';
  ok: boolean;
  available: boolean;
  permission?: string;
  payload?: Record<string, unknown>;
  error?: string;
};

declare global {
  interface Window {
    DivergramNative?: {
      getCapabilities: () => Promise<Record<string, unknown>>;
      requestGps: () => Promise<NativeState>;
      requestBluetooth: () => Promise<NativeState>;
      requestPush: () => Promise<NativeState>;
    };
  }
}

export default function NativeBridgeTest() {
  const [caps, setCaps] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<'gps' | 'bluetooth' | 'push' | null>(null);
  const [logs, setLogs] = useState<NativeState[]>([]);

  useEffect(() => {
    window.DivergramNative?.getCapabilities().then(setCaps).catch(() => setCaps({ error: 'capabilities_failed' }));

    const onState = (event: Event) => {
      const detail = (event as CustomEvent<NativeState>).detail;
      if (!detail) return;
      setLogs((prev) => [detail, ...prev].slice(0, 20));
      setLoading(null);
    };

    window.addEventListener('divergram:native-state', onState as EventListener);
    return () => window.removeEventListener('divergram:native-state', onState as EventListener);
  }, []);

  const call = async (feature: 'gps' | 'bluetooth' | 'push') => {
    if (!window.DivergramNative) return;
    setLoading(feature);
    try {
      if (feature === 'gps') await window.DivergramNative.requestGps();
      else if (feature === 'bluetooth') await window.DivergramNative.requestBluetooth();
      else await window.DivergramNative.requestPush();
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl text-gray-900 dark:text-gray-100 space-y-4">
      <h1 className="text-2xl font-bold">Native Bridge Test.</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">GPS / Bluetooth / Push 브리지 테스트 페이지 1</p>

      <div className="rounded-lg border p-4 text-sm bg-white dark:bg-zinc-900">
        <p className="font-semibold mb-2">Capabilities</p>
        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(caps, null, 2)}</pre>
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
