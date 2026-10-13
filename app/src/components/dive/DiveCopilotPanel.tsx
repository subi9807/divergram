import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DiveCopilotSuggestion, DiveCopilotSuggestionKind, OneTapReadinessItem } from '../../services/diveCopilot';

interface Props {
  suggestions: DiveCopilotSuggestion[];
  readiness: OneTapReadinessItem[];
  ignoredCount: number;
  onAccept: (suggestion: DiveCopilotSuggestion) => void;
  onEdit: (kind: DiveCopilotSuggestionKind) => void;
  onIgnore: (id: string) => void;
}

export function DiveCopilotPanel({ suggestions, readiness, ignoredCount, onAccept, onEdit, onIgnore }: Props) {
  const { t } = useTranslation();
  const readyCount = readiness.filter(item => item.status === 'ready').length;
  return <View style={{ marginTop: 12, borderWidth: 1, borderColor: '#BFE4E1', borderRadius: 16, backgroundColor: '#F0FDFA', padding: 14, gap: 10 }}>
    <View>
      <Text style={{ color: '#134E4A', fontSize: 17, fontWeight: '800' }}>{t('diveCopilot.title')}</Text>
      <Text style={{ marginTop: 3, color: '#476B69', fontSize: 12 }}>{t('diveCopilot.readiness', { ready: readyCount, total: readiness.length })}</Text>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {readiness.map(item => <View key={item.id} style={{ borderRadius: 999, backgroundColor: item.status === 'ready' ? '#CCFBF1' : '#fff', borderWidth: 1, borderColor: item.status === 'action' ? '#F59E0B' : '#99D8D3', paddingHorizontal: 9, paddingVertical: 5 }}>
        <Text style={{ color: item.status === 'action' ? '#92400E' : '#115E59', fontSize: 11, fontWeight: '700' }}>{t(`diveCopilot.steps.${item.id}`)} · {t(`diveCopilot.status.${item.status}`)}</Text>
      </View>)}
    </View>
    {!suggestions.length ? <Text style={{ color: '#476B69', fontSize: 12 }}>{t('diveCopilot.empty')}{ignoredCount ? ` · ${t('diveCopilot.ignoredCount', { count: ignoredCount })}` : ''}</Text> : suggestions.map(suggestion => <View key={suggestion.id} style={{ borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#BFE4E1', padding: 11, gap: 8 }}>
      <Text style={{ color: '#134E4A', fontWeight: '700' }}>{t(`diveCopilot.suggestions.${suggestion.kind}`, { count: suggestion.candidateCount || 0, minutes: suggestion.distanceMinutes || 0 })}</Text>
      <Text numberOfLines={2} style={{ color: '#64748B', fontSize: 10 }}>{t('diveCopilot.evidence')} · {suggestion.evidenceRefs.join(' · ')}</Text>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <TouchableOpacity accessibilityRole="button" onPress={() => onAccept(suggestion)}><Text style={{ color: '#0F766E', fontWeight: '800' }}>{t('diveCopilot.accept')}</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => onEdit(suggestion.kind)}><Text style={{ color: '#0D5FA8', fontWeight: '800' }}>{t('diveCopilot.edit')}</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => onIgnore(suggestion.id)}><Text style={{ color: '#64748B', fontWeight: '800' }}>{t('diveCopilot.ignore')}</Text></TouchableOpacity>
      </View>
    </View>)}
    <Text style={{ color: '#64748B', fontSize: 11 }}>{t('diveCopilot.notice')}</Text>
  </View>;
}
