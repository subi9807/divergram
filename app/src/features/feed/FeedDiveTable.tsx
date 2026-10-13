import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { feedDiveRecordRows, type FeedDiveRecords } from '../../utils/feedDiveRecords';

export function FeedDiveTable({ post }: { post: FeedDiveRecords }) {
  const { t, i18n } = useTranslation();
  const { isDark } = useResolvedTheme();
  const rows = feedDiveRecordRows(post);
  const buddy = post.diveType !== 'daily' ? post.buddyName?.trim() : '';
  if (!rows.length && !buddy) return null;
  const ink = isDark ? '#e8f2fc' : '#18334c';
  const line = isDark ? '#2a4054' : '#dce8f1';
  const format = new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language, { maximumFractionDigits: 2 });
  return <View style={[styles.table, { borderColor: line }]}>
    <Text style={[styles.heading, { color: ink, backgroundColor: isDark ? '#142b40' : '#edf6fc' }]}>{t('feedDiveTable.title')}</Text>
    {rows.map(({ key, value, unit }) => <View key={key} style={[styles.row, { borderTopColor: line }]}>
      <Text style={[styles.label, { color: isDark ? '#a7bdcf' : '#61788a' }]}>{t(`feedDiveTable.${key}`)}</Text>
      <Text style={[styles.value, { color: ink }]}>{format.format(value)} {unit === 'min' ? t('feedDiveTable.minutes') : unit}</Text>
    </View>)}
    {!!buddy && <View style={[styles.row, { borderTopColor: line }]}>
      <Text style={[styles.label, { color: isDark ? '#a7bdcf' : '#61788a' }]}>{t('feedDiveTable.buddy')}</Text>
      <Text style={[styles.value, { color: ink }]}>{buddy}</Text>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  table: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  heading: { fontSize: 13, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 11 },
  row: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
  label: { flex: 1, fontSize: 13, lineHeight: 19 },
  value: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'right' },
});
