import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Film,
  Layers3,
  MapPinned,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { dispatchAdminJobs, getStoredAdminKey, setAdminUserBlocked, setStoredAdminKey, updateAdminCertificationStatus, updateAdminReportStatus, type AdminCertification, type AdminReport, type AdminUser } from '../../lib/adminApi';
import { loadAdminDashboardSnapshot, type AdminDashboardItem, type AdminDashboardSnapshot, type AdminModuleState } from '../../lib/adminDashboard';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

const SECTIONS: { key: 'overview' | 'members' | 'resorts' | 'feed' | 'reels' | 'visitors' | 'ads' | 'map' | 'system'; label: string; icon: any }[] = [
  { key: 'overview', label: '대시보드', icon: BarChart3 },
  { key: 'members', label: '회원관리', icon: Users },
  { key: 'resorts', label: '리조트', icon: Store },
  { key: 'feed', label: '피드', icon: BookOpen },
  { key: 'reels', label: '릴스', icon: Film },
  { key: 'visitors', label: '방문자', icon: Activity },
  { key: 'ads', label: '광고', icon: Megaphone },
  { key: 'map', label: '지도', icon: MapPinned },
  { key: 'system', label: '시스템', icon: ClipboardList },
];

function formatNumber(value?: number | string | null) {
  if (value === undefined || value === null || value === '') return '-';
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return new Intl.NumberFormat('ko-KR').format(parsed);
}

function formatDateTime(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return raw;
  return new Date(ms).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusChip({ label, tone = 'default' }: { label: string; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const style =
    tone === 'good'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
        : tone === 'bad'
          ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
          : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return <View className={`rounded-full border px-3 py-1 ${style}`}><Text className="text-[11px] font-bold">{label}</Text></View>;
}

function SectionHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: any }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/40">
        <Icon size={18} color="#0D5FA8" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-slate-950 dark:text-white">{title}</Text>
        <Text className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{subtitle}</Text>
      </View>
    </View>
  );
}

function MetricCard({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <View className="flex-1 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</Text>
      <Text className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{value}</Text>
      <Text className="mt-2 text-xs text-slate-500 dark:text-slate-400">{note}</Text>
    </View>
  );
}

function ContentCard({ item, primaryLabel, secondaryLabel, onPrimaryPress }: { item: AdminDashboardItem; primaryLabel?: string; secondaryLabel?: string; onPrimaryPress?: () => void }) {
  return (
    <View className="mb-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      {item.cover ? <Image source={{ uri: item.cover }} className="h-44 w-full" resizeMode="cover" /> : <View className="h-44 w-full bg-slate-100 dark:bg-slate-800" />}
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="flex-1 text-base font-extrabold text-slate-950 dark:text-white" numberOfLines={1}>{item.title}</Text>
              {item.badge ? <StatusChip label={item.badge} tone={item.badge === '피드' || item.badge === '릴스' || item.badge === '리조트' ? 'good' : 'default'} /> : null}
            </View>
            <Text className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400" numberOfLines={2}>{item.subtitle}</Text>
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap gap-2">
          {item.tags.slice(0, 4).map((tag) => (
            <View key={`${item.id}-${tag}`} className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
              <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">#{tag}</Text>
            </View>
          ))}
        </View>

        <View className="mt-3 flex-row flex-wrap gap-3">
          <Text className="text-[11px] text-slate-500 dark:text-slate-400">미디어 {formatNumber(item.mediaCount || 0)}</Text>
          <Text className="text-[11px] text-slate-500 dark:text-slate-400">좋아요 {formatNumber(item.likes || 0)}</Text>
          <Text className="text-[11px] text-slate-500 dark:text-slate-400">댓글 {formatNumber(item.comments || 0)}</Text>
        </View>

        {item.meta ? <Text className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.meta}</Text> : null}

        {(primaryLabel || secondaryLabel) && (
          <View className="mt-4 flex-row gap-2">
            {primaryLabel ? (
              <Pressable onPress={onPrimaryPress} className="flex-1 rounded-2xl bg-sky-600 px-4 py-3">
                <Text className="text-center text-sm font-extrabold text-white">{primaryLabel}</Text>
              </Pressable>
            ) : null}
            {secondaryLabel ? (
              <View className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <Text className="text-center text-sm font-bold text-slate-600 dark:text-slate-300">{secondaryLabel}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

function VisitorChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <View className="flex-row items-end gap-2">
      {values.map((value, index) => (
        <View key={`${labels[index] || index}`} className="flex-1 items-center">
          <View className="h-[150px] w-full justify-end rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
            <View className="w-full rounded-full bg-sky-500" style={{ height: Math.max(10, (value / max) * 120) }} />
          </View>
          <Text className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{labels[index] || '-'}</Text>
          <Text className="mt-1 text-sm font-extrabold text-slate-950 dark:text-white">{formatNumber(value)}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AdminDashboardScreen() {
  const { isDark } = useResolvedTheme();
  const [adminKey, setAdminKey] = useState(getStoredAdminKey());
  const [activeAdminKey, setActiveAdminKey] = useState(getStoredAdminKey());
  const [activeSection, setActiveSection] = useState<'overview' | 'members' | 'resorts' | 'feed' | 'reels' | 'visitors' | 'ads' | 'map' | 'system'>('overview');
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [operationBusy, setOperationBusy] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | 'general' | 'resort' | 'admin'>('all');
  const [error, setError] = useState('');

  const load = useCallback(async (providedKey?: string) => {
    const key = setStoredAdminKey(providedKey || activeAdminKey || adminKey);
    if (!key) {
      setError('운영 관리자 키를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const next = await loadAdminDashboardSnapshot(key);
      setSnapshot(next);
    } catch (e: any) {
      setError(String(e?.message || '관리자 대시보드를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [activeAdminKey, adminKey]);

  useEffect(() => {
    if (!activeAdminKey.trim()) return;
    const timer = setTimeout(() => {
      void load(activeAdminKey.trim());
    }, 0);
    return () => clearTimeout(timer);
  }, [activeAdminKey, load]);

  const filteredMembers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const rows = snapshot?.users || [];
    return rows.filter((item) => {
      const role = String(item.role || '').toLowerCase();
      const roleGroup = role === 'admin' ? 'admin' : role === 'resort' ? 'resort' : role === 'member' || role === 'user' || !role ? 'general' : 'general';
      if (memberRoleFilter !== 'all' && roleGroup !== memberRoleFilter) return false;
      if (!keyword) return true;
      return `${item.email || ''} ${item.username || ''} ${item.role || ''}`.toLowerCase().includes(keyword);
    });
  }, [memberRoleFilter, searchText, snapshot]);

  const filteredResorts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const rows = snapshot?.resortItems || [];
    if (!keyword) return rows;
    return rows.filter((item) => `${item.title} ${item.subtitle} ${item.meta || ''} ${item.tags.join(' ')}`.toLowerCase().includes(keyword));
  }, [snapshot, searchText]);

  const filteredFeed = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const rows = snapshot?.feedItems || [];
    if (!keyword) return rows;
    return rows.filter((item) => `${item.title} ${item.subtitle} ${item.meta || ''} ${item.tags.join(' ')}`.toLowerCase().includes(keyword));
  }, [snapshot, searchText]);

  const filteredReels = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const rows = snapshot?.reelItems || [];
    if (!keyword) return rows;
    return rows.filter((item) => `${item.title} ${item.subtitle} ${item.meta || ''} ${item.tags.join(' ')}`.toLowerCase().includes(keyword));
  }, [snapshot, searchText]);

  const onToggleBlock = async (item: AdminUser) => {
    if (!(activeAdminKey || adminKey).trim()) return;
    try {
      setOperationBusy(true);
      const updated = await setAdminUserBlocked(activeAdminKey || adminKey, item.id, !item.is_blocked);
      setSnapshot((current) => current ? { ...current, users: current.users.map((row) => (row.id === updated.id ? updated : row)) } : current);
    } catch (e: any) {
      Alert.alert('처리 실패', String(e?.message || '회원 차단 상태를 변경하지 못했습니다.'));
    } finally {
      setOperationBusy(false);
    }
  };

  const onChangeCertification = async (item: AdminCertification, status: string) => {
    if (!(activeAdminKey || adminKey).trim()) return;
    try {
      setOperationBusy(true);
      const updated = await updateAdminCertificationStatus(activeAdminKey || adminKey, item.id, status);
      setSnapshot((current) => current ? { ...current, certifications: current.certifications.map((row) => (row.id === updated.id ? updated : row)) } : current);
    } catch (e: any) {
      Alert.alert('처리 실패', String(e?.message || '자격증 상태를 변경하지 못했습니다.'));
    } finally {
      setOperationBusy(false);
    }
  };

  const onChangeReport = async (item: AdminReport, status: string) => {
    if (!(activeAdminKey || adminKey).trim()) return;
    try {
      setOperationBusy(true);
      const updated = await updateAdminReportStatus(activeAdminKey || adminKey, item.id, status);
      setSnapshot((current) => current ? { ...current, reports: current.reports.map((row) => (row.id === updated.id ? updated : row)) } : current);
    } catch (e: any) {
      Alert.alert('처리 실패', String(e?.message || '신고 상태를 변경하지 못했습니다.'));
    } finally {
      setOperationBusy(false);
    }
  };

  const onDispatchJobs = async () => {
    if (!(activeAdminKey || adminKey).trim()) return;
    try {
      setOperationBusy(true);
      const result = await dispatchAdminJobs(activeAdminKey || adminKey, 50);
      Alert.alert('작업 배포 완료', `처리 ${result.processed ?? result.completed ?? 0}건 / 실패 ${result.failed ?? 0}건`);
      await load(activeAdminKey || adminKey);
    } catch (e: any) {
      Alert.alert('실행 실패', String(e?.message || '작업 배포에 실패했습니다.'));
    } finally {
      setOperationBusy(false);
    }
  };

  const visitor = snapshot?.visitor;
  const modules = useMemo(() => snapshot?.modules || [], [snapshot]);
  const moduleMap = useMemo(
    () => Object.fromEntries(modules.map((item) => [item.key, item])) as Record<string, AdminModuleState>,
    [modules],
  );

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-5">
          <View className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <View className="rounded-full bg-sky-50 px-3 py-1 dark:bg-sky-950/40">
                    <Text className="text-[11px] font-bold text-sky-700 dark:text-sky-200">운영 대시보드</Text>
                  </View>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">관리자 전용</Text>
                </View>
                <Text className="mt-3 text-[28px] font-extrabold leading-tight text-slate-950 dark:text-white sm:text-3xl">
                  운영 대시보드
                </Text>
                <Text className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  회원 · 리조트 · 피드 · 릴스 · 광고 · 방문자 통계를 한 화면에서 관리합니다. 실제 운영 테이블과 관리자 API를 함께 읽어옵니다.
                </Text>
              </View>
              <Pressable onPress={() => void load(activeAdminKey || adminKey)} className="rounded-2xl bg-sky-600 p-3" disabled={loading || operationBusy}>
                {loading ? <ActivityIndicator color="#fff" /> : <RefreshCw size={18} color="#fff" />}
              </Pressable>
            </View>

            <View className="mt-4 flex-row gap-2">
              <TextInput
                value={adminKey}
                onChangeText={setAdminKey}
                secureTextEntry
                autoCapitalize="none"
                placeholder="x-admin-key 입력"
                placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <Pressable
                onPress={() => {
                  const key = setStoredAdminKey(adminKey);
                  setActiveAdminKey(key);
                }}
                className="rounded-2xl bg-slate-950 px-4 py-3 dark:bg-white"
                disabled={loading || operationBusy}
              >
                <Text className="text-sm font-extrabold text-white dark:text-slate-950">연결</Text>
              </Pressable>
            </View>
            {error ? <Text className="mt-3 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</Text> : null}
          </View>
        </View>

        {snapshot ? (
          <>
            <View className="px-5 pt-4">
              <View className="flex-row flex-wrap gap-3">
                {snapshot.overviewCards.map((card) => (
                  <MetricCard key={card.label} label={card.label} value={card.value} note={card.note} />
                ))}
              </View>
            </View>

            <View className="px-5 pt-4">
              <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <SectionHeader title="운영 연결 상태" subtitle="연결됨 / 대기 / 점검필요를 한눈에 확인합니다." icon={Layers3} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
                  <View className="flex-row gap-2">
                    {SECTIONS.map((section) => {
                      const module = moduleMap[section.key] || { status: section.key === 'ads' ? '대기' : '점검필요', count: 0, note: '' } as AdminModuleState;
                      return (
                        <Pressable key={section.key} onPress={() => setActiveSection(section.key)} className={`rounded-full border px-4 py-2 ${activeSection === section.key ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-950/40' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}>
                          <View className="flex-row items-center gap-2">
                            <section.icon size={14} color={activeSection === section.key ? (isDark ? '#7dd3fc' : '#0d5fa8') : (isDark ? '#cbd5e1' : '#64748b')} />
                            <Text className={`text-xs font-bold ${activeSection === section.key ? 'text-sky-700 dark:text-sky-200' : 'text-slate-600 dark:text-slate-300'}`}>{section.label}</Text>
                            <StatusChip label={module.status === '연결됨' ? '연결됨' : module.status} tone={module.status === '연결됨' ? 'good' : module.status === '대기' ? 'warn' : 'bad'} />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
                <View className="mt-4 grid grid-cols-2 gap-3">
                  {modules.map((item) => (
                    <View key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                      <Text className="text-sm font-bold text-slate-950 dark:text-white">{item.label}</Text>
                      <Text className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.note}</Text>
                      <View className="mt-3 flex-row items-center justify-between">
                        <StatusChip label={item.status} tone={item.status === '연결됨' ? 'good' : item.status === '대기' ? 'warn' : 'bad'} />
                        <Text className="text-sm font-extrabold text-slate-950 dark:text-white">{formatNumber(item.count || 0)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {activeSection === 'overview' ? (
              <View className="px-5 pt-4">
                <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <SectionHeader title="시스템 상태" subtitle="CPU / 메모리 / 디스크 / 네트워크" icon={ShieldCheck} />
                  <View className="mt-4 grid grid-cols-2 gap-3">
                    <MetricCard label="서비스" value={snapshot.health?.service || 'admin-api'} note={snapshot.health?.ok ? '정상 연결됨' : '확인 필요'} />
                    <MetricCard label="작업 큐" value={snapshot.jobs.length} note="배포/동기화 작업" />
                    <MetricCard label="지도 포인트" value={snapshot.mapPoints.length} note="포인트/리조트 마커" />
                    <MetricCard label="신고 대기" value={snapshot.reports.length} note="검토 중 신고" />
                  </View>
                  <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                    <View className="grid grid-cols-2 gap-3">
                      <View>
                        <Text className="text-xs text-slate-500 dark:text-slate-400">CPU</Text>
                        <Text className="mt-1 text-sm font-extrabold text-slate-950 dark:text-white">{snapshot.stats?.system?.cpuUsagePct ?? '-'}%</Text>
                      </View>
                      <View>
                        <Text className="text-xs text-slate-500 dark:text-slate-400">메모리</Text>
                        <Text className="mt-1 text-sm font-extrabold text-slate-950 dark:text-white">
                          {snapshot.stats?.system ? `${formatNumber(snapshot.stats.system.memoryUsedGb)} / ${formatNumber(snapshot.stats.system.memoryTotalGb)} GB` : '-'}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-xs text-slate-500 dark:text-slate-400">디스크</Text>
                        <Text className="mt-1 text-sm font-extrabold text-slate-950 dark:text-white">
                          {snapshot.stats?.system?.disk ? `${formatNumber(snapshot.stats.system.disk.usedGb)} / ${formatNumber(snapshot.stats.system.disk.totalGb)} GB` : '-'}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-xs text-slate-500 dark:text-slate-400">네트워크</Text>
                        <Text className="mt-1 text-sm font-extrabold text-slate-950 dark:text-white">
                          {snapshot.stats?.system?.network ? `IN ${formatNumber(snapshot.stats.system.network.inMb)} · OUT ${formatNumber(snapshot.stats.system.network.outMb)}` : '-'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {activeSection === 'members' ? (
              <View className="px-5 pt-4">
                <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <SectionHeader title="회원 관리" subtitle="리조트 회원과 일반 회원을 분리해 관리합니다." icon={Users} />
                  <View className="mt-4 grid grid-cols-2 gap-3">
                    <MetricCard label="일반회원" value={snapshot?.roleBreakdown.general || 0} note="기본 회원" />
                    <MetricCard label="리조트회원" value={snapshot?.roleBreakdown.resort || 0} note="리조트 계정" />
                    <MetricCard label="관리자" value={snapshot?.roleBreakdown.admin || 0} note="운영 계정" />
                    <MetricCard label="미확인" value={snapshot?.roleBreakdown.unknown || 0} note="분류 보류" />
                  </View>
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    {[
                      { key: 'all', label: '전체' },
                      { key: 'general', label: '일반' },
                      { key: 'resort', label: '리조트' },
                      { key: 'admin', label: '관리자' },
                    ].map((item) => (
                      <Pressable key={item.key} onPress={() => setMemberRoleFilter(item.key as any)} className={`rounded-full px-4 py-2 ${memberRoleFilter === item.key ? 'bg-sky-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Text className={`text-sm font-bold ${memberRoleFilter === item.key ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput value={searchText} onChangeText={setSearchText} placeholder="이메일, 닉네임, 역할로 검색" placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white" />
                  <View className="mt-4 space-y-3">
                    {filteredMembers.map((item) => (
                      <View key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="flex-1">
                            <Text className="text-base font-extrabold text-slate-950 dark:text-white">{item.username || item.email || item.id}</Text>
                            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.email || '-'}</Text>
                            <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(item.created_at)}</Text>
                          </View>
                          <StatusChip label={item.is_blocked ? '차단중' : '정상'} tone={item.is_blocked ? 'bad' : 'good'} />
                        </View>
                        <Pressable onPress={() => void onToggleBlock(item)} className={`mt-4 rounded-2xl px-4 py-3 ${item.is_blocked ? 'bg-emerald-600' : 'bg-rose-600'}`} disabled={operationBusy}>
                          <Text className="text-center text-sm font-extrabold text-white">{item.is_blocked ? '차단 해제' : '차단'}</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {activeSection === 'resorts' ? (
              <View className="px-5 pt-4">
                <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <SectionHeader title="리조트 관리" subtitle="리조트 회원의 위치와 기본 정보를 확인합니다." icon={Store} />
                  <TextInput value={searchText} onChangeText={setSearchText} placeholder="국가, 지역, 리조트명, 주소 검색" placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white" />
                  <View className="mt-4 space-y-3">
                    {filteredResorts.map((item) => <ContentCard key={item.id} item={item} primaryLabel="상세보기" secondaryLabel="운영메모" />)}
                  </View>
                </View>
              </View>
            ) : null}

            {activeSection === 'feed' ? (
              <View className="px-5 pt-4">
                <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <SectionHeader title="피드 관리" subtitle="실제 운영 테이블에서 읽은 피드 게시물입니다." icon={BookOpen} />
                  <TextInput value={searchText} onChangeText={setSearchText} placeholder="태그, 제목, 설명으로 검색" placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white" />
                  <View className="mt-4 space-y-3">
                    {filteredFeed.map((item) => <ContentCard key={item.id} item={item} primaryLabel="검수" secondaryLabel="숨김" />)}
                  </View>
                </View>
              </View>
            ) : null}

            {activeSection === 'reels' ? (
              <View className="px-5 pt-4">
                <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <SectionHeader title="릴스 관리" subtitle="릴스 노출과 중간 광고 슬롯 운영을 함께 봅니다." icon={Film} />
                  <TextInput value={searchText} onChangeText={setSearchText} placeholder="태그, 제목, 설명으로 검색" placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white" />
                  <View className="mt-4 space-y-3">
                    {filteredReels.map((item) => <ContentCard key={item.id} item={item} primaryLabel="검수" secondaryLabel="광고 슬롯" />)}
                  </View>
                </View>
              </View>
            ) : null}

            {activeSection === 'visitors' ? (
              <View className="px-5 pt-4">
                <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <SectionHeader title="방문자 통계" subtitle={visitor?.note || '최근 방문자 추정치를 확인합니다.'} icon={Activity} />
                  <View className="mt-4 grid grid-cols-3 gap-3">
                    <MetricCard label="평균" value={Math.round(visitor?.average || 0)} note="최근 DAU 추정 평균" />
                    <MetricCard label="최대" value={visitor?.peak || 0} note="가장 많은 일자" />
                    <MetricCard label="변화" value={visitor ? (visitor.trend >= 0 ? `+${visitor.trend}` : visitor.trend) : 0} note="첫날 대비 마지막날" />
                  </View>
                  <View className="mt-5">
                    <VisitorChart labels={visitor?.labels || []} values={visitor?.values || []} />
                  </View>
                </View>
              </View>
            ) : null}

            {activeSection === 'ads' ? (
              <View className="px-5 pt-4">
                <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <SectionHeader title="광고 운영" subtitle="현재는 설계 완료 상태이며, 광고 슬롯 API 연결 후 바로 운영할 수 있습니다." icon={Megaphone} />
                  <View className="mt-4 space-y-3 rounded-3xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
                    <Text className="text-sm font-bold text-slate-950 dark:text-white">피드 / 릴스 중간 광고</Text>
                    <Text className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">광고 승인, 소재 등록, 노출 회차, 보류 상태를 각각 분리해 관리하는 구조로 설계했습니다.</Text>
                    <View className="mt-3 flex-row gap-2">
                      <StatusChip label="초안" tone="warn" />
                      <StatusChip label="API 대기" tone="warn" />
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {activeSection === 'map' ? (
              <View className="px-5 pt-4">
                <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <SectionHeader title="지도 포인트" subtitle="다이빙 포인트와 리조트 마커를 함께 점검합니다." icon={MapPinned} />
                  <View className="mt-4 space-y-3">
                    {(snapshot.mapPoints || []).slice(0, 10).map((item) => (
                      <View key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="flex-1">
                            <Text className="font-extrabold text-slate-950 dark:text-white">{item.dive_site || item.location || item.id}</Text>
                            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.location || '위치 정보 없음'}</Text>
                            <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(item.created_at)}</Text>
                          </View>
                          <StatusChip label="포인트" tone="good" />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {activeSection === 'system' ? (
              <View className="px-5 pt-4">
                <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <SectionHeader title="시스템 / 신고 / 인증" subtitle="작업 큐와 상태 전이를 함께 관리합니다." icon={ClipboardList} />
                  <Pressable onPress={() => void onDispatchJobs()} className="mt-4 rounded-2xl bg-sky-600 px-4 py-3" disabled={operationBusy}>
                    <Text className="text-center text-sm font-extrabold text-white">작업 배포</Text>
                  </Pressable>
                  <View className="mt-4 grid grid-cols-3 gap-3">
                    <MetricCard label="작업 큐" value={snapshot.jobs.length} note="배포/동기화 작업" />
                    <MetricCard label="신고" value={snapshot.reports.length} note="검토 대기" />
                    <MetricCard label="자격증" value={snapshot.certifications.length} note="검토 대기" />
                  </View>
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    <StatusChip label={`접수 ${snapshot.reportBreakdown.received || 0}`} tone="warn" />
                    <StatusChip label={`검토 ${snapshot.reportBreakdown.reviewing || 0}`} tone="warn" />
                    <StatusChip label={`처리 ${snapshot.reportBreakdown.resolved || 0}`} tone="good" />
                    <StatusChip label={`반려 ${snapshot.reportBreakdown.rejected || 0}`} tone="bad" />
                  </View>
                  <View className="mt-4 space-y-3">
                    {snapshot.reports.slice(0, 5).map((item) => (
                      <View key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                        <Text className="font-extrabold text-slate-950 dark:text-white">{item.reason || '사유 없음'}</Text>
                        <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">대상: {item.user_id || '-'}</Text>
                        <View className="mt-3 flex-row flex-wrap gap-2">
                          {['received', 'reviewing', 'resolved', 'rejected'].map((status) => (
                            <Pressable key={status} onPress={() => void onChangeReport(item, status)} className="rounded-full border border-slate-200 px-3 py-2 dark:border-slate-700">
                              <Text className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{status}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                  <View className="mt-4 space-y-3">
                    {snapshot.certifications.slice(0, 5).map((item) => (
                      <View key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                        <Text className="font-extrabold text-slate-950 dark:text-white">{item.agency || '기관명 없음'}</Text>
                        <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.certification_number || '번호 없음'}</Text>
                        <View className="mt-3 flex-row flex-wrap gap-2">
                          {['reviewing', 'verified', 'rejected'].map((status) => (
                            <Pressable key={status} onPress={() => void onChangeCertification(item, status)} className="rounded-full border border-slate-200 px-3 py-2 dark:border-slate-700">
                              <Text className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{status}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            <View className="px-5 pt-4 pb-8">
              <View className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <SectionHeader title="실시간 콘텐츠 미리보기" subtitle="실제 서버 테이블에서 읽어온 콘텐츠 일부를 바로 볼 수 있습니다." icon={CheckCircle2} />
                <View className="mt-4 space-y-4">
                  {activeSection !== 'feed' && filteredFeed.slice(0, 2).map((item) => <ContentCard key={item.id} item={item} primaryLabel="검수" secondaryLabel="숨김" />)}
                  {activeSection !== 'reels' && filteredReels.slice(0, 2).map((item) => <ContentCard key={item.id} item={item} primaryLabel="검수" secondaryLabel="광고 슬롯" />)}
                  {activeSection !== 'resorts' && filteredResorts.slice(0, 2).map((item) => <ContentCard key={item.id} item={item} primaryLabel="상세보기" secondaryLabel="운영메모" />)}
                </View>
              </View>

              <View className="mt-4 rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">최근 갱신</Text>
                <Text className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{formatDateTime(snapshot.lastLoadedAt)}</Text>
              </View>
            </View>
          </>
        ) : (
          <View className="mx-5 mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <Text className="text-base font-bold text-slate-800 dark:text-slate-100">관리자 키를 입력하면 대시보드가 열립니다.</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">회원/리조트/피드/릴스/지도 데이터는 실제 운영 테이블에서 읽어옵니다.</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
