import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { CalendarDays, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/hooks/useAuth';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function AccountRecoveryScreen() {
  const { t, i18n } = useTranslation();
  const { isDark } = useResolvedTheme();
  const { accountDeletion, accountDeletionLoading, cancelAccountDeletion } = useAuth();
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  const schedule = useMemo(() => {
    const requestedAt = accountDeletion?.requestedAt ? new Date(accountDeletion.requestedAt) : new Date();
    const permanentAt = accountDeletion?.permanentDeletionAt
      ? new Date(accountDeletion.permanentDeletionAt)
      : new Date(requestedAt.getTime() + (accountDeletion?.gracePeriodDays || 30) * DAY_MS);
    const locale = i18n.resolvedLanguage || i18n.language || 'ko';
    const format = (date: Date) => date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    return {
      requestedAt: format(requestedAt),
      recoverableUntil: format(accountDeletion?.recoverableUntil ? new Date(accountDeletion.recoverableUntil) : permanentAt),
      permanentDeletionAt: format(permanentAt),
    };
  }, [accountDeletion, i18n.language, i18n.resolvedLanguage]);

  const handleRecover = () => {
    Alert.alert(
      t('settingsPage.account.recoverAccount', { defaultValue: '계정 복구하기' }),
      t('settingsPage.account.recoverAccountConfirm', { defaultValue: '탈퇴 신청을 철회하고 계정을 복구하시겠습니까?' }),
      [
        { text: t('common.cancel', { defaultValue: '취소' }), style: 'cancel' },
        {
          text: t('settingsPage.account.recoverAccount', { defaultValue: '계정 복구하기' }),
          onPress: async () => {
            setRecovering(true);
            try {
              const recovered = await cancelAccountDeletion();
              if (!recovered) throw new Error('account_recovery_failed');
              Alert.alert(
                t('settingsPage.account.recoveryCompleteTitle', { defaultValue: '계정 복구 완료' }),
                t('settingsPage.account.recoveryCompleteMessage', { defaultValue: '탈퇴 신청이 철회되었습니다. Divergram을 계속 이용할 수 있습니다.' }),
                [{ text: t('common.done', { defaultValue: '확인' }), onPress: () => router.replace('/(tabs)/feed') }]
              );
            } catch {
              Alert.alert(
                t('auth.error', { defaultValue: '오류' }),
                t('settingsPage.account.recoveryFailed', { defaultValue: '계정 복구에 실패했습니다. 잠시 후 다시 시도해주세요.' })
              );
            } finally {
              setRecovering(false);
            }
          },
        },
      ]
    );
  };

  if (accountDeletionLoading && !accountDeletion) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator size="large" color="#0a79d4" />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Trash2 size={30} color="#ef4444" />
        </View>
        <Text style={[styles.title, isDark && styles.textLight]}>
          {t('settingsPage.account.deletionPendingTitle', { defaultValue: '계정 삭제가 예약되어 있습니다' })}
        </Text>
        <Text style={[styles.subtitle, isDark && styles.textMutedDark]}>
          {t('settingsPage.account.deletionPendingSubtitle', { defaultValue: '복구 가능 기간에는 다른 기능을 이용할 수 없습니다. 계정을 복구하면 즉시 다시 이용할 수 있습니다.' })}
        </Text>

        <View style={[styles.card, isDark && styles.cardDark]}>
          <ScheduleRow icon={<CalendarDays size={18} color="#0a79d4" />} label={t('settingsPage.account.deletionRequestedAt')} value={schedule.requestedAt} isDark={isDark} />
          <ScheduleRow icon={<RotateCcw size={18} color="#0a79d4" />} label={t('settingsPage.account.recoverableUntil')} value={schedule.recoverableUntil} isDark={isDark} />
          <ScheduleRow icon={<Trash2 size={18} color="#ef4444" />} label={t('settingsPage.account.permanentDeletionAt')} value={schedule.permanentDeletionAt} isDark={isDark} danger last />
        </View>

        <View style={[styles.notice, isDark && styles.noticeDark]}>
          <ShieldCheck size={18} color="#64748b" />
          <Text style={[styles.noticeText, isDark && styles.textMutedDark]}>
            {t('settingsPage.account.legalRetentionNotice')}
          </Text>
        </View>

        <TouchableOpacity style={styles.recoverButton} activeOpacity={0.86} disabled={recovering} onPress={handleRecover}>
          {recovering ? <ActivityIndicator color="#ffffff" /> : <RotateCcw size={19} color="#ffffff" />}
          <Text style={styles.recoverButtonText}>
            {recovering
              ? t('common.loading', { defaultValue: '처리 중...' })
              : t('settingsPage.account.recoverAccount', { defaultValue: '계정 복구하기' })}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

function ScheduleRow({ icon, label, value, isDark, danger = false, last = false }: { icon: React.ReactNode; label: string; value: string; isDark: boolean; danger?: boolean; last?: boolean }) {
  return (
    <View style={[styles.scheduleRow, !last && styles.scheduleDivider, isDark && !last && styles.scheduleDividerDark]}>
      {icon}
      <View style={styles.scheduleText}>
        <Text style={[styles.scheduleLabel, isDark && styles.textMutedDark]}>{label}</Text>
        <Text style={[styles.scheduleValue, isDark && styles.textLight, danger && styles.dangerText]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  iconCircle: { alignSelf: 'center', width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1f2', marginBottom: 20 },
  title: { color: '#0f172a', fontSize: 25, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 10, marginBottom: 26 },
  card: { borderRadius: 22, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe7f1', paddingHorizontal: 18 },
  cardDark: { backgroundColor: '#101d29', borderColor: '#24384a' },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  scheduleDivider: { borderBottomWidth: 1, borderBottomColor: '#e7eef5' },
  scheduleDividerDark: { borderBottomColor: '#24384a' },
  scheduleText: { marginLeft: 13, flex: 1 },
  scheduleLabel: { color: '#64748b', fontSize: 12 },
  scheduleValue: { color: '#0f172a', fontSize: 15, fontWeight: '700', marginTop: 4 },
  dangerText: { color: '#ef4444' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 16, backgroundColor: '#f1f5f9', padding: 15, marginTop: 16 },
  noticeDark: { backgroundColor: '#101d29' },
  noticeText: { flex: 1, color: '#64748b', fontSize: 12, lineHeight: 19, marginLeft: 10 },
  recoverButton: { minHeight: 54, borderRadius: 16, backgroundColor: '#0a79d4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  recoverButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginLeft: 9 },
  textLight: { color: '#f8fafc' },
  textMutedDark: { color: '#94a3b8' },
});
