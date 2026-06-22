import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/Screen';
import type { Certification } from '../../models';
import { CERTIFICATION_AGENCY_PRESETS, normalizeCertificationAgency } from '../../models/Certification';
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

const statusLabel: Record<Certification['status'], string> = {
  unregistered: '미등록',
  reviewing: '검토중',
  verified: '인증완료',
  rejected: '반려',
};

const statusColor: Record<Certification['status'], string> = {
  unregistered: '#64748B',
  reviewing: '#D97706',
  verified: '#166534',
  rejected: '#B91C1C',
};

const RECENT_AGENCY_STORAGE_KEY = 'divergram_recent_cert_agencies_v1';
const MAX_RECENT_AGENCIES = 6;

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
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCertificationId, setEditingCertificationId] = useState<string | null>(null);
  const [agency, setAgency] = useState('PADI');
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
  const certificationUserId = String(user?.id || 'me');

  const certificationsQuery = useQuery({
    queryKey: ['certifications', certificationUserId],
    queryFn: () => listCertifications(certificationUserId),
  });
  const items = certificationsQuery.data || [];
  const loading = certificationsQuery.isLoading;
  const agencyQueryNormalized = agencyQuery.trim().toLowerCase();
  const recentFiltered = useMemo(() => {
    if (!agencyQueryNormalized) return recentAgencies;
    return recentAgencies.filter((item) => item.toLowerCase().includes(agencyQueryNormalized));
  }, [agencyQueryNormalized, recentAgencies]);
  const presetFiltered = useMemo(() => {
    if (!agencyQueryNormalized) return CERTIFICATION_AGENCY_PRESETS;
    return CERTIFICATION_AGENCY_PRESETS.filter((item) => item.toLowerCase().includes(agencyQueryNormalized));
  }, [agencyQueryNormalized]);

  const sync = getCertificationSyncState();
  const syncHint = sync.reason
    ? `${sync.source === 'backend' ? '백엔드 동기화' : '로컬 저장소 fallback'} (${sync.reason})`
    : sync.source === 'backend'
      ? '백엔드 동기화'
      : '로컬 저장소 fallback';

  const applyOcrSuggestion = (ocr: any) => {
    const agencyRaw = normalizeCertificationAgency(ocr?.agency);
    const levelRaw = String(ocr?.type || '').trim();
    const numberRaw = String(ocr?.number || '').trim();
    const issuedAtRaw = String(ocr?.issued_at || '').trim();

    if (agencyRaw) {
      setAgency(agencyRaw);
      pushRecentAgency(agencyRaw);
      setRecentAgencies(readRecentAgencies());
    }
    if (levelRaw) setLevel((prev) => prev || levelRaw);
    if (numberRaw) setCertificationNumber((prev) => prev || numberRaw);
    if (issuedAtRaw) setIssuedAt((prev) => prev || issuedAtRaw);

    const applied: string[] = [];
    if (agencyRaw) applied.push(`기관 ${agencyRaw}`);
    if (levelRaw) applied.push(`레벨 ${levelRaw}`);
    if (numberRaw) applied.push(`번호 ${numberRaw}`);
    if (issuedAtRaw) applied.push(`취득일 ${issuedAtRaw}`);
    setOcrHint(applied.length ? `OCR 반영: ${applied.join(' · ')}` : 'OCR 결과를 찾지 못했습니다.');
  };

  const runLicenseOcr = async (base64?: string | null, mimeType?: string | null) => {
    const encoded = String(base64 || '').trim();
    if (!encoded) return;
    const safeMime = String(mimeType || 'image/jpeg').trim() || 'image/jpeg';
    const dataUrl = `data:${safeMime};base64,${encoded}`;

    setOcrRunning(true);
    try {
      const result = await apiClient.uploadLicenseImageWithOcr(dataUrl);
      const ocr = result?.ocr || {};
      applyOcrSuggestion(ocr);
    } catch (error: any) {
      const message = String(error?.response?.data?.error || error?.message || '').trim();
      setOcrHint(message ? `OCR 실패: ${message}` : 'OCR 실패: 서버 연결을 확인해주세요.');
    } finally {
      setOcrRunning(false);
    }
  };

  const handlePickImage = async () => {
    if (uploadingImage) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '사진 접근 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      base64: true,
      quality: 0.9,
      selectionLimit: 1,
    });
    if (result.canceled || !result.assets?.length) return;

    const picked = String(result.assets[0]?.uri || '').trim();
    if (!picked) return;
    setUploadingImage(true);
    try {
      const uploaded = await uploadImage(picked);
      setImageUrl(uploaded.url);
      Alert.alert('업로드 완료', uploaded.source === 'cloudinary' ? '자격증 이미지가 업로드되었습니다.' : '임시 업로드 URL로 저장됩니다.');
      const base64 = result.assets[0]?.base64 || '';
      const mimeType = result.assets[0]?.mimeType || 'image/jpeg';
      void runLicenseOcr(base64, mimeType);
    } catch (error: any) {
      Alert.alert('업로드 실패', String(error?.message || error));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!certificationNumber.trim()) {
      Alert.alert('입력 필요', '자격증 번호를 입력해주세요.');
      return;
    }
    if (!level.trim()) {
      Alert.alert('입력 필요', '자격 레벨을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        userId: certificationUserId,
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
      Alert.alert('저장 완료', editingCertificationId ? '자격증 정보가 수정되었습니다.' : '자격증이 등록되었습니다. 상태는 검토중으로 표시됩니다.');
      setLevel('');
      setCertificationNumber('');
      setIssuedAt('');
      setExpiresAt('');
      setImageUrl('');
      setShowForm(false);
      setEditingCertificationId(null);
      await certificationsQuery.refetch();
    } catch (error: any) {
      Alert.alert(editingCertificationId ? '수정 실패' : '등록 실패', String(error?.message || error));
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
    setAgency(item.agency || 'PADI');
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
    setAgency('PADI');
    setAgencyQuery('');
    setLevel('');
    setCertificationNumber('');
    setIssuedAt('');
    setExpiresAt('');
    setImageUrl('');
    setOcrHint('');
  };

  const handleDelete = async (item: Certification) => {
    Alert.alert('자격증 삭제', '이 자격증을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCertification(item.id);
            if (editingCertificationId === item.id) cancelEdit();
            await certificationsQuery.refetch();
          } catch (error: any) {
            Alert.alert('삭제 실패', String(error?.message || error));
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>자격증 관리</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>여러 단체의 자격증을 등록하고, 이미지 업로드와 인증 상태를 함께 관리합니다.</Text>
        {syncHint ? (
          <Text style={{ marginTop: 6, color: syncHint.includes('백엔드') ? '#0F766E' : '#B45309', fontSize: 12, fontWeight: '700' }}>
            저장 경로: {syncHint}
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
            {showForm ? '등록 폼 닫기' : editingCertificationId ? '자격증 수정' : '자격증 등록'}
          </Text>
        </TouchableOpacity>

        {showForm ? (
          <View style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800' }}>
                {editingCertificationId ? '자격증 수정' : '자격증 등록'}
              </Text>
              {editingCertificationId ? (
                <TouchableOpacity onPress={cancelEdit}>
                  <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>편집 취소</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={{ color: '#334155', fontWeight: '700' }}>발급 기관</Text>
            <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18 }}>
              자주 쓰는 단체를 누르거나, 아래 입력칸에 직접 단체명을 적어주세요.
            </Text>
            <TextInput
              value={agencyQuery}
              onChangeText={setAgencyQuery}
              placeholder="단체명 검색"
              style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }}
            />
            {recentFiltered.length ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '700' }}>최근 사용</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {recentFiltered.map((item) => (
                    <TouchableOpacity
                      key={`recent-${item}`}
                      onPress={() => {
                        const nextAgency = normalizeCertificationAgency(item);
                        setAgency(nextAgency);
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
                    pushRecentAgency(item);
                    setRecentAgencies(readRecentAgencies());
                  }}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: agency === item ? '#0D5FA8' : '#CBD5E1',
                    backgroundColor: agency === item ? '#EAF4FF' : '#fff',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                  >
                    <Text style={{ color: agency === item ? '#0D5FA8' : '#334155', fontWeight: '700' }}>{item}</Text>
                  </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={agency}
              onChangeText={setAgency}
              placeholder="단체명을 직접 입력하세요 (예: PADI, SSI, AIDA, CMAS, NAUI)"
              style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }}
            />

            <Text style={{ color: '#334155', fontWeight: '700' }}>자격 레벨</Text>
            <TextInput value={level} onChangeText={setLevel} placeholder="예: Open Water / Advanced" style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }} />

            <Text style={{ color: '#334155', fontWeight: '700' }}>자격증 번호</Text>
            <TextInput value={certificationNumber} onChangeText={setCertificationNumber} placeholder="예: A-123456" style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }} />

            <Text style={{ color: '#334155', fontWeight: '700' }}>발급일 / 만료일</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput value={issuedAt} onChangeText={setIssuedAt} placeholder="YYYY-MM-DD" style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }} />
              <TextInput value={expiresAt} onChangeText={setExpiresAt} placeholder="YYYY-MM-DD" style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }} />
            </View>

            <Text style={{ color: '#334155', fontWeight: '700' }}>자격증 이미지</Text>
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
                <Text style={{ color: '#1D4ED8', fontWeight: '800' }}>{imageUrl ? '이미지 다시 선택' : '이미지 업로드'}</Text>
              )}
            </TouchableOpacity>
            {ocrHint ? (
              <Text style={{ color: ocrHint.includes('실패') ? '#B91C1C' : '#0F766E', fontSize: 12, fontWeight: '700' }}>{ocrHint}</Text>
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
                <Text style={{ color: '#fff', fontWeight: '800' }}>{editingCertificationId ? '수정 저장' : '검토 요청 등록'}</Text>
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
                  {item.agency} · {item.level || 'Level 미입력'}
                </Text>
                <Text style={{ marginTop: 4, color: '#64748B' }}>번호: {item.certificationNumber || '-'}</Text>
                <Text style={{ marginTop: 4, color: '#64748B' }}>발급일: {item.issuedAt || '-'}</Text>
                <Text style={{ marginTop: 4, color: '#64748B' }}>만료일: {item.expiresAt || '-'}</Text>
                <Text style={{ marginTop: 4, color: statusColor[item.status], fontWeight: '700' }}>상태: {statusLabel[item.status]}</Text>
                {item.imageUrl ? (
                  <View style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <ExpoImage source={{ uri: item.imageUrl }} style={{ width: '100%', height: 140, backgroundColor: '#E2E8F0' }} contentFit="cover" />
                  </View>
                ) : null}
                {item.status === 'reviewing' ? (
                  <View style={{ marginTop: 10, flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => applyStatus(item.id, 'verified')}>
                      <Text style={{ color: '#166534', fontWeight: '800' }}>인증완료 처리(mock)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => applyStatus(item.id, 'rejected')}>
                      <Text style={{ color: '#B91C1C', fontWeight: '800' }}>반려 처리(mock)</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <View style={{ marginTop: 10, flexDirection: 'row', gap: 14 }}>
                  <TouchableOpacity onPress={() => startEdit(item)}>
                    <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)}>
                    <Text style={{ color: '#B91C1C', fontWeight: '800' }}>삭제</Text>
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
