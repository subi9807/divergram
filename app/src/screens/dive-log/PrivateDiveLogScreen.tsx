import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../hooks/useAuth';
import { privateDiveLogService as service, type DiveLogSource, type PrivateDiveLog } from '../../services/privateDiveLogService';

export default function PrivateDiveLogScreen() {
  const { user } = useAuth();
  // Account changes unmount all private documents and pending request handlers.
  return user ? <Archive key={user.id} /> : null;
}

function Archive() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PrivateDiveLog[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [editing, setEditing] = useState<PrivateDiveLog | null>(null);
  const [source, setSource] = useState<DiveLogSource | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [memo, setMemo] = useState('');
  const [depth, setDepth] = useState('');
  const [duration, setDuration] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const alive = useRef(true);
  const locked = useRef(false);
  const draftId = useRef<string | null>(null);

  function fail(err: unknown) {
    const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
    setError(code === 'dive_revision_conflict' ? 'conflict' : code === 'dive_logs_migration_required' ? 'notReady' : 'failed');
  }

  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try { await action(); }
    catch (err) { if (alive.current) fail(err); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }

  async function load(after?: string) {
    const result = await service.list(after);
    if (!alive.current) return;
    setRows(previous => after
      ? [...new Map([...previous, ...result.data].map(row => [row.id, row])).values()]
      : result.data);
    setCursor(result.nextCursor);
  }

  useEffect(() => {
    alive.current = true;
    void run(() => load());
    return () => { alive.current = false; };
    // Requests are scoped to this account-keyed mount, not form state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    draftId.current = randomUUID();
    setEditing(null);
    setSource(null);
    setMemo(''); setDepth(''); setDuration('');
    setError(''); setNotice(''); setFormOpen(true);
  }

  async function review(row: PrivateDiveLog) {
    const original = await service.source(row.id);
    if (!alive.current) return;
    setEditing(row); setSource(original);
    setMemo(row.memo || '');
    setDepth(row.maxDepth == null ? '' : String(row.maxDepth));
    setDuration(row.totalDiveTime == null ? '' : String(row.totalDiveTime));
    setFormOpen(true);
  }

  async function save() {
    const maxDepth = depth.trim() ? Number(depth) : null;
    const totalDiveTime = duration.trim() ? Number(duration) : null;
    if ((maxDepth !== null && (!Number.isFinite(maxDepth) || maxDepth < 0 || maxDepth > 500)) ||
      (totalDiveTime !== null && (!Number.isFinite(totalDiveTime) || totalDiveTime < 0 || totalDiveTime > 1440))) {
      setError('invalid'); return;
    }
    await run(async () => {
      const patch = { memo, maxDepth, totalDiveTime };
      // Keep identity on retries; the server rejects a reused ID with changed data.
      const saved = editing ? await service.patch(editing, patch) : await service.create({ ...patch, id: draftId.current, sourceType: 'manual', diveDate: '', media: [], tags: [] });
      if (!alive.current) return;
      setRows(previous => [saved, ...previous.filter(row => row.id !== saved.id)]);
      setFormOpen(false); setSource(null); setEditing(null);
      draftId.current = null;
      setNotice('saved');
    });
  }

  const button = (label: string, onPress: () => void) => (
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onPress} style={[styles.button, busy && { opacity: 0.5 }]}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
  const originalNumber = (key: string) => typeof source?.original_data[key] === 'number' ? String(source.original_data[key]) : t('privateDiveLog.unknown');

  return <Screen><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Text style={styles.title}>{t('privateDiveLog.title')}</Text>
    <Text style={styles.description}>{t('privateDiveLog.description')}</Text>
    {busy && <ActivityIndicator accessibilityLabel={t('common.loading')} />}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{t(`privateDiveLog.${error}`)}</Text>}
    {!!notice && <Text accessibilityRole="alert" style={styles.description}>{t(`privateDiveLog.${notice}`)}</Text>}
    {formOpen ? <View style={styles.card}>
      <Text style={styles.heading}>{t(editing ? 'privateDiveLog.review' : 'privateDiveLog.new')}</Text>
      {editing && <Text style={styles.description}>{t('privateDiveLog.revision', { revision: editing.revision })}</Text>}
      {source && <View style={styles.original}>
        <Text style={styles.heading}>{t('privateDiveLog.original')}</Text>
        <Text style={styles.description}>{t(`privateDiveLog.${source.source_kind}`)}</Text>
        <Text style={styles.description}>{t('privateDiveLog.depth')}: {originalNumber('maxDepth')}</Text>
        <Text style={styles.description}>{t('privateDiveLog.duration')}: {originalNumber('totalDiveTime')}</Text>
        <Text style={styles.description}>{t('privateDiveLog.memo')}: {typeof source.original_data.memo === 'string' ? source.original_data.memo : t('privateDiveLog.unknown')}</Text>
      </View>}
      <Text style={styles.description}>{t('privateDiveLog.correction')}</Text>
      <Text style={styles.label}>{t('privateDiveLog.depth')}</Text>
      <TextInput accessibilityLabel={t('privateDiveLog.depth')} style={styles.input} keyboardType="decimal-pad" value={depth} onChangeText={setDepth} editable={!busy} />
      <Text style={styles.label}>{t('privateDiveLog.duration')}</Text>
      <TextInput accessibilityLabel={t('privateDiveLog.duration')} style={styles.input} keyboardType="decimal-pad" value={duration} onChangeText={setDuration} editable={!busy} />
      <Text style={styles.label}>{t('privateDiveLog.memo')}</Text>
      <TextInput accessibilityLabel={t('privateDiveLog.memo')} style={[styles.input, styles.memo]} multiline maxLength={10000} value={memo} onChangeText={setMemo} editable={!busy} />
      {button(t('common.save'), () => void save())}
      {button(t('common.cancel'), () => { setFormOpen(false); setError(''); })}
    </View> : <>
      {button(t('privateDiveLog.new'), startNew)}
      {button(t('privateDiveLog.refresh'), () => void run(() => load()))}
      {!rows.length && !busy && !error && <Text style={styles.description}>{t('privateDiveLog.empty')}</Text>}
      {rows.map(row => <View key={row.id} style={styles.card}>
        <Text style={styles.heading}>{row.divePointName || row.diveDate || t('privateDiveLog.undated')}</Text>
        <Text style={styles.description}>{t('privateDiveLog.depth')}: {row.maxDepth ?? t('privateDiveLog.unknown')}</Text>
        <Text style={styles.description}>{t('privateDiveLog.revision', { revision: row.revision })}</Text>
        {button(t('privateDiveLog.review'), () => void run(() => review(row)))}
      </View>)}
      {!!cursor && button(t('privateDiveLog.more'), () => void run(() => load(cursor)))}
    </>}
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  heading: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  description: { color: '#475569', lineHeight: 22 },
  label: { color: '#334155', fontWeight: '600' },
  card: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', gap: 10 },
  original: { padding: 12, gap: 6, backgroundColor: '#F1F5F9', borderRadius: 12 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, color: '#0F172A', backgroundColor: '#fff' },
  memo: { minHeight: 100, textAlignVertical: 'top' },
  button: { padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#0D5FA8' },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#B91C1C', lineHeight: 22 },
});
