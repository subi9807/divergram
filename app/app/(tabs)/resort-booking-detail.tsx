import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, CircleDollarSign, Hotel, Mail, Phone } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient, type ResortBooking } from '../../src/lib/api';
import { canUsePayPal, payResortBookingWithPayPal } from '../../src/services/paypalPaymentService';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { canPayResortBookingDeposit, getResortBookingStage, getResortBookingStatusKey, RESORT_BOOKING_STAGES } from '../../src/features/booking/bookingStatus';
import { resortDepositPaymentsAvailable } from '../../src/config/paymentAvailability';

export default function ResortBookingDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark } = useResolvedTheme();
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paypalAvailable, setPaypalAvailable] = useState(false);
  const params = useLocalSearchParams<{ bookingId?: string | string[]; created?: string | string[] }>();
  const bookingId = Array.isArray(params.bookingId) ? params.bookingId[0] || '' : params.bookingId || '';
  const created = (Array.isArray(params.created) ? params.created[0] : params.created) === '1';
  const colors = { page: isDark ? '#07131F' : '#F4F8FB', card: isDark ? '#0F2030' : '#FFF', title: isDark ? '#F1F5F9' : '#102A36', text: isDark ? '#CBD5E1' : '#526B75', border: isDark ? '#243B4C' : '#DCE8EA', accent: '#087F79', soft: isDark ? '#12332F' : '#E9F7F4' };
  const bookingQuery = useQuery({ queryKey: ['resort-booking', bookingId], queryFn: () => apiClient.getMyResortBooking(bookingId), enabled: Boolean(bookingId) });
  const paymentConfigQuery = useQuery({ queryKey: ['resort-payment-config'], queryFn: apiClient.getResortPaymentConfig, enabled: resortDepositPaymentsAvailable });
  const { data: resorts = [] } = useQuery({ queryKey: ['resorts'], queryFn: apiClient.getResorts });
  const resort = useMemo(() => (resorts as any[]).find((item) => String(item.id) === bookingQuery.data?.resortId), [resorts, bookingQuery.data?.resortId]);
  const booking = bookingQuery.data;
  const currentStage = booking ? getResortBookingStage(booking) : 'received';
  const currentStageIndex = RESORT_BOOKING_STAGES.indexOf(currentStage);
  const terminal = booking && ['cancelled', 'rejected', 'no_show'].includes(booking.status);

  useEffect(() => {
    if (!resortDepositPaymentsAvailable) return;
    let active = true;
    void canUsePayPal(paymentConfigQuery.data).then((paypal) => {
      if (active) setPaypalAvailable(paypal);
    });
    return () => { active = false; };
  }, [paymentConfigQuery.data]);

  const refreshAll = async () => {
    await Promise.all([bookingQuery.refetch(), queryClient.invalidateQueries({ queryKey: ['my-resort-bookings'] })]);
  };
  const payWithPayPal = async () => {
    if (!resortDepositPaymentsAvailable || !booking || !paymentConfigQuery.data || paymentBusy) return;
    setPaymentBusy(true);
    try {
      const result = await payResortBookingWithPayPal(booking, paymentConfigQuery.data);
      await refreshAll();
      Alert.alert(t('resortBooking.paymentProcessingTitle'), t(result.sample ? 'resortBooking.paypalSandboxCompleteBody' : 'resortBooking.paypalProcessingBody'));
    } catch (error: any) {
      const cancelled = String(error?.code || error?.message || '').toLowerCase().includes('cancel');
      if (!cancelled) Alert.alert(t('resortBooking.paymentErrorTitle'), t('resortBooking.paymentErrorBody'));
    } finally { setPaymentBusy(false); }
  };
  const cancelBooking = (item: ResortBooking) => Alert.alert(t('resortBooking.cancel'), t('resortBooking.cancelConfirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('resortBooking.cancel'), style: 'destructive', onPress: async () => { try { await apiClient.cancelResortBooking(item.id); await refreshAll(); } catch { Alert.alert(t('common.error'), t('resortBooking.cancelUnavailable')); } } }]);
  const requestRefund = (item: ResortBooking) => Alert.alert(t('resortBooking.refundRequest'), t('resortBooking.refundConfirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('resortBooking.refundRequest'), onPress: async () => { try { const refund = await apiClient.requestResortBookingRefund(item.id); await refreshAll(); Alert.alert(t('resortBooking.refundRequested'), t('resortBooking.refundEstimate', { currency: 'USD', amount: Number(refund.refundAmount || 0).toLocaleString(), percent: refund.refundPercent })); } catch { Alert.alert(t('common.error'), t('resortBooking.refundUnavailable')); } } }]);
  if (bookingQuery.isLoading) return <Screen style={{ backgroundColor: colors.page, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></Screen>;
  if (!booking) return <Screen style={{ backgroundColor: colors.page }}><View style={{ padding: 20 }}><TouchableOpacity onPress={() => router.back()}><ArrowLeft color={colors.title} /></TouchableOpacity><Text style={{ marginTop: 30, color: colors.text, textAlign: 'center' }}>{t('resortBooking.detailUnavailable')}</Text></View></Screen>;

  const paymentPending = canPayResortBookingDeposit(booking);
  const canCancel = booking.status === 'pending' && !['paid', 'refund_requested', 'partially_refunded', 'refunded'].includes(booking.depositStatus);
  const canRefund = ['pending', 'confirmed'].includes(booking.status) && booking.depositStatus === 'paid';
  const card = { marginTop: 14, padding: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border } as const;
  const row = { marginTop: 11, flexDirection: 'row', justifyContent: 'space-between', gap: 16 } as const;

  return <Screen style={{ backgroundColor: colors.page }}><ScrollView refreshControl={<RefreshControl refreshing={bookingQuery.isRefetching} onRefresh={refreshAll} tintColor={colors.accent} />} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}><TouchableOpacity onPress={() => router.back()}><ArrowLeft color={colors.title} /></TouchableOpacity><View style={{ marginLeft: 14, flex: 1 }}><Text style={{ fontSize: 24, fontWeight: '900', color: colors.title }}>{t('resortBooking.confirmationTitle')}</Text><Text style={{ marginTop: 3, color: colors.text }}>{booking.bookingNumber || booking.id}</Text></View><Text style={{ color: terminal ? '#DC2626' : colors.accent, fontWeight: '900' }}>{t(`resortBooking.status.${getResortBookingStatusKey(booking)}`)}</Text></View>
    {created ? <View style={{ marginTop: 18, padding: 14, borderRadius: 14, backgroundColor: colors.soft }}><Text style={{ color: colors.accent, fontWeight: '900' }}>{t('resortBooking.successTitle')}</Text><Text style={{ marginTop: 4, color: colors.text }}>{t(Number(booking.depositAmount || 0) > 0 ? 'resortBooking.successBodyPayment' : 'resortBooking.successBody')}</Text></View> : null}

    <View style={card}><Text style={{ color: colors.title, fontSize: 17, fontWeight: '900' }}>{t('resortBooking.stageTitle')}</Text><View style={{ marginTop: 16, flexDirection: 'row' }}>{RESORT_BOOKING_STAGES.map((stage, index) => { const active = !terminal && index <= currentStageIndex; return <View key={stage} style={{ flex: 1, alignItems: 'center' }}><View style={{ width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.accent : colors.soft }}><Text style={{ color: active ? '#FFF' : colors.text, fontSize: 11, fontWeight: '900' }}>{index + 1}</Text></View><Text numberOfLines={2} style={{ marginTop: 7, color: active ? colors.accent : colors.text, fontSize: 10, textAlign: 'center', fontWeight: active ? '900' : '600' }}>{t(`resortBooking.stages.${stage}`)}</Text></View>; })}</View>{terminal ? <Text style={{ marginTop: 14, padding: 10, borderRadius: 10, color: '#B91C1C', backgroundColor: '#FEF2F2', fontWeight: '800' }}>{t(`resortBooking.status.${getResortBookingStatusKey(booking)}`)}</Text> : null}</View>

    {paymentPending ? <View style={card}><View style={{ flexDirection: 'row', alignItems: 'center' }}><CircleDollarSign size={22} color={colors.accent} /><View style={{ marginLeft: 10, flex: 1 }}><Text style={{ color: colors.title, fontSize: 17, fontWeight: '900' }}>{t(resortDepositPaymentsAvailable && paypalAvailable ? 'resortBooking.payDepositAction' : 'resortBooking.paymentUnavailableTitle')}</Text><Text style={{ marginTop: 3, color: colors.text }}>{booking.depositCurrency} {Number(booking.depositAmount).toLocaleString()}</Text></View></View>{resortDepositPaymentsAvailable && paypalAvailable ? <TouchableOpacity disabled={paymentBusy} onPress={() => { void payWithPayPal(); }} style={{ marginTop: 16, padding: 15, borderRadius: 13, alignItems: 'center', backgroundColor: '#0070BA', opacity: paymentBusy ? 0.6 : 1 }}><Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>{t('resortBooking.paypalPayAction')}</Text></TouchableOpacity> : null}{resortDepositPaymentsAvailable && paymentConfigQuery.data?.card.sample ? <Text style={{ marginTop: 10, color: '#9A6700', fontSize: 12, lineHeight: 18 }}>{t('resortBooking.paypalSandboxNotice')}</Text> : null}{!resortDepositPaymentsAvailable || !paypalAvailable ? <Text style={{ marginTop: 12, padding: 12, borderRadius: 12, color: colors.text, lineHeight: 20, backgroundColor: colors.soft }}>{t('resortBooking.paymentUnavailableBody')}</Text> : null}{paymentBusy ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.accent} /> : null}</View> : null}

    <View style={card}><Text style={{ color: colors.title, fontSize: 17, fontWeight: '900' }}>{t('resortBooking.bookingInformation')}</Text><View style={row}><Text style={{ color: colors.text }}>{t('resortBooking.date')}</Text><Text style={{ color: colors.title, fontWeight: '800' }}>{String(booking.bookingDate).slice(0, 10)}{booking.bookingEndDate && booking.bookingEndDate !== booking.bookingDate ? ` - ${String(booking.bookingEndDate).slice(0, 10)}` : ''}</Text></View><View style={row}><Text style={{ color: colors.text }}>{t('resortBooking.participants')}</Text><Text style={{ color: colors.title, fontWeight: '800' }}>{booking.participants}</Text></View><View style={row}><Text style={{ color: colors.text }}>{t('resortBooking.diveType')}</Text><Text style={{ color: colors.title, fontWeight: '800' }}>{t(`resortBooking.types.${booking.diveType}`)}</Text></View><View style={row}><Text style={{ color: colors.text }}>{t('resortBooking.product')}</Text><Text style={{ color: colors.title, fontWeight: '800' }}>{booking.priceTitle || '-'}</Text></View><View style={row}><Text style={{ color: colors.text }}>{t('resortBooking.deposit')}</Text><Text style={{ color: colors.title, fontWeight: '800' }}>{booking.depositCurrency} {Number(booking.depositAmount || 0).toLocaleString()} · {t(`resortBooking.depositStatus.${booking.depositStatus}`)}</Text></View><View style={row}><Text style={{ color: colors.text }}>{t('resortBooking.name')}</Text><Text style={{ color: colors.title, fontWeight: '800' }}>{booking.applicantName}</Text></View>{booking.contactPhone ? <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}><Phone size={15} color={colors.accent} /><Text style={{ marginLeft: 7, color: colors.text }}>{booking.contactPhone}</Text></View> : null}{booking.contactEmail ? <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}><Mail size={15} color={colors.accent} /><Text style={{ marginLeft: 7, color: colors.text }}>{booking.contactEmail}</Text></View> : null}{booking.note ? <Text style={{ marginTop: 14, padding: 11, borderRadius: 10, color: colors.text, backgroundColor: colors.soft }}>{booking.note}</Text> : null}{booking.adminNote ? <Text style={{ marginTop: 11, color: colors.text }}>{t('resortBooking.adminNote')}: {booking.adminNote}</Text> : null}</View>

    <TouchableOpacity activeOpacity={0.82} onPress={() => router.push({ pathname: '/(tabs)/resort-detail', params: { resortId: booking.resortId } })} style={card}>{booking.resortCoverUrl ? <Image source={{ uri: booking.resortCoverUrl }} style={{ width: '100%', height: 150, borderRadius: 14 }} /> : null}<View style={{ marginTop: 13, flexDirection: 'row', alignItems: 'center' }}><Hotel size={21} color={colors.accent} /><View style={{ marginLeft: 10, flex: 1 }}><Text style={{ color: colors.title, fontSize: 17, fontWeight: '900' }}>{booking.resortName}</Text>{resort?.area || resort?.address ? <Text style={{ marginTop: 4, color: colors.text }}>{resort.area || resort.address}</Text> : null}</View><ChevronRight size={21} color={colors.text} /></View><Text style={{ marginTop: 10, color: colors.accent, fontWeight: '900' }}>{t('resortBooking.goToResort')}</Text></TouchableOpacity>

    <View style={card}><Text style={{ color: colors.title, fontSize: 17, fontWeight: '900' }}>{t('resortBooking.cancellationPolicyTitle')}</Text><Text style={{ marginTop: 7, color: colors.text, lineHeight: 20 }}>{t('resortBooking.cancellationPolicyBody')}</Text><View style={{ height: 1, marginVertical: 13, backgroundColor: colors.border }} /><Text style={{ color: colors.title, fontWeight: '900' }}>{t('resortBooking.noShowPolicyTitle')}</Text><Text style={{ marginTop: 7, color: colors.text, lineHeight: 20 }}>{t('resortBooking.noShowPolicyBody')}</Text></View>
    {canCancel ? <TouchableOpacity onPress={() => cancelBooking(booking)} style={{ marginTop: 16, padding: 14, borderRadius: 13, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' }}><Text style={{ color: '#DC2626', fontWeight: '900' }}>{t('resortBooking.cancel')}</Text></TouchableOpacity> : null}{canRefund ? <TouchableOpacity onPress={() => requestRefund(booking)} style={{ marginTop: 12, padding: 14, borderRadius: 13, alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B' }}><Text style={{ color: '#B45309', fontWeight: '900' }}>{t('resortBooking.refundRequest')}</Text></TouchableOpacity> : null}
    <TouchableOpacity onPress={() => router.replace('/(tabs)/booking-history')} style={{ marginTop: 12, padding: 14, alignItems: 'center' }}><Text style={{ color: colors.accent, fontWeight: '900' }}>{t('resortBooking.backToHistory')}</Text></TouchableOpacity>
  </ScrollView></Screen>;
}
