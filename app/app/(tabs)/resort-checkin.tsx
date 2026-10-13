import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useQuery } from '@tanstack/react-query';
import { Building2, CheckCircle2, Clock3, QrCode, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';

export default function ResortCheckinScreen() {
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedResortId, setSelectedResortId] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const context = useQuery({ queryKey: ['resort-checkin-context'], queryFn: apiClient.getResortCheckinContext });
  const resorts = useMemo(() => context.data?.resorts || [], [context.data?.resorts]);
  const recent = useMemo(() => context.data?.recent || [], [context.data?.recent]);
  const palette = isDark
    ? { text: '#eef6ff', sub: '#9fb3c8', card: '#101c2a', border: '#26394d' }
    : { text: '#10213a', sub: '#60758d', card: '#ffffff', border: '#d8e6f2' };

  useEffect(() => {
    if (!selectedResortId && resorts[0]?.id) setSelectedResortId(String(resorts[0].id));
  }, [resorts, selectedResortId]);

  const startScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setScannerActive(true);
  };

  const handleScan = async ({ data }: { data: string }) => {
    if (processing || !scannerActive || !selectedResortId) return;
    setProcessing(true);
    setScannerActive(false);
    try {
      const result = await apiClient.scanResortCheckin(selectedResortId, data);
      const member = result.checkin || {};
      Alert.alert(
        result.duplicate ? t('resortCheckin.duplicateTitle') : t('resortCheckin.successTitle'),
        `${member.member_name || ''}\n${member.member_number || ''}`.trim()
      );
      await context.refetch();
    } catch (error: any) {
      Alert.alert(t('resortCheckin.errorTitle'), String(error?.response?.data?.error || error?.message || 'resort_checkin_failed'));
    } finally {
      setProcessing(false);
    }
  };

  if (context.isLoading) return <Screen><View style={styles.center}><ActivityIndicator color="#0d5fa8" /></View></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><QrCode size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}><Text style={styles.heroTitle}>{t('resortCheckin.title')}</Text><Text style={styles.heroSub}>{t('resortCheckin.subtitle')}</Text></View>
        </View>

        {!resorts.length ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ShieldCheck size={28} color="#0d5fa8" />
            <Text style={[styles.cardTitle, { color: palette.text }]}>{t('resortCheckin.noPermission')}</Text>
            <Text style={[styles.body, { color: palette.sub }]}>{t('resortCheckin.noPermissionBody')}</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('resortCheckin.selectResort')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.resortRow}>
              {resorts.map((resort: any) => {
                const active = selectedResortId === String(resort.id);
                return <TouchableOpacity key={resort.id} onPress={() => setSelectedResortId(String(resort.id))} style={[styles.resortChip, { borderColor: active ? '#0d5fa8' : palette.border, backgroundColor: active ? '#e6f4ff' : palette.card }]}><Building2 size={16} color="#0d5fa8" /><Text style={styles.resortChipText}>{resort.name}</Text></TouchableOpacity>;
              })}
            </ScrollView>

            {scannerActive ? (
              <View style={styles.cameraWrap}>
                <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={handleScan} />
                <View pointerEvents="none" style={styles.scanFrame} />
                <Text style={styles.scanHint}>{t('resortCheckin.scanHint')}</Text>
              </View>
            ) : (
              <TouchableOpacity disabled={processing} onPress={startScanner} style={styles.scanButton}>
                {processing ? <ActivityIndicator color="#fff" /> : <QrCode size={20} color="#fff" />}
                <Text style={styles.scanButtonText}>{t('resortCheckin.scanAction')}</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('resortCheckin.recent')}</Text>
            {recent.length ? recent.map((item: any) => (
              <View key={item.id} style={[styles.history, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <CheckCircle2 size={21} color="#07966f" />
                <View style={{ flex: 1 }}><Text style={[styles.historyName, { color: palette.text }]}>{item.member_name}</Text><Text style={[styles.body, { color: palette.sub }]}>{item.member_number}</Text></View>
                <View style={styles.time}><Clock3 size={13} color={palette.sub} /><Text style={[styles.timeText, { color: palette.sub }]}>{new Date(item.checked_in_at).toLocaleString()}</Text></View>
              </View>
            )) : <Text style={[styles.body, { color: palette.sub }]}>{t('resortCheckin.empty')}</Text>}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60, gap: 16 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 20, borderRadius: 22, backgroundColor: '#0d5fa8' },
  heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.16)' },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '900' }, heroSub: { color: '#d9efff', marginTop: 4, lineHeight: 19 },
  card: { padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 10 }, cardTitle: { fontSize: 18, fontWeight: '800' }, body: { fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginTop: 6 }, resortRow: { gap: 8 }, resortChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, height: 44, borderWidth: 1, borderRadius: 14 }, resortChipText: { color: '#17324d', fontWeight: '800' },
  cameraWrap: { height: 390, borderRadius: 24, overflow: 'hidden', backgroundColor: '#051525', justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 235, height: 235, borderWidth: 3, borderColor: '#fff', borderRadius: 24 }, scanHint: { position: 'absolute', bottom: 24, color: '#fff', fontWeight: '800' },
  scanButton: { height: 58, borderRadius: 18, backgroundColor: '#0d5fa8', flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }, scanButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  history: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 }, historyName: { fontSize: 15, fontWeight: '800' }, time: { alignItems: 'flex-end', gap: 3 }, timeText: { fontSize: 10 },
});
