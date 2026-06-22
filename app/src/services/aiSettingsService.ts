import { apiClient } from '../lib/api';
import { useSettingsStore } from '../stores/settingsStore';

export type AiSettingsSnapshot = {
  aiSummaryEnabled: boolean;
  aiPointRecommendEnabled: boolean;
  aiCaptionEnabled: boolean;
  aiRiskDescriptionEnabled: boolean;
  updatedAt?: string;
};

export type AiSettingsSyncState = {
  source: 'backend' | 'local';
  reason?: string;
  settings: AiSettingsSnapshot;
};

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(lowered)) return true;
    if (['0', 'false', 'no', 'off'].includes(lowered)) return false;
  }
  return fallback;
}

function readLocalSettings(): AiSettingsSnapshot {
  const state = useSettingsStore.getState();
  return {
    aiSummaryEnabled: Boolean(state.aiSummaryEnabled),
    aiPointRecommendEnabled: Boolean(state.aiPointRecommendEnabled),
    aiCaptionEnabled: Boolean(state.aiCaptionEnabled),
    aiRiskDescriptionEnabled: Boolean(state.aiRiskDescriptionEnabled),
  };
}

function normalizeSetting(payload: any, fallback: AiSettingsSnapshot): AiSettingsSnapshot {
  const row = payload?.data || payload || {};
  return {
    aiSummaryEnabled: asBoolean(row.aiSummaryEnabled ?? row.ai_summary_enabled, fallback.aiSummaryEnabled),
    aiPointRecommendEnabled: asBoolean(row.aiPointRecommendEnabled ?? row.ai_point_recommend_enabled, fallback.aiPointRecommendEnabled),
    aiCaptionEnabled: asBoolean(row.aiCaptionEnabled ?? row.ai_caption_enabled, fallback.aiCaptionEnabled),
    aiRiskDescriptionEnabled: asBoolean(row.aiRiskDescriptionEnabled ?? row.ai_risk_description_enabled, fallback.aiRiskDescriptionEnabled),
    updatedAt: String(row.updatedAt || row.updated_at || new Date().toISOString()),
  };
}

function toStoreSettings(settings: AiSettingsSnapshot) {
  return {
    aiSummaryEnabled: settings.aiSummaryEnabled,
    aiPointRecommendEnabled: settings.aiPointRecommendEnabled,
    aiCaptionEnabled: settings.aiCaptionEnabled,
    aiRiskDescriptionEnabled: settings.aiRiskDescriptionEnabled,
  };
}

export async function loadAiSettings(): Promise<AiSettingsSyncState> {
  const fallback = readLocalSettings();
  try {
    const result = await apiClient.getAiSetting();
    const normalized = normalizeSetting(result, fallback);
    useSettingsStore.setState(toStoreSettings(normalized));
    return { source: 'backend', settings: normalized };
  } catch (error: any) {
    return {
      source: 'local',
      reason: String(error?.response?.data?.error || error?.message || 'ai_settings_backend_unavailable'),
      settings: fallback,
    };
  }
}

export async function saveAiSettings(
  patch: Partial<AiSettingsSnapshot>
): Promise<AiSettingsSyncState> {
  const current = readLocalSettings();
  const next: AiSettingsSnapshot = {
    aiSummaryEnabled: patch.aiSummaryEnabled ?? current.aiSummaryEnabled,
    aiPointRecommendEnabled: patch.aiPointRecommendEnabled ?? current.aiPointRecommendEnabled,
    aiCaptionEnabled: patch.aiCaptionEnabled ?? current.aiCaptionEnabled,
    aiRiskDescriptionEnabled: patch.aiRiskDescriptionEnabled ?? current.aiRiskDescriptionEnabled,
  };

  useSettingsStore.setState(next);

  try {
    const result = await apiClient.updateAiSetting(next);
    const normalized = normalizeSetting(result, next);
    useSettingsStore.setState(toStoreSettings(normalized));
    return { source: 'backend', settings: normalized };
  } catch (error: any) {
    return {
      source: 'local',
      reason: String(error?.response?.data?.error || error?.message || 'ai_settings_backend_save_failed'),
      settings: next,
    };
  }
}
