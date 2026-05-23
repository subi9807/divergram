import React from 'react';
import { Text, View } from 'react-native';
import type { DiveLogSyncStatus } from '../models';

const map: Record<DiveLogSyncStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: '#E2E8F0', fg: '#334155', label: '대기중' },
  syncing: { bg: '#DBEAFE', fg: '#1D4ED8', label: '동기화중' },
  done: { bg: '#DCFCE7', fg: '#166534', label: '완료' },
  failed: { bg: '#FEE2E2', fg: '#B91C1C', label: '실패' },
  duplicate: { bg: '#FEF3C7', fg: '#92400E', label: '중복' },
  canceled: { bg: '#E2E8F0', fg: '#475569', label: '취소됨' },
};

export function SyncStatusBadge({ status }: { status: DiveLogSyncStatus }) {
  const token = map[status];
  return (
    <View style={{ backgroundColor: token.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: token.fg, fontSize: 11, fontWeight: '700' }}>{token.label}</Text>
    </View>
  );
}
