import React, { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarDays, ChevronRight, GraduationCap, Hotel, Users } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { useAuth } from '../../src/hooks/useAuth';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { getResortBookingStage, getResortBookingStatusKey } from '../../src/features/booking/bookingStatus';

type BookingTab = 'resort' | 'education';

export default function BookingHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
  const [tab, setTab] = useState<BookingTab>('resort');
  const colors = { page: isDark ? '#07131F' : '#F4F8FB', card: isDark ? '#0F2030' : '#FFF', title: isDark ? '#F1F5F9' : '#102A36', text: isDark ? '#CBD5E1' : '#526B75', border: isDark ? '#243B4C' : '#DCE8EA', accent: '#087F79', soft: isDark ? '#12332F' : '#E9F7F4' };
  const resortQuery = useQuery({ queryKey: ['my-resort-bookings'], queryFn: apiClient.getMyResortBookings });
  const educationQuery = useQuery({ queryKey: ['education-applications', user?.id], queryFn: apiClient.getMyEducationApplications, enabled: Boolean(user?.id) });
  const refreshing = resortQuery.isRefetching || educationQuery.isRefetching;
  const refresh = () => { void resortQuery.refetch(); void educationQuery.refetch(); };

  return <Screen style={{ backgroundColor: colors.page }}><ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}><TouchableOpacity onPress={() => router.back()}><ArrowLeft color={colors.title} /></TouchableOpacity><View style={{ marginLeft: 14, flex: 1 }}><Text style={{ fontSize: 24, fontWeight: '900', color: colors.title }}>{t('resortBooking.historyTitle')}</Text><Text style={{ marginTop: 3, color: colors.text }}>{t('resortBooking.historySubtitle')}</Text></View></View>
    <View style={{ marginTop: 20, padding: 4, borderRadius: 15, backgroundColor: colors.soft, flexDirection: 'row' }}>{(['resort', 'education'] as BookingTab[]).map((value) => <TouchableOpacity key={value} onPress={() => setTab(value)} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: tab === value ? colors.card : 'transparent', flexDirection: 'row', justifyContent: 'center' }}>{value === 'resort' ? <Hotel size={17} color={tab === value ? colors.accent : colors.text} /> : <GraduationCap size={18} color={tab === value ? colors.accent : colors.text} />}<Text style={{ marginLeft: 7, color: tab === value ? colors.accent : colors.text, fontWeight: '900' }}>{t(`resortBooking.tabs.${value}`)}</Text></TouchableOpacity>)}</View>

    {tab === 'resort' ? <View style={{ marginTop: 8 }}>{resortQuery.isLoading ? <ActivityIndicator style={{ marginTop: 32 }} color={colors.accent} /> : null}{(resortQuery.data || []).map((booking) => <TouchableOpacity key={booking.id} activeOpacity={0.82} onPress={() => router.push({ pathname: '/(tabs)/resort-booking-detail', params: { bookingId: booking.id } })} style={{ marginTop: 12, padding: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: colors.title, fontSize: 17, fontWeight: '900' }}>{booking.resortName}</Text><Text style={{ marginTop: 4, color: colors.text, fontSize: 12 }}>{booking.bookingNumber || booking.id}</Text></View><Text style={{ color: booking.status === 'cancelled' || booking.status === 'rejected' ? '#DC2626' : colors.accent, fontWeight: '900' }}>{t(`resortBooking.status.${getResortBookingStatusKey(booking)}`)}</Text><ChevronRight size={20} color={colors.text} /></View><View style={{ marginTop: 13, flexDirection: 'row', alignItems: 'center' }}><CalendarDays size={15} color={colors.accent} /><Text style={{ marginLeft: 6, color: colors.text }}>{String(booking.bookingDate).slice(0, 10)}{booking.bookingEndDate && booking.bookingEndDate !== booking.bookingDate ? ` - ${String(booking.bookingEndDate).slice(0, 10)}` : ''}</Text><Users size={15} color={colors.accent} style={{ marginLeft: 16 }} /><Text style={{ marginLeft: 6, color: colors.text }}>{booking.participants}</Text></View><View style={{ marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: colors.soft, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.text, fontWeight: '700' }}>{t('resortBooking.currentStage')}</Text><Text style={{ color: colors.accent, fontWeight: '900' }}>{t(`resortBooking.stages.${getResortBookingStage(booking)}`)}</Text></View><Text style={{ marginTop: 12, textAlign: 'right', color: colors.accent, fontWeight: '900' }}>{t('resortBooking.viewDetails')}</Text></TouchableOpacity>)}{!resortQuery.isLoading && !(resortQuery.data || []).length ? <Text style={{ marginTop: 28, textAlign: 'center', color: colors.text }}>{t('resortBooking.empty')}</Text> : null}</View> : null}

    {tab === 'education' ? <View style={{ marginTop: 8 }}>{educationQuery.isLoading ? <ActivityIndicator style={{ marginTop: 32 }} color={colors.accent} /> : null}{(educationQuery.data || []).map((application) => <TouchableOpacity key={application.id} activeOpacity={0.82} onPress={() => router.push('/(tabs)/dive-education')} style={{ marginTop: 12, padding: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: colors.title, fontSize: 17, fontWeight: '900' }}>{application.courseTitle}</Text><Text style={{ marginTop: 4, color: colors.text }}>{application.assignedResortName || t('diveEducation.assignmentPending')}</Text></View><Text style={{ color: colors.accent, fontWeight: '900' }}>{t(`diveEducation.status.${application.status}`)}</Text><ChevronRight size={20} color={colors.text} /></View><View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}><CalendarDays size={15} color={colors.accent} /><Text style={{ marginLeft: 6, color: colors.text }}>{application.preferredDate || application.preferredSchedule || '-'}</Text></View></TouchableOpacity>)}{!educationQuery.isLoading && !(educationQuery.data || []).length ? <Text style={{ marginTop: 28, textAlign: 'center', color: colors.text }}>{t('profileExtra.educationEmpty')}</Text> : null}</View> : null}
  </ScrollView></Screen>;
}
