import { useEffect, useMemo, useState } from 'react';
import { AVAILABLE_BOTTOM_NAV_ITEMS, DEFAULT_BOTTOM_NAV_ITEMS, useAppSettings, type BottomNavItemId } from '../contexts/AppSettingsContext';

type BleDevice = { id: string; name: string; rssi?: number };

function SettingsCard({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-[#22252a] dark:bg-[#121212] dark:shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">{eyebrow}</p>}
          <h2 className="text-base font-bold text-gray-950 dark:text-white">{title}</h2>
          {description && <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
        {action}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
      {label}
      <select
        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-[#2f333a] dark:bg-[#17191d] dark:text-white dark:focus:ring-blue-950/40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export default function SettingsPage() {
  const {
    language,
    setLanguage,
    units,
    setUnits,
    privacyScope,
    setPrivacyScope,
    theme,
    setTheme,
    wearables,
    addWearable,
    bottomNavItems,
    setBottomNavItems,
    resetBottomNavItems,
    t,
  } = useAppSettings();
  const [bleDevices, setBleDevices] = useState<BleDevice[]>([]);
  const [bleScanning, setBleScanning] = useState(false);
  const [showBottomNavSheet, setShowBottomNavSheet] = useState(false);
  const [draftBottomNavItems, setDraftBottomNavItems] = useState<BottomNavItemId[]>(bottomNavItems);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'account' | 'app' | 'diving' | 'notifications'>('app');

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

  const bottomNavLabels: Record<BottomNavItemId, string> = {
    home: t('home'),
    explore: t('explore'),
    create: t('create'),
    resorts: t('resorts'),
    location: '지도',
    reels: t('reels'),
    messages: t('messages'),
    notifications: t('notifications'),
    profile: t('profile'),
  };

  const openBottomNavSheet = () => {
    setDraftBottomNavItems(bottomNavItems);
    setShowBottomNavSheet(true);
  };

  const setDraftSlot = (index: number, item: BottomNavItemId) => {
    setDraftBottomNavItems((prev) => {
      const next = [...prev];
      const existingIndex = next.indexOf(item);
      if (existingIndex >= 0) {
        [next[index], next[existingIndex]] = [next[existingIndex], next[index]];
      } else {
        next[index] = item;
      }
      return next;
    });
  };

  const moveDraftSlot = (index: number, direction: -1 | 1) => {
    setDraftBottomNavItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveBottomNavItems = () => {
    setBottomNavItems(draftBottomNavItems);
    setShowBottomNavSheet(false);
  };

  const resetDraftBottomNavItems = () => {
    setDraftBottomNavItems(DEFAULT_BOTTOM_NAV_ITEMS);
  };

  const resetBottomNavNow = () => {
    resetBottomNavItems();
    setDraftBottomNavItems(DEFAULT_BOTTOM_NAV_ITEMS);
  };

  const settingsTabs = [
    { id: 'app' as const, label: '앱', description: '테마와 하단 버튼' },
    { id: 'account' as const, label: '계정', description: '언어와 공개 범위' },
    { id: 'diving' as const, label: '다이빙', description: '단위와 장비' },
    { id: 'notifications' as const, label: '알림', description: '알림 설정' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 pb-28 pt-4 text-gray-900 dark:text-gray-100 md:p-8 md:pb-12">
      <div className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#2563eb] p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Settings</p>
        <h1 className="mt-2 text-3xl font-bold">{t('settingsTitle')}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">자주 쓰는 설정을 위에 모았어요. 언어, 테마, 하단 버튼을 빠르게 바꾸고 세부 설정은 아래에서 관리하세요.</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl bg-white/12 px-3 py-3 backdrop-blur"><b className="block text-sm">{bottomNavItems.length}</b>하단 버튼</div>
          <div className="rounded-2xl bg-white/12 px-3 py-3 backdrop-blur"><b className="block text-sm">{language.toUpperCase()}</b>언어</div>
          <div className="rounded-2xl bg-white/12 px-3 py-3 backdrop-blur"><b className="block text-sm">{theme === 'dark' ? 'Dark' : 'Light'}</b>테마</div>
        </div>
      </div>

      <div className="sticky top-16 z-20 -mx-4 bg-white/90 px-4 py-3 backdrop-blur-md dark:bg-[#1b1d21]/90 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-0 md:backdrop-blur-0 md:dark:bg-transparent">
        <div className="grid grid-cols-4 gap-2 rounded-[24px] border border-gray-200 bg-gray-50 p-1.5 dark:border-[#2f333a] dark:bg-[#121212]">
          {settingsTabs.map((tab) => {
            const isActive = activeSettingsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`rounded-[20px] px-2 py-3 text-center transition ${
                  isActive
                    ? 'bg-black text-white shadow-lg dark:bg-white dark:text-black'
                    : 'text-gray-500 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#202329] dark:hover:text-white'
                }`}
              >
                <span className="block text-sm font-bold">{tab.label}</span>
                <span className={`mt-0.5 hidden text-[11px] md:block ${isActive ? 'opacity-75' : 'opacity-70'}`}>{tab.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeSettingsTab === 'app' && (
        <div className="space-y-4">
          <SettingsCard
            eyebrow="Quick"
            title="하단 네비게이션"
            description="자주 쓰는 버튼 5개를 원하는 순서로 배치하세요."
            action={<button onClick={openBottomNavSheet} className="shrink-0 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-black">버튼 변경</button>}
          >
            <div className="flex flex-wrap gap-2">
              {bottomNavItems.map((item, index) => (
                <span key={item} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-[#202329] dark:text-gray-200">
                  {index + 1}. {bottomNavLabels[item]}
                </span>
              ))}
            </div>
          </SettingsCard>

          <SettingsCard title={t('theme')} description="눈에 편한 화면 모드를 선택하세요.">
            <div className="grid grid-cols-2 gap-2">
              <button className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${theme === 'light' ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'border-gray-200 bg-gray-50 dark:border-[#2f333a] dark:bg-[#17191d]'}`} onClick={() => setTheme('light')}>라이트</button>
              <button className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${theme === 'dark' ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'border-gray-200 bg-gray-50 dark:border-[#2f333a] dark:bg-[#17191d]'}`} onClick={() => setTheme('dark')}>다크</button>
            </div>
          </SettingsCard>
        </div>
      )}

      {activeSettingsTab === 'account' && (
        <div className="space-y-4">
          <SettingsCard title={t('language')} description="앱에서 사용할 언어를 선택하세요.">
            <SelectField label="언어" value={language} onChange={(value) => setLanguage(value as any)}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </SelectField>
          </SettingsCard>

          <SettingsCard title={t('privacy')} description="게시물의 기본 공개 범위를 정하세요.">
            <SelectField label="공개 범위" value={privacyScope} onChange={(value) => setPrivacyScope(value as any)}>
              <option value="public">{t('public')}</option>
              <option value="following">팔로잉에게 공개</option>
              <option value="followers">팔로워에게 공개</option>
              <option value="private">{t('private')}</option>
            </SelectField>
          </SettingsCard>
        </div>
      )}

      {activeSettingsTab === 'diving' && (
        <div className="space-y-4">
          <SettingsCard title={t('units')} description="다이빙 로그에 표시할 단위를 설정하세요.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SelectField label="Time" value={units.time} onChange={(value) => setUnits({ ...units, time: value as any })}>
                <option value="24h">24h</option>
                <option value="12h">12h</option>
              </SelectField>
              <SelectField label="Length/Depth" value={units.length} onChange={(value) => setUnits({ ...units, length: value as any })}>
                <option value="metric">Metric (m)</option>
                <option value="imperial">Imperial (ft)</option>
              </SelectField>
              <SelectField label="Pressure" value={units.pressure} onChange={(value) => setUnits({ ...units, pressure: value as any })}>
                <option value="bar">bar</option>
                <option value="psi">psi</option>
              </SelectField>
              <SelectField label="Temperature" value={units.temperature} onChange={(value) => setUnits({ ...units, temperature: value as any })}>
                <option value="c">°C</option>
                <option value="f">°F</option>
              </SelectField>
            </div>
          </SettingsCard>

          <SettingsCard title={t('wearable')} description="다이빙 컴퓨터나 웨어러블 기기를 앱과 연결하세요.">
            {!isNativeWebView && <p className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">앱(WebView)에서만 BLE 스캔이 동작해요.</p>}
            <div className="flex flex-wrap gap-2">
              <button onClick={startBle} className="rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-45" disabled={!isNativeWebView || bleScanning}>{bleScanning ? t('scanning') : t('scanBle')}</button>
              <button onClick={stopBle} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold dark:border-[#22252a]" disabled={!bleScanning}>{t('stopBle')}</button>
            </div>
            <div className="mt-4 space-y-2">
              {bleDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-[#22252a] dark:bg-[#17191d]">
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-xs text-gray-500">{device.id} {typeof device.rssi === 'number' ? `| RSSI ${device.rssi}` : ''}</p>
                  </div>
                  <button className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm dark:border-[#22252a]" onClick={() => addWearable(device)}>등록</button>
                </div>
              ))}
              {wearables.length > 0 && <p className="text-sm text-green-600">등록됨: {wearables.map((w) => w.name).join(', ')}</p>}
            </div>
          </SettingsCard>
        </div>
      )}

      {activeSettingsTab === 'notifications' && (
        <div className="space-y-4">
          <SettingsCard
            title="알림 설정"
            description="푸시 알림은 아직 준비 중이에요. 먼저 앱 안 알림 페이지와 읽음 상태를 기준으로 정리해둘게요."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl bg-gray-50 p-4 dark:bg-[#17191d]">
                <p className="text-sm font-semibold">현재 상태</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">앱 내 알림 페이지 사용 가능 · Push 미구현</p>
              </div>
              <div className="rounded-3xl bg-gray-50 p-4 dark:bg-[#17191d]">
                <p className="text-sm font-semibold">다음 작업</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">좋아요/댓글/팔로우 필터와 읽음 UX 개선 예정</p>
              </div>
            </div>
          </SettingsCard>
        </div>
      )}

      {showBottomNavSheet && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={() => setShowBottomNavSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[32px] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-[#121212]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">하단 버튼 변경</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">각 슬롯에서 원하는 메뉴를 선택하고 순서를 조정하세요.</p>
              </div>
              <button onClick={() => setShowBottomNavSheet(false)} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm dark:bg-[#262626]">닫기</button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 rounded-3xl bg-gray-50 p-3 dark:bg-[#17191d]">
              {draftBottomNavItems.map((item, index) => (
                <span key={`${item}-preview`} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm dark:bg-[#262626]">
                  {index + 1}. {bottomNavLabels[item]}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              {draftBottomNavItems.map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-3xl border border-gray-200 bg-gray-50 p-3 dark:border-[#2f333a] dark:bg-[#17191d]">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">슬롯 {index + 1}</span>
                    <div className="flex gap-1">
                      <button disabled={index === 0} onClick={() => moveDraftSlot(index, -1)} className="rounded-xl border border-gray-200 px-2 py-1 text-xs disabled:opacity-30 dark:border-[#2f333a]">위</button>
                      <button disabled={index === draftBottomNavItems.length - 1} onClick={() => moveDraftSlot(index, 1)} className="rounded-xl border border-gray-200 px-2 py-1 text-xs disabled:opacity-30 dark:border-[#2f333a]">아래</button>
                    </div>
                  </div>
                  <select
                    value={item}
                    onChange={(e) => setDraftSlot(index, e.target.value as BottomNavItemId)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-[#2f333a] dark:bg-[#202329]"
                  >
                    {AVAILABLE_BOTTOM_NAV_ITEMS.map((option) => (
                      <option key={option} value={option}>{bottomNavLabels[option]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button onClick={resetDraftBottomNavItems} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold dark:border-[#2f333a]">초기화</button>
              <button onClick={() => setShowBottomNavSheet(false)} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold dark:border-[#2f333a]">취소</button>
              <button onClick={saveBottomNavItems} className="rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-black">저장</button>
            </div>
            <button onClick={resetBottomNavNow} className="mt-3 w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 dark:bg-[#202329] dark:text-gray-200">저장된 설정 기본값으로 복원</button>
          </div>
        </div>
      )}
    </div>
  );
}
