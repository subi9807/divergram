import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { DiveSourceSummary } from '../../components/DiveSourceSummary';
import { DiveSourceDetails } from '../../components/DiveSourceDetails';
import { useDiveLogStore } from '../../stores/diveLogStore';
import { privateDiveLogService } from '../../services/privateDiveLogService';

export default function DiveLogDetailScreen() {
  const { t } = useTranslation();
  const { logId } = useLocalSearchParams<{ logId?: string }>();
  const router = useRouter();
  const safeLogId = String(logId || '').trim();
  const log = useDiveLogStore((state) => state.getLogById(safeLogId));
  const upsertLog = useDiveLogStore((state) => state.upsertLog);
  const [loading, setLoading] = useState(Boolean(safeLogId && !log));
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const mediaCount = log?.media.length || 0;
  const tags = log?.tags?.length ? log.tags.join(', ') : '-';
  const entryLocation = log?.entryLocation ? `${log.entryLocation.lat}, ${log.entryLocation.lng}` : '-';
  const exitLocation = log?.exitLocation ? `${log.exitLocation.lat}, ${log.exitLocation.lng}` : '-';

  useEffect(() => {
    let cancelled = false;
    if (!safeLogId || log) {
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
    setError('');
    void privateDiveLogService.get(safeLogId)
      .then((result) => { if (!cancelled) upsertLog(result); })
      .catch((reason) => {
        if (cancelled) return;
        const code = String(reason?.response?.data?.error || reason?.message || '');
        setError(code === 'dive_log_not_found' ? 'notFound' : 'failed');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [log, retry, safeLogId, upsertLog]);

  if (loading) {
    return <Screen><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}><ActivityIndicator accessibilityLabel={t('common.loading')} /><Text style={{ color: '#64748B' }}>{t('common.loading')}</Text></View></Screen>;
  }

  if (!log) {
    return <Screen><View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Text accessibilityRole="alert" style={{ color: error === 'notFound' ? '#475569' : '#B91C1C', textAlign: 'center' }}>
        {t(error === 'notFound' ? 'diveManagement.empty' : 'privateDiveLog.failed')}
      </Text>
      {error !== 'notFound' ? <TouchableOpacity style={{ borderRadius: 12, backgroundColor: '#0D5FA8', paddingHorizontal: 18, paddingVertical: 11 }} onPress={() => setRetry((value) => value + 1)}><Text style={{ color: '#fff', fontWeight: '800' }}>{t('common.retry')}</Text></TouchableOpacity> : null}
    </View></Screen>;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>{t('diveDetail.title')}</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>{t('diveDetail.description')}</Text>

        <View style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 16 }}>
          <Text style={{ fontWeight: '800', fontSize: 18, color: '#0F172A' }}>{log?.divePointName || '-'}</Text>
          <Text style={{ marginTop: 8, color: '#475569' }}>{t('diveDetail.date')}: {log?.diveDate || '-'}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.maxDepth')}: {log?.maxDepth ?? '-'}m</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.duration')}: {log?.totalDiveTime ?? '-'}min</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.source')}: {log?.sourceType || '-'}</Text>
          <DiveSourceSummary log={log} />
          <DiveSourceDetails log={log} />
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.buddy')}: {log?.buddyName || '-'}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.entryLocation')}: {entryLocation}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.exitLocation')}: {exitLocation}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.visibility')}: {log?.visibility ?? '-'}m</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.current')}: {log?.currentStrength ?? '-'}kt</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.memo')}: {log?.memo || '-'}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.scope')}: {log?.visibilityType || '-'}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.tags')}: {tags}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>{t('diveDetail.media')}: {t('diveDetail.mediaCount', { count: mediaCount })}</Text>
        </View>

        <TouchableOpacity
          style={{ marginTop: 14, borderRadius: 12, backgroundColor: '#0D5FA8', paddingVertical: 12, alignItems: 'center' }}
          onPress={() => router.push(`/(tabs)/dive-log-edit?logId=${encodeURIComponent(log.id)}` as never)}
          activeOpacity={0.86}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>{t('diveDetail.edit')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
