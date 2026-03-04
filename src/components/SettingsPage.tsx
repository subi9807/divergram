import { useEffect, useMemo, useState } from 'react';
import { useAppSettings } from '../contexts/AppSettingsContext';

type BleDevice = { id: string; name: string; rssi?: number };

const FALLBACK_LANGUAGES = [
  'ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'it', 'ru', 'ar', 'hi', 'th', 'vi', 'id', 'tr', 'nl', 'pl', 'sv', 'uk', 'cs', 'ro', 'hu', 'fi', 'da', 'no', 'el', 'he'
];

function getAllCountries(locale: string) {
  const dn = new Intl.DisplayNames([locale], { type: 'region' });
  const out: Array<{ code: string; label: string }> = [];
  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const code = String.fromCharCode(i) + String.fromCharCode(j);
      const label = dn.of(code);
      if (label && label !== code) out.push({ code, label });
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

function getAllLanguages(locale: string) {
  const dn = new Intl.DisplayNames([locale], { type: 'language' });
  const source = (Intl as any).supportedValuesOf?.('language') || FALLBACK_LANGUAGES;
  const out: Array<{ code: string; label: string }> = [];
  for (const code of source) {
    const short = String(code).toLowerCase();
    if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/.test(short)) continue;
    const label = dn.of(short);
    if (label && label !== short) out.push({ code: short, label });
  }
  const uniq = Array.from(new Map(out.map((x) => [x.code, x])).values());
  return uniq.sort((a, b) => a.label.localeCompare(b.label));
}

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

  const languageOptions = useMemo(() => getAllLanguages(language || 'en'), [language]);

  const countryOptions = useMemo(() => getAllCountries(language || 'en'), [language]);

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
            <p className="text-sm text-gray-600 dark:text-gray-300">등록하기를 누르면 자동으로 BLE 스캔을 시작해. 아래 목록에서 기기를 선택해줘.</p>
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
            <button onClick={() => setWizardStep(3)} className="btn btn-primary">페어링 완료하고 다음</button>
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
              className="btn btn-primary"
            >
              다음
            </button>
          </section>
        )}

        {wizardStep === 4 && (
          <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
            <h2 className="font-semibold">등록 완료</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">기기 등록이 완료됐어.</p>
            <button onClick={() => setView('wearables')} className="btn btn-primary">기기 목록으로 이동</button>
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
          <button onClick={beginWizard} className="btn btn-primary">등록하기</button>
          {!isNativeWebView && <p className="text-sm text-amber-600">앱(WebView)에서 BLE 스캔이 동작해.</p>}
          <div className="space-y-2">
            {wearables.length === 0 && <p className="text-sm text-gray-500">등록된 기기가 없어.</p>}
            {wearables.map((w) => (
              <div key={w.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div>
                  <p className="font-medium">{w.name}</p>
                  <p className="text-xs text-gray-500">{w.id}</p>
                </div>
                <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDeleteWearable(w.id, w.name)}>삭제</button>
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

      <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] bg-white dark:bg-[#1b1d21] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2f333a]">
          <h2 className="font-semibold">{t('country')} / {t('language')}</h2>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-lg border border-gray-200 dark:border-[#3a3f47] p-3 space-y-2">
            <p className="text-sm font-medium">{t('country')}</p>
            <input
              value={countryQuery}
              onChange={(e) => setCountryQuery(e.target.value)}
              placeholder="국가 검색"
              className="form-control"
            />
            <select className="form-select" value={country} onChange={(e) => setCountry(e.target.value)}>
              {filteredCountries.map((c) => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
            </select>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-[#3a3f47] p-3 space-y-2">
            <p className="text-sm font-medium">{t('language')}</p>
            <input
              value={languageQuery}
              onChange={(e) => setLanguageQuery(e.target.value)}
              placeholder="언어 검색"
              className="form-control"
            />
            <select className="form-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {filteredLanguages.map((l) => <option key={l.code} value={l.code}>{l.label} ({l.code})</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-4 bg-white dark:bg-[#1b1d21]">
        <h2 className="font-semibold">{t('units')}</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm mb-2">Time</p>
            <div className="flex gap-2">
              <button className={`btn btn-sm ${units.time === '24h' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setUnits({ ...units, time: '24h' })}>24h</button>
              <button className={`btn btn-sm ${units.time === '12h' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setUnits({ ...units, time: '12h' })}>12h</button>
            </div>
          </div>
          <div>
            <p className="text-sm mb-2">Length/Depth</p>
            <div className="flex gap-2">
              <button className={`btn btn-sm ${units.length === 'metric' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setUnits({ ...units, length: 'metric' })}>m</button>
              <button className={`btn btn-sm ${units.length === 'imperial' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setUnits({ ...units, length: 'imperial' })}>ft</button>
            </div>
          </div>
          <div>
            <p className="text-sm mb-2">압력</p>
            <div className="flex gap-2">
              <button className={`btn btn-sm ${units.pressure === 'bar' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setUnits({ ...units, pressure: 'bar' })}>bar</button>
              <button className={`btn btn-sm ${units.pressure === 'psi' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setUnits({ ...units, pressure: 'psi' })}>psi</button>
            </div>
          </div>
          <div>
            <p className="text-sm mb-2">온도</p>
            <div className="flex gap-2">
              <button className={`btn btn-sm ${units.temperature === 'c' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setUnits({ ...units, temperature: 'c' })}>°C</button>
              <button className={`btn btn-sm ${units.temperature === 'f' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setUnits({ ...units, temperature: 'f' })}>°F</button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
        <h2 className="font-semibold">{t('privacy')}</h2>
        <select className="form-select" value={privacyScope} onChange={(e) => setPrivacyScope(e.target.value as any)}>
          <option value="public">{t('public')}</option>
          <option value="friends">{t('friends')}</option>
          <option value="private">{t('private')}</option>
        </select>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
        <h2 className="font-semibold">{t('theme')}</h2>
        <div className="flex gap-2">
          <button className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setTheme('light')}>{t('lightMode')}</button>
          <button className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setTheme('dark')}>{t('darkMode')}</button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-[#2f333a] p-4 space-y-3 bg-white dark:bg-[#1b1d21]">
        <h2 className="font-semibold">{t('wearable')}</h2>
        <p className="text-sm text-gray-500">등록된 기기: {wearables.length ? wearables.map((w) => w.name).join(', ') : '없음'}</p>
        <button onClick={() => setView('wearables')} className="btn btn-outline-secondary">웨어러블 기기 관리로 이동</button>
      </section>
    </div>
  );
}
