import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DiveLog } from '../models';
import { buildDiveSourceDetails } from '../services/diveSourceDetails';

export function DiveSourceDetails({ log }: { log?: DiveLog }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!log) return null;
  const details = buildDiveSourceDetails(log);
  return <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)}>
      <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{t(open ? 'diveSource.hideDetails' : 'diveSource.showDetails', { count: details.length })}</Text>
    </TouchableOpacity>
    {open ? <View style={{ marginTop: 8, gap: 6 }}>
      {details.map(item => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ flex: 1, color: '#475569', fontSize: 12 }}>{t(`diveSource.fields.${item.field}`, { defaultValue: item.field })}</Text>
        <View style={{ maxWidth: '60%', alignItems: 'flex-end' }}>
          <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '700' }}>{t(`diveSourceTypes.${item.source}`)}</Text>
          {item.evidenceRef ? <Text numberOfLines={1} style={{ color: '#94A3B8', fontSize: 10 }}>{item.evidenceRef}</Text> : null}
        </View>
      </View>)}
      <Text style={{ color: '#64748B', fontSize: 11 }}>{t('diveSource.detailNotice')}</Text>
    </View> : null}
  </View>;
}
