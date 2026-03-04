import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Language = string;
type PrivacyScope = 'public' | 'friends' | 'private';
type CountryCode = string;

type Units = {
  time: '24h' | '12h';
  length: 'metric' | 'imperial';
  pressure: 'bar' | 'psi';
  temperature: 'c' | 'f';
};

type Wearable = { id: string; name: string; rssi?: number };

type AppSettingsContextValue = {
  country: CountryCode;
  setCountry: (v: CountryCode) => void;
  language: Language;
  setLanguage: (v: Language) => void;
  units: Units;
  setUnits: (v: Units) => void;
  privacyScope: PrivacyScope;
  setPrivacyScope: (v: PrivacyScope) => void;
  theme: 'light' | 'dark';
  setTheme: (v: 'light' | 'dark') => void;
  wearables: Wearable[];
  addWearable: (w: Wearable) => void;
  removeWearable: (id: string) => void;
  t: (key: string) => string;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

const dict: Record<string, Record<string, string>> = {
  ko: {
    home: '홈', explore: '탐색', resorts: '리조트', location: '포인트 지도', reels: '릴스', create: '게시물 등록', messages: '메시지', notifications: '알림', profile: '프로필',
    settings: '설정', activity: '내 활동', saved: '저장됨', more: '더보기',
    settingsTitle: '설정', language: '언어', units: '단위', privacy: '게시물 공개 범위', wearable: '웨어러블 기기(BLE)', theme: '테마', country: '국가',
    public: '전체 공개', friends: '친구만 공개', private: '비공개',
    scanBle: 'BLE 스캔 시작', stopBle: '스캔 중지', lightMode: '라이트 모드', darkMode: '다크 모드', reportIssue: '문제 신고', admin: '관리자', logout: '로그아웃',
  },
  en: {
    home: 'Home', explore: 'Explore', resorts: 'Resorts', location: 'Dive Map', reels: 'Reels', create: 'Create', messages: 'Messages', notifications: 'Notifications', profile: 'Profile',
    settings: 'Settings', activity: 'Activity', saved: 'Saved', more: 'More',
    settingsTitle: 'Settings', language: 'Language', units: 'Units', privacy: 'Post Visibility', wearable: 'Wearables (BLE)', theme: 'Theme', country: 'Country',
    public: 'Public', friends: 'Friends only', private: 'Private',
    scanBle: 'Start BLE Scan', stopBle: 'Stop Scan', lightMode: 'Light mode', darkMode: 'Dark mode', reportIssue: 'Report issue', admin: 'Admin', logout: 'Log out',
  },
  ja: {
    home: 'ホーム', explore: '探索', resorts: 'リゾート', location: 'ポイント地図', reels: 'リール', create: '投稿作成', messages: 'メッセージ', notifications: '通知', profile: 'プロフィール',
    settings: '設定', activity: 'アクティビティ', saved: '保存済み', more: 'その他',
    settingsTitle: '設定', language: '言語', units: '単位', privacy: '投稿公開範囲', wearable: 'ウェアラブル(BLE)', theme: 'テーマ', country: '国',
    public: '全体公開', friends: '友だちのみ', private: '非公開',
    scanBle: 'BLEスキャン開始', stopBle: 'スキャン停止', lightMode: 'ライトモード', darkMode: 'ダークモード', reportIssue: '問題を報告', admin: '管理者', logout: 'ログアウト',
  },
  zh: {
    home: '首页', explore: '探索', resorts: '度假村', location: '潜点地图', reels: '短视频', create: '发布', messages: '消息', notifications: '通知', profile: '个人主页',
    settings: '设置', activity: '我的活动', saved: '已收藏', more: '更多',
    settingsTitle: '设置', language: '语言', units: '单位', privacy: '帖子可见范围', wearable: '可穿戴设备(BLE)', theme: '主题', country: '国家',
    public: '公开', friends: '仅好友可见', private: '私密',
    scanBle: '开始BLE扫描', stopBle: '停止扫描', lightMode: '浅色模式', darkMode: '深色模式', reportIssue: '问题反馈', admin: '管理员', logout: '退出登录',
  },
};

const DEFAULT_UNITS: Units = { time: '24h', length: 'metric', pressure: 'bar', temperature: 'c' };

function detectInitialLanguage() {
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase();
  if (nav.startsWith('ko')) return 'ko';
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('zh')) return 'zh';
  return nav || 'en';
}

function detectInitialCountry() {
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const parts = nav.split('-');
  return (parts[1] || 'US').toUpperCase();
}

function unitsFromLocale(language: string, country: string): Units {
  const imperialCountries = new Set(['US', 'LR', 'MM']);
  const imperial = imperialCountries.has(country.toUpperCase()) || language.toLowerCase().startsWith('en-us');
  return {
    time: imperial ? '12h' : '24h',
    length: imperial ? 'imperial' : 'metric',
    pressure: imperial ? 'psi' : 'bar',
    temperature: imperial ? 'f' : 'c',
  };
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<CountryCode>(() => localStorage.getItem('dg_country') || detectInitialCountry());
  const [language, setLanguageState] = useState<Language>(() => localStorage.getItem('dg_lang') || detectInitialLanguage());
  const [units, setUnitsState] = useState<Units>(() => {
    try { return JSON.parse(localStorage.getItem('dg_units') || '') as Units; } catch { return unitsFromLocale(detectInitialLanguage(), detectInitialCountry()); }
  });
  const [privacyScope, setPrivacyScopeState] = useState<PrivacyScope>(() => (localStorage.getItem('dg_privacy') as PrivacyScope) || 'public');
  const [wearables, setWearables] = useState<Wearable[]>(() => {
    try { return JSON.parse(localStorage.getItem('dg_wearables') || '[]'); } catch { return []; }
  });
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => (JSON.parse(localStorage.getItem('darkMode') || 'false') ? 'dark' : 'light'));

  const setLanguage = (v: Language) => {
    setLanguageState(v);
    setUnitsState(unitsFromLocale(v, country));
  };

  const setCountry = (v: CountryCode) => {
    setCountryState(v);
    setUnitsState(unitsFromLocale(language, v));
  };

  useEffect(() => { localStorage.setItem('dg_country', country); }, [country]);
  useEffect(() => { localStorage.setItem('dg_lang', language); }, [language]);
  useEffect(() => { localStorage.setItem('dg_units', JSON.stringify(units || DEFAULT_UNITS)); }, [units]);
  useEffect(() => { localStorage.setItem('dg_privacy', privacyScope); }, [privacyScope]);
  useEffect(() => { localStorage.setItem('dg_wearables', JSON.stringify(wearables)); }, [wearables]);
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(theme === 'dark'));
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo<AppSettingsContextValue>(() => ({
    country,
    setCountry,
    language,
    setLanguage,
    units,
    setUnits: setUnitsState,
    privacyScope,
    setPrivacyScope: setPrivacyScopeState,
    theme,
    setTheme: setThemeState,
    wearables,
    addWearable: (w) => setWearables((prev) => prev.find((x) => x.id === w.id) ? prev : [...prev, w]),
    removeWearable: (id) => setWearables((prev) => prev.filter((w) => w.id !== id)),
    t: (key: string) => dict[language]?.[key] || dict.en?.[key] || key,
  }), [country, language, units, privacyScope, theme, wearables]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
