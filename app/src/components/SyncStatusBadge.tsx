import React from 'react';
import { Text, View } from 'react-native';
import type { DiveLogSyncStatus } from '../models';
import { useTranslation } from 'react-i18next';

const map: Record<DiveLogSyncStatus, { bg: string; fg: string }> = {
  pending: { bg: '#E2E8F0', fg: '#334155' },
  syncing: { bg: '#DBEAFE', fg: '#1D4ED8' },
  done: { bg: '#DCFCE7', fg: '#166534' },
  failed: { bg: '#FEE2E2', fg: '#B91C1C' },
  duplicate: { bg: '#FEF3C7', fg: '#92400E' },
  canceled: { bg: '#E2E8F0', fg: '#475569' },
};

export function SyncStatusBadge({ status }: { status: DiveLogSyncStatus }) {
  const { t } = useTranslation();
  const token = map[status];
  return (
    <View style={{ backgroundColor: token.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: token.fg, fontSize: 11, fontWeight: '700' }}>{t(`syncStatus.${status}`)}</Text>
    </View>
  );
}
