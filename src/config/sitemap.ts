export type AppRouteId =
  | 'home'
  | 'explore'
  | 'create'
  | 'messages'
  | 'profile'
  | 'resorts'
  | 'reels'
  | 'location'
  | 'notifications'
  | 'settings'
  | 'activity'
  | 'saved'
  | 'admin'
  | 'search'
  | 'account'
  | 'post'
  | 'report'
  | 'feed'
  | 'logs'
  | 'devices'
  | 'profile_edit'
  | 'auth_welcome'
  | 'auth_login'
  | 'auth_privacy'
  | 'auth_terms';

export interface AppRoute {
  id: AppRouteId;
  path: string;
  titleKey: string;
  section: 'tabs' | 'auth';
  visibleInTabBar?: boolean;
}

export const appSitemap: AppRoute[] = [
  { id: 'home', path: '/(tabs)', titleKey: 'tabs.home', section: 'tabs', visibleInTabBar: true },
  { id: 'explore', path: '/(tabs)/explore', titleKey: 'tabs.explore', section: 'tabs', visibleInTabBar: true },
  { id: 'create', path: '/(tabs)/create', titleKey: 'tabs.create', section: 'tabs', visibleInTabBar: true },
  { id: 'messages', path: '/(tabs)/messages', titleKey: 'tabs.messages', section: 'tabs', visibleInTabBar: true },
  { id: 'profile', path: '/(tabs)/profile', titleKey: 'tabs.profile', section: 'tabs', visibleInTabBar: true },
  { id: 'resorts', path: '/(tabs)/resorts', titleKey: 'tabs.resorts', section: 'tabs', visibleInTabBar: true },
  { id: 'reels', path: '/(tabs)/reels', titleKey: 'tabs.reels', section: 'tabs', visibleInTabBar: true },
  { id: 'location', path: '/(tabs)/location', titleKey: 'tabs.location', section: 'tabs', visibleInTabBar: false },
  { id: 'notifications', path: '/(tabs)/notifications', titleKey: 'tabs.notifications', section: 'tabs', visibleInTabBar: false },
  { id: 'settings', path: '/(tabs)/settings', titleKey: 'tabs.settings', section: 'tabs', visibleInTabBar: false },
  { id: 'activity', path: '/(tabs)/activity', titleKey: 'tabs.activity', section: 'tabs', visibleInTabBar: false },
  { id: 'saved', path: '/(tabs)/saved', titleKey: 'tabs.saved', section: 'tabs', visibleInTabBar: false },
  { id: 'admin', path: '/(tabs)/admin', titleKey: 'tabs.admin', section: 'tabs', visibleInTabBar: false },
  { id: 'search', path: '/(tabs)/search', titleKey: 'tabs.search', section: 'tabs', visibleInTabBar: false },
  { id: 'account', path: '/(tabs)/account', titleKey: 'tabs.account', section: 'tabs', visibleInTabBar: false },
  { id: 'post', path: '/(tabs)/post', titleKey: 'tabs.post', section: 'tabs', visibleInTabBar: false },
  { id: 'report', path: '/(tabs)/report', titleKey: 'tabs.report', section: 'tabs', visibleInTabBar: false },
  { id: 'feed', path: '/(tabs)/feed', titleKey: 'tabs.feed', section: 'tabs', visibleInTabBar: false },
  { id: 'logs', path: '/(tabs)/logs', titleKey: 'tabs.create', section: 'tabs', visibleInTabBar: false },
  { id: 'devices', path: '/(tabs)/devices', titleKey: 'tabs.devices', section: 'tabs', visibleInTabBar: false },
  { id: 'profile_edit', path: '/(tabs)/profile-edit', titleKey: 'tabs.profileEdit', section: 'tabs', visibleInTabBar: false },
  { id: 'auth_welcome', path: '/(auth)/welcome', titleKey: 'auth.welcome', section: 'auth' },
  { id: 'auth_login', path: '/(auth)/login', titleKey: 'auth.signIn', section: 'auth' },
  { id: 'auth_privacy', path: '/(auth)/privacy', titleKey: 'auth.privacy', section: 'auth' },
  { id: 'auth_terms', path: '/(auth)/terms', titleKey: 'auth.terms', section: 'auth' },
];

export const appTabSitemap = appSitemap.filter((route) => route.section === 'tabs');

export const appRouteMap = appSitemap.reduce<Record<AppRouteId, AppRoute>>((acc, route) => {
  acc[route.id] = route;
  return acc;
}, {} as Record<AppRouteId, AppRoute>);
