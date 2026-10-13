import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MediaFile } from '../../models';

export function PhotoMatchReview({ media, currentLogId, onReview }: { media: MediaFile; currentLogId: string; onReview: (confirmed: boolean) => void }) {
  const { t } = useTranslation();
  const match = media.diveMatch;
  if (!match || match.status === 'unknown') return <Text style={{ color: '#64748b', fontSize: 12 }}>{t('photoMatch.unknown')}</Text>;
  const currentSuggested = match.suggestedLogId === currentLogId;
  const key = match.status === 'ambiguous' ? 'ambiguous' : match.status === 'outside' ? 'outside' : currentSuggested ? match.status : 'other';
  return <View style={{ marginTop: 6, borderRadius: 10, backgroundColor: '#f8fafc', padding: 8, gap: 7 }}>
    <Text style={{ color: '#475569', fontSize: 12 }}>{t(`photoMatch.${key}`, { minutes: match.distanceMinutes ?? 0 })}</Text>
    {currentSuggested && !match.confirmed ? <View style={{ flexDirection: 'row', gap: 14 }}>
      <TouchableOpacity accessibilityRole="button" onPress={() => onReview(true)}><Text style={{ color: '#0f766e', fontWeight: '700' }}>{t('photoMatch.confirm')}</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => onReview(false)}><Text style={{ color: '#b91c1c', fontWeight: '700' }}>{t('photoMatch.reject')}</Text></TouchableOpacity>
    </View> : null}
    {match.confirmed ? <Text style={{ color: '#166534', fontWeight: '700', fontSize: 12 }}>{t('photoMatch.confirmed')}</Text> : null}
  </View>;
}
