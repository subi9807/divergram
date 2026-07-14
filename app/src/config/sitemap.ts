export type AppRouteId =
  | 'home'
  | 'explore'
  | 'create'
  | 'messages'
  | 'profile'
  | 'resorts'
  | 'resort_detail'
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
  | 'dive_log_management'
  | 'dive_log_detail'
  | 'dive_log_edit'
  | 'integration_settings'
  | 'marine_weather'
  | 'bluetooth_devices'
  | 'certifications'
  | 'license_management'
  | 'notification_settings'
  | 'ai_settings'
  | 'policy_center'
  | 'policy_document'
  | 'terms_policy'
  | 'privacy_policy'
  | 'location_policy'
  | 'community_policy'
  | 'safety_disclaimer'
  | 'ai_usage_policy'
  | 'open_source_licenses'
  | 'app_info'
  | 'donate'
  | 'settings_detail'
  | 'auth_tutorial'
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
  { id: 'create', path: '/(tabs)/create', titleKey: 'tabs.create', section: 'tabs', visibleInTabBar: false },
  { id: 'messages', path: '/(tabs)/messages', titleKey: 'tabs.messages', section: 'tabs', visibleInTabBar: false },
  { id: 'profile', path: '/(tabs)/profile', titleKey: 'tabs.profile', section: 'tabs', visibleInTabBar: true },
  { id: 'resorts', path: '/(tabs)/resorts', titleKey: 'tabs.resorts', section: 'tabs', visibleInTabBar: false },
  { id: 'resort_detail', path: '/(tabs)/resort-detail', titleKey: 'tabs.resorts', section: 'tabs', visibleInTabBar: false },
  { id: 'reels', path: '/(tabs)/reels', titleKey: 'tabs.reels', section: 'tabs', visibleInTabBar: false },
  { id: 'location', path: '/(tabs)/location', titleKey: 'tabs.location', section: 'tabs', visibleInTabBar: true },
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
  { id: 'logs', path: '/(tabs)/logs', titleKey: 'tabs.logs', section: 'tabs', visibleInTabBar: true },
  { id: 'devices', path: '/(tabs)/devices', titleKey: 'tabs.devices', section: 'tabs', visibleInTabBar: false },
  { id: 'profile_edit', path: '/(tabs)/profile-edit', titleKey: 'tabs.profileEdit', section: 'tabs', visibleInTabBar: false },
  { id: 'dive_log_management', path: '/(tabs)/dive-log-management', titleKey: 'settingsPage.diving.diveLogManagement', section: 'tabs', visibleInTabBar: false },
  { id: 'dive_log_detail', path: '/(tabs)/dive-log-detail', titleKey: 'tabs.logs', section: 'tabs', visibleInTabBar: false },
  { id: 'dive_log_edit', path: '/(tabs)/dive-log-edit', titleKey: 'tabs.logs', section: 'tabs', visibleInTabBar: false },
  { id: 'integration_settings', path: '/(tabs)/integration-settings', titleKey: 'settingsPage.sections.account', section: 'tabs', visibleInTabBar: false },
  { id: 'marine_weather', path: '/(tabs)/marine-weather', titleKey: 'settingsPage.notifications.weatherAlert', section: 'tabs', visibleInTabBar: false },
  { id: 'bluetooth_devices', path: '/(tabs)/bluetooth-devices', titleKey: 'tabs.devices', section: 'tabs', visibleInTabBar: false },
  { id: 'certifications', path: '/(tabs)/certifications', titleKey: 'settingsPage.diving.certifications', section: 'tabs', visibleInTabBar: false },
  { id: 'license_management', path: '/(tabs)/license-management', titleKey: 'settingsPage.diving.licenseManagement', section: 'tabs', visibleInTabBar: false },
  { id: 'notification_settings', path: '/(tabs)/notification-settings', titleKey: 'settingsPage.sections.notifications', section: 'tabs', visibleInTabBar: false },
  { id: 'ai_settings', path: '/(tabs)/ai-settings', titleKey: 'settingsPage.sections.app', section: 'tabs', visibleInTabBar: false },
  { id: 'policy_center', path: '/(tabs)/policy-center', titleKey: 'settingsPage.app.policyCenter', section: 'tabs', visibleInTabBar: false },
  { id: 'policy_document', path: '/(tabs)/policy-document', titleKey: 'settingsPage.app.policyCenter', section: 'tabs', visibleInTabBar: false },
  { id: 'terms_policy', path: '/(tabs)/terms-policy', titleKey: 'settingsPage.app.terms', section: 'tabs', visibleInTabBar: false },
  { id: 'privacy_policy', path: '/(tabs)/privacy-policy', titleKey: 'settingsPage.app.privacyPolicy', section: 'tabs', visibleInTabBar: false },
  { id: 'location_policy', path: '/(tabs)/location-policy', titleKey: 'settingsPage.app.locationTerms', section: 'tabs', visibleInTabBar: false },
  { id: 'community_policy', path: '/(tabs)/community-policy', titleKey: 'settingsPage.app.communityPolicy', section: 'tabs', visibleInTabBar: false },
  { id: 'safety_disclaimer', path: '/(tabs)/safety-disclaimer', titleKey: 'settingsPage.app.safetyNotice', section: 'tabs', visibleInTabBar: false },
  { id: 'ai_usage_policy', path: '/(tabs)/ai-usage-policy', titleKey: 'settingsPage.app.aiNotice', section: 'tabs', visibleInTabBar: false },
  { id: 'open_source_licenses', path: '/(tabs)/open-source-licenses', titleKey: 'settingsPage.app.openSourceLicenses', section: 'tabs', visibleInTabBar: false },
  { id: 'app_info', path: '/(tabs)/app-info', titleKey: 'settingsPage.app.appInfo', section: 'tabs', visibleInTabBar: false },
  { id: 'donate', path: '/(tabs)/donate', titleKey: 'settingsPage.app.donate', section: 'tabs', visibleInTabBar: false },
  { id: 'settings_detail', path: '/(tabs)/settings-detail', titleKey: 'tabs.settings', section: 'tabs', visibleInTabBar: false },
  { id: 'auth_tutorial', path: '/(auth)/tutorial', titleKey: 'welcome.getStarted', section: 'auth' },
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
