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
    settingsTitle: '설정', language: '언어', units: '단위', privacy: '게시물 공개 범위', wearable: '웨어러블 기기', theme: '테마', country: '국가',
    public: '전체 공개', friends: '친구만 공개', private: '비공개',
    scanBle: '블루투스 스캔 시작', stopBle: '스캔 중지', lightMode: '라이트 모드', darkMode: '다크 모드', reportIssue: '문제 신고', admin: '관리자', logout: '로그아웃',
    wearableManageBack: '웨어러블 관리로 돌아가기', wearableRegisterTitle: '웨어러블 등록', scanning: '블루투스 스캔 중...', scanPreparing: '스캔 준비 중...', select: '선택', noDeviceYet: '검색된 기기가 아직 없어. 잠시만 기다려줘.', selectedDevice: '선택된 기기', pairNextHint: '다음 버튼을 누르면 페어링 단계로 진행해.', pairDoneNext: '페어링 완료하고 다음', deviceNamePrompt: '기기명을 입력해줘.', next: '다음', registerDone: '등록 완료', registerDoneMsg: '기기 등록이 완료됐어.', goDeviceList: '기기 목록으로 이동', backToSettings: '설정으로 돌아가기', wearableManageTitle: '웨어러블 기기 관리', register: '등록하기', appOnlyBle: '앱(WebView)에서 블루투스 스캔이 동작해.', noWearable: '등록된 기기가 없어.', delete: '삭제', deleteConfirmSuffix: '기기를 삭제할까요?', countrySearch: '국가 검색', languageSearch: '언어 검색', pressure: '압력', temperature: '온도', noData: '없음', goWearableManage: '웨어러블 기기 관리로 이동',
  },
  en: {
    home: 'Home', explore: 'Explore', resorts: 'Resorts', location: 'Dive Map', reels: 'Reels', create: 'Create', messages: 'Messages', notifications: 'Notifications', profile: 'Profile',
    settings: 'Settings', activity: 'Activity', saved: 'Saved', more: 'More',
    settingsTitle: 'Settings', language: 'Language', units: 'Units', privacy: 'Post Visibility', wearable: 'Wearables (BLE)', theme: 'Theme', country: 'Country',
    public: 'Public', friends: 'Friends only', private: 'Private',
    scanBle: 'Start Bluetooth Scan', stopBle: 'Stop Scan', lightMode: 'Light mode', darkMode: 'Dark mode', reportIssue: 'Report issue', admin: 'Admin', logout: 'Log out',
    wearableManageBack: 'Back to Wearables', wearableRegisterTitle: 'Wearable Registration', scanning: 'Bluetooth scanning...', scanPreparing: 'Preparing scan...', select: 'Select', noDeviceYet: 'No device found yet. Please wait.', selectedDevice: 'Selected device', pairNextHint: 'Tap next to continue to pairing.', pairDoneNext: 'Pairing done, next', deviceNamePrompt: 'Enter device name.', next: 'Next', registerDone: 'Registration Complete', registerDoneMsg: 'Device registration is complete.', goDeviceList: 'Go to device list', backToSettings: 'Back to settings', wearableManageTitle: 'Wearable Device Management', register: 'Register', appOnlyBle: 'Bluetooth scan works in app(WebView) only.', noWearable: 'No registered devices.', delete: 'Delete', deleteConfirmSuffix: 'Delete this device?', countrySearch: 'Search country', languageSearch: 'Search language', pressure: 'Pressure', temperature: 'Temperature', noData: 'None', goWearableManage: 'Go to wearable management',
  },
  ja: {
    home: 'ホーム', explore: '探索', resorts: 'リゾート', location: 'ポイント地図', reels: 'リール', create: '投稿作成', messages: 'メッセージ', notifications: '通知', profile: 'プロフィール',
    settings: '設定', activity: 'アクティビティ', saved: '保存済み', more: 'その他',
    settingsTitle: '設定', language: '言語', units: '単位', privacy: '投稿公開範囲', wearable: 'ウェアラブル(BLE)', theme: 'テーマ', country: '国',
    public: '全体公開', friends: '友だちのみ', private: '非公開',
    scanBle: 'Bluetoothスキャン開始', stopBle: 'スキャン停止', lightMode: 'ライトモード', darkMode: 'ダークモード', reportIssue: '問題を報告', admin: '管理者', logout: 'ログアウト',
    wearableManageBack: 'ウェアラブル管理に戻る', wearableRegisterTitle: 'ウェアラブル登録', scanning: 'Bluetoothスキャン中...', scanPreparing: 'スキャン準備中...', select: '選択', noDeviceYet: 'まだ検出された機器がありません。しばらくお待ちください。', selectedDevice: '選択した機器', pairNextHint: '次へを押すとペアリングに進みます。', pairDoneNext: 'ペアリング完了して次へ', deviceNamePrompt: '機器名を入力してください。', next: '次へ', registerDone: '登録完了', registerDoneMsg: '機器登録が完了しました。', goDeviceList: '機器リストへ移動', backToSettings: '設定に戻る', wearableManageTitle: 'ウェアラブル機器管理', register: '登録', appOnlyBle: 'Bluetoothスキャンはアプリ(WebView)でのみ動作します。', noWearable: '登録済み機器がありません。', delete: '削除', deleteConfirmSuffix: 'この機器を削除しますか？', countrySearch: '国を検索', languageSearch: '言語を検索', pressure: '圧力', temperature: '温度', noData: 'なし', goWearableManage: 'ウェアラブル管理へ移動',
  },
  zh: {
    home: '首页', explore: '探索', resorts: '度假村', location: '潜点地图', reels: '短视频', create: '发布', messages: '消息', notifications: '通知', profile: '个人主页',
    settings: '设置', activity: '我的活动', saved: '已收藏', more: '更多',
    settingsTitle: '设置', language: '语言', units: '单位', privacy: '帖子可见范围', wearable: '可穿戴设备(BLE)', theme: '主题', country: '国家',
    public: '公开', friends: '仅好友可见', private: '私密',
    scanBle: '开始蓝牙扫描', stopBle: '停止扫描', lightMode: '浅色模式', darkMode: '深色模式', reportIssue: '问题反馈', admin: '管理员', logout: '退出登录',
    wearableManageBack: '返回设备管理', wearableRegisterTitle: '可穿戴设备注册', scanning: '蓝牙扫描中...', scanPreparing: '准备扫描中...', select: '选择', noDeviceYet: '暂未发现设备，请稍候。', selectedDevice: '已选择设备', pairNextHint: '点击下一步进入配对。', pairDoneNext: '配对完成并继续', deviceNamePrompt: '请输入设备名称。', next: '下一步', registerDone: '注册完成', registerDoneMsg: '设备注册已完成。', goDeviceList: '前往设备列表', backToSettings: '返回设置', wearableManageTitle: '可穿戴设备管理', register: '注册', appOnlyBle: '蓝牙扫描仅在应用(WebView)中可用。', noWearable: '暂无已注册设备。', delete: '删除', deleteConfirmSuffix: '要删除该设备吗？', countrySearch: '搜索国家', languageSearch: '搜索语言', pressure: '压力', temperature: '温度', noData: '无', goWearableManage: '前往设备管理',
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
