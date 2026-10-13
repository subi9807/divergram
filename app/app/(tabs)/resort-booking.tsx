import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarDays, Check, CircleDollarSign } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { useAuth } from '../../src/hooks/useAuth';
import { useProfile } from '../../src/hooks/useProfile';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { resortDepositPaymentsAvailable } from '../../src/config/paymentAvailability';

const DIVE_TYPES = ['fun_diving', 'scuba', 'freediving'] as const;

function toLocalDateValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeInternationalPhone(value: string) {
  const input = value.trim();
  if (!/^\+[0-9\s().-]+$/.test(input)) return '';
  const normalized = input.replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : '';
}

function getBookingErrorKey(code: string) {
  if (code === 'duplicate_resort_booking') return 'duplicateError';
  if (code === 'resort_booking_unavailable') return 'unavailable';
  if (code === 'resort_booking_notice_too_short') return 'noticeTooShort';
  if (code === 'resort_booking_date_closed') return 'dateClosed';
  if (code === 'resort_booking_capacity_exceeded') return 'capacityExceeded';
  if (code === 'invalid_resort_booking') return 'validationError';
  if (code === 'invalid_resort_booking_date_range' || code === 'resort_booking_range_too_long') return 'dateRangeInvalid';
  if (code === 'invalid_resort_booking_phone') return 'phoneInvalid';
  if (code === 'invalid_resort_booking_price') return 'priceError';
  if (code === 'unauthorized') return 'loginRequired';
  return 'error';
}

export default function ResortBookingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
  const params = useLocalSearchParams<{ resortId?: string | string[] }>();
  const resortId = Array.isArray(params.resortId) ? params.resortId[0] || '' : params.resortId || '';
  const [startDate, setStartDate] = useState(new Date(Date.now() + 86_400_000));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86_400_000));
  const [datePicker, setDatePicker] = useState<'start' | 'end' | null>(null);
  const [participants, setParticipants] = useState('1');
  const [diveType, setDiveType] = useState<(typeof DIVE_TYPES)[number]>('fun_diving');
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [note, setNote] = useState('');
  const [priceId, setPriceId] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { data: profile } = useProfile();
  const { data: resorts = [] } = useQuery({ queryKey: ['resorts'], queryFn: apiClient.getResorts });
  const resort = useMemo(() => resorts.find((item: any) => String(item.id) === resortId), [resorts, resortId]);
  const { data: prices = [] } = useQuery({ queryKey: ['resort-prices', resortId], queryFn: () => apiClient.getResortPrices(resortId), enabled: Boolean(resortId) });
  const { data: availability } = useQuery({ queryKey: ['resort-booking-availability', resortId], queryFn: () => apiClient.getResortBookingAvailability(resortId), enabled: Boolean(resortId) });
  const colors = { page: isDark ? '#07131F' : '#F4F8FB', card: isDark ? '#0F2030' : '#FFF', title: isDark ? '#F1F5F9' : '#102A36', text: isDark ? '#CBD5E1' : '#526B75', border: isDark ? '#243B4C' : '#DCE8EA', accent: '#087F79', soft: isDark ? '#12332F' : '#E9F7F4' };
  const field = { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: colors.title, backgroundColor: colors.card } as const;
  const minimumDate = useMemo(() => new Date(Date.now() + Math.max(0, Number(availability?.minNoticeDays || 0)) * 86_400_000), [availability?.minNoticeDays]);
  useEffect(() => {
    if (startDate < minimumDate) setStartDate(minimumDate);
    if (endDate < minimumDate) setEndDate(minimumDate);
  }, [endDate, minimumDate, startDate]);
  useEffect(() => {
    if (!name.trim()) setName(String(profile?.full_name || user?.name || '').trim());
    if (!phone.trim()) setPhone(String(profile?.contact_phone || '').trim());
    if (!email.trim()) setEmail(String(profile?.email || user?.email || '').trim());
  }, [email, name, phone, profile?.contact_phone, profile?.email, profile?.full_name, user?.email, user?.name]);
  useEffect(() => { if (!resortId) router.replace('/(tabs)/booking-history'); }, [resortId, router]);

  const submit = useMutation({
    mutationFn: () => apiClient.createResortBooking({ resortId, priceId: priceId || undefined, bookingDate: toLocalDateValue(startDate), bookingEndDate: toLocalDateValue(endDate), participants: Number(participants), diveType, applicantName: name.trim(), contactPhone: normalizeInternationalPhone(phone), contactEmail: email.trim(), note: note.trim(), bookingTermsAccepted: termsAccepted }),
    onSuccess: async (booking) => {
      await queryClient.invalidateQueries({ queryKey: ['my-resort-bookings'] });
      router.replace({ pathname: '/(tabs)/resort-booking-detail', params: { bookingId: booking.id, created: '1' } });
    },
    onError: (error: any) => {
      const code = String(error?.response?.data?.error || error?.code || 'network_error');
      const message = t(`resortBooking.${getBookingErrorKey(code)}`);
      Alert.alert(t('common.unexpectedErrorTitle'), __DEV__ ? `${message}\n(${code})` : message);
    },
  });
  const normalizedPhone = normalizeInternationalPhone(phone);
  const depositRequired = Number(resort?.bookingDepositAmount || 0) > 0;
  const validDateRange = endDate >= startDate && endDate.getTime() - startDate.getTime() <= 30 * 86_400_000;
  const canSubmit = Boolean(resort?.bookingEnabled && name.trim() && normalizedPhone && termsAccepted && Number(participants) > 0 && validDateRange);

  return <Screen style={{ backgroundColor: colors.page }}><ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}><TouchableOpacity onPress={() => router.back()}><ArrowLeft color={colors.title} /></TouchableOpacity><View style={{ marginLeft: 14 }}><Text style={{ fontSize: 24, fontWeight: '900', color: colors.title }}>{t('resortBooking.title')}</Text><Text style={{ marginTop: 3, color: colors.text }}>{t('resortBooking.subtitle')}</Text></View></View>
    {resortId && resort ? <View style={{ marginTop: 18, padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
      {resort.coverUrl ? <Image source={{ uri: resort.coverUrl }} style={{ width: '100%', height: 150, borderRadius: 15 }} /> : null}<Text style={{ marginTop: 14, fontSize: 20, fontWeight: '900', color: colors.title }}>{resort.name}</Text><Text style={{ marginTop: 4, color: colors.text }}>{resort.area}</Text>
      {!resort.bookingEnabled ? <Text style={{ marginTop: 14, padding: 12, borderRadius: 12, color: '#B45309', backgroundColor: '#FFF7E8', fontWeight: '800' }}>{t('resortBooking.unavailable')}</Text> : null}
      <Text style={{ marginTop: 16, color: colors.text, fontWeight: '800' }}>{t('resortBooking.dateRange')}</Text><View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}><TouchableOpacity onPress={() => setDatePicker('start')} style={[field, { marginTop: 0, flex: 1, flexDirection: 'row', alignItems: 'center' }]}><CalendarDays size={18} color={colors.accent} /><View style={{ marginLeft: 8 }}><Text style={{ color: colors.text, fontSize: 11 }}>{t('resortBooking.startDate')}</Text><Text style={{ marginTop: 2, color: colors.title, fontWeight: '800' }}>{toLocalDateValue(startDate)}</Text></View></TouchableOpacity><TouchableOpacity onPress={() => setDatePicker('end')} style={[field, { marginTop: 0, flex: 1, flexDirection: 'row', alignItems: 'center', borderColor: validDateRange ? colors.border : '#DC2626' }]}><CalendarDays size={18} color={colors.accent} /><View style={{ marginLeft: 8 }}><Text style={{ color: colors.text, fontSize: 11 }}>{t('resortBooking.endDate')}</Text><Text style={{ marginTop: 2, color: colors.title, fontWeight: '800' }}>{toLocalDateValue(endDate)}</Text></View></TouchableOpacity></View>{!validDateRange ? <Text style={{ marginTop: 6, color: '#DC2626', fontSize: 12 }}>{t('resortBooking.dateRangeInvalid')}</Text> : null}{datePicker ? <DateTimePicker value={datePicker === 'start' ? startDate : endDate} minimumDate={datePicker === 'start' ? minimumDate : startDate} maximumDate={datePicker === 'end' ? new Date(startDate.getTime() + 30 * 86_400_000) : undefined} mode="date" onChange={(_, value) => { const target = datePicker; setDatePicker(null); if (!value) return; if (target === 'start') { setStartDate(value); if (endDate < value) setEndDate(value); } else setEndDate(value); }} /> : null}
      <Text style={{ marginTop: 14, color: colors.text, fontWeight: '800' }}>{t('resortBooking.participants')}</Text><TextInput style={field} keyboardType="number-pad" value={participants} onChangeText={setParticipants} />
      <Text style={{ marginTop: 14, color: colors.text, fontWeight: '800' }}>{t('resortBooking.diveType')}</Text><View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap' }}>{DIVE_TYPES.map(value => <TouchableOpacity key={value} onPress={() => setDiveType(value)} style={{ marginRight: 7, marginBottom: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: diveType === value ? colors.accent : colors.card, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: diveType === value ? '#fff' : colors.title, fontWeight: '700' }}>{t(`resortBooking.types.${value}`)}</Text></TouchableOpacity>)}</View>
      {prices.length ? <><Text style={{ marginTop: 10, color: colors.text, fontWeight: '800' }}>{t('resortBooking.product')}</Text>{prices.map((price: any) => <TouchableOpacity key={price.id} onPress={() => setPriceId(priceId === price.id ? '' : price.id)} style={[field, { borderColor: priceId === price.id ? colors.accent : colors.border }]}><Text style={{ color: colors.title, fontWeight: '800' }}>{price.title} · {price.currency} {Number(price.amount).toLocaleString()}</Text></TouchableOpacity>)}</> : null}
      <View style={{ marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: colors.soft, flexDirection: 'row', alignItems: 'center' }}><CircleDollarSign size={22} color={colors.accent} /><View style={{ marginLeft: 10, flex: 1 }}><Text style={{ color: colors.title, fontWeight: '900' }}>{t('resortBooking.deposit')}</Text><Text style={{ marginTop: 3, color: colors.text }}>{depositRequired ? `USD ${Number(resort.bookingDepositAmount).toLocaleString()}` : t('resortBooking.noDeposit')}</Text></View></View>{depositRequired ? <Text style={{ marginTop: 6, color: colors.text, fontSize: 12 }}>{t(resortDepositPaymentsAvailable ? 'resortBooking.depositWalletNotice' : 'resortBooking.paymentUnavailableBody')}</Text> : null}<View style={{ marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.title, fontWeight: '900' }}>{t('resortBooking.cancellationPolicyTitle')}</Text><Text style={{ marginTop: 5, color: colors.text, fontSize: 12, lineHeight: 18 }}>{t('resortBooking.cancellationPolicyBody')}</Text><View style={{ height: 1, marginVertical: 10, backgroundColor: colors.border }} /><Text style={{ color: colors.title, fontWeight: '900' }}>{t('resortBooking.noShowPolicyTitle')}</Text><Text style={{ marginTop: 5, color: colors.text, fontSize: 12, lineHeight: 18 }}>{t('resortBooking.noShowPolicyBody')}</Text></View>
      <TextInput style={field} value={name} onChangeText={setName} placeholder={t('resortBooking.name')} placeholderTextColor={colors.text} /><TextInput style={[field, phone.length > 0 && !normalizedPhone ? { borderColor: '#DC2626' } : null]} value={phone} onChangeText={setPhone} placeholder={t('resortBooking.phonePlaceholder')} placeholderTextColor={colors.text} keyboardType="phone-pad" autoComplete="tel" /><Text style={{ marginTop: 5, color: phone.length > 0 && !normalizedPhone ? '#DC2626' : colors.text, fontSize: 12 }}>{phone.length > 0 && !normalizedPhone ? t('resortBooking.phoneInvalid') : t('resortBooking.phoneHint')}</Text><TextInput style={field} value={email} onChangeText={setEmail} placeholder={t('resortBooking.email')} placeholderTextColor={colors.text} keyboardType="email-address" autoCapitalize="none" /><TextInput style={[field, { minHeight: 90, textAlignVertical: 'top' }]} multiline value={note} onChangeText={setNote} placeholder={t('resortBooking.note')} placeholderTextColor={colors.text} />
      <TouchableOpacity onPress={() => setTermsAccepted(value => !value)} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'flex-start' }}><View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: termsAccepted ? colors.accent : colors.border, backgroundColor: termsAccepted ? colors.accent : colors.card, alignItems: 'center', justifyContent: 'center' }}>{termsAccepted ? <Check size={15} color="#fff" /> : null}</View><Text style={{ marginLeft: 9, flex: 1, color: colors.text, lineHeight: 20 }}>{t('resortBooking.termsConsent')}</Text></TouchableOpacity>
      <TouchableOpacity disabled={!canSubmit || submit.isPending} onPress={() => submit.mutate()} style={{ marginTop: 16, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: colors.accent, opacity: canSubmit ? 1 : 0.45 }}><Text style={{ color: '#fff', fontWeight: '900' }}>{submit.isPending ? t('common.loading') : t('resortBooking.submit')}</Text></TouchableOpacity>
    </View> : null}
  </ScrollView></Screen>;
}
