import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Clock3, MapPin, Waves } from 'lucide-react-native';
import type { DiveLog } from '../models';
import { SyncStatusBadge } from './SyncStatusBadge';

export function DiveLogCard({ item, onPress }: { item: DiveLog; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: '#D9E4F1', borderRadius: 18, backgroundColor: '#fff', padding: 14, marginBottom: 10 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800' }}>{item.divePointName || 'Dive Point'}</Text>
        <SyncStatusBadge status={item.syncStatus} />
      </View>
      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MapPin size={14} color="#64748B" />
        <Text style={{ color: '#64748B' }}>{item.diveDate}</Text>
      </View>
      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Waves size={13} color="#0D5FA8" />
          <Text style={{ color: '#334155' }}>Max {item.maxDepth ?? '-'}m</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock3 size={13} color="#0D5FA8" />
          <Text style={{ color: '#334155' }}>{item.totalDiveTime ?? '-'}min</Text>
        </View>
      </View>
      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#475569', fontWeight: '600' }}>출처: {item.sourceType}</Text>
        <ChevronRight size={16} color="#64748B" />
      </View>
    </TouchableOpacity>
  );
}
