import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { DiveLogCard } from '../../components/DiveLogCard';
import { importManualDiveLogs } from '../../services/diveLogSyncService';
import { useDiveLogStore } from '../../stores/diveLogStore';
import { useIntegrationStore } from '../../stores/integrationStore';

type DiveLogFilter = 'all' | 'manual' | 'external' | 'failed';

function formatTime(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

function sortMs(value?: string) {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : 0;
}

export default function DiveLogManagementScreen() {
  const router = useRouter();
  const logs = useDiveLogStore((state) => state.logs);
  const appendImportedLogs = useDiveLogStore((state) => state.appendImportedLogs);
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
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>DiveLog 관리</Text>
          <Text style={{ marginTop: 6, color: '#64748B', lineHeight: 20 }}>
            가져온 로그를 검토하고 편집/공개 범위를 관리합니다. 기기 연결 및 동기화는 다이빙 컴퓨터 관리에서 진행하세요.
          </Text>
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#475569', fontWeight: '600' }}>마지막 로그 업데이트</Text>
            <Text style={{ color: '#0F172A', fontWeight: '700' }}>{formatTime(lastImportedAt)}</Text>
          </View>
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#475569', fontWeight: '600' }}>자동 동기화</Text>
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
            <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>다이빙 컴퓨터 관리 열기</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>동기화 실패 기록</Text>
            <TouchableOpacity onPress={clearSyncFailures}>
              <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>초기화</Text>
            </TouchableOpacity>
          </View>
          {syncFailures.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: '#D9E4F1', borderRadius: 14, backgroundColor: '#fff', padding: 12 }}>
              <Text style={{ color: '#64748B' }}>실패 기록이 없습니다.</Text>
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
                <Text style={{ marginTop: 3, color: '#B91C1C', fontSize: 12 }}>{formatTime(row.at)}</Text>
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
              전체 {logSummary.total} · 수동 {logSummary.manual} · 연동 {logSummary.external} · 실패 {logSummary.failed}
            </Text>
            <View style={{ marginTop: 10, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {([
                { key: 'all', label: '전체' },
                { key: 'manual', label: '수동' },
                { key: 'external', label: '연동' },
                { key: 'failed', label: '실패' },
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
          <Text style={{ marginBottom: 8, fontSize: 17, fontWeight: '800', color: '#0F172A' }}>가져온 DiveLog</Text>
          {displayLogs.map((item) => (
            <DiveLogCard
              key={item.id}
              item={item}
              onPress={() => router.push(`/(tabs)/dive-log-detail?logId=${encodeURIComponent(item.id)}` as never)}
            />
          ))}
          {displayLogs.length === 0 ? (
            <View style={{ marginTop: 8, borderWidth: 1, borderColor: '#D9E4F1', borderRadius: 14, backgroundColor: '#fff', padding: 12 }}>
              <Text style={{ color: '#64748B' }}>선택한 필터에 해당하는 로그가 없습니다.</Text>
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
              const imported = await importManualDiveLogs('me');
              appendImportedLogs(imported);
              Alert.alert('가져오기 완료', `${imported.length}개의 수동 로그를 추가했습니다.`);
            }}
            activeOpacity={0.86}
          >
            <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>수동 로그 가져오기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
