import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/Screen';
import type { Certification, CertificationDiscipline } from '../../models';
import { CERTIFICATION_AGENCIES, normalizeCertificationAgency } from '../../models/Certification';
import { storage } from '../../lib/storage';
import { uploadImage } from '../../services/cloudinaryService';
import {
  deleteCertification,
  getCertificationSyncState,
  listCertifications,
  registerCertification,
  updateCertificationDetails,
  updateCertificationStatus,
} from '../../services/certificationService';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';

const statusColor: Record<Certification['status'], string> = {
  unregistered: '#64748B',
  reviewing: '#D97706',
  verified: '#166534',
  rejected: '#B91C1C',
};

const RECENT_AGENCY_STORAGE_KEY = 'divergram_recent_cert_agencies_v1';
const MAX_RECENT_AGENCIES = 6;
const OTHER_AGENCY = '__other__';

function readRecentAgencies() {
  const raw = storage.getString(RECENT_AGENCY_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeCertificationAgency(item))
      .filter(Boolean)
      .slice(0, MAX_RECENT_AGENCIES);
  } catch {
    return [];
  }
}

function writeRecentAgencies(items: string[]) {
  const normalized = items.map((item) => normalizeCertificationAgency(item)).filter(Boolean).slice(0, MAX_RECENT_AGENCIES);
  if (!normalized.length) {
    storage.delete(RECENT_AGENCY_STORAGE_KEY);
    return;
  }
  storage.set(RECENT_AGENCY_STORAGE_KEY, JSON.stringify(normalized));
}

function pushRecentAgency(value: string) {
  const normalized = normalizeCertificationAgency(value);
  if (!normalized) return;
  const current = readRecentAgencies();
  const next = [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, MAX_RECENT_AGENCIES);
  writeRecentAgencies(next);
}

export default function CertificationScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCertificationId, setEditingCertificationId] = useState<string | null>(null);
  const [discipline, setDiscipline] = useState<CertificationDiscipline>('scuba');
  const [agency, setAgency] = useState('PADI');
  const [agencySelection, setAgencySelection] = useState('PADI');
  const [agencyQuery, setAgencyQuery] = useState('');
  const [recentAgencies, setRecentAgencies] = useState<string[]>(() => readRecentAgencies());
  const [level, setLevel] = useState('');
  const [certificationNumber, setCertificationNumber] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrHint, setOcrHint] = useState('');
  const [ocrFailed, setOcrFailed] = useState(false);
  const certificationUserId = String(user?.id || 'me');

  const certificationsQuery = useQuery({
    queryKey: ['certifications', certificationUserId],
    queryFn: () => listCertifications(certificationUserId),
  });
  const items = certificationsQuery.data || [];
  const loading = certificationsQuery.isLoading;
  const agencyQueryNormalized = agencyQuery.trim().toLowerCase();
  const recentFiltered = useMemo(() => {
    const available = new Set(CERTIFICATION_AGENCIES[discipline].map((item) => item.toLowerCase()));
    const matching = recentAgencies.filter((item) => available.has(item.toLowerCase()));
    if (!agencyQueryNormalized) return matching;
    return matching.filter((item) => item.toLowerCase().includes(agencyQueryNormalized));
  }, [agencyQueryNormalized, discipline, recentAgencies]);
  const presetFiltered = useMemo(() => {
    const agencies = CERTIFICATION_AGENCIES[discipline];
    if (!agencyQueryNormalized) return agencies;
    return agencies.filter((item) => item.toLowerCase().includes(agencyQueryNormalized));
  }, [agencyQueryNormalized, discipline]);

  const chooseDiscipline = (next: CertificationDiscipline) => {
    const firstAgency = CERTIFICATION_AGENCIES[next][0];
    setDiscipline(next);
    setAgency(firstAgency);
    setAgencySelection(firstAgency);
    setAgencyQuery('');
  };

  const sync = getCertificationSyncState();
  const syncIsBackend = sync.source === 'backend';
  const syncHintBase = t(syncIsBackend ? 'certification.backendSync' : 'certification.localFallback');
  const syncHint = sync.reason ? `${syncHintBase} (${sync.reason})` : syncHintBase;

  const applyOcrSuggestion = (ocr: any) => {
    const agencyRaw = normalizeCertificationAgency(ocr?.agency);
    const levelRaw = String(ocr?.type || '').trim();
    const numberRaw = String(ocr?.number || '').trim();
    const issuedAtRaw = String(ocr?.issued_at || '').trim();

    if (agencyRaw) {
      setAgency(agencyRaw);
      setAgencySelection(CERTIFICATION_AGENCIES[discipline].some((item) => item.toLowerCase() === agencyRaw.toLowerCase()) ? agencyRaw : OTHER_AGENCY);
      pushRecentAgency(agencyRaw);
      setRecentAgencies(readRecentAgencies());
    }
    if (levelRaw) setLevel((prev) => prev || levelRaw);
    if (numberRaw) setCertificationNumber((prev) => prev || numberRaw);
    if (issuedAtRaw) setIssuedAt((prev) => prev || issuedAtRaw);

    const applied: string[] = [];
    if (agencyRaw) applied.push(t('certification.ocrAgency', { value: agencyRaw }));
    if (levelRaw) applied.push(t('certification.ocrLevel', { value: levelRaw }));
    if (numberRaw) applied.push(t('certification.ocrNumber', { value: numberRaw }));
    if (issuedAtRaw) applied.push(t('certification.ocrIssueDate', { value: issuedAtRaw }));
    setOcrFailed(false);
    setOcrHint(applied.length ? t('certification.ocrApplied', { values: applied.join(' · ') }) : t('certification.ocrNoResult'));
  };

  const runLicenseOcr = async (base64?: string | null, mimeType?: string | null) => {
    const encoded = String(base64 || '').trim();
    if (!encoded) return;
    const safeMime = String(mimeType || 'image/jpeg').trim() || 'image/jpeg';
    const dataUrl = `data:${safeMime};base64,${encoded}`;

    setOcrRunning(true);
    setOcrFailed(false);
    try {
      const result = await apiClient.uploadLicenseImageWithOcr(dataUrl);
      const ocr = result?.ocr || {};
      applyOcrSuggestion(ocr);
    } catch (error: any) {
      const message = String(error?.response?.data?.error || error?.message || '').trim();
      setOcrFailed(true);
      setOcrHint(message ? t('certification.ocrFailedReason', { reason: message }) : t('certification.ocrFailedServer'));
    } finally {
      setOcrRunning(false);
    }
  };

  const handlePickImage = async () => {
    if (uploadingImage) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('certification.permissionTitle'), t('certification.permissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      base64: true,
      quality: 0.9,
      selectionLimit: 1,
      shouldDownloadFromNetwork: true,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });
    if (result.canceled || !result.assets?.length) return;

    const picked = String(result.assets[0]?.uri || '').trim();
    if (!picked) return;
    setUploadingImage(true);
    try {
      const uploaded = await uploadImage(picked);
      setImageUrl(uploaded.url);
      Alert.alert(t('certification.uploadComplete'), t(uploaded.source === 'cloudinary' ? 'certification.uploaded' : 'certification.temporaryUpload'));
      const base64 = result.assets[0]?.base64 || '';
      const mimeType = result.assets[0]?.mimeType || 'image/jpeg';
      void runLicenseOcr(base64, mimeType);
    } catch (error: any) {
      Alert.alert(t('certification.uploadFailed'), String(error?.message || error));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!certificationNumber.trim()) {
      Alert.alert(t('certification.inputRequired'), t('certification.numberRequired'));
      return;
    }
    if (!level.trim()) {
      Alert.alert(t('certification.inputRequired'), t('certification.levelRequired'));
      return;
    }
    if (!agency.trim()) {
      Alert.alert(t('certification.inputRequired'), t('certification.agencyRequired'));
      return;
    }
    if (!imageUrl.trim()) {
      Alert.alert(t('certification.photoRequired'), t('certification.photoRequiredBody'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        userId: certificationUserId,
        discipline,
        agency,
        certificationNumber: certificationNumber.trim(),
        level: level.trim(),
        issuedAt: issuedAt.trim(),
        expiresAt: expiresAt.trim(),
        imageUrl: imageUrl.trim(),
      };
      if (editingCertificationId) {
        await updateCertificationDetails(editingCertificationId, payload);
      } else {
        await registerCertification(payload);
      }
      pushRecentAgency(agency);
      setRecentAgencies(readRecentAgencies());
      Alert.alert(t('certification.saveComplete'), t(editingCertificationId ? 'certification.updated' : 'certification.created'));
      setLevel('');
      setCertificationNumber('');
      setIssuedAt('');
      setExpiresAt('');
      setImageUrl('');
      setShowForm(false);
      setEditingCertificationId(null);
      await certificationsQuery.refetch();
    } catch (error: any) {
      Alert.alert(t(editingCertificationId ? 'certification.updateFailed' : 'certification.createFailed'), String(error?.message || error));
    } finally {
      setSubmitting(false);
    }
  };

  const applyStatus = async (id: string, status: Certification['status']) => {
    await updateCertificationStatus(id, status);
    await certificationsQuery.refetch();
  };

  const startEdit = (item: Certification) => {
    setEditingCertificationId(item.id);
    setShowForm(true);
    setDiscipline(item.discipline || 'scuba');
    setAgency(item.agency || 'PADI');
    setAgencySelection(CERTIFICATION_AGENCIES[item.discipline || 'scuba'].some((agencyName) => agencyName === item.agency) ? item.agency : OTHER_AGENCY);
    setAgencyQuery(item.agency || '');
    setLevel(item.level || '');
    setCertificationNumber(item.certificationNumber || '');
    setIssuedAt(item.issuedAt || '');
    setExpiresAt(item.expiresAt || '');
    setImageUrl(item.imageUrl || '');
    setOcrHint('');
  };

  const cancelEdit = () => {
    setEditingCertificationId(null);
    setShowForm(false);
    setDiscipline('scuba');
    setAgency('PADI');
    setAgencySelection('PADI');
    setAgencyQuery('');
    setLevel('');
    setCertificationNumber('');
    setIssuedAt('');
    setExpiresAt('');
    setImageUrl('');
    setOcrHint('');
    setOcrFailed(false);
  };

  const handleDelete = async (item: Certification) => {
    Alert.alert(t('certification.deleteTitle'), t('certification.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCertification(item.id);
            if (editingCertificationId === item.id) cancelEdit();
            await certificationsQuery.refetch();
          } catch (error: any) {
            Alert.alert(t('certification.deleteFailed'), String(error?.message || error));
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>{t('certification.title')}</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>{t('certification.subtitle')}</Text>
        {syncHint ? (
          <Text style={{ marginTop: 6, color: syncIsBackend ? '#0F766E' : '#B45309', fontSize: 12, fontWeight: '700' }}>
            {t('certification.storagePath')}: {syncHint}
          </Text>
        ) : null}

        <TouchableOpacity
          style={{ marginTop: 14, borderRadius: 12, backgroundColor: '#0D5FA8', paddingVertical: 12, alignItems: 'center' }}
          onPress={() => {
            if (showForm) {
              cancelEdit();
              return;
            }
            setShowForm(true);
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>
            {t(showForm ? 'certification.closeForm' : editingCertificationId ? 'certification.editTitle' : 'certification.registerTitle')}
          </Text>
        </TouchableOpacity>

        {showForm ? (
          <View style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800' }}>
                {t(editingCertificationId ? 'certification.editTitle' : 'certification.registerTitle')}
              </Text>
              {editingCertificationId ? (
                <TouchableOpacity onPress={cancelEdit}>
                  <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>{t('certification.cancelEdit')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={{ color: '#334155', fontWeight: '700' }}>{t('certification.discipline')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['scuba', 'freediving'] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => chooseDiscipline(value)}
                  style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: discipline === value ? '#0D5FA8' : '#CBD5E1', backgroundColor: discipline === value ? '#EAF4FF' : '#fff', paddingVertical: 11, alignItems: 'center' }}
                >
                  <Text style={{ color: discipline === value ? '#0D5FA8' : '#334155', fontWeight: '800' }}>{t(`certification.disciplines.${value}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: '#334155', fontWeight: '700' }}>{t('certification.agency')}</Text>
            <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18 }}>
              {t('certification.agencyHint')}
            </Text>
            <TextInput
              value={agencyQuery}
              onChangeText={setAgencyQuery}
              placeholder={t('certification.searchAgency')}
              style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }}
            />
            {recentFiltered.length ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '700' }}>{t('certification.recent')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {recentFiltered.map((item) => (
                    <TouchableOpacity
                      key={`recent-${item}`}
                      onPress={() => {
                        const nextAgency = normalizeCertificationAgency(item);
                        setAgency(nextAgency);
                        setAgencySelection(nextAgency);
                        pushRecentAgency(nextAgency);
                        setRecentAgencies(readRecentAgencies());
                      }}
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#0D5FA8',
                        backgroundColor: '#EAF4FF',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {presetFiltered.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    setAgency(item);
                    setAgencySelection(item);
                    pushRecentAgency(item);
                    setRecentAgencies(readRecentAgencies());
                  }}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: agencySelection === item ? '#0D5FA8' : '#CBD5E1',
                    backgroundColor: agencySelection === item ? '#EAF4FF' : '#fff',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                  >
                    <Text style={{ color: agencySelection === item ? '#0D5FA8' : '#334155', fontWeight: '700' }}>{item}</Text>
                  </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => {
                  setAgencySelection(OTHER_AGENCY);
                  setAgency('');
                }}
                style={{ borderRadius: 999, borderWidth: 1, borderColor: agencySelection === OTHER_AGENCY ? '#0D5FA8' : '#CBD5E1', backgroundColor: agencySelection === OTHER_AGENCY ? '#EAF4FF' : '#fff', paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ color: agencySelection === OTHER_AGENCY ? '#0D5FA8' : '#334155', fontWeight: '700' }}>{t('certification.other')}</Text>
              </TouchableOpacity>
            </View>
            {agencySelection === OTHER_AGENCY ? (
              <TextInput
                value={agency}
                onChangeText={setAgency}
                placeholder={t('certification.customAgencyPlaceholder')}
                style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }}
              />
            ) : null}

            <Text style={{ color: '#334155', fontWeight: '700' }}>{t('certification.level')}</Text>
            <TextInput value={level} onChangeText={setLevel} placeholder={t('certification.levelPlaceholder')} style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }} />

            <Text style={{ color: '#334155', fontWeight: '700' }}>{t('certification.number')}</Text>
            <TextInput value={certificationNumber} onChangeText={setCertificationNumber} placeholder={t('certification.numberPlaceholder')} style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }} />

            <Text style={{ color: '#334155', fontWeight: '700' }}>{t('certification.issueAndExpiry')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput value={issuedAt} onChangeText={setIssuedAt} placeholder="YYYY-MM-DD" style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }} />
              <TextInput value={expiresAt} onChangeText={setExpiresAt} placeholder="YYYY-MM-DD" style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }} />
            </View>

            <Text style={{ color: '#334155', fontWeight: '700' }}>{t('certification.photo')} <Text style={{ color: '#DC2626' }}>{t('certification.required')}</Text></Text>
            <TouchableOpacity
              onPress={handlePickImage}
              disabled={uploadingImage || ocrRunning}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#93C5FD',
                backgroundColor: '#EFF6FF',
                paddingVertical: 11,
                alignItems: 'center',
                opacity: uploadingImage || ocrRunning ? 0.65 : 1,
              }}
            >
              {uploadingImage || ocrRunning ? (
                <ActivityIndicator color="#1D4ED8" />
              ) : (
                <Text style={{ color: '#1D4ED8', fontWeight: '800' }}>{t(imageUrl ? 'certification.reselectImage' : 'certification.uploadImage')}</Text>
              )}
            </TouchableOpacity>
            {ocrHint ? (
              <Text style={{ color: ocrFailed ? '#B91C1C' : '#0F766E', fontSize: 12, fontWeight: '700' }}>{ocrHint}</Text>
            ) : null}
            {imageUrl ? (
              <View style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <ExpoImage source={{ uri: imageUrl }} style={{ width: '100%', height: 170, backgroundColor: '#E2E8F0' }} contentFit="cover" />
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || uploadingImage}
              style={{
                marginTop: 4,
                borderRadius: 12,
                backgroundColor: submitting || uploadingImage ? '#94A3B8' : '#0D5FA8',
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800' }}>{t(editingCertificationId ? 'certification.saveEdit' : 'certification.submitReview')}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ marginTop: 14 }}>
          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 30 }}>
              <ActivityIndicator color="#0D5FA8" />
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={{ marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', flexShrink: 1 }}>
                  {t(`certification.disciplines.${item.discipline === 'freediving' ? 'freediving' : 'scuba'}`)} · {item.agency} · {item.level || t('certification.levelMissing')}
                </Text>
                <Text style={{ marginTop: 4, color: '#64748B' }}>{t('certification.number')}: {item.certificationNumber || '-'}</Text>
                <Text style={{ marginTop: 4, color: '#64748B' }}>{t('certification.issueDate')}: {item.issuedAt || '-'}</Text>
                <Text style={{ marginTop: 4, color: '#64748B' }}>{t('certification.expiryDate')}: {item.expiresAt || '-'}</Text>
                <Text style={{ marginTop: 4, color: statusColor[item.status], fontWeight: '700' }}>{t('certification.status')}: {t(`certification.statuses.${item.status}`)}</Text>
                {item.imageUrl ? (
                  <View style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <ExpoImage source={{ uri: item.imageUrl }} style={{ width: '100%', height: 140, backgroundColor: '#E2E8F0' }} contentFit="cover" />
                  </View>
                ) : null}
                {item.status === 'reviewing' ? (
                  <View style={{ marginTop: 10, flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => applyStatus(item.id, 'verified')}>
                      <Text style={{ color: '#166534', fontWeight: '800' }}>{t('certification.markVerifiedMock')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => applyStatus(item.id, 'rejected')}>
                      <Text style={{ color: '#B91C1C', fontWeight: '800' }}>{t('certification.markRejectedMock')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <View style={{ marginTop: 10, flexDirection: 'row', gap: 14 }}>
                  <TouchableOpacity onPress={() => startEdit(item)}>
                    <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)}>
                    <Text style={{ color: '#B91C1C', fontWeight: '800' }}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
