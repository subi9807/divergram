import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Clock3, MapPin, Waves } from 'lucide-react-native';
import type { DiveLog } from '../models';
import { SyncStatusBadge } from './SyncStatusBadge';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

export function DiveLogCard({ item, onPress }: { item: DiveLog; onPress: () => void }) {
  const { isDark } = useResolvedTheme();
  const colors = isDark
    ? {
        bg: '#0f1b2a',
        border: '#2a3e52',
        title: '#e2e8f0',
        text: '#c5d4e2',
        muted: '#8fa5bc',
      }
    : {
        bg: '#ffffff',
        border: '#d9e4f1',
        title: '#0f172a',
        text: '#334155',
        muted: '#64748b',
      };

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.bg, padding: 14, marginBottom: 10 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.title, fontSize: 16, fontWeight: '800' }}>{item.divePointName || 'Dive Point'}</Text>
        <SyncStatusBadge status={item.syncStatus} />
      </View>
      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MapPin size={14} color={colors.muted} />
        <Text style={{ color: colors.muted }}>{item.diveDate}</Text>
      </View>
      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Waves size={13} color="#0D5FA8" />
          <Text style={{ color: colors.text }}>Max {item.maxDepth ?? '-'}m</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock3 size={13} color="#0D5FA8" />
          <Text style={{ color: colors.text }}>{item.totalDiveTime ?? '-'}min</Text>
        </View>
      </View>
      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.muted, fontWeight: '600' }}>출처: {item.sourceType}</Text>
        <ChevronRight size={16} color={colors.muted} />
      </View>
    </TouchableOpacity>
  );
}
