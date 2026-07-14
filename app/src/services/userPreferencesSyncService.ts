import { apiClient } from '../lib/api';
import i18n from '../lib/i18n';
import { bottomTabDefault, useSettingsStore } from '../stores/settingsStore';
import { useSettingsFeatureStore } from '../stores/settingsFeatureStore';
import { useIntegrationStore } from '../stores/integrationStore';
import { useLegalStore } from '../stores/legalStore';

type UserPreferences = {
  language: 'ko' | 'en' | 'ja' | 'zh';
  theme: 'light' | 'dark' | 'system';
  profilePublic: boolean;
  postVisibility: 'public' | 'followers' | 'private';
  diveLogVisibility: 'public' | 'followers' | 'private';
  locationSharing: boolean;
  locationTracking: boolean;
  analyticsEnabled: boolean;
  preferredDiveType: 'scuba' | 'freediving' | 'snorkeling';
  depthUnit: 'm' | 'ft';
  temperatureUnit: 'c' | 'f';
  gasPressureUnit: 'bar' | 'psi';
  units: 'metric' | 'imperial';
  defaultDiveMode: 'recreational' | 'technical';
  emergencyShareEnabled: boolean;
  bottomTabItems: typeof bottomTabDefault;
  blockedUsers: ReturnType<typeof useSettingsFeatureStore.getState>['blockedUsers'];
  emergencyContact: ReturnType<typeof useSettingsFeatureStore.getState>['emergencyContact'];
  insuranceInfo: ReturnType<typeof useSettingsFeatureStore.getState>['insuranceInfo'];
  integrationState: Pick<ReturnType<typeof useIntegrationStore.getState>, 'integrations' | 'syncFailures' | 'autoSyncEnabled' | 'registeredDiveDevices'>;
  legalState: Pick<ReturnType<typeof useLegalStore.getState>, 'consentHistory' | 'legalAgreements' | 'reports' | 'moderationActions'>;
};

let activeUserId = '';
let stopSubscriptions: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized = '';
let syncGeneration = 0;

function snapshot(): UserPreferences {
  const settings = useSettingsStore.getState();
  const features = useSettingsFeatureStore.getState();
  const integrations = useIntegrationStore.getState();
  const legal = useLegalStore.getState();
  return {
    language: settings.language,
    theme: settings.theme,
    profilePublic: settings.profilePublic,
    postVisibility: settings.postVisibility,
    diveLogVisibility: settings.diveLogVisibility,
    locationSharing: settings.locationSharing,
    locationTracking: settings.locationTracking,
    analyticsEnabled: settings.analyticsEnabled,
    preferredDiveType: settings.preferredDiveType,
    depthUnit: settings.depthUnit,
    temperatureUnit: settings.temperatureUnit,
    gasPressureUnit: settings.gasPressureUnit,
    units: settings.units,
    defaultDiveMode: settings.defaultDiveMode,
    emergencyShareEnabled: settings.emergencyShareEnabled,
    bottomTabItems: settings.bottomTabItems as typeof bottomTabDefault,
    blockedUsers: features.blockedUsers,
    emergencyContact: features.emergencyContact,
    insuranceInfo: features.insuranceInfo,
    integrationState: {
      integrations: integrations.integrations,
      syncFailures: integrations.syncFailures,
      autoSyncEnabled: integrations.autoSyncEnabled,
      registeredDiveDevices: integrations.registeredDiveDevices,
    },
    legalState: {
      consentHistory: legal.consentHistory,
      legalAgreements: legal.legalAgreements,
      reports: legal.reports,
      moderationActions: legal.moderationActions,
    },
  };
}

function applyServerPreferences(input: Partial<UserPreferences>) {
  useSettingsStore.setState({
    language: input.language,
    theme: input.theme,
    profilePublic: input.profilePublic,
    postVisibility: input.postVisibility,
    diveLogVisibility: input.diveLogVisibility,
    locationSharing: input.locationSharing,
    locationTracking: input.locationTracking,
    analyticsEnabled: input.analyticsEnabled,
    preferredDiveType: input.preferredDiveType,
    depthUnit: input.depthUnit,
    temperatureUnit: input.temperatureUnit,
    gasPressureUnit: input.gasPressureUnit,
    units: input.units,
    defaultDiveMode: input.defaultDiveMode,
    emergencyShareEnabled: input.emergencyShareEnabled,
    bottomTabItems: input.bottomTabItems,
  });
  useSettingsFeatureStore.setState({
    blockedUsers: input.blockedUsers,
    emergencyContact: input.emergencyContact,
    insuranceInfo: input.insuranceInfo,
  });
  if (input.integrationState) useIntegrationStore.setState(input.integrationState);
  if (input.legalState) useLegalStore.setState(input.legalState);
  if (input.language && i18n.language !== input.language) {
    void i18n.changeLanguage(input.language);
  }
}

function scheduleSave(generation: number) {
  if (!activeUserId || generation !== syncGeneration) return;
  const current = snapshot();
  const serialized = JSON.stringify(current);
  if (serialized === lastSerialized) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!activeUserId || generation !== syncGeneration) return;
    const payload = snapshot();
    const nextSerialized = JSON.stringify(payload);
    if (nextSerialized === lastSerialized) return;
    void apiClient.updateUserPreferences(payload).then((saved) => {
      if (generation !== syncGeneration) return;
      lastSerialized = JSON.stringify(saved);
    }).catch(() => undefined);
  }, 750);
}

export function stopUserPreferencesSync() {
  syncGeneration += 1;
  activeUserId = '';
  lastSerialized = '';
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  stopSubscriptions?.();
  stopSubscriptions = null;
}

export async function startUserPreferencesSync(userId: string) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    stopUserPreferencesSync();
    return;
  }
  if (activeUserId === normalizedUserId && stopSubscriptions) return;

  stopUserPreferencesSync();
  activeUserId = normalizedUserId;
  const generation = syncGeneration;

  try {
    const remote = await apiClient.getUserPreferences();
    if (generation !== syncGeneration || activeUserId !== normalizedUserId) return;
    if (remote.exists) {
      applyServerPreferences(remote.data);
      lastSerialized = JSON.stringify(snapshot());
    } else {
      const saved = await apiClient.updateUserPreferences(snapshot());
      if (generation !== syncGeneration) return;
      lastSerialized = JSON.stringify(saved);
    }
  } catch {
    lastSerialized = JSON.stringify(snapshot());
  }

  if (generation !== syncGeneration || activeUserId !== normalizedUserId) return;
  const unsubscribeSettings = useSettingsStore.subscribe(() => scheduleSave(generation));
  const unsubscribeFeatures = useSettingsFeatureStore.subscribe(() => scheduleSave(generation));
  const unsubscribeIntegrations = useIntegrationStore.subscribe(() => scheduleSave(generation));
  const unsubscribeLegal = useLegalStore.subscribe(() => scheduleSave(generation));
  stopSubscriptions = () => {
    unsubscribeSettings();
    unsubscribeFeatures();
    unsubscribeIntegrations();
    unsubscribeLegal();
  };
}
