import { useEffect, useMemo, useState } from 'react';
import { useAppSettings } from '../contexts/AppSettingsContext';

type BleDevice = { id: string; name: string; rssi?: number };

const TOP_LANGUAGES = [
  'ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'it', 'ru', 'ar', 'hi', 'th', 'vi', 'id', 'tr', 'nl', 'pl', 'sv', 'uk', 'cs', 'ro', 'hu', 'fi', 'da', 'no', 'el', 'he'
];

const COUNTRIES = ['KR', 'US', 'JP', 'CN', 'TW', 'HK', 'SG', 'TH', 'VN', 'ID', 'PH', 'MY', 'GB', 'FR', 'DE', 'IT', 'ES', 'PT', 'CA', 'AU', 'NZ', 'BR', 'MX', 'AR', 'TR', 'IN', 'SA', 'AE'];

export default function SettingsPage() {
  const {
    country, setCountry,
    language, setLanguage,
    units, setUnits,
    privacyScope, setPrivacyScope,
    theme, setTheme,
    wearables, addWearable, removeWearable,
    t,
  } = useAppSettings();

  const [view, setView] = useState<'main' | 'wearables' | 'wizard'>('main');
  const [countryQuery, setCountryQuery] = useState('');
  const [languageQuery, setLanguageQuery] = useState('');

  const [bleDevices, setBleDevices] = useState<BleDevice[]>([]);
  const [bleScanning, setBleScanning] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedBle, setSelectedBle] = useState<BleDevice | null>(null);
  const [deviceAlias, setDeviceAlias] = useState('');

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
        const next = { id: data.id, name: data.name || 'Unknown Device', rssi: data.rssi };
        setBleDevices((prev) => prev.find((d) => d.id === next.id) ? prev : [...prev, next]);
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

  const languageOptions = useMemo(() => TOP_LANGUAGES.map((code) => ({
    code,
    label: new Intl.DisplayNames([language || 'en'], { type: 'language' }).of(code) || code,
  })), [language]);

  const countryOptions = useMemo(() => COUNTRIES.map((code) => ({
    code,
    label: new Intl.DisplayNames([language || 'en'], { type: 'region' }).of(code) || code,
  })), [language]);

  const filteredLanguages = languageOptions.filter((x) => `${x.label} ${x.code}`.toLowerCase().includes(languageQuery.toLowerCase()));
  const filteredCountries = countryOptions.filter((x) => `${x.label} ${x.code}`.toLowerCase().includes(countryQuery.toLowerCase()));

  const beginWizard = () => {
    setView('wizard');
    setWizardStep(1);
    setSelectedBle(null);
    setDeviceAlias('');
    setBleDevices([]);
    startBle();
  };

  const confirmDeleteWearable = (id: string, name: string) => {
    if (window.confirm(`${name} 기기를 삭제할까요?`)) {
      removeWearable(id);
    }
  };

  if (view === 'wizard') {
    return (
      <div className="p-6 md:p-8 max-w-4xl text-gray-900 dark:text-gray-100 space-y-6">
        <button className="text-sm underline" onClick={() => { stopBle(); setView('wearables'); }}>← 웨어러블 관리로 돌아가기</button>
        <h1 className="text-2xl font-bold">웨어러블 등록 ({wizardStep}/4)</h1>

        {wizardStep === 1 && (
          <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
            <p className="text-sm text-gray-600 dark:text-gray-300">BLE 스캐너에서 기기를 찾는 단계야.</p>
            <div className="flex gap-2">
              <button onClick={startBle} className="px-3 py-2 rounded-md bg-blue-500 text-white" disabled={!isNativeWebView || bleScanning}>스캔 시작</button>
              <button onClick={stopBle} className="px-3 py-2 rounded-md border" disabled={!bleScanning}>스캔 중지</button>
            </div>
            <div className="space-y-2 max-h-72 overflow-auto">
              {bleDevices.map((d) => (
                <button key={d.id} onClick={() => { setSelectedBle(d); setWizardStep(2); stopBle(); }} className="w-full flex items-center justify-between border rounded-md px-3 py-2 text-left">
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.id} {typeof d.rssi === 'number' ? `| RSSI ${d.rssi}` : ''}</p>
                  </div>
                  <span className="text-xs">선택</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {wizardStep === 2 && selectedBle && (
          <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
            <p className="font-medium">선택된 기기: {selectedBle.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">다음 버튼을 누르면 페어링 단계로 진행해.</p>
            <button onClick={() => setWizardStep(3)} className="px-3 py-2 rounded-md bg-blue-500 text-white">페어링 완료하고 다음</button>
          </section>
        )}

        {wizardStep === 3 && selectedBle && (
          <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
            <p className="text-sm">기기명을 입력해줘.</p>
            <input value={deviceAlias} onChange={(e) => setDeviceAlias(e.target.value)} placeholder={selectedBle.name} className="w-full border rounded-md px-3 py-2 bg-transparent" />
            <button
              onClick={() => {
                addWearable({ ...selectedBle, name: deviceAlias.trim() || selectedBle.name });
                setWizardStep(4);
              }}
              className="px-3 py-2 rounded-md bg-blue-500 text-white"
            >
              다음
            </button>
          </section>
        )}

        {wizardStep === 4 && (
          <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
            <h2 className="font-semibold">등록 완료</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">기기 등록이 완료됐어.</p>
            <button onClick={() => setView('wearables')} className="px-3 py-2 rounded-md bg-blue-500 text-white">기기 목록으로 이동</button>
          </section>
        )}
      </div>
    );
  }

  if (view === 'wearables') {
    return (
      <div className="p-6 md:p-8 max-w-4xl text-gray-900 dark:text-gray-100 space-y-6">
        <button className="text-sm underline" onClick={() => setView('main')}>← 설정으로 돌아가기</button>
        <h1 className="text-2xl font-bold">웨어러블 기기 관리</h1>

        <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
          <button onClick={beginWizard} className="px-3 py-2 rounded-md bg-blue-500 text-white">등록하기</button>
          {!isNativeWebView && <p className="text-sm text-amber-600">앱(WebView)에서 BLE 스캔이 동작해.</p>}
          <div className="space-y-2">
            {wearables.length === 0 && <p className="text-sm text-gray-500">등록된 기기가 없어.</p>}
            {wearables.map((w) => (
              <div key={w.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div>
                  <p className="font-medium">{w.name}</p>
                  <p className="text-xs text-gray-500">{w.id}</p>
                </div>
                <button className="px-3 py-1.5 rounded-md border border-red-300 text-red-600" onClick={() => confirmDeleteWearable(w.id, w.name)}>삭제</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl text-gray-900 dark:text-gray-100 space-y-8">
      <h1 className="text-2xl font-bold">{t('settingsTitle')}</h1>

      <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
        <h2 className="font-semibold">{t('country')}</h2>
        <input
          value={countryQuery}
          onChange={(e) => setCountryQuery(e.target.value)}
          placeholder="국가 검색"
          className="w-full border rounded-md px-3 py-2 bg-transparent"
        />
        <select className="w-full border rounded-md px-3 py-2 bg-transparent" value={country} onChange={(e) => setCountry(e.target.value)}>
          {filteredCountries.map((c) => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
        </select>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
        <h2 className="font-semibold">{t('language')}</h2>
        <input
          value={languageQuery}
          onChange={(e) => setLanguageQuery(e.target.value)}
          placeholder="언어 검색"
          className="w-full border rounded-md px-3 py-2 bg-transparent"
        />
        <select className="w-full border rounded-md px-3 py-2 bg-transparent" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {filteredLanguages.map((l) => <option key={l.code} value={l.code}>{l.label} ({l.code})</option>)}
        </select>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-4 bg-white dark:bg-[#1b1d21]">
        <h2 className="font-semibold">{t('units')}</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm mb-2">Time</p>
            <label className="mr-4"><input type="radio" checked={units.time === '24h'} onChange={() => setUnits({ ...units, time: '24h' })} /> 24h</label>
            <label><input type="radio" checked={units.time === '12h'} onChange={() => setUnits({ ...units, time: '12h' })} /> 12h</label>
          </div>
          <div>
            <p className="text-sm mb-2">Length/Depth</p>
            <label className="mr-4"><input type="radio" checked={units.length === 'metric'} onChange={() => setUnits({ ...units, length: 'metric' })} /> m</label>
            <label><input type="radio" checked={units.length === 'imperial'} onChange={() => setUnits({ ...units, length: 'imperial' })} /> ft</label>
          </div>
          <div>
            <p className="text-sm mb-2">압력</p>
            <label className="mr-4"><input type="radio" checked={units.pressure === 'bar'} onChange={() => setUnits({ ...units, pressure: 'bar' })} /> bar</label>
            <label><input type="radio" checked={units.pressure === 'psi'} onChange={() => setUnits({ ...units, pressure: 'psi' })} /> psi</label>
          </div>
          <div>
            <p className="text-sm mb-2">온도</p>
            <label className="mr-4"><input type="radio" checked={units.temperature === 'c'} onChange={() => setUnits({ ...units, temperature: 'c' })} /> °C</label>
            <label><input type="radio" checked={units.temperature === 'f'} onChange={() => setUnits({ ...units, temperature: 'f' })} /> °F</label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
        <h2 className="font-semibold">{t('privacy')}</h2>
        <select className="w-full border rounded-md px-3 py-2 bg-transparent" value={privacyScope} onChange={(e) => setPrivacyScope(e.target.value as any)}>
          <option value="public">{t('public')}</option>
          <option value="friends">{t('friends')}</option>
          <option value="private">{t('private')}</option>
        </select>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
        <h2 className="font-semibold">{t('theme')}</h2>
        <div className="flex gap-2">
          <button className={`px-3 py-2 rounded-md border ${theme === 'light' ? 'bg-gray-100' : ''}`} onClick={() => setTheme('light')}>{t('lightMode')}</button>
          <button className={`px-3 py-2 rounded-md border ${theme === 'dark' ? 'bg-gray-100 dark:bg-[#2b3038]' : ''}`} onClick={() => setTheme('dark')}>{t('darkMode')}</button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
        <h2 className="font-semibold">{t('wearable')}</h2>
        <p className="text-sm text-gray-500">등록된 기기: {wearables.length ? wearables.map((w) => w.name).join(', ') : '없음'}</p>
        <button onClick={() => setView('wearables')} className="px-3 py-2 rounded-md border">웨어러블 기기 관리로 이동</button>
      </section>
    </div>
  );
}
