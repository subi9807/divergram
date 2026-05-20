import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/hooks/useAuth';
import { useProfile } from '../../src/hooks/useProfile';
import { useToast } from '../../src/components/Toast';
import { apiClient } from '../../src/lib/api';
import { appRouteMap } from '../../src/config/sitemap';

type ScubaLevel = 'none' | 'open_water' | 'advanced' | 'rescue' | 'master' | 'instructor' | 'trainer' | 'course_director';
type FreedivingLevel = 'none' | 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'instructor' | 'trainer' | 'course_director';

const SCUBA_LEVEL_KEYS: ScubaLevel[] = ['none', 'open_water', 'advanced', 'rescue', 'master', 'instructor', 'trainer', 'course_director'];
const FREEDIVING_LEVEL_KEYS: FreedivingLevel[] = ['none', 'level_1', 'level_2', 'level_3', 'level_4', 'instructor', 'trainer', 'course_director'];

function normalizeScubaLevel(level: unknown): ScubaLevel {
  const value = String(level || '').trim();
  if (SCUBA_LEVEL_KEYS.includes(value as ScubaLevel)) return value as ScubaLevel;
  return 'none';
}

function normalizeFreedivingLevel(level: unknown): FreedivingLevel {
  const value = String(level || '').trim();
  if (FREEDIVING_LEVEL_KEYS.includes(value as FreedivingLevel)) return value as FreedivingLevel;
  return 'none';
}

function legacyToScubaLevel(legacy: string): ScubaLevel {
  if (legacy === 'pro') return 'instructor';
  if (legacy === 'advanced') return 'rescue';
  if (legacy === 'intermediate') return 'advanced';
  if (legacy === 'beginner') return 'open_water';
  return 'none';
}

function legacyToFreedivingLevel(legacy: string): FreedivingLevel {
  if (legacy === 'pro') return 'instructor';
  if (legacy === 'advanced') return 'level_3';
  if (legacy === 'intermediate') return 'level_2';
  if (legacy === 'beginner') return 'level_1';
  return 'none';
}

function toLegacyDiveLevel(scuba: ScubaLevel, freediving: FreedivingLevel): string {
  const hasPro =
    scuba === 'instructor' ||
    scuba === 'trainer' ||
    scuba === 'course_director' ||
    freediving === 'instructor' ||
    freediving === 'trainer' ||
    freediving === 'course_director';
  if (hasPro) return 'pro';

  const hasAdvanced = scuba === 'rescue' || scuba === 'master' || freediving === 'level_3' || freediving === 'level_4';
  if (hasAdvanced) return 'advanced';

  const hasIntermediate = scuba === 'advanced' || freediving === 'level_2';
  if (hasIntermediate) return 'intermediate';

  const hasBeginner = scuba === 'open_water' || freediving === 'level_1';
  if (hasBeginner) return 'beginner';

  return '';
}

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [scubaLevel, setScubaLevel] = useState<ScubaLevel>('none');
  const [freedivingLevel, setFreedivingLevel] = useState<FreedivingLevel>('none');
  const [licenseImagePreviewUri, setLicenseImagePreviewUri] = useState('');
  const [licenseImageUrl, setLicenseImageUrl] = useState('');
  const [licenseAgency, setLicenseAgency] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseIssuedAt, setLicenseIssuedAt] = useState('');
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrNotice, setOcrNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(String(profile?.full_name || user?.name || '').trim());
    setBio(String(profile?.bio || '').trim());
    setAvatarUri(String(profile?.avatar_url || user?.avatar || '').trim());
    const scuba = normalizeScubaLevel(profile?.scuba_level);
    const freediving = normalizeFreedivingLevel(profile?.freediving_level);
    if (scuba !== 'none' || freediving !== 'none') {
      setScubaLevel(scuba);
      setFreedivingLevel(freediving);
    } else {
      const legacy = String(profile?.diving_level || '').trim();
      setScubaLevel(legacyToScubaLevel(legacy));
      setFreedivingLevel(legacyToFreedivingLevel(legacy));
    }
    const existingLicenseImage = String(profile?.license_image_url || '').trim();
    setLicenseImageUrl(existingLicenseImage);
    setLicenseImagePreviewUri(existingLicenseImage);
    setLicenseAgency(String(profile?.license_agency || '').trim());
    setLicenseNumber(String(profile?.license_number || '').trim());
    setLicenseIssuedAt(String(profile?.license_issued_at || '').trim());
  }, [
    profile?.avatar_url,
    profile?.bio,
    profile?.diving_level,
    profile?.freediving_level,
    profile?.full_name,
    profile?.license_agency,
    profile?.license_image_url,
    profile?.license_issued_at,
    profile?.license_number,
    profile?.scuba_level,
    user?.avatar,
    user?.name,
  ]);

  const scubaLevels = useMemo(
    () => [
      { key: 'none' as const, label: t('pages.profileEdit.scubaLevels.none', { defaultValue: '라이선스 없음' }) },
      { key: 'open_water' as const, label: t('pages.profileEdit.scubaLevels.open_water', { defaultValue: '오픈워터' }) },
      { key: 'advanced' as const, label: t('pages.profileEdit.scubaLevels.advanced', { defaultValue: '어드벤스' }) },
      { key: 'rescue' as const, label: t('pages.profileEdit.scubaLevels.rescue', { defaultValue: '레스큐' }) },
      { key: 'master' as const, label: t('pages.profileEdit.scubaLevels.master', { defaultValue: '마스터' }) },
      { key: 'instructor' as const, label: t('pages.profileEdit.commonLevels.instructor', { defaultValue: '강사' }) },
      { key: 'trainer' as const, label: t('pages.profileEdit.commonLevels.trainer', { defaultValue: '트레이너' }) },
      { key: 'course_director' as const, label: t('pages.profileEdit.commonLevels.course_director', { defaultValue: '코스디렉터' }) },
    ],
    [t]
  );

  const freedivingLevels = useMemo(
    () => [
      { key: 'none' as const, label: t('pages.profileEdit.freedivingLevels.none', { defaultValue: '라이선스 없음' }) },
      { key: 'level_1' as const, label: t('pages.profileEdit.freedivingLevels.level_1', { defaultValue: 'Level 1' }) },
      { key: 'level_2' as const, label: t('pages.profileEdit.freedivingLevels.level_2', { defaultValue: 'Level 2' }) },
      { key: 'level_3' as const, label: t('pages.profileEdit.freedivingLevels.level_3', { defaultValue: 'Level 3' }) },
      { key: 'level_4' as const, label: t('pages.profileEdit.freedivingLevels.level_4', { defaultValue: 'Level 4' }) },
      { key: 'instructor' as const, label: t('pages.profileEdit.commonLevels.instructor', { defaultValue: '강사' }) },
      { key: 'trainer' as const, label: t('pages.profileEdit.commonLevels.trainer', { defaultValue: '트레이너' }) },
      { key: 'course_director' as const, label: t('pages.profileEdit.commonLevels.course_director', { defaultValue: '코스디렉터' }) },
    ],
    [t]
  );

  const pickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast({
          type: 'error',
          title: t('pages.profileEdit.photoPermissionTitle', { defaultValue: '사진 권한이 필요합니다.' }),
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;
      setAvatarUri(String(result.assets[0]?.uri || '').trim());
    } catch {
      showToast({
        type: 'error',
        title: t('pages.profileEdit.photoSelectFailTitle', { defaultValue: '사진 선택 실패' }),
        message: t('pages.profileEdit.photoSelectFailBody', { defaultValue: '사진을 불러오는 중 오류가 발생했습니다.' }),
      });
    }
  };

  const pickLicenseImageWithOcr = async () => {
    if (ocrPending) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast({
          type: 'error',
          title: t('pages.profileEdit.photoPermissionTitle', { defaultValue: '사진 권한이 필요합니다.' }),
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.85,
        base64: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (Number(asset.fileSize || 0) > 8 * 1024 * 1024) {
        showToast({
          type: 'info',
          title: t('pages.profileEdit.license.fileTooLarge', { defaultValue: '8MB 이하 이미지를 선택해주세요.' }),
        });
        return;
      }
      setLicenseImagePreviewUri(String(asset.uri || '').trim());

      if (!asset.base64) {
        setOcrNotice(t('pages.profileEdit.license.ocrNoBase64', { defaultValue: '이미지를 선택했지만 자동 인식 데이터가 없어 수동 입력이 필요합니다.' }));
        showToast({
          type: 'info',
          title: t('pages.profileEdit.license.ocrNoBase64Title', { defaultValue: '자동 인식 불가' }),
        });
        return;
      }

      setOcrPending(true);
      const payload = await apiClient.uploadLicenseImageWithOcr(`data:image/jpeg;base64,${asset.base64}`);
      const ocr = (payload as any)?.ocr || {};
      const nextAgency = String(ocr.agency || '').trim();
      const nextNumber = String(ocr.number || '').trim();
      const nextIssuedAt = String(ocr.issued_at || '').trim();
      const uploadedImageUrl = String((payload as any)?.image_url || (payload as any)?.license_image_url || (payload as any)?.url || '').trim();

      if (nextAgency) setLicenseAgency(nextAgency);
      if (nextNumber) setLicenseNumber(nextNumber);
      if (nextIssuedAt) setLicenseIssuedAt(nextIssuedAt);
      if (uploadedImageUrl) {
        setLicenseImageUrl(uploadedImageUrl);
        setLicenseImagePreviewUri(uploadedImageUrl);
      }

      if (!(payload as any)?.ocr_configured) {
        const notice = t('pages.profileEdit.license.ocrNotConfigured', {
          defaultValue: '라이선스 이미지는 등록되었지만 OCR 설정이 없어 자동 입력이 비활성화되어 있습니다.',
        });
        setOcrNotice(notice);
        showToast({ type: 'info', title: t('pages.profileEdit.license.uploadDone', { defaultValue: '라이선스 사진 등록 완료' }), message: notice });
      } else if ((payload as any)?.ocr_error) {
        const notice = t('pages.profileEdit.license.ocrFailed', {
          defaultValue: '사진은 등록되었지만 OCR 인식에 실패했습니다. 값을 직접 입력해주세요.',
        });
        setOcrNotice(notice);
        showToast({ type: 'info', title: t('pages.profileEdit.license.uploadDone', { defaultValue: '라이선스 사진 등록 완료' }), message: notice });
      } else {
        const notice = t('pages.profileEdit.license.ocrApplied', {
          defaultValue: 'OCR 인식 결과를 라이선스 정보에 반영했습니다. 저장 전에 확인해주세요.',
        });
        setOcrNotice(notice);
        showToast({ type: 'success', title: t('pages.profileEdit.license.ocrDoneTitle', { defaultValue: 'OCR 인식 완료' }) });
      }
    } catch (error: any) {
      const message = String(error?.response?.data?.error || error?.message || '').trim();
      const fallback = t('pages.profileEdit.license.uploadFailBody', { defaultValue: '라이선스 사진 업로드 중 오류가 발생했습니다.' });
      setOcrNotice(t('pages.profileEdit.license.uploadFailNotice', { defaultValue: '자동 인식에 실패했습니다. 수동으로 입력해주세요.' }));
      showToast({
        type: 'error',
        title: t('pages.profileEdit.license.uploadFailTitle', { defaultValue: '라이선스 업로드 실패' }),
        message: message || fallback,
      });
    } finally {
      setOcrPending(false);
    }
  };

  const saveProfile = async () => {
    if (!user?.id || saving) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast({
        type: 'info',
        title: t('pages.profileEdit.nameRequired', { defaultValue: '표시 이름을 입력해주세요.' }),
      });
      return;
    }

    setSaving(true);
    try {
      await apiClient.updateProfile(user.id, {
        full_name: trimmedName,
        bio: bio.trim(),
        avatar_url: avatarUri.trim(),
        diving_level: toLegacyDiveLevel(scubaLevel, freedivingLevel),
        scuba_level: scubaLevel,
        freediving_level: freedivingLevel,
        license_image_url: licenseImageUrl.trim(),
        license_agency: licenseAgency.trim(),
        license_number: licenseNumber.trim(),
        license_issued_at: licenseIssuedAt.trim(),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['saved-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['account-profile'] }),
      ]);

      showToast({
        type: 'success',
        title: t('pages.profileEdit.doneTitle'),
        message: t('pages.profileEdit.doneBody'),
      });
      router.replace(appRouteMap.profile.path as never);
    } catch {
      showToast({
        type: 'error',
        title: t('pages.profileEdit.saveFailTitle', { defaultValue: '저장 실패' }),
        message: t('pages.profileEdit.saveFailBody', { defaultValue: '프로필 저장 중 오류가 발생했습니다.' }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="border-b border-gray-100 px-5 py-4">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.profileEdit')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.profileEdit.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          <View className="mb-5 items-center">
            <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <Camera size={26} color="#64748b" />
              )}
            </View>
            <View className="mt-3 flex-row">
              <TouchableOpacity
                className="mr-2 flex-row items-center rounded-xl border border-gray-200 bg-white px-3 py-2"
                activeOpacity={0.88}
                onPress={pickAvatar}
              >
                <ImagePlus size={15} color="#0f172a" />
                <Text className="ml-1 text-xs font-semibold text-gray-900">
                  {t('pages.profileEdit.photoSelect', { defaultValue: '사진 선택' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-xl border border-gray-200 bg-white px-3 py-2"
                activeOpacity={0.88}
                onPress={() => setAvatarUri('')}
              >
                <Text className="text-xs font-semibold text-gray-700">
                  {t('pages.profileEdit.photoRemove', { defaultValue: '사진 제거' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text className="mb-2 text-sm font-semibold text-gray-700">{t('pages.profileEdit.name')}</Text>
          <TextInput
            className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-950"
            value={name}
            onChangeText={setName}
            maxLength={40}
          />

          <Text className="mb-2 text-sm font-semibold text-gray-700">{t('pages.profileEdit.bio')}</Text>
          <TextInput
            className="min-h-28 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-950"
            multiline
            textAlignVertical="top"
            value={bio}
            onChangeText={setBio}
            maxLength={300}
          />

          <Text className="mb-2 mt-5 text-sm font-semibold text-gray-700">
            {t('pages.profileEdit.scubaLevel', { defaultValue: '스쿠버 다이빙 레벨' })}
          </Text>
          <View className="mb-1 flex-row flex-wrap">
            {scubaLevels.map((item) => {
              const active = item.key === scubaLevel;
              return (
                <TouchableOpacity
                  key={item.key}
                  className={`mb-2 mr-2 rounded-full border px-4 py-2 ${active ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white'}`}
                  onPress={() => setScubaLevel(item.key)}
                  activeOpacity={0.88}
                >
                  <Text className={`text-xs font-semibold ${active ? 'text-brand-700' : 'text-gray-700'}`}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="mb-2 mt-4 text-sm font-semibold text-gray-700">
            {t('pages.profileEdit.freedivingLevel', { defaultValue: '프리다이빙 레벨' })}
          </Text>
          <View className="mb-1 flex-row flex-wrap">
            {freedivingLevels.map((item) => {
              const active = item.key === freedivingLevel;
              return (
                <TouchableOpacity
                  key={item.key}
                  className={`mb-2 mr-2 rounded-full border px-4 py-2 ${active ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white'}`}
                  onPress={() => setFreedivingLevel(item.key)}
                  activeOpacity={0.88}
                >
                  <Text className={`text-xs font-semibold ${active ? 'text-brand-700' : 'text-gray-700'}`}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="text-sm font-semibold text-gray-700">
              {t('pages.profileEdit.license.title', { defaultValue: '라이선스 검증' })}
            </Text>
            <Text className="mt-1 text-xs text-gray-500">
              {t('pages.profileEdit.license.subtitle', { defaultValue: '라이선스 사진을 업로드하면 단체명, 번호, 취득일을 자동 인식합니다.' })}
            </Text>

            <View className="mt-3 flex-row items-center">
              <TouchableOpacity
                className={`mr-2 flex-row items-center rounded-xl border px-3 py-2 ${ocrPending ? 'border-gray-300 bg-gray-100' : 'border-gray-200 bg-white'}`}
                activeOpacity={0.88}
                onPress={pickLicenseImageWithOcr}
                disabled={ocrPending}
              >
                {ocrPending ? <ActivityIndicator size="small" color="#0f172a" /> : <ImagePlus size={15} color="#0f172a" />}
                <Text className="ml-1 text-xs font-semibold text-gray-900">
                  {ocrPending
                    ? t('pages.profileEdit.license.processing', { defaultValue: '인식 중...' })
                    : t('pages.profileEdit.license.upload', { defaultValue: '라이선스 사진 업로드 + OCR' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-xl border border-gray-200 bg-white px-3 py-2"
                activeOpacity={0.88}
                onPress={() => {
                  setLicenseImageUrl('');
                  setLicenseImagePreviewUri('');
                }}
              >
                <Text className="text-xs font-semibold text-gray-700">
                  {t('pages.profileEdit.license.remove', { defaultValue: '사진 제거' })}
                </Text>
              </TouchableOpacity>
            </View>

            {licenseImagePreviewUri ? (
              <View className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <Image source={{ uri: licenseImagePreviewUri }} className="h-36 w-full" resizeMode="contain" />
              </View>
            ) : null}

            {ocrNotice ? <Text className="mt-2 text-xs text-blue-700">{ocrNotice}</Text> : null}

            <Text className="mb-2 mt-3 text-xs font-semibold text-gray-500">
              {t('pages.profileEdit.license.agency', { defaultValue: '단체명' })}
            </Text>
            <TextInput
              className="rounded-xl border border-gray-200 bg-surface-50 px-3 py-3 text-sm text-surface-900"
              placeholder={t('pages.profileEdit.license.agencyPlaceholder', { defaultValue: '예: PADI, SSI, AIDA' })}
              placeholderTextColor="#9ca3af"
              value={licenseAgency}
              onChangeText={setLicenseAgency}
              maxLength={60}
            />

            <Text className="mb-2 mt-3 text-xs font-semibold text-gray-500">
              {t('pages.profileEdit.license.number', { defaultValue: '라이선스 번호' })}
            </Text>
            <TextInput
              className="rounded-xl border border-gray-200 bg-surface-50 px-3 py-3 text-sm text-surface-900"
              placeholder={t('pages.profileEdit.license.numberPlaceholder', { defaultValue: '예: 12345678' })}
              placeholderTextColor="#9ca3af"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              maxLength={60}
            />

            <Text className="mb-2 mt-3 text-xs font-semibold text-gray-500">
              {t('pages.profileEdit.license.issuedAt', { defaultValue: '취득일' })}
            </Text>
            <TextInput
              className="rounded-xl border border-gray-200 bg-surface-50 px-3 py-3 text-sm text-surface-900"
              placeholder={t('pages.profileEdit.license.issuedAtPlaceholder', { defaultValue: 'YYYY-MM-DD' })}
              placeholderTextColor="#9ca3af"
              value={licenseIssuedAt}
              onChangeText={setLicenseIssuedAt}
              maxLength={20}
            />
          </View>

          <TouchableOpacity
            className={`mt-5 h-12 items-center justify-center rounded-2xl ${saving ? 'bg-gray-500' : 'bg-gray-950'}`}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-semibold text-white">{t('pages.profileEdit.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
