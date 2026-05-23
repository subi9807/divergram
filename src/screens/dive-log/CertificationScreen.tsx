import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { Screen } from '../../components/Screen';
import type { Certification, CertificationAgency } from '../../models';
import { uploadImage } from '../../services/cloudinaryService';
import {
  getCertificationSyncState,
  listCertifications,
  registerCertification,
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

export default function CertificationScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [agency, setAgency] = useState<CertificationAgency>('PADI');
  const [level, setLevel] = useState('');
  const [certificationNumber, setCertificationNumber] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrHint, setOcrHint] = useState('');
  const [syncHint, setSyncHint] = useState('');

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCertifications(String(user?.id || 'me'));
      setItems(rows);
      const sync = getCertificationSyncState();
      const base = sync.source === 'backend' ? '백엔드 동기화' : '로컬 저장소 fallback';
      setSyncHint(sync.reason ? `${base} (${sync.reason})` : base);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const applyOcrSuggestion = (ocr: any) => {
    const agencyRaw = String(ocr?.agency || '').trim().toUpperCase();
    const levelRaw = String(ocr?.type || '').trim();
    const numberRaw = String(ocr?.number || '').trim();
    const issuedAtRaw = String(ocr?.issued_at || '').trim();
    const nextAgency: CertificationAgency | null = agencyRaw === 'PADI' ? 'PADI' : agencyRaw === 'SSI' ? 'SSI' : null;

    if (nextAgency) setAgency(nextAgency);
    if (levelRaw) setLevel((prev) => prev || levelRaw);
    if (numberRaw) setCertificationNumber((prev) => prev || numberRaw);
    if (issuedAtRaw) setIssuedAt((prev) => prev || issuedAtRaw);

    const applied: string[] = [];
    if (nextAgency) applied.push(`기관 ${nextAgency}`);
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
      await registerCertification({
        userId: String(user?.id || 'me'),
        agency,
        certificationNumber: certificationNumber.trim(),
        level: level.trim(),
        issuedAt: issuedAt.trim(),
        expiresAt: expiresAt.trim(),
        imageUrl: imageUrl.trim(),
      });
      Alert.alert('등록 완료', '자격증이 등록되었습니다. 상태는 검토중으로 표시됩니다.');
      setLevel('');
      setCertificationNumber('');
      setIssuedAt('');
      setExpiresAt('');
      setImageUrl('');
      setShowForm(false);
      await loadList();
    } catch (error: any) {
      Alert.alert('등록 실패', String(error?.message || error));
    } finally {
      setSubmitting(false);
    }
  };

  const applyStatus = async (id: string, status: Certification['status']) => {
    await updateCertificationStatus(id, status);
    await loadList();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>자격증 관리</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>PADI / SSI 자격증 등록, 이미지 업로드, 인증 상태를 관리합니다.</Text>
        {syncHint ? (
          <Text style={{ marginTop: 6, color: syncHint.includes('백엔드') ? '#0F766E' : '#B45309', fontSize: 12, fontWeight: '700' }}>
            저장 경로: {syncHint}
          </Text>
        ) : null}

        <TouchableOpacity
          style={{ marginTop: 14, borderRadius: 12, backgroundColor: '#0D5FA8', paddingVertical: 12, alignItems: 'center' }}
          onPress={() => setShowForm((prev) => !prev)}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>{showForm ? '등록 폼 닫기' : '자격증 등록'}</Text>
        </TouchableOpacity>

        {showForm ? (
          <View style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14, gap: 10 }}>
            <Text style={{ color: '#334155', fontWeight: '700' }}>발급 기관</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['PADI', 'SSI'] as const).map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setAgency(item)}
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
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>검토 요청 등록</Text>}
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
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
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
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
