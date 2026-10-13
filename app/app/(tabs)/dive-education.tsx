import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BookOpenCheck, CalendarDays, Check, CheckSquare2, ChevronDown, ChevronRight, Clock3, GraduationCap, MapPin, ShieldCheck, Square, Users, Waves, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../src/components/Screen';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { apiClient } from '../../src/lib/api';
import { useAuth } from '../../src/hooks/useAuth';

type Track = 'scuba' | 'freediving';

type Course = {
  id: string;
  track: Track;
  level: string;
  translationKey: string;
  featured?: boolean;
};

const COURSES: Course[] = [
  { id: 'scuba-entry', track: 'scuba', level: 'LEVEL 01', translationKey: 'scubaEntry', featured: true },
  { id: 'scuba-advanced', track: 'scuba', level: 'LEVEL 02', translationKey: 'scubaAdvanced' },
  { id: 'scuba-rescue', track: 'scuba', level: 'LEVEL 03', translationKey: 'scubaRescue' },
  { id: 'scuba-pro', track: 'scuba', level: 'PRO', translationKey: 'scubaPro' },
  { id: 'free-entry', track: 'freediving', level: 'LEVEL 01', translationKey: 'freeEntry', featured: true },
  { id: 'free-intermediate', track: 'freediving', level: 'LEVEL 02', translationKey: 'freeIntermediate' },
  { id: 'free-advanced', track: 'freediving', level: 'LEVEL 03', translationKey: 'freeAdvanced' },
  { id: 'free-instructor', track: 'freediving', level: 'PRO', translationKey: 'freeInstructor' },
];

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DiveEducationScreen() {
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [track, setTrack] = useState<Track>('scuba');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [region, setRegion] = useState('');
  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [thirdPartyConsent, setThirdPartyConsent] = useState(false);
  const colors = useMemo(() => ({
    title: isDark ? '#f8fafc' : '#0b1f33', muted: isDark ? '#9fb1c4' : '#64748b',
    text: isDark ? '#dbe7f2' : '#24384d', card: isDark ? '#102031' : '#ffffff',
    border: isDark ? '#294057' : '#dbe7f2', soft: isDark ? '#162d42' : '#eaf5ff', field: isDark ? '#0b1825' : '#f8fbfe',
  }), [isDark]);
  const visibleCourses = COURSES.filter((course) => course.track === track);
  const courseCopy = (course: Course, field: 'title' | 'description' | 'duration' | 'prerequisite' | 'depth') =>
    t(`diveEducation.courses.${course.translationKey}.${field}`);

  const { data: applications = [] } = useQuery({
    queryKey: ['education-applications', user?.id],
    enabled: Boolean(user?.id),
    queryFn: apiClient.getMyEducationApplications,
  });
  const submitApplication = useMutation({
    mutationFn: apiClient.createEducationApplication,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['education-applications', user?.id] });
      setSelectedCourse(null);
      setRegion('');
      setPreferredDate(null);
      setPrivacyConsent(false);
      setThirdPartyConsent(false);
      Alert.alert(t('diveEducation.form.successTitle'), t('diveEducation.form.successBody'));
    },
    onError: () => Alert.alert(t('diveEducation.form.errorTitle'), t('diveEducation.form.errorBody')),
  });
  const cancelApplication = useMutation({
    mutationFn: apiClient.cancelEducationApplication,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['education-applications', user?.id] });
      Alert.alert(t('diveEducation.cancellation.successTitle'), t('diveEducation.cancellation.successBody'));
    },
    onError: async (error: any) => {
      await queryClient.invalidateQueries({ queryKey: ['education-applications', user?.id] });
      const unavailable = Number(error?.response?.status || 0) === 409;
      Alert.alert(
        t(unavailable ? 'diveEducation.cancellation.unavailableTitle' : 'diveEducation.cancellation.errorTitle'),
        t(unavailable ? 'diveEducation.cancellation.unavailableBody' : 'diveEducation.cancellation.errorBody')
      );
    },
  });

  const confirmCancellation = (applicationId: string, courseTitle: string) => {
    if (cancelApplication.isPending) return;
    Alert.alert(
      t('diveEducation.cancellation.confirmTitle'),
      t('diveEducation.cancellation.confirmBody', { course: courseTitle }),
      [
        { text: t('diveEducation.cancellation.keep'), style: 'cancel' },
        { text: t('diveEducation.cancellation.cancel'), style: 'destructive', onPress: () => cancelApplication.mutate(applicationId) },
      ]
    );
  };

  const reviewApplication = () => {
    if (!name.trim() || !contact.trim()) {
      Alert.alert(t('diveEducation.form.requiredTitle'), t('diveEducation.form.requiredBody'));
      return;
    }
    if (!preferredDate) {
      Alert.alert(t('diveEducation.form.dateRequiredTitle'), t('diveEducation.form.dateRequiredBody'));
      return;
    }
    if (!privacyConsent || !thirdPartyConsent) {
      Alert.alert(t('diveEducation.form.consentRequiredTitle'), t('diveEducation.form.consentRequiredBody'));
      return;
    }
    if (!selectedCourse || submitApplication.isPending) return;
    const localizedCourseTitle = courseCopy(selectedCourse, 'title');
    Alert.alert(t('diveEducation.form.reviewTitle'), t('diveEducation.form.reviewBody', { course: localizedCourseTitle, name, contact }), [
      { text: t('diveEducation.form.cancel'), style: 'cancel' },
      { text: t('diveEducation.form.submit'), onPress: () => submitApplication.mutate({ track: selectedCourse.track, courseId: selectedCourse.id, courseLevel: selectedCourse.level, courseTitle: localizedCourseTitle, applicantName: name.trim(), contact: contact.trim(), preferredRegion: region.trim(), preferredDate: formatDateValue(preferredDate), privacyConsent, thirdPartyConsent }) },
    ]);
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && date) setPreferredDate(date);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroIcon}><GraduationCap size={28} color="#ffffff" /></View>
          <Text style={styles.eyebrow}>{t('diveEducation.eyebrow')}</Text>
          <Text style={styles.heroTitle}>{t('diveEducation.title')}</Text>
          <Text style={styles.heroBody}>{t('diveEducation.subtitle')}</Text>
          <View style={styles.heroFacts}>
            <View style={styles.heroFact}><ShieldCheck size={16} color="#86d9ff" /><Text style={styles.heroFactText}>{t('diveEducation.safe')}</Text></View>
            <View style={styles.heroFact}><Users size={16} color="#86d9ff" /><Text style={styles.heroFactText}>{t('diveEducation.consult')}</Text></View>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <View><Text style={[styles.sectionTitle, { color: colors.title }]}>{t('diveEducation.pathTitle')}</Text><Text style={[styles.sectionSub, { color: colors.muted }]}>{t('diveEducation.pathSubtitle')}</Text></View>
          <BookOpenCheck size={22} color="#0d75bd" />
        </View>
        <View style={[styles.segment, { backgroundColor: colors.soft }]}>
          {(['scuba', 'freediving'] as Track[]).map((item) => (
            <TouchableOpacity key={item} style={[styles.segmentButton, track === item && styles.segmentButtonActive]} onPress={() => setTrack(item)}>
              {item === 'scuba' ? <Waves size={18} color={track === item ? '#fff' : '#0d75bd'} /> : <Users size={18} color={track === item ? '#fff' : '#0d75bd'} />}
              <Text style={[styles.segmentText, { color: track === item ? '#fff' : colors.text }]}>{t(`diveEducation.tracks.${item}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.courseList}>
          {visibleCourses.map((course, index) => (
            <TouchableOpacity key={course.id} activeOpacity={0.86} style={[styles.courseCard, { backgroundColor: colors.card, borderColor: course.featured ? '#35a6df' : colors.border }]} onPress={() => setSelectedCourse(course)}>
              <View style={styles.timelineColumn}><View style={[styles.timelineDot, course.featured && styles.timelineDotActive]} />{index < visibleCourses.length - 1 ? <View style={[styles.timelineLine, { backgroundColor: colors.border }]} /> : null}</View>
              <View style={styles.courseContent}>
                <View style={styles.courseTop}><Text style={styles.levelText}>{course.level}</Text>{course.featured ? <Text style={styles.recommended}>{t('diveEducation.recommended')}</Text> : null}</View>
                <Text style={[styles.courseTitle, { color: colors.title }]}>{courseCopy(course, 'title')}</Text>
                <Text style={[styles.courseDescription, { color: colors.muted }]}>{courseCopy(course, 'description')}</Text>
                <View style={styles.metaRow}><View style={[styles.metaChip, { backgroundColor: colors.soft }]}><Clock3 size={13} color="#0d75bd" /><Text style={[styles.metaText, { color: colors.text }]}>{courseCopy(course, 'duration')}</Text></View><View style={[styles.metaChip, { backgroundColor: colors.soft }]}><Waves size={13} color="#0d75bd" /><Text style={[styles.metaText, { color: colors.text }]}>{courseCopy(course, 'depth')}</Text></View></View>
                <Text style={[styles.prerequisite, { color: colors.muted }]}>{t('diveEducation.prerequisite')}: {courseCopy(course, 'prerequisite')}</Text>
              </View>
              <ChevronRight size={20} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {applications.length ? (
          <View style={styles.applicationHistory}>
            <Text style={[styles.sectionTitle, { color: colors.title }]}>{t('diveEducation.myApplications')}</Text>
            {applications.slice(0, 3).map((application) => (
              <View key={application.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.historyBody}><Text style={[styles.historyTitle, { color: colors.title }]}>{application.courseTitle}</Text><Text style={[styles.historyMeta, { color: colors.muted }]}>{application.assignedResortName || t('diveEducation.assignmentPending')}</Text></View>
                <View style={styles.historyActions}>
                  <Text style={[styles.historyStatus, application.status === 'cancelled' && styles.historyStatusCancelled]}>{t(`diveEducation.status.${application.status}`)}</Text>
                  {application.status === 'received' ? (
                    <TouchableOpacity
                      disabled={cancelApplication.isPending}
                      onPress={() => confirmCancellation(application.id, application.courseTitle)}
                      style={[styles.cancelApplicationButton, { borderColor: colors.border }, cancelApplication.isPending && styles.submitButtonDisabled]}
                    >
                      <Text style={styles.cancelApplicationText}>{t('diveEducation.cancellation.button')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal transparent visible={Boolean(selectedCourse)} animationType="slide" onRequestClose={() => setSelectedCourse(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedCourse(null)} />
          <View style={[styles.applicationSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <View style={styles.applicationHeader}><View><Text style={styles.levelText}>{selectedCourse?.level}</Text><Text style={[styles.applicationTitle, { color: colors.title }]}>{selectedCourse ? courseCopy(selectedCourse, 'title') : ''}</Text></View><TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.soft }]} onPress={() => setSelectedCourse(null)}><X size={20} color={colors.text} /></TouchableOpacity></View>
            <Text style={[styles.applicationIntro, { color: colors.muted }]}>{t('diveEducation.form.intro')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.fieldRow}><View style={styles.fieldHalf}><Text style={[styles.label, { color: colors.text }]}>{t('diveEducation.form.name')} *</Text><TextInput value={name} onChangeText={setName} placeholder={t('diveEducation.form.namePlaceholder')} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.title, borderColor: colors.border, backgroundColor: colors.field }]} /></View><View style={styles.fieldHalf}><Text style={[styles.label, { color: colors.text }]}>{t('diveEducation.form.contact')} *</Text><TextInput value={contact} onChangeText={setContact} placeholder={t('diveEducation.form.contactPlaceholder')} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.title, borderColor: colors.border, backgroundColor: colors.field }]} /></View></View>
              <Text style={[styles.label, { color: colors.text }]}>{t('diveEducation.form.region')}</Text><View style={styles.iconInput}><MapPin size={17} color="#0d75bd" /><TextInput value={region} onChangeText={setRegion} placeholder={t('diveEducation.form.regionPlaceholder')} placeholderTextColor={colors.muted} style={[styles.input, styles.inputWithIcon, { color: colors.title, borderColor: colors.border, backgroundColor: colors.field }]} /></View>
              <Text style={[styles.label, { color: colors.text }]}>{t('diveEducation.form.schedule')} *</Text>
              <TouchableOpacity style={[styles.dateField, { borderColor: colors.border, backgroundColor: colors.field }]} onPress={() => setShowDatePicker((current) => !current)}>
                <CalendarDays size={17} color="#0d75bd" />
                <Text style={[styles.dateText, { color: preferredDate ? colors.title : colors.muted }]}>{preferredDate ? preferredDate.toLocaleDateString() : t('diveEducation.form.schedulePlaceholder')}</Text>
                <ChevronDown size={17} color={colors.muted} />
              </TouchableOpacity>
              {showDatePicker ? <DateTimePicker value={preferredDate || new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} minimumDate={new Date()} onChange={handleDateChange} /> : null}
              <View style={[styles.consentBox, { borderColor: colors.border, backgroundColor: colors.field }]}>
                <Text style={[styles.consentHeading, { color: colors.title }]}>{t('diveEducation.form.consentHeading')}</Text>
                <TouchableOpacity style={styles.consentRow} onPress={() => setPrivacyConsent((current) => !current)}>
                  {privacyConsent ? <CheckSquare2 size={22} color="#0d75bd" /> : <Square size={22} color={colors.muted} />}
                  <View style={styles.consentCopy}><Text style={[styles.consentTitle, { color: colors.text }]}>{t('diveEducation.form.privacyConsentTitle')} *</Text><Text style={[styles.consentBody, { color: colors.muted }]}>{t('diveEducation.form.privacyConsentBody')}</Text></View>
                </TouchableOpacity>
                <View style={[styles.consentDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.consentRow} onPress={() => setThirdPartyConsent((current) => !current)}>
                  {thirdPartyConsent ? <CheckSquare2 size={22} color="#0d75bd" /> : <Square size={22} color={colors.muted} />}
                  <View style={styles.consentCopy}><Text style={[styles.consentTitle, { color: colors.text }]}>{t('diveEducation.form.thirdPartyConsentTitle')} *</Text><Text style={[styles.consentBody, { color: colors.muted }]}>{t('diveEducation.form.thirdPartyConsentBody')}</Text></View>
                </TouchableOpacity>
              </View>
              <View style={[styles.notice, { backgroundColor: colors.soft }]}><Check size={17} color="#0d75bd" /><Text style={[styles.noticeText, { color: colors.text }]}>{t('diveEducation.form.notice')}</Text></View>
              <TouchableOpacity style={[styles.submitButton, submitApplication.isPending && styles.submitButtonDisabled]} disabled={submitApplication.isPending} onPress={reviewApplication}>{submitApplication.isPending ? <ActivityIndicator color="#fff" /> : <><Text style={styles.submitText}>{t('diveEducation.form.review')}</Text><ChevronRight size={18} color="#fff" /></>}</TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 18, paddingBottom: 40 },
  hero: { overflow: 'hidden', borderRadius: 28, padding: 24, backgroundColor: '#052f54', minHeight: 235 },
  heroGlow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#087ac1', opacity: 0.4, right: -80, top: -80 },
  heroIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 18 },
  eyebrow: { color: '#86d9ff', fontSize: 11, fontWeight: '900', letterSpacing: 1.6 }, heroTitle: { marginTop: 7, color: '#fff', fontSize: 29, lineHeight: 37, fontWeight: '900' }, heroBody: { marginTop: 10, color: '#cce9fa', fontSize: 14, lineHeight: 21, maxWidth: '90%' },
  heroFacts: { flexDirection: 'row', gap: 14, marginTop: 18 }, heroFact: { flexDirection: 'row', alignItems: 'center', gap: 6 }, heroFactText: { color: '#eaf7ff', fontSize: 12, fontWeight: '700' },
  sectionHead: { marginTop: 28, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { fontSize: 21, fontWeight: '900' }, sectionSub: { marginTop: 4, fontSize: 13 },
  segment: { padding: 5, borderRadius: 16, flexDirection: 'row', gap: 5 }, segmentButton: { flex: 1, minHeight: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, segmentButtonActive: { backgroundColor: '#0d75bd' }, segmentText: { fontWeight: '800' },
  courseList: { marginTop: 14, gap: 10 }, courseCard: { minHeight: 172, borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'flex-start' }, timelineColumn: { width: 19, alignItems: 'center', alignSelf: 'stretch', marginRight: 9 }, timelineDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#b9ccdc', marginTop: 5 }, timelineDotActive: { width: 13, height: 13, backgroundColor: '#15a3d7', borderWidth: 3, borderColor: '#dff6ff' }, timelineLine: { width: 2, flex: 1, marginTop: 5 }, courseContent: { flex: 1 }, courseTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, levelText: { color: '#168bc8', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, recommended: { color: '#076297', backgroundColor: '#dff5ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontSize: 10, fontWeight: '800' }, courseTitle: { marginTop: 6, fontSize: 18, fontWeight: '900' }, courseDescription: { marginTop: 7, fontSize: 13, lineHeight: 19 }, metaRow: { marginTop: 12, flexDirection: 'row', gap: 7, flexWrap: 'wrap' }, metaChip: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }, metaText: { fontSize: 11, fontWeight: '700' }, prerequisite: { marginTop: 9, fontSize: 11 },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,12,23,0.58)' }, applicationSheet: { maxHeight: '88%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 28 }, modalHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#c7d5e2', marginTop: 10, marginBottom: 16 }, applicationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, applicationTitle: { marginTop: 3, fontSize: 23, fontWeight: '900' }, closeButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, applicationIntro: { marginTop: 8, marginBottom: 18, lineHeight: 19 },
  fieldRow: { flexDirection: 'row', gap: 10 }, fieldHalf: { flex: 1 }, label: { fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 10 }, input: { height: 48, borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 }, iconInput: { position: 'relative', justifyContent: 'center' }, inputWithIcon: { paddingLeft: 40 }, notice: { marginTop: 18, borderRadius: 14, padding: 13, flexDirection: 'row', gap: 9, alignItems: 'flex-start' }, noticeText: { flex: 1, fontSize: 12, lineHeight: 18 }, submitButton: { marginTop: 16, minHeight: 52, borderRadius: 15, paddingHorizontal: 18, backgroundColor: '#0d75bd', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, submitText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  dateField: { minHeight: 48, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 13 }, dateText: { flex: 1, fontSize: 14 },
  consentBox: { marginTop: 18, padding: 14, borderWidth: 1, borderRadius: 15 }, consentHeading: { marginBottom: 12, fontSize: 13, fontWeight: '900' }, consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, consentCopy: { flex: 1 }, consentTitle: { fontSize: 12, fontWeight: '900' }, consentBody: { marginTop: 4, fontSize: 10, lineHeight: 15 }, consentDivider: { height: StyleSheet.hairlineWidth, marginVertical: 13 },
  submitButtonDisabled: { opacity: 0.6 }, applicationHistory: { marginTop: 28, gap: 10 }, historyCard: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, historyBody: { flex: 1 }, historyTitle: { fontSize: 14, fontWeight: '900' }, historyMeta: { marginTop: 4, fontSize: 11 }, historyActions: { alignItems: 'flex-end', gap: 8 }, historyStatus: { color: '#0874b5', backgroundColor: '#e4f5ff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: '900' }, historyStatusCancelled: { color: '#9f3131', backgroundColor: '#fdeaea' }, cancelApplicationButton: { minHeight: 34, justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 11 }, cancelApplicationText: { color: '#b42318', fontSize: 11, fontWeight: '900' },
});
