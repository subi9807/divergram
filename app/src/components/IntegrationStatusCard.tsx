import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Link2, RefreshCw, Unplug } from 'lucide-react-native';
import type { UserIntegration } from '../models';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

const integrationLabelMap: Record<UserIntegration['type'], string> = {
  google_maps: 'Google Maps',
  stormglass: 'Stormglass',
  garmin: 'Garmin',
  suunto: 'Suunto',
  shearwater: 'Shearwater',
  bluetooth: 'Bluetooth',
  instagram_share: 'Instagram 공유',
  cloudinary: 'Cloudinary',
  openai: 'OpenAI',
  fcm: 'FCM',
};

function formatLastSync(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

function formatSyncAge(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '기록 없음';
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return '확인 불가';
  const diffMin = Math.max(0, Math.round((Date.now() - ms) / (1000 * 60)));
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.round(diffHour / 24);
  return `${diffDay}일 전`;
}

function syncAgeColor(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '#B45309';
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return '#64748B';
  const diffMin = Math.max(0, Math.round((Date.now() - ms) / (1000 * 60)));
  if (diffMin <= 120) return '#166534';
  if (diffMin <= 24 * 60) return '#B45309';
  return '#B91C1C';
}

function statusTone(message?: string) {
  const text = String(message || '').toLowerCase();
  if (text.includes('실패') || text.includes('error') || text.includes('fail')) {
    return { fg: '#991B1B', bg: '#FEF2F2' };
  }
  if (text.includes('대기') || text.includes('준비') || text.includes('없음') || text.includes('미지원')) {
    return { fg: '#475569', bg: '#F8FAFC' };
  }
  if (text.includes('동기화중') || text.includes('처리중') || text.includes('요청')) {
    return { fg: '#1D4ED8', bg: '#EFF6FF' };
  }
  return { fg: '#065F46', bg: '#ECFDF5' };
}

export function IntegrationStatusCard({
  item,
  onSync,
  onDisconnect,
  onOpenDetail,
  openLabel,
  syncDisabled = false,
  actionDisabled = false,
  syncLabel,
  actionLabel,
  showActions = true,
}: {
  item: UserIntegration;
  onSync: () => void;
  onDisconnect: () => void;
  onOpenDetail?: () => void;
  openLabel?: string;
  syncDisabled?: boolean;
  actionDisabled?: boolean;
  syncLabel?: string;
  actionLabel?: string;
  showActions?: boolean;
}) {
  const { isDark } = useResolvedTheme();
  const colors = isDark
    ? {
        bg: '#0f1b2a',
        border: '#2a3e52',
        title: '#e2e8f0',
        text: '#c5d4e2',
        muted: '#8fa5bc',
        badgeBg: '#172534',
        syncBg: '#12243b',
        syncText: '#7dd3fc',
        disconnectConnectedBg: '#2a151b',
        disconnectConnectedText: '#fca5a5',
        disconnectIdleBg: '#0f2d1c',
        disconnectIdleText: '#86efac',
      }
    : {
        bg: '#ffffff',
        border: '#d9e4f1',
        title: '#0f172a',
        text: '#334155',
        muted: '#64748b',
        badgeBg: '#f8fafc',
        syncBg: '#eaf4ff',
        syncText: '#0d5fa8',
        disconnectConnectedBg: '#fff1f2',
        disconnectConnectedText: '#dc2626',
        disconnectIdleBg: '#ecfdf3',
        disconnectIdleText: '#166534',
      };

  const toggleDefault = item.connected ? '연결 해제' : '연결하기';
  const tone = statusTone(item.statusMessage);
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.bg, padding: 14, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Link2 size={16} color="#0D5FA8" />
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.title }}>{integrationLabelMap[item.type] || item.type}</Text>
        </View>
        <Text style={{ color: item.connected ? '#166534' : colors.muted, fontWeight: '700' }}>{item.connected ? '연결됨' : '미연결'}</Text>
      </View>
      {item.accountLabel ? <Text style={{ marginTop: 6, color: colors.text, fontWeight: '700', fontSize: 12 }}>{item.accountLabel}</Text> : null}
      <View style={{ marginTop: 8, borderRadius: 10, backgroundColor: tone.bg, paddingHorizontal: 8, paddingVertical: 6 }}>
        <Text style={{ color: tone.fg, fontSize: 13, fontWeight: '700' }}>{item.statusMessage || '-'}</Text>
      </View>
      <Text style={{ marginTop: 4, color: colors.muted, fontSize: 12 }}>마지막 동기화: {formatLastSync(item.lastSyncAt)}</Text>
      <Text style={{ marginTop: 2, color: syncAgeColor(item.lastSyncAt), fontSize: 12, fontWeight: '700' }}>
        동기화 경과: {formatSyncAge(item.lastSyncAt)}
      </Text>
      {showActions ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TouchableOpacity
            onPress={onSync}
            disabled={syncDisabled}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: colors.syncBg,
              opacity: syncDisabled ? 0.6 : 1,
            }}
            activeOpacity={0.85}
          >
            <RefreshCw size={14} color={colors.syncText} />
            <Text style={{ marginLeft: 6, color: colors.syncText, fontWeight: '700' }}>{syncLabel || '동기화'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDisconnect}
            disabled={actionDisabled}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: item.connected ? colors.disconnectConnectedBg : colors.disconnectIdleBg,
              opacity: actionDisabled ? 0.6 : 1,
            }}
            activeOpacity={0.85}
          >
            <Unplug size={14} color={item.connected ? colors.disconnectConnectedText : colors.disconnectIdleText} />
            <Text style={{ marginLeft: 6, color: item.connected ? colors.disconnectConnectedText : colors.disconnectIdleText, fontWeight: '700' }}>{actionLabel || toggleDefault}</Text>
          </TouchableOpacity>
        </View>
      ) : onOpenDetail ? (
        <View style={{ marginTop: 12 }}>
          <TouchableOpacity
            onPress={onOpenDetail}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: colors.syncBg,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: colors.syncText, fontWeight: '700' }}>{openLabel || '상세 보기'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
