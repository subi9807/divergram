import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { IntegrationStatusCard } from '../../components/IntegrationStatusCard';
import { useIntegrationStore } from '../../stores/integrationStore';
import { connectGarminAccount, disconnectGarminAccount } from '../../services/garminService';
import { connectShearwaterAccount, disconnectShearwaterAccount } from '../../services/shearwaterService';
import { connectSuuntoAccount, disconnectSuuntoAccount } from '../../services/suuntoService';
import { appRouteMap } from '../../config/sitemap';
import type { UserIntegration } from '../../models';
import { apiClient } from '../../lib/api';
import { isInstagramShareAvailable } from '../../services/instagramShareService';
import { flushPendingMediaDeletes, getCloudinaryConfig, getPendingDeleteCount } from '../../services/cloudinaryService';
import { checkAiHealth } from '../../services/aiService';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useTranslation } from 'react-i18next';

const integrationDisplayNameMap: Record<string, string> = {
  google_maps: 'Google Maps',
  stormglass: 'Stormglass',
  garmin: 'Garmin',
  suunto: 'Suunto',
  shearwater: 'Shearwater',
  instagram_share: 'Instagram',
  cloudinary: 'Cloudinary',
  openai: 'OpenAI',
  fcm: 'FCM',
};

const managedConnectionTypes = new Set(['garmin', 'suunto', 'shearwater']);
const DIAGNOSTIC_COOLDOWN_MS = 60 * 1000;
const INITIAL_DIAGNOSTIC_NOW_MS = Date.now();
const hasGoogleMapsKey = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY);
const hasStormglassKey = Boolean(process.env.EXPO_PUBLIC_STORMGLASS_API_KEY || process.env.STORMGLASS_API_KEY);
const cloudinaryConfig = getCloudinaryConfig();

function hasAny(status: string, keywords: string[]) {
  return keywords.some((keyword) => status.includes(keyword));
}

function isFailureStatus(statusMessage?: string) {
  const status = String(statusMessage || '').toLowerCase();
  return hasAny(status, ['\uC2E4\uD328', 'error', 'fail']);
}

function requiresAttention(item: UserIntegration) {
  const status = String(item.statusMessage || '').toLowerCase();
  if (!item.connected && managedConnectionTypes.has(item.type)) return true;
  return hasAny(status, ['\uC2E4\uD328', 'error', 'fail', '\uD544\uC694', '\uB300\uAE30', '\uBBF8\uC9C0\uC6D0']);
}

function priorityScore(item: UserIntegration) {
  const status = String(item.statusMessage || '').toLowerCase();
  const isFailure = hasAny(status, ['\uC2E4\uD328', 'error', 'fail']);
  const isSyncing = hasAny(status, ['\uB3D9\uAE30\uD654\uC911', '\uCC98\uB9AC\uC911', '\uC694\uCCAD']);
  const needsAction = requiresAttention(item);
  const orderMap: Record<string, number> = {
    garmin: 0,
    suunto: 1,
    shearwater: 2,
    google_maps: 3,
    stormglass: 4,
    cloudinary: 5,
    openai: 6,
    fcm: 7,
    instagram_share: 8,
  };
  const order = orderMap[item.type] ?? 99;
  if (isFailure) return [0, order] as const;
  if (!item.connected && managedConnectionTypes.has(item.type)) return [1, order] as const;
  if (isSyncing) return [2, order] as const;
  if (needsAction) return [3, order] as const;
  if (item.connected) return [4, order] as const;
  return [5, order] as const;
}

export default function IntegrationSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isDark } = useResolvedTheme();
  const integrations = useIntegrationStore((state) => state.integrations);
  const syncFailures = useIntegrationStore((state) => state.syncFailures);
  const clearSyncFailures = useIntegrationStore((state) => state.clearSyncFailures);
  const updateIntegration = useIntegrationStore((state) => state.updateIntegration);
  const [syncingType, setSyncingType] = useState<string | null>(null);
  const [togglingType, setTogglingType] = useState<string | null>(null);
  const [showNeedsOnly, setShowNeedsOnly] = useState(false);
  const [showStaleOnly, setShowStaleOnly] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [pendingMediaDeleteCount, setPendingMediaDeleteCount] = useState(() => getPendingDeleteCount());
  const [lastDiagnosticRunMs, setLastDiagnosticRunMs] = useState(0);
  const [diagnosticSummary, setDiagnosticSummary] = useState('');
  const [diagnosticNowMs, setDiagnosticNowMs] = useState(INITIAL_DIAGNOSTIC_NOW_MS);
  const colors = useMemo(
    () => ({
      title: isDark ? '#F1F5F9' : '#0F172A',
      subtitle: isDark ? '#9FB3C8' : '#64748B',
      cardBg: isDark ? '#0F1B2A' : '#ffffff',
      cardBorder: isDark ? '#2A3E52' : '#D7E4F1',
      cardTitle: isDark ? '#E2E8F0' : '#0F172A',
      cardText: isDark ? '#C5D4E2' : '#475569',
      muted: isDark ? '#8FA5BC' : '#64748B',
      filterBorder: isDark ? '#2A3E52' : '#CBD5E1',
      filterBg: isDark ? '#0F1B2A' : '#ffffff',
      emptyText: isDark ? '#9FB3C8' : '#64748B',
      failureWrapBg: isDark ? '#2A151B' : '#FFF5F5',
      failureWrapBorder: isDark ? '#5B2A33' : '#FECACA',
      failureItemBg: isDark ? '#1D1217' : '#ffffff',
      failureItemBorder: isDark ? '#4B222B' : '#FEE2E2',
      failureTitle: isDark ? '#FCA5A5' : '#991B1B',
      failureText: isDark ? '#FCA5A5' : '#991B1B',
      neutralBtnBg: isDark ? '#172534' : '#F8FAFC',
      neutralBtnBorder: isDark ? '#334155' : '#E2E8F0',
      neutralBtnText: isDark ? '#B6C6D8' : '#64748B',
    }),
    [isDark]
  );

  const isStaleIntegration = React.useCallback(
    (item: UserIntegration) => {
      if (!item.connected) return false;
      const syncMs = Date.parse(String(item.lastSyncAt || ''));
      if (!Number.isFinite(syncMs)) return true;
      return diagnosticNowMs - syncMs > 24 * 60 * 60 * 1000;
    },
    [diagnosticNowMs]
  );

  const items = useMemo(
    () =>
      integrations
        .filter((item) => ['google_maps', 'stormglass', 'garmin', 'suunto', 'shearwater', 'instagram_share', 'cloudinary', 'openai', 'fcm'].includes(item.type))
        .sort((a, b) => {
          const [aPriority, aOrder] = priorityScore(a);
          const [bPriority, bOrder] = priorityScore(b);
          if (aPriority !== bPriority) return aPriority - bPriority;
          if (aOrder !== bOrder) return aOrder - bOrder;
          const aSync = Date.parse(String(a.lastSyncAt || ''));
          const bSync = Date.parse(String(b.lastSyncAt || ''));
          if (Number.isFinite(aSync) && Number.isFinite(bSync)) return bSync - aSync;
          return 0;
        }),
    [integrations]
  );
  const summary = useMemo(() => {
    const connected = items.filter((item) => item.connected).length;
    const needsAction = items.filter((item) => requiresAttention(item)).length;
    const syncing = items.filter((item) => hasAny(String(item.statusMessage || '').toLowerCase(), ['\uB3D9\uAE30\uD654\uC911', '\uCC98\uB9AC\uC911', '\uC694\uCCAD', 'sync', 'processing', 'request'])).length;
    const failed = items.filter((item) => hasAny(String(item.statusMessage || '').toLowerCase(), ['\uC2E4\uD328', 'error', 'fail'])).length;
    const disconnectedManaged = items.filter((item) => managedConnectionTypes.has(item.type) && !item.connected).length;
      const stale = items.filter((item) => {
        if (!item.connected) return false;
        const syncMs = Date.parse(String(item.lastSyncAt || ''));
        if (!Number.isFinite(syncMs)) return true;
        return diagnosticNowMs - syncMs > 24 * 60 * 60 * 1000;
      }).length;
    return { connected, needsAction, syncing, failed, stale, disconnectedManaged, total: items.length };
  }, [diagnosticNowMs, items]);
  const displayItems = useMemo(() => {
    return items.filter((item) => {
      if (showNeedsOnly && !requiresAttention(item)) return false;
      if (showStaleOnly && !isStaleIntegration(item)) return false;
      return true;
    });
  }, [isStaleIntegration, items, showNeedsOnly, showStaleOnly]);
  const failedManagedItems = useMemo(
    () => items.filter((item) => managedConnectionTypes.has(item.type) && item.connected && isFailureStatus(item.statusMessage)),
    [items]
  );
  const lastDiagnosticAt = useMemo(() => {
    const targets = items.filter((item) => ['cloudinary', 'fcm', 'instagram_share'].includes(item.type));
    const latestMs = targets.reduce((best, item) => {
      const ms = Date.parse(String(item.lastSyncAt || ''));
      if (!Number.isFinite(ms)) return best;
      return ms > best ? ms : best;
    }, 0);
    if (!latestMs) return '';
    return new Date(latestMs).toLocaleString();
  }, [items]);
  const diagnosticCooldownSec = useMemo(() => {
    if (!lastDiagnosticRunMs) return 0;
    const remainMs = DIAGNOSTIC_COOLDOWN_MS - (diagnosticNowMs - lastDiagnosticRunMs);
    if (remainMs <= 0) return 0;
    return Math.max(1, Math.ceil(remainMs / 1000));
  }, [diagnosticNowMs, lastDiagnosticRunMs]);

  const runIntegrationDiagnostics = useCallback(
    async (silent = false) => {
      if (diagnosing) return;
      const nowMs = Date.now();
      if (!silent && lastDiagnosticRunMs && nowMs - lastDiagnosticRunMs < DIAGNOSTIC_COOLDOWN_MS) {
        const remainSec = Math.max(1, Math.ceil((DIAGNOSTIC_COOLDOWN_MS - (nowMs - lastDiagnosticRunMs)) / 1000));
        Alert.alert(t('integrationSettings.waitTitle'), t('integrationSettings.waitBody', { seconds: remainSec }));
        return;
      }
      setDiagnosing(true);
      const now = new Date().toISOString();
      const errors: string[] = [];
      let successCount = 0;
      try {
        updateIntegration('google_maps', {
          connected: hasGoogleMapsKey,
          statusMessage: `i18nKey:${hasGoogleMapsKey ? 'integrationSettings.apiKeyReady' : 'integrationSettings.apiKeyRequired'}`,
          lastSyncAt: now,
        });
        if (hasGoogleMapsKey) successCount += 1;
        else errors.push('GoogleMaps:key_missing');

        updateIntegration('stormglass', {
          connected: hasStormglassKey,
          statusMessage: `i18nKey:${hasStormglassKey ? 'integrationSettings.apiKeyReady' : 'integrationSettings.apiKeyRequired'}`,
          lastSyncAt: now,
        });
        if (hasStormglassKey) successCount += 1;
        else errors.push('Stormglass:key_missing');

        try {
          await apiClient.getNotificationSetting();
          updateIntegration('fcm', {
            connected: true,
            statusMessage: 'i18nKey:integrationSettings.settingsReady',
            lastSyncAt: now,
          });
          successCount += 1;
        } catch (error: any) {
          const status = Number(error?.response?.status || 0);
          updateIntegration('fcm', {
            connected: false,
            statusMessage: `i18nKey:${status === 401 ? 'integrationSettings.loginRequired' : 'integrationSettings.settingsReviewRequired'}`,
            lastSyncAt: now,
          });
          errors.push(`FCM:${status || 'error'}`);
        }

        try {
          await apiClient.requestCloudinarySignedUpload({
            resourceType: 'image',
            fileName: 'integration-health-check.jpg',
            folder: 'divergram',
          });
          updateIntegration('cloudinary', {
            connected: true,
            statusMessage: 'i18nKey:integrationSettings.signedApiReady',
            lastSyncAt: now,
          });
          successCount += 1;
        } catch (error: any) {
          const status = Number(error?.response?.status || 0);
          const code = String(error?.response?.data?.error || error?.code || '').toLowerCase();
          const required = Array.isArray(error?.response?.data?.required)
            ? error.response.data.required.join(', ')
            : '';
          if (cloudinaryConfig.canUnsignedUpload) {
            updateIntegration('cloudinary', {
              connected: true,
              statusMessage: 'i18nKey:integrationSettings.unsignedUploadReady',
              lastSyncAt: now,
            });
            successCount += 1;
          } else {
            updateIntegration('cloudinary', {
              connected: false,
              statusMessage:
                status === 401
                  ? t('integrationSettings.loginRequired')
                  : code.includes('cloudinary_not_configured')
                    ? required
                      ? t('integrationSettings.configurationRequiredDetail', { required })
                      : t('integrationSettings.cloudinaryKeyRequired')
                    : t('integrationSettings.signedApiReviewRequired'),
              lastSyncAt: now,
            });
            errors.push(`Cloudinary:${status || code || 'error'}`);
          }
        }

        try {
          const ai = await checkAiHealth();
          updateIntegration('openai', {
            connected: ai.status === 'ready',
            statusMessage: ai.message,
            lastSyncAt: now,
          });
          if (ai.status === 'ready') successCount += 1;
          else errors.push(`OpenAI:${ai.status}`);
        } catch {
          updateIntegration('openai', {
            connected: false,
          statusMessage: 'i18nKey:integrationSettings.responseCheckFailed',
            lastSyncAt: now,
          });
          errors.push('OpenAI:error');
        }

        try {
          const installed = await isInstagramShareAvailable();
          updateIntegration('instagram_share', {
            connected: installed,
            statusMessage: `i18nKey:${installed ? 'integrationSettings.shareReady' : 'integrationSettings.shareFallback'}`,
            lastSyncAt: now,
          });
          if (installed) successCount += 1;
          else errors.push('Instagram:not_installed');
        } catch {
          updateIntegration('instagram_share', {
            connected: false,
            statusMessage: 'i18nKey:integrationSettings.shareCheckFailed',
            lastSyncAt: now,
          });
          errors.push('Instagram:error');
        }

        setDiagnosticSummary(errors.length ? errors.join(' | ') : t('integrationSettings.healthyCount', { count: successCount }));
        if (!silent) {
          const summary = errors.length
            ? t('integrationSettings.diagnosticCounts', { success: successCount, errors: errors.length })
            : t('integrationSettings.allHealthy');
          Alert.alert(t('integrationSettings.diagnosticComplete'), summary);
        }
      } finally {
        const doneMs = Date.now();
        setDiagnosticNowMs(doneMs);
        setLastDiagnosticRunMs(doneMs);
        setDiagnosing(false);
      }
    },
    [diagnosing, lastDiagnosticRunMs, t, updateIntegration]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void runIntegrationDiagnostics(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [runIntegrationDiagnostics]);

  useEffect(() => {
    if (!lastDiagnosticRunMs) return;
    if (diagnosticCooldownSec <= 0) return;
    const timer = setInterval(() => {
      setDiagnosticNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [diagnosticCooldownSec, lastDiagnosticRunMs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPendingMediaDeleteCount(getPendingDeleteCount());
    }, 0);
    return () => clearTimeout(timer);
  }, [integrations]);

  const retryFailedManagedItems = () => {
    if (!failedManagedItems.length) {
      Alert.alert(t('integrationSettings.noRetryTitle'), t('integrationSettings.noRetryBody'));
      return;
    }
    const now = new Date().toISOString();
    failedManagedItems.forEach((item) => {
      updateIntegration(item.type, {
        connected: true,
        statusMessage: 'i18nKey:integrationSettings.syncRequestedAgain',
        lastSyncAt: now,
      });
    });
    Alert.alert(t('integrationSettings.retryComplete'), t('integrationSettings.retryCompleteBody', { count: failedManagedItems.length }));
  };

  const clearPendingMediaDeletes = async () => {
    try {
      const result = await flushPendingMediaDeletes(30);
      setPendingMediaDeleteCount(result.remaining);
      Alert.alert(t('integrationSettings.cleanupComplete'), t('integrationSettings.cleanupSummary', result));
    } catch (error: any) {
      Alert.alert(t('integrationSettings.cleanupFailed'), String(error?.message || error));
    }
  };

  const openIntegrationDetail = (type: string) => {
    if (type === 'stormglass') {
      router.push(appRouteMap.marine_weather.path as never);
      return;
    }
    if (type === 'fcm') {
      router.push(appRouteMap.notification_settings.path as never);
      return;
    }
    if (type === 'openai') {
      router.push(appRouteMap.ai_settings.path as never);
      return;
    }
    if (type === 'google_maps') {
      router.push(appRouteMap.location.path as never);
      return;
    }
    Alert.alert(t('integrationSettings.notice'), t('integrationSettings.appSettingsInfo', { type }));
  };

  const connectProvider = async (type: string) => {
    if (type === 'garmin') return connectGarminAccount();
    if (type === 'suunto') return connectSuuntoAccount();
    if (type === 'shearwater') return connectShearwaterAccount();
    return { connected: true, accountLabel: type };
  };

  const isTestModeAccount = (label?: string) => /\(mock\)/i.test(String(label || ''));

  const normalizeAccountLabel = (label?: string) =>
    String(label || '')
      .replace(/\(mock\)/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const disconnectProvider = async (type: string) => {
    if (type === 'garmin') return disconnectGarminAccount();
    if (type === 'suunto') return disconnectSuuntoAccount();
    if (type === 'shearwater') return disconnectShearwaterAccount();
    return;
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.title }}>{t('integrationSettings.title')}</Text>
        <Text style={{ marginTop: 8, color: colors.subtitle }}>
          {t('integrationSettings.subtitle')}
        </Text>
        <View style={{ marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 12 }}>
          <Text style={{ color: colors.cardTitle, fontWeight: '800' }}>{t('integrationSettings.summaryTitle')}</Text>
          <Text style={{ marginTop: 6, color: colors.cardText }}>
            {t('integrationSettings.summary', summary)}
          </Text>
          <Text style={{ marginTop: 2, color: summary.failed > 0 ? '#B91C1C' : colors.muted, fontSize: 12, fontWeight: '700' }}>
            {t('integrationSettings.prioritySummary', summary)}
          </Text>
          {lastDiagnosticAt ? (
            <Text style={{ marginTop: 2, color: colors.muted, fontSize: 12 }}>
              {t('integrationSettings.lastDiagnostic')}: {lastDiagnosticAt}
            </Text>
          ) : null}
          {diagnosticSummary ? (
            <Text style={{ marginTop: 2, color: diagnosticSummary.includes(':') || diagnosticSummary.includes('|') ? '#B45309' : '#0F766E', fontSize: 12, fontWeight: '700' }}>
              {t('integrationSettings.diagnosticSummary')}: {diagnosticSummary}
            </Text>
          ) : null}
          {pendingMediaDeleteCount > 0 ? (
            <Text style={{ marginTop: 2, color: '#B45309', fontSize: 12, fontWeight: '700' }}>
              {t('integrationSettings.pendingDeletes', { count: pendingMediaDeleteCount })}
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={() => setShowNeedsOnly((prev) => !prev)}
            style={{
              marginTop: 10,
              alignSelf: 'flex-start',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: showNeedsOnly ? '#0D5FA8' : colors.filterBorder,
              backgroundColor: showNeedsOnly ? '#EAF4FF' : colors.filterBg,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={{ color: showNeedsOnly ? '#0D5FA8' : colors.cardText, fontWeight: '700' }}>
              {t(showNeedsOnly ? 'integrationSettings.showAll' : 'integrationSettings.showNeedsOnly')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowStaleOnly((prev) => !prev)}
            style={{
              marginTop: 8,
              alignSelf: 'flex-start',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: showStaleOnly ? '#B45309' : colors.filterBorder,
              backgroundColor: showStaleOnly ? '#FFF7ED' : colors.filterBg,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={{ color: showStaleOnly ? '#B45309' : colors.cardText, fontWeight: '700' }}>
              {t(showStaleOnly ? 'integrationSettings.showAllStale' : 'integrationSettings.showStaleOnly')}
            </Text>
          </TouchableOpacity>
          <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => runIntegrationDiagnostics(false)}
                disabled={diagnosing || diagnosticCooldownSec > 0}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: diagnosing || diagnosticCooldownSec > 0 ? colors.neutralBtnBorder : '#93C5FD',
                  backgroundColor: diagnosing || diagnosticCooldownSec > 0 ? colors.neutralBtnBg : '#EFF6FF',
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: diagnosing || diagnosticCooldownSec > 0 ? colors.neutralBtnText : '#1D4ED8', fontWeight: '700', fontSize: 12 }}>
                  {diagnosing ? t('integrationSettings.diagnosing') : diagnosticCooldownSec > 0 ? t('integrationSettings.diagnoseCountdown', { seconds: diagnosticCooldownSec }) : t('integrationSettings.diagnose')}
                </Text>
              </TouchableOpacity>
            <TouchableOpacity
              onPress={retryFailedManagedItems}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: failedManagedItems.length ? '#FECACA' : colors.neutralBtnBorder,
                backgroundColor: failedManagedItems.length ? '#FFF1F2' : colors.neutralBtnBg,
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: failedManagedItems.length ? '#B91C1C' : colors.neutralBtnText, fontWeight: '700', fontSize: 12 }}>
                {t('integrationSettings.retryFailed', { count: failedManagedItems.length })}
              </Text>
            </TouchableOpacity>
            {pendingMediaDeleteCount > 0 ? (
              <TouchableOpacity
                onPress={clearPendingMediaDeletes}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#F59E0B',
                  backgroundColor: '#FFFBEB',
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: '#B45309', fontWeight: '700', fontSize: 12 }}>{t('integrationSettings.cleanupDeletes')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => router.push(appRouteMap.bluetooth_devices.path as never)}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#BFDBFE',
                backgroundColor: '#EFF6FF',
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: '#1D4ED8', fontWeight: '700', fontSize: 12 }}>{t('integrationSettings.manageComputers')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(appRouteMap.dive_log_management.path as never)}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#CFFAFE',
                backgroundColor: '#ECFEFF',
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: '#0F766E', fontWeight: '700', fontSize: 12 }}>{t('integrationSettings.manageDiveLogs')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ marginTop: 16 }}>
          {syncFailures.length ? (
            <View style={{ marginBottom: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.failureWrapBorder, backgroundColor: colors.failureWrapBg, padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.failureTitle, fontWeight: '800' }}>{t('integrationSettings.recentFailures')}</Text>
                <TouchableOpacity onPress={clearSyncFailures}>
                  <Text style={{ color: '#B91C1C', fontSize: 12, fontWeight: '700' }}>{t('integrationSettings.clearHistory')}</Text>
                </TouchableOpacity>
              </View>
              {syncFailures.slice(0, 3).map((row) => (
                <View key={row.id} style={{ marginTop: 8, borderRadius: 10, backgroundColor: colors.failureItemBg, borderWidth: 1, borderColor: colors.failureItemBorder, padding: 8 }}>
                  <Text style={{ color: colors.failureTitle, fontWeight: '700', fontSize: 12 }}>{integrationDisplayNameMap[row.integrationType] || row.integrationType}</Text>
                  <Text style={{ marginTop: 2, color: colors.failureText, fontSize: 12 }}>{row.message}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {displayItems.map((item) => (
            <IntegrationStatusCard
              key={item.id}
              item={item}
              showActions={managedConnectionTypes.has(item.type)}
              onOpenDetail={() => openIntegrationDetail(item.type)}
              openLabel={t('integrationSettings.openDetails')}
              syncDisabled={syncingType === item.type || togglingType === item.type}
              actionDisabled={syncingType === item.type || togglingType === item.type}
              syncLabel={syncingType === item.type ? t('integrationSettings.syncing') : undefined}
              actionLabel={togglingType === item.type ? t('integrationSettings.processing') : undefined}
              onSync={async () => {
                setSyncingType(item.type);
                try {
                  const displayName = integrationDisplayNameMap[item.type] || item.type;
                  if (!managedConnectionTypes.has(item.type)) {
                    updateIntegration(item.type, {
                      statusMessage: 'i18nKey:integrationSettings.statusChecked',
                      lastSyncAt: new Date().toISOString(),
                    });
                    openIntegrationDetail(item.type);
                    return;
                  }
                  if (!item.connected) {
                    Alert.alert(t('integrationSettings.integrationRequired'), t('integrationSettings.connectFirst', { name: displayName }));
                    return;
                  }
                  updateIntegration(item.type, {
                    connected: item.connected,
                    statusMessage: `i18nKey:${isTestModeAccount(item.accountLabel) ? 'integrationSettings.syncRequestedTest' : 'integrationSettings.syncRequested'}`,
                    lastSyncAt: new Date().toISOString(),
                  });
                  Alert.alert(
                    t('integrationSettings.sync'),
                    isTestModeAccount(item.accountLabel)
                      ? t('integrationSettings.testSyncRequestedBody', { name: displayName })
                      : t('integrationSettings.syncRequestedBody', { name: displayName })
                  );
                } catch (error: any) {
                  Alert.alert(t('integrationSettings.syncFailed'), String(error?.message || error));
                } finally {
                  setSyncingType(null);
                }
              }}
              onDisconnect={async () => {
                setTogglingType(item.type);
                const nextConnected = !item.connected;
                try {
                  const displayName = integrationDisplayNameMap[item.type] || item.type;
                  if (!managedConnectionTypes.has(item.type)) {
                    openIntegrationDetail(item.type);
                    return;
                  }
                  if (nextConnected) {
                    const connected = await connectProvider(item.type);
                    const testMode = isTestModeAccount(connected.accountLabel);
                    updateIntegration(item.type, {
                      connected: connected.connected,
                      accountLabel: normalizeAccountLabel(connected.accountLabel) || connected.accountLabel,
                      statusMessage: `i18nKey:${testMode ? 'integrationSettings.testModeConnected' : 'integrationSettings.connected'}`,
                    });
                    Alert.alert(
                      t('integrationSettings.connected'),
                      testMode
                        ? t('integrationSettings.testConnectedBody', { name: displayName })
                        : t('integrationSettings.connectedBody', { name: displayName })
                    );
                    return;
                  }
                  await disconnectProvider(item.type);
                  updateIntegration(item.type, {
                    connected: false,
                    accountLabel: undefined,
                    statusMessage: 'i18nKey:integrationSettings.disconnected',
                  });
                  Alert.alert(t('integrationSettings.disconnected'), t('integrationSettings.disconnectedBody', { name: displayName }));
                } catch (error: any) {
                  Alert.alert(t('integrationSettings.actionFailed'), String(error?.message || error));
                } finally {
                  setTogglingType(null);
                }
              }}
            />
          ))}
          {displayItems.length === 0 ? (
            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 14 }}>
              <Text style={{ color: colors.emptyText }}>{t('integrationSettings.noItems')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
