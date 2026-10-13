import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { convertExternalToDiveLog } from '../../services/diveLogSyncService';
import { assessDiveImportDuplicates, previewDiveImport, type DiveImportFormat } from '../../services/diveImportParser';
import { useDiveLogStore } from '../../stores/diveLogStore';
import { privateDiveLogService } from '../../services/privateDiveLogService';
import { useAuth } from '../../hooks/useAuth';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { utf8ByteLength } from '../../services/mainDiveLogDraft';

const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

export default function DiveImportWizardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const appendImportedLogs = useDiveLogStore(state => state.appendImportedLogs);
  const existingLogs = useDiveLogStore(state => state.logs);
  const [format, setFormat] = useState<DiveImportFormat>('json');
  const [source, setSource] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [acceptedPossible, setAcceptedPossible] = useState<Set<number>>(() => new Set());
  const preview = useMemo(() => reviewed ? assessDiveImportDuplicates(previewDiveImport(source, format), existingLogs) : [], [existingLogs, format, reviewed, source]);
  const ready = preview.filter(row => (row.status === 'ready' || (row.status === 'possible_duplicate' && acceptedPossible.has(row.index))) && row.normalized);
  const possibleCount = preview.filter(row => row.status === 'possible_duplicate').length;
  const duplicateCount = preview.filter(row => row.status === 'duplicate').length;
  const errorCount = preview.filter(row => row.status === 'error').length;

  function resetReview(value?: DiveImportFormat) {
    if (value) setFormat(value);
    setReviewed(false);
    setAcceptedPossible(new Set());
  }

  async function pickImportFile() {
    if (picking) return;
    setPicking(true);
    setFileError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'application/xml', 'text/xml', 'text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
        base64: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (typeof asset.size === 'number' && asset.size > MAX_IMPORT_FILE_BYTES) {
        setFileError('fileTooLarge');
        return;
      }
      const nextFormat: DiveImportFormat = /\.(?:uddf|xml)$/i.test(asset.name) || /xml/i.test(asset.mimeType || '')
        ? 'uddf'
        : /\.csv$/i.test(asset.name) || /csv/i.test(asset.mimeType || '') ? 'csv' : 'json';
      const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
      if (utf8ByteLength(text) > MAX_IMPORT_FILE_BYTES) {
        setFileError('fileTooLarge');
        return;
      }
      setFormat(nextFormat);
      setSource(text);
      setFileName(asset.name);
      setReviewed(false);
      setAcceptedPossible(new Set());
    } catch {
      setFileError('fileReadFailed');
    } finally {
      setPicking(false);
    }
  }

  async function importReviewed() {
    if (!user?.id || saving) return;
    const logs = ready.map(row => convertExternalToDiveLog(row.normalized!, String(user.id)));
    setSaving(true);
    try {
      const saved = await privateDiveLogService.createMany(logs as unknown as Record<string, unknown>[]);
      appendImportedLogs(saved);
      Alert.alert(t('diveImport.completeTitle'), t('diveImport.completeBody', { count: logs.length }), [{ text: t('common.confirm'), onPress: () => router.back() }]);
    } catch (error: any) {
      const code = String(error?.response?.data?.error || error?.message || '');
      Alert.alert(t('diveImport.failedTitle'), t(code === 'dive_logs_migration_required' ? 'diveImport.notReady' : 'diveImport.failed'));
    } finally {
      setSaving(false);
    }
  }

  return <Screen><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Text style={styles.title}>{t('diveImport.title')}</Text>
    <Text style={styles.description}>{t('diveImport.description')}</Text>
    <View style={styles.steps}><Text style={styles.step}>{t('diveImport.step1')}</Text><Text style={styles.step}>{t('diveImport.step2')}</Text><Text style={styles.step}>{t('diveImport.step3')}</Text></View>
    <View style={styles.row}>{(['json', 'csv', 'uddf'] as const).map(item => <TouchableOpacity key={item} onPress={() => resetReview(item)} style={[styles.choice, format === item && styles.choiceActive]}><Text style={[styles.choiceText, format === item && styles.choiceTextActive]}>{item.toUpperCase()}</Text></TouchableOpacity>)}</View>
    <TouchableOpacity disabled={picking} onPress={() => void pickImportFile()} style={[styles.fileButton, picking && styles.disabled]}>
      {picking ? <ActivityIndicator color="#0D5FA8" /> : <Text style={styles.fileButtonText}>{t('diveImport.selectFile')}</Text>}
    </TouchableOpacity>
    {!!fileName && <Text style={styles.description}>{t('diveImport.fileSelected', { name: fileName })}</Text>}
    {!!fileError && <Text accessibilityRole="alert" style={styles.fileError}>{t(`diveImport.${fileError}`)}</Text>}
    <TextInput
      accessibilityLabel={t('diveImport.inputLabel')}
      multiline
      textAlignVertical="top"
      value={source}
      onChangeText={value => { setSource(value); setFileName(''); setFileError(''); setReviewed(false); setAcceptedPossible(new Set()); }}
      placeholder={format === 'json' ? '[{"date":"2026-09-06","maxDepth":24}]' : format === 'csv' ? 'id,date,maxDepth\n1,2026-09-06,24' : '<uddf version="3.2.2">...</uddf>'}
      placeholderTextColor="#94A3B8"
      style={styles.input}
    />
    <TouchableOpacity disabled={!source.trim()} onPress={() => setReviewed(true)} style={[styles.button, !source.trim() && styles.disabled]}><Text style={styles.buttonText}>{t('diveImport.preview')}</Text></TouchableOpacity>
    {reviewed && <View style={styles.card}>
      <Text style={styles.heading}>{t('diveImport.previewSummary', { ready: preview.filter(row => row.status === 'ready').length, possible: possibleCount, duplicates: duplicateCount, errors: errorCount })}</Text>
      {!preview.length && <Text style={styles.description}>{t('diveImport.empty')}</Text>}
      {preview.slice(0, 20).map(row => <View key={row.index} style={styles.previewRow}>
        <Text style={styles.rowTitle}>#{row.index + 1}</Text>
        {row.status === 'possible_duplicate' ? <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedPossible.has(row.index) }}
          onPress={() => setAcceptedPossible(current => {
            const next = new Set(current);
            if (next.has(row.index)) next.delete(row.index); else next.add(row.index);
            return next;
          })}
          style={{ flex: 1 }}
        ><Text style={styles.possible}>{row.normalized?.diveDate || '-'} · {row.normalized?.maxDepthM ?? '-'}m</Text><Text style={styles.possibleHint}>{t(acceptedPossible.has(row.index) ? 'diveImport.possibleIncluded' : 'diveImport.possibleDuplicate')}</Text></TouchableOpacity> : <Text style={row.status === 'ready' ? styles.ready : styles.error}>{row.status === 'ready' ? `${row.normalized?.diveDate || '-'} · ${row.normalized?.maxDepthM ?? '-'}m` : row.status === 'duplicate' ? t('diveImport.duplicate') : t(`diveImport.errors.${row.error}`, { defaultValue: row.error })}</Text>}
      </View>)}
      {preview.length > 20 && <Text style={styles.description}>{t('diveImport.moreRows', { count: preview.length - 20 })}</Text>}
      <Text style={styles.warning}>{t('diveImport.reviewWarning')}</Text>
      <TouchableOpacity disabled={!ready.length || saving || !user?.id} onPress={() => void importReviewed()} style={[styles.button, (!ready.length || saving || !user?.id) && styles.disabled]}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('diveImport.confirm', { count: ready.length })}</Text>}
      </TouchableOpacity>
    </View>}
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60, gap: 12 }, title: { fontSize: 24, fontWeight: '800', color: '#0F172A' }, heading: { fontSize: 17, fontWeight: '800', color: '#0F172A' }, description: { color: '#475569', lineHeight: 21 },
  steps: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, step: { color: '#0D5FA8', fontWeight: '700', fontSize: 12 }, row: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 11, backgroundColor: '#fff' }, choiceActive: { borderColor: '#0D5FA8', backgroundColor: '#EAF4FF' }, choiceText: { color: '#64748B', fontWeight: '700' }, choiceTextActive: { color: '#0D5FA8' },
  input: { minHeight: 220, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 14, backgroundColor: '#fff', color: '#0F172A', padding: 12, fontFamily: 'monospace' }, button: { borderRadius: 12, padding: 13, alignItems: 'center', backgroundColor: '#0D5FA8' }, buttonText: { color: '#fff', fontWeight: '800' }, disabled: { opacity: 0.4 },
  fileButton: { minHeight: 46, borderWidth: 1, borderColor: '#0D5FA8', borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF' }, fileButtonText: { color: '#0D5FA8', fontWeight: '800' }, fileError: { color: '#B91C1C', lineHeight: 20 },
  card: { borderWidth: 1, borderColor: '#D7E4F1', borderRadius: 16, padding: 14, backgroundColor: '#fff', gap: 9 }, previewRow: { flexDirection: 'row', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D7E4F1', paddingVertical: 7 }, rowTitle: { width: 38, color: '#334155', fontWeight: '700' }, ready: { flex: 1, color: '#047857' }, possible: { color: '#92400E', fontWeight: '700' }, possibleHint: { marginTop: 2, color: '#92400E', fontSize: 12 }, error: { flex: 1, color: '#B91C1C' }, warning: { color: '#92400E', lineHeight: 20, backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10 },
});
