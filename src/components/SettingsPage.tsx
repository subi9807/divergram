import { useEffect, useMemo, useState } from 'react';
import { useAppSettings } from '../contexts/AppSettingsContext';

export default function SettingsPage() {
  const { language, setLanguage, units, setUnits, privacyScope, setPrivacyScope, theme, setTheme, wearables, addWearable, t } = useAppSettings();
  const [bleDevices, setBleDevices] = useState<{ id: string; name: string; rssi?: number }[]>([]);
  const [bleScanning, setBleScanning] = useState(false);

  const isNativeWebView = useMemo(() => typeof window !== 'undefined' && !!(window as any).ReactNativeWebView, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      let data: any = null;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!data) return;
      if (data.type === 'ble_device_found') {
        setBleDevices((prev) => prev.find((d) => d.id === data.id) ? prev : [...prev, { id: data.id, name: data.name, rssi: data.rssi }]);
      }
      if (data.type === 'ble_scan_stopped') setBleScanning(false);
    };

    window.addEventListener('message', onMessage as any);
    document.addEventListener('message', onMessage as any);
    return () => {
      window.removeEventListener('message', onMessage as any);
      document.removeEventListener('message', onMessage as any);
    };
  }, []);

  const sendNative = (action: string) => {
    if (!(window as any).ReactNativeWebView) return;
    (window as any).ReactNativeWebView.postMessage(JSON.stringify({ action }));
  };

  const startBle = () => {
    setBleDevices([]);
    setBleScanning(true);
    sendNative('start_ble_scan');
  };

  const stopBle = () => {
    setBleScanning(false);
    sendNative('stop_ble_scan');
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl text-gray-900 dark:text-gray-100 space-y-8">
      <h1 className="text-2xl font-bold">{t('settingsTitle')}</h1>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">1) {t('language')}</h2>
        <select className="border rounded-md px-3 py-2 bg-transparent" value={language} onChange={(e) => setLanguage(e.target.value as any)}>
          <option value="ko">한국어</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
          <option value="zh">中文</option>
        </select>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">2) {t('units')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">Time
            <select className="mt-1 w-full border rounded-md px-3 py-2 bg-transparent" value={units.time} onChange={(e) => setUnits({ ...units, time: e.target.value as any })}>
              <option value="24h">24h</option>
              <option value="12h">12h</option>
            </select>
          </label>
          <label className="text-sm">Length/Depth
            <select className="mt-1 w-full border rounded-md px-3 py-2 bg-transparent" value={units.length} onChange={(e) => setUnits({ ...units, length: e.target.value as any })}>
              <option value="metric">Metric (m)</option>
              <option value="imperial">Imperial (ft)</option>
            </select>
          </label>
          <label className="text-sm">Pressure
            <select className="mt-1 w-full border rounded-md px-3 py-2 bg-transparent" value={units.pressure} onChange={(e) => setUnits({ ...units, pressure: e.target.value as any })}>
              <option value="bar">bar</option>
              <option value="psi">psi</option>
            </select>
          </label>
          <label className="text-sm">Temperature
            <select className="mt-1 w-full border rounded-md px-3 py-2 bg-transparent" value={units.temperature} onChange={(e) => setUnits({ ...units, temperature: e.target.value as any })}>
              <option value="c">°C</option>
              <option value="f">°F</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">3) {t('wearable')}</h2>
        {!isNativeWebView && <p className="text-sm text-amber-600">앱(WebView)에서만 BLE 스캔이 동작해.</p>}
        <div className="flex gap-2">
          <button onClick={startBle} className="px-3 py-2 rounded-md bg-blue-500 text-white" disabled={!isNativeWebView || bleScanning}>{t('scanBle')}</button>
          <button onClick={stopBle} className="px-3 py-2 rounded-md border" disabled={!bleScanning}>{t('stopBle')}</button>
        </div>
        <div className="space-y-2">
          {bleDevices.map((d) => (
            <div key={d.id} className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-gray-500">{d.id} {typeof d.rssi === 'number' ? `| RSSI ${d.rssi}` : ''}</p>
              </div>
              <button className="px-3 py-1.5 rounded-md border" onClick={() => addWearable(d)}>등록</button>
            </div>
          ))}
          {wearables.length > 0 && <p className="text-sm text-green-600">등록됨: {wearables.map((w) => w.name).join(', ')}</p>}
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">4) {t('privacy')}</h2>
        <select className="border rounded-md px-3 py-2 bg-transparent" value={privacyScope} onChange={(e) => setPrivacyScope(e.target.value as any)}>
          <option value="public">{t('public')}</option>
          <option value="following">{t('following')}</option>
          <option value="followers">{t('followers')}</option>
          <option value="private">{t('private')}</option>
        </select>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">5) {t('theme')}</h2>
        <div className="flex gap-2">
          <button className={`px-3 py-2 rounded-md border ${theme === 'light' ? 'bg-gray-100' : ''}`} onClick={() => setTheme('light')}>라이트</button>
          <button className={`px-3 py-2 rounded-md border ${theme === 'dark' ? 'bg-gray-100 dark:bg-gray-700' : ''}`} onClick={() => setTheme('dark')}>다크</button>
        </div>
      </section>
    </div>
  );
}
