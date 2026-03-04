import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Language = 'ko' | 'en' | 'ja' | 'zh';
type PrivacyScope = 'public' | 'following' | 'followers' | 'private';

type Units = {
  time: '24h' | '12h';
  length: 'metric' | 'imperial';
  pressure: 'bar' | 'psi';
  temperature: 'c' | 'f';
};

type Wearable = { id: string; name: string; rssi?: number };

type AppSettingsContextValue = {
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
  t: (key: string) => string;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

const dict: Record<Language, Record<string, string>> = {
  ko: {
    home: '홈', explore: '탐색', resorts: '리조트', location: '포인트 지도', reels: '릴스', create: '게시물 등록', messages: '메시지', notifications: '알림', profile: '프로필',
    settings: '설정', activity: '내 활동', saved: '저장됨',
    settingsTitle: '설정', language: '언어', units: '단위', privacy: '게시물 공개 범위', wearable: '웨어러블 기기(BLE)', theme: '테마',
    public: '전체 공개', following: '팔로우만', followers: '팔로워만', private: '비공개',
    scanBle: 'BLE 스캔 시작', stopBle: '스캔 중지',
  },
  en: {
    home: 'Home', explore: 'Explore', resorts: 'Resorts', location: 'Dive Map', reels: 'Reels', create: 'Create', messages: 'Messages', notifications: 'Notifications', profile: 'Profile',
    settings: 'Settings', activity: 'Activity', saved: 'Saved',
    settingsTitle: 'Settings', language: 'Language', units: 'Units', privacy: 'Post Visibility', wearable: 'Wearables (BLE)', theme: 'Theme',
    public: 'Public', following: 'Following only', followers: 'Followers only', private: 'Private',
    scanBle: 'Start BLE Scan', stopBle: 'Stop Scan',
  },
  ja: {
    home: 'ホーム', explore: '探索', resorts: 'リゾート', location: 'ポイント地図', reels: 'リール', create: '投稿作成', messages: 'メッセージ', notifications: '通知', profile: 'プロフィール',
    settings: '設定', activity: 'アクティビティ', saved: '保存済み',
    settingsTitle: '設定', language: '言語', units: '単位', privacy: '投稿公開範囲', wearable: 'ウェアラブル(BLE)', theme: 'テーマ',
    public: '全体公開', following: 'フォローのみ', followers: 'フォロワーのみ', private: '非公開',
    scanBle: 'BLEスキャン開始', stopBle: 'スキャン停止',
  },
  zh: {
    home: '首页', explore: '探索', resorts: '度假村', location: '潜点地图', reels: '短视频', create: '发布', messages: '消息', notifications: '通知', profile: '个人主页',
    settings: '设置', activity: '我的活动', saved: '已收藏',
    settingsTitle: '设置', language: '语言', units: '单位', privacy: '帖子可见范围', wearable: '可穿戴设备(BLE)', theme: '主题',
    public: '公开', following: '仅关注', followers: '仅粉丝', private: '私密',
    scanBle: '开始BLE扫描', stopBle: '停止扫描',
  },
};

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('dg_lang') as Language) || 'ko');
  const [units, setUnitsState] = useState<Units>(() => {
    try { return JSON.parse(localStorage.getItem('dg_units') || '') as Units; } catch { return { time: '24h', length: 'metric', pressure: 'bar', temperature: 'c' }; }
  });
  const [privacyScope, setPrivacyScopeState] = useState<PrivacyScope>(() => (localStorage.getItem('dg_privacy') as PrivacyScope) || 'public');
  const [wearables, setWearables] = useState<Wearable[]>(() => {
    try { return JSON.parse(localStorage.getItem('dg_wearables') || '[]'); } catch { return []; }
  });
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => (JSON.parse(localStorage.getItem('darkMode') || 'false') ? 'dark' : 'light'));

  useEffect(() => { localStorage.setItem('dg_lang', language); }, [language]);
  useEffect(() => { localStorage.setItem('dg_units', JSON.stringify(units)); }, [units]);
  useEffect(() => { localStorage.setItem('dg_privacy', privacyScope); }, [privacyScope]);
  useEffect(() => { localStorage.setItem('dg_wearables', JSON.stringify(wearables)); }, [wearables]);
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(theme === 'dark'));
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo<AppSettingsContextValue>(() => ({
    language,
    setLanguage: setLanguageState,
    units,
    setUnits: setUnitsState,
    privacyScope,
    setPrivacyScope: setPrivacyScopeState,
    theme,
    setTheme: setThemeState,
    wearables,
    addWearable: (w) => setWearables((prev) => prev.find((x) => x.id === w.id) ? prev : [...prev, w]),
    t: (key: string) => dict[language]?.[key] || key,
  }), [language, units, privacyScope, theme, wearables]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
