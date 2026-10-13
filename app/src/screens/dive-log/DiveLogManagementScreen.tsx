import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { DiveLogCard } from '../../components/DiveLogCard';
import { importManualDiveLogs } from '../../services/diveLogSyncService';
import { useDiveLogStore } from '../../stores/diveLogStore';
import { useIntegrationStore } from '../../stores/integrationStore';
import { privateDiveLogService } from '../../services/privateDiveLogService';

type DiveLogFilter = 'all' | 'manual' | 'external' | 'failed';

function formatTime(value: string | undefined, locale: string) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString(locale);
}

function sortMs(value?: string) {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : 0;
}

export default function DiveLogManagementScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const router = useRouter();
  const logs = useDiveLogStore((state) => state.logs);
  const appendImportedLogs = useDiveLogStore((state) => state.appendImportedLogs);
  const replaceLogs = useDiveLogStore((state) => state.replaceLogs);
  const setLoadState = useDiveLogStore((state) => state.setLoadState);
  const loading = useDiveLogStore((state) => state.loading);
  const loadError = useDiveLogStore((state) => state.error);
  const [filter, setFilter] = useState<DiveLogFilter>('all');

  const autoSyncEnabled = useIntegrationStore((state) => state.autoSyncEnabled);
  const setAutoSyncEnabled = useIntegrationStore((state) => state.setAutoSyncEnabled);
  const syncFailures = useIntegrationStore((state) => state.syncFailures);
  const clearSyncFailures = useIntegrationStore((state) => state.clearSyncFailures);

  const lastImportedAt = useMemo(() => {
    const rows = [...logs]
      .map((item) => item.updatedAt || item.createdAt)
      .filter(Boolean)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return rows.at(-1) || '';
  }, [logs]);

  const logSummary = useMemo(() => {
    const total = logs.length;
    const manual = logs.filter((item) => item.sourceType === 'manual').length;
    const external = logs.filter((item) => item.sourceType !== 'manual').length;
    const failed = logs.filter((item) => item.syncStatus === 'failed').length;
    return { total, manual, external, failed };
  }, [logs]);

  const displayLogs = useMemo(() => {
    const rows = [...logs].sort((a, b) => sortMs(b.updatedAt || b.createdAt) - sortMs(a.updatedAt || a.createdAt));
    if (filter === 'all') return rows;
    if (filter === 'manual') return rows.filter((item) => item.sourceType === 'manual');
    if (filter === 'external') return rows.filter((item) => item.sourceType !== 'manual');
    return rows.filter((item) => item.syncStatus === 'failed');
  }, [filter, logs]);

  const refreshLogs = async () => {
    setLoadState(true);
    try {
      replaceLogs(await privateDiveLogService.listAll());
    } catch (error: any) {
      setLoadState(false, String(error?.response?.data?.error || error?.message || 'dive_log_load_failed'));
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 12,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#D7E4F1',
            backgroundColor: '#FFFFFF',
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>{t('diveManagement.title')}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/dive-log-archive' as never)} style={{ marginTop: 12, paddingVertical: 12 }}>
            <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{t('privateDiveLog.title')}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/dive-discovery' as never)} style={{ paddingVertical: 12 }}>
            <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{t('diveDiscovery.title')}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/dive-import' as never)} style={{ paddingVertical: 12 }}>
            <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{t('diveImport.title')}</Text>
          </TouchableOpacity>
          <Text style={{ marginTop: 6, color: '#64748B', lineHeight: 20 }}>
            {t('diveManagement.description')}
          </Text>
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#475569', fontWeight: '600' }}>{t('diveManagement.lastUpdated')}</Text>
            <Text style={{ color: '#0F172A', fontWeight: '700' }}>{formatTime(lastImportedAt, locale)}</Text>
          </View>
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#475569', fontWeight: '600' }}>{t('diveManagement.autoSync')}</Text>
            <Switch
              value={autoSyncEnabled}
              onValueChange={setAutoSyncEnabled}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity
            style={{
              marginTop: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#BFDBFE',
              backgroundColor: '#F8FBFF',
              paddingVertical: 12,
              alignItems: 'center',
            }}
            onPress={() => router.push('/(tabs)/bluetooth-devices' as never)}
            activeOpacity={0.86}
          >
            <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>{t('diveManagement.openComputer')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>{t('diveManagement.failures')}</Text>
            <TouchableOpacity onPress={clearSyncFailures}>
              <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{t('diveManagement.clear')}</Text>
            </TouchableOpacity>
          </View>
          {syncFailures.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: '#D9E4F1', borderRadius: 14, backgroundColor: '#fff', padding: 12 }}>
              <Text style={{ color: '#64748B' }}>{t('diveManagement.noFailures')}</Text>
            </View>
          ) : (
            syncFailures.slice(0, 5).map((row) => (
              <View
                key={row.id}
                style={{
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: '#F1D5D5',
                  borderRadius: 14,
                  backgroundColor: '#FFF7F7',
                  padding: 12,
                }}
              >
                <Text style={{ color: '#991B1B', fontWeight: '700' }}>{row.integrationType}</Text>
                <Text style={{ marginTop: 4, color: '#7F1D1D' }}>{row.message}</Text>
                <Text style={{ marginTop: 3, color: '#B91C1C', fontSize: 12 }}>{formatTime(row.at, locale)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 14 }}>
          <View
            style={{
              marginBottom: 10,
              borderWidth: 1,
              borderColor: '#D9E4F1',
              borderRadius: 14,
              backgroundColor: '#fff',
              padding: 12,
            }}
          >
            <Text style={{ color: '#0F172A', fontWeight: '800' }}>
              {t('diveManagement.summary', logSummary)}
            </Text>
            <View style={{ marginTop: 10, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {([
                { key: 'all', label: t('diveManagement.filters.all') },
                { key: 'manual', label: t('diveManagement.filters.manual') },
                { key: 'external', label: t('diveManagement.filters.external') },
                { key: 'failed', label: t('diveManagement.filters.failed') },
              ] as const).map((item) => {
                const active = filter === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setFilter(item.key)}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? '#0D5FA8' : '#CBD5E1',
                      backgroundColor: active ? '#EAF4FF' : '#fff',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: active ? '#0D5FA8' : '#475569', fontWeight: '700' }}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <Text style={{ marginBottom: 8, fontSize: 17, fontWeight: '800', color: '#0F172A' }}>{t('diveManagement.imported')}</Text>
          {loading ? <ActivityIndicator accessibilityLabel={t('common.loading')} color="#0D5FA8" /> : null}
          {loadError ? (
            <TouchableOpacity accessibilityRole="button" onPress={() => void refreshLogs()} style={{ marginBottom: 10, borderRadius: 12, backgroundColor: '#FFF7ED', padding: 12 }}>
              <Text style={{ color: '#9A3412', fontWeight: '700' }}>{t('common.error')} · {t('common.retry')}</Text>
            </TouchableOpacity>
          ) : null}
          {displayLogs.map((item) => (
            <DiveLogCard
              key={item.id}
              item={item}
              onPress={() => router.push(`/(tabs)/dive-log-detail?logId=${encodeURIComponent(item.id)}` as never)}
            />
          ))}
          {!loading && !loadError && displayLogs.length === 0 ? (
            <View style={{ marginTop: 8, borderWidth: 1, borderColor: '#D9E4F1', borderRadius: 14, backgroundColor: '#fff', padding: 12 }}>
              <Text style={{ color: '#64748B' }}>{t('diveManagement.empty')}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={{
              marginTop: 4,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#D9E4F1',
              backgroundColor: '#fff',
              paddingVertical: 12,
              alignItems: 'center',
            }}
            onPress={async () => {
              try {
                const imported = await importManualDiveLogs('me');
                const saved = await privateDiveLogService.createMany(imported as unknown as Record<string, unknown>[]);
                appendImportedLogs(saved);
                Alert.alert(t('diveManagement.importComplete'), t('diveManagement.importCompleteBody', { count: saved.length }));
              } catch {
                Alert.alert(t('common.error'), t('privateDiveLog.failed'));
              }
            }}
            activeOpacity={0.86}
          >
            <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>{t('diveManagement.manualImport')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
