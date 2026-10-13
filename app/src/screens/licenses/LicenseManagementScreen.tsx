import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Eye,
  EyeOff,
  Filter,
  Fish,
  ImagePlus,
  Pencil,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Wallet,
  Waves,
  X,
} from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useAuth } from '../../hooks/useAuth';
import { uploadImage } from '../../services/cloudinaryService';
import { createDivingLicense, deleteDivingLicense, listDivingLicenses, updateDivingLicense } from '../../services/divingLicenseService';
import {
  DIVING_DISCIPLINE_OPTIONS,
  DIVING_LICENSE_STATUS_OPTIONS,
  normalizeDivingDiscipline,
  normalizeDivingLicenseStatus,
  type DivingDiscipline,
  type DivingLicense,
  type DivingLicenseStatus,
} from '../../models/DivingLicense';
import { getAppleWalletPassStatus, requestAppleWalletPass, requestGoogleWalletPass } from '../../services/licenseWalletService';
import { apiClient } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';

type DisciplineFilter = DivingDiscipline | 'all';
type LicenseSide = 'front' | 'back';

type LicenseDraft = {
  holderName: string;
  licenseNumber: string;
  discipline: DivingDiscipline;
  certificationLevel: string;
  issueDate: string;
  expirationDate: string;
  hasExpiration: boolean;
  maxDepth: string;
  trainingAgency: string;
  instructorName: string;
  instructorNumber: string;
  emergencyContact: string;
  verificationUrl: string;
  profileImageUrl: string;
  status: DivingLicenseStatus;
  notes: string;
};

const EMPTY_DRAFT: LicenseDraft = {
  holderName: '',
  licenseNumber: '',
  discipline: 'scuba',
  certificationLevel: '',
  issueDate: '',
  expirationDate: '',
  hasExpiration: false,
  maxDepth: '',
  trainingAgency: '',
  instructorName: '',
  instructorNumber: '',
  emergencyContact: '',
  verificationUrl: '',
  profileImageUrl: '',
  status: 'active',
  notes: '',
};

const cardAccentMap: Record<DivingDiscipline, string> = {
  scuba: '#0D5FA8',
  freediving: '#08B7C7',
};

const statusStyleMap: Record<DivingLicenseStatus, { bg: string; fg: string; border: string }> = {
  active: { bg: '#EAF7F0', fg: '#0F7A47', border: '#BFE8D0' },
  pending_review: { bg: '#FFF7E8', fg: '#B45309', border: '#F6D19C' },
  expired: { bg: '#FFF1F2', fg: '#BE123C', border: '#F9B6C2' },
  revoked: { bg: '#F1F5F9', fg: '#475569', border: '#CBD5E1' },
  draft: { bg: '#EFF6FF', fg: '#0D5FA8', border: '#BFDBFE' },
};

const DEV_PREVIEW_LICENSE: DivingLicense = {
  id: 'dev-preview',
  licenseNumber: 'DG-SC-2026-A7F2',
  memberNumber: 'DG-2026-0309',
  userId: 'dev-preview',
  holderName: 'SAMPLE USER',
  discipline: 'scuba',
  certificationLevel: 'ADVANCED OPEN WATER DIVER',
  issueDate: '2026-08-28',
  hasExpiration: false,
  maxDepth: 30,
  trainingAgency: 'DIVERGRAM EDUCATION',
  instructorName: 'DIVERGRAM INSTRUCTOR',
  verificationUrl: 'https://divergram.com/license/DG-SC-2026-A7F2',
  status: 'draft',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

function formatDateValue(value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return '-';
  return normalized.replace(/-/g, '.');
}

function buildVerificationUrl(licenseNumber: string) {
  const trimmed = String(licenseNumber || '').trim();
  if (!trimmed) return 'https://api.divergram.com/api/diving-licenses/verify';
  return `https://api.divergram.com/api/diving-licenses/verify/${encodeURIComponent(trimmed)}`;
}

function initialsFromName(name: string) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'DG';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2);
}

function StatusChip({ status }: { status: DivingLicenseStatus }) {
  const { t } = useTranslation();
  const tone = statusStyleMap[status];
  return (
    <View style={[styles.statusChip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.statusChipText, { color: tone.fg }]}>{t(`licenseManagement.statuses.${status}`)}</Text>
    </View>
  );
}

function DisciplineChip({ discipline }: { discipline: DivingDiscipline }) {
  const { t } = useTranslation();
  const label = t(`licenseManagement.disciplines.${discipline}`);
  const tone = cardAccentMap[discipline];
  return (
    <View style={[styles.disciplineChip, { backgroundColor: `${tone}18`, borderColor: `${tone}33` }]}>
      {discipline === 'freediving' ? <Fish size={12} color={tone} /> : <Waves size={12} color={tone} />}
      <Text style={[styles.disciplineChipText, { color: tone }]}>{label}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  multiline = false,
  keyboardType = 'default',
  rightSlot,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  rightSlot?: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          style={[styles.input, multiline ? styles.inputMultiline : undefined]}
          multiline={multiline}
          keyboardType={keyboardType}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {rightSlot ? <View style={styles.inputRightSlot}>{rightSlot}</View> : null}
      </View>
    </View>
  );
}

function ChipButton({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  const { isDark } = useResolvedTheme();
  const bg = active ? '#0D5FA8' : isDark ? '#101B29' : '#F7FBFF';
  const border = active ? '#0D5FA8' : isDark ? '#243447' : '#D7E4F1';
  const text = active ? '#FFFFFF' : isDark ? '#D7E4F1' : '#0F172A';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.86} style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
      <Text style={[styles.chipText, { color: text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionButton({
  label,
  onPress,
  icon,
  filled = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  filled?: boolean;
  danger?: boolean;
}) {
  const { isDark } = useResolvedTheme();
  const border = danger ? '#FCA5A5' : filled ? '#0D5FA8' : isDark ? '#243447' : '#D7E4F1';
  const backgroundColor = danger ? '#FFF1F2' : filled ? '#0D5FA8' : isDark ? '#0F1B2A' : '#FFFFFF';
  const color = danger ? '#B91C1C' : filled ? '#FFFFFF' : isDark ? '#E2E8F0' : '#0F172A';
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={[styles.actionButton, { borderColor: border, backgroundColor }]}>
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function LicenseCard({
  license,
  side,
  onToggleSide,
}: {
  license: DivingLicense;
  side: LicenseSide;
  onToggleSide: () => void;
}) {
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const accent = cardAccentMap[license.discipline];
  const displayName = license.holderName || 'DIVERGRAM USER';
  const verificationUrl = buildVerificationUrl(license.licenseNumber);
  const initials = initialsFromName(displayName);
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || displayName;
  const restName = nameParts.slice(1).join(' ');

  if (side === 'back') {
    return (
      <Pressable onPress={onToggleSide} style={[styles.backCard, { borderColor: `${accent}26`, backgroundColor: isDark ? '#F4F8FC' : '#FFFFFF' }]}>
        <View style={styles.cardTopRow}>
          <View style={styles.brandRow}>
            <View style={[styles.brandLogo, { borderColor: `${accent}33`, backgroundColor: `${accent}12` }]}>
              <ExpoImage source={require('../../../assets/images/divergram-logo-blue.png')} style={styles.brandLogoImage} contentFit="contain" />
            </View>
            <View>
              <Text style={styles.brandTitle}>Divergram</Text>
              <Text style={styles.brandSub}>Digital Diving License</Text>
            </View>
          </View>
          <StatusChip status={license.status} />
        </View>

        <View style={styles.backBody}>
          <View style={styles.backInformation}>
            <Text style={styles.backSectionTitle}>LICENSE DETAILS</Text>
            <Text style={styles.backSectionValue} numberOfLines={1}>{license.certificationLevel}</Text>
            <Text style={styles.backSectionMeta} numberOfLines={1}>
              {t(`licenseManagement.disciplines.${license.discipline}`)} · {license.maxDepth ? `${license.maxDepth} m` : 'DIVER'}
            </Text>
            <View style={styles.compactGrid}>
              <View style={styles.compactGridItem}><CompactField label="AGENCY" value={license.trainingAgency || '-'} /></View>
              <View style={styles.compactGridItem}><CompactField label="INSTRUCTOR" value={license.instructorName || '-'} /></View>
              <View style={styles.compactGridItem}><CompactField label="ISSUED" value={formatDateValue(license.issueDate)} /></View>
              <View style={styles.compactGridItem}><CompactField label="EXPIRES" value={license.hasExpiration ? formatDateValue(license.expirationDate || '-') : 'NONE'} /></View>
            </View>
          </View>
          <View style={styles.compactQrWrap}>
            <View style={styles.compactQrFrame}>
              <QRCode value={verificationUrl} size={68} color="#0F172A" backgroundColor="#FFFFFF" ecl="M" />
            </View>
            <Text style={[styles.compactQrLabel, { color: accent }]}>SCAN TO VERIFY</Text>
          </View>
        </View>

        <Text style={styles.cardSerial} numberOfLines={1}>{license.licenseNumber} · {license.memberNumber || '-'}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onToggleSide} style={[styles.frontCard, { borderColor: `${accent}26`, backgroundColor: isDark ? '#F4F8FC' : '#FFFFFF' }]}>
      <View style={styles.frontTop}>
        <View style={styles.brandRow}>
          <View style={[styles.brandLogo, { borderColor: `${accent}33`, backgroundColor: `${accent}12` }]}>
            <ExpoImage source={require('../../../assets/images/divergram-logo-blue.png')} style={styles.brandLogoImage} contentFit="contain" />
          </View>
          <View>
            <Text style={styles.brandTitle}>Divergram</Text>
            <Text style={styles.brandSub}>Digital Diving License</Text>
          </View>
        </View>
        <View style={[styles.digitalTag, { backgroundColor: `${accent}12`, borderColor: `${accent}22` }]}>
          <Sparkles size={12} color={accent} />
          <Text style={[styles.digitalTagText, { color: accent }]}>DIGITAL LICENSE</Text>
        </View>
      </View>

      <View style={styles.profileRow}>
        {license.profileImageUrl ? (
          <ExpoImage source={{ uri: license.profileImageUrl }} style={[styles.profileAvatar, { borderColor: `${accent}22` }]} contentFit="cover" />
        ) : (
          <View style={[styles.profileAvatarFallback, { borderColor: `${accent}22`, backgroundColor: `${accent}12` }]}>
            <Text style={[styles.profileAvatarFallbackText, { color: accent }]}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.holderName} numberOfLines={1}>{firstName}</Text>
          {restName ? <Text style={styles.holderSubName} numberOfLines={1}>{restName}</Text> : null}
          <Text style={styles.certificationName} numberOfLines={1}>{license.certificationLevel}</Text>
          <View style={styles.inlineBadges}>
            <DisciplineChip discipline={license.discipline} />
            <StatusChip status={license.status} />
          </View>
        </View>
      </View>

      <View style={[styles.frontDataRow, { borderTopColor: `${accent}22` }]}>
        <CompactField label="LICENSE NO." value={license.licenseNumber} />
        <CompactField label="MEMBER NO." value={license.memberNumber || '-'} />
        <CompactField label="ISSUED" value={formatDateValue(license.issueDate)} />
      </View>
    </Pressable>
  );
}

function CompactField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.compactField}>
      <Text style={styles.compactFieldLabel}>{label}</Text>
      <Text style={styles.compactFieldValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function LicenseManagementScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
  const userId = String(user?.id || 'me').trim() || 'me';
  const userName = String(user?.name || 'Divergram Diver').trim();
  const userAvatar = String(user?.avatar || '').trim();

  const query = useQuery({
    queryKey: ['diving-licenses', userId],
    queryFn: () => listDivingLicenses(userId),
  });

  const licenses = useMemo(() => query.data || [], [query.data]);
  const [filter, setFilter] = useState<DisciplineFilter>('all');
  const [selectedLicense, setSelectedLicense] = useState<DivingLicense | null>(null);
  const [selectedSide, setSelectedSide] = useState<LicenseSide>('front');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [walletLoadingId, setWalletLoadingId] = useState<string | null>(null);
  const [ocrNotice, setOcrNotice] = useState('');
  const [draft, setDraft] = useState<LicenseDraft>(() => ({
    ...EMPTY_DRAFT,
    holderName: userName,
    profileImageUrl: userAvatar,
  }));
  const detailsScrollRef = useRef<ScrollView>(null);

  const appleWalletStatus = useQuery({
    queryKey: ['apple-wallet-status', userId],
    queryFn: getAppleWalletPassStatus,
    enabled: Platform.OS === 'ios',
    staleTime: 60_000,
  });

  const filteredLicenses = useMemo(
    () => (filter === 'all' ? licenses : licenses.filter((item) => item.discipline === filter)),
    [filter, licenses]
  );

  const stats = useMemo(() => {
    const active = licenses.filter((item) => item.status === 'active').length;
    const scuba = licenses.filter((item) => item.discipline === 'scuba').length;
    const freediving = licenses.filter((item) => item.discipline === 'freediving').length;
    return {
      total: licenses.length,
      active,
      scuba,
      freediving,
    };
  }, [licenses]);

  useEffect(() => {
    if (!selectedLicense) return;
    requestAnimationFrame(() => detailsScrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, [selectedLicense]);

  const openCreate = () => {
    setEditingId(null);
    setDraft({
      ...EMPTY_DRAFT,
      holderName: userName,
      profileImageUrl: userAvatar,
      issueDate: new Date().toISOString().slice(0, 10),
    });
    setOcrNotice('');
    setEditorOpen(true);
  };

  const openEdit = (license: DivingLicense) => {
    setEditingId(license.id);
    setDraft({
      holderName: license.holderName || '',
      licenseNumber: license.licenseNumber || '',
      discipline: license.discipline,
      certificationLevel: license.certificationLevel || '',
      issueDate: license.issueDate || '',
      expirationDate: license.expirationDate || '',
      hasExpiration: license.hasExpiration,
      maxDepth: license.maxDepth !== undefined && license.maxDepth !== null ? String(license.maxDepth) : '',
      trainingAgency: license.trainingAgency || '',
      instructorName: license.instructorName || '',
      instructorNumber: license.instructorNumber || '',
      emergencyContact: license.emergencyContact || '',
      verificationUrl: license.verificationUrl || '',
      profileImageUrl: license.profileImageUrl || userAvatar,
      status: license.status,
      notes: license.notes || '',
    });
    setOcrNotice('');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving || uploadingImage) return;
    setEditorOpen(false);
    setEditingId(null);
  };

  const openDetails = (license: DivingLicense) => {
    setSelectedLicense(license);
    setSelectedSide('front');
  };

  const closeDetails = () => {
    setSelectedLicense(null);
    setSelectedSide('front');
  };

  const handlePickImage = async () => {
    if (uploadingImage || saving) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('licenseManagement.alerts.permissionTitle'), t('licenseManagement.alerts.permissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      base64: true,
      quality: 0.45,
      selectionLimit: 1,
      shouldDownloadFromNetwork: true,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const picked = String(asset?.uri || '').trim();
    if (!picked || !asset?.base64) {
      Alert.alert(t('licenseManagement.alerts.unreadableTitle'), t('licenseManagement.alerts.unreadableBody'));
      return;
    }
    if (Number(asset.fileSize || 0) > 8 * 1024 * 1024 || asset.base64.length > 8_000_000) {
      Alert.alert(t('licenseManagement.alerts.fileTooLargeTitle'), t('licenseManagement.alerts.fileTooLargeBody'));
      return;
    }
    setUploadingImage(true);
    setOcrNotice(t('licenseManagement.alerts.ocrReading'));
    try {
      const mimeType = String(asset.mimeType || 'image/jpeg').toLowerCase();
      const safeMimeType = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimeType) ? mimeType : 'image/jpeg';
      const [payload, uploaded] = await Promise.all([
        apiClient.uploadLicenseImageWithOcr(`data:${safeMimeType};base64,${asset.base64}`),
        uploadImage(picked),
      ]);
      const ocr = (payload as any)?.ocr || {};
      const imageUrl = String(uploaded?.url || (payload as any)?.image_url || (payload as any)?.license_image_url || '').trim();
      const disciplineText = String(ocr.discipline || ocr.type || '').toLowerCase();
      const expiresAt = String(ocr.expires_at || '').trim();
      const maxDepth = String(ocr.max_depth || '').replace(/[^0-9.]/g, '');

      setDraft((prev) => ({
        ...prev,
        holderName: String(ocr.holder_name || '').trim() || prev.holderName,
        licenseNumber: String(ocr.number || '').trim() || prev.licenseNumber,
        discipline: disciplineText.includes('free') ? 'freediving' : disciplineText ? 'scuba' : prev.discipline,
        certificationLevel: String(ocr.type || '').trim() || prev.certificationLevel,
        issueDate: String(ocr.issued_at || '').trim() || prev.issueDate,
        expirationDate: expiresAt || prev.expirationDate,
        hasExpiration: Boolean(expiresAt) || prev.hasExpiration,
        maxDepth: maxDepth || prev.maxDepth,
        trainingAgency: String(ocr.agency || '').trim() || prev.trainingAgency,
        instructorName: String(ocr.instructor_name || '').trim() || prev.instructorName,
        instructorNumber: String(ocr.instructor_number || '').trim() || prev.instructorNumber,
        verificationUrl: String(ocr.verification_url || '').trim() || prev.verificationUrl,
        profileImageUrl: imageUrl || picked,
      }));

      if (!(payload as any)?.ocr_configured) {
        setOcrNotice(t('licenseManagement.alerts.ocrNotConfiguredNotice'));
        Alert.alert(t('licenseManagement.alerts.photoSavedTitle'), t('licenseManagement.alerts.ocrNotConfiguredBody'));
      } else if ((payload as any)?.ocr_error) {
        setOcrNotice(t('licenseManagement.alerts.ocrPartialNotice'));
        Alert.alert(t('licenseManagement.alerts.ocrFailedTitle'), t('licenseManagement.alerts.ocrPartialBody'));
      } else {
        setOcrNotice(t('licenseManagement.alerts.ocrAppliedNotice'));
        Alert.alert(t('licenseManagement.alerts.ocrAppliedTitle'), t('licenseManagement.alerts.ocrAppliedBody'));
      }
    } catch (error: any) {
      setOcrNotice(t('licenseManagement.alerts.ocrFailedNotice'));
      Alert.alert(t('licenseManagement.alerts.uploadFailedTitle'), String(error?.message || error));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (saving || uploadingImage) return;
    if (!draft.holderName.trim()) {
      Alert.alert(t('licenseManagement.alerts.inputRequired'), t('licenseManagement.alerts.holderRequired'));
      return;
    }
    if (!draft.licenseNumber.trim()) {
      Alert.alert(t('licenseManagement.alerts.inputRequired'), t('licenseManagement.alerts.numberRequired'));
      return;
    }
    if (!draft.certificationLevel.trim()) {
      Alert.alert(t('licenseManagement.alerts.inputRequired'), t('licenseManagement.alerts.levelRequired'));
      return;
    }
    if (!draft.issueDate.trim()) {
      Alert.alert(t('licenseManagement.alerts.inputRequired'), t('licenseManagement.alerts.issueDateRequired'));
      return;
    }
    if (draft.hasExpiration && !draft.expirationDate.trim()) {
      Alert.alert(t('licenseManagement.alerts.inputRequired'), t('licenseManagement.alerts.expirationDateRequired'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        userId,
        holderName: draft.holderName.trim(),
        licenseNumber: draft.licenseNumber.trim(),
        discipline: normalizeDivingDiscipline(draft.discipline),
        certificationLevel: draft.certificationLevel.trim(),
        issueDate: draft.issueDate.trim(),
        expirationDate: draft.hasExpiration ? draft.expirationDate.trim() : '',
        hasExpiration: draft.hasExpiration,
        maxDepth: draft.maxDepth.trim() ? Number(draft.maxDepth) : undefined,
        trainingAgency: draft.trainingAgency.trim(),
        instructorName: draft.instructorName.trim(),
        instructorNumber: draft.instructorNumber.trim(),
        emergencyContact: draft.emergencyContact.trim(),
        verificationUrl: draft.verificationUrl.trim() || buildVerificationUrl(draft.licenseNumber.trim()),
        profileImageUrl: draft.profileImageUrl.trim(),
        status: normalizeDivingLicenseStatus(draft.status),
        notes: draft.notes.trim(),
      };
      if (editingId) {
        await updateDivingLicense(editingId, payload);
      } else {
        await createDivingLicense(payload);
      }
      await query.refetch();
      setEditorOpen(false);
      setEditingId(null);
      Alert.alert(t('licenseManagement.alerts.saveComplete'), t(editingId ? 'licenseManagement.alerts.updated' : 'licenseManagement.alerts.created'));
    } catch (error: any) {
      Alert.alert(t(editingId ? 'licenseManagement.alerts.updateFailed' : 'licenseManagement.alerts.createFailed'), String(error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (license: DivingLicense) => {
    Alert.alert(t('licenseManagement.alerts.deleteTitle'), t('licenseManagement.alerts.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDivingLicense(license.id);
            if (selectedLicense?.id === license.id) closeDetails();
            if (editingId === license.id) {
              setEditorOpen(false);
              setEditingId(null);
            }
            await query.refetch();
          } catch (error: any) {
            Alert.alert(t('licenseManagement.alerts.deleteFailed'), String(error?.message || error));
          }
        },
      },
    ]);
  };

  const handleShare = async (license: DivingLicense) => {
    const url = license.verificationUrl || buildVerificationUrl(license.licenseNumber);
    try {
      await Share.share({
        message: `${license.holderName}\n${license.certificationLevel}\n${license.licenseNumber}\n${url}`,
        title: `${license.holderName} - Divergram License`,
      });
    } catch {
      Alert.alert(t('licenseManagement.alerts.shareFailedTitle'), t('licenseManagement.alerts.shareFailedBody'));
    }
  };

  const handleVerify = async (license: DivingLicense) => {
    const url = license.verificationUrl || buildVerificationUrl(license.licenseNumber);
    const supported = await Linking.canOpenURL(url).catch(() => false);
    if (!supported) {
      Alert.alert(t('licenseManagement.alerts.verificationLink'), url);
      return;
    }
    await Linking.openURL(url);
  };

  const handleWallet = async (license: DivingLicense) => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      Alert.alert('Wallet', 'Wallet passes are available on iPhone and Android.');
      return;
    }
    const isApple = Platform.OS === 'ios';
    const walletName = isApple ? 'Apple Wallet' : 'Google Wallet';
    if (isApple && appleWalletStatus.data?.ready === false) {
      Alert.alert(walletName, t('licenseManagement.walletCertificateRequired'));
      return;
    }
    setWalletLoadingId(license.id);
    try {
      const result = isApple
        ? await requestAppleWalletPass({ licenseId: license.id })
        : await requestGoogleWalletPass({ licenseId: license.id });
      if (result.ready && result.passUrl) {
        const supported = await Linking.canOpenURL(result.passUrl).catch(() => false);
        if (supported) {
          await Linking.openURL(result.passUrl);
          return;
        }
      }
      Alert.alert(walletName, result.message || t('licenseManagement.walletUnavailable'));
    } finally {
      setWalletLoadingId(null);
    }
  };

  const colors = isDark
    ? {
        title: '#E2E8F0',
        subtitle: '#9FB3C8',
        cardBg: '#0F1B2A',
        cardBorder: '#243447',
        mutedBg: '#111C2B',
        mutedBorder: '#223246',
        text: '#D7E4F1',
        subText: '#9FB3C8',
        section: '#0B1522',
      }
    : {
        title: '#0F172A',
        subtitle: '#64748B',
        cardBg: '#FFFFFF',
        cardBorder: '#D7E4F1',
        mutedBg: '#F7FBFF',
        mutedBorder: '#DCE8F4',
        text: '#10213A',
        subText: '#64748B',
        section: '#F4F8FC',
      };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 80 }}>
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBrand}>
              <View style={styles.heroLogoWrap}>
                <ExpoImage source={require('../../../assets/images/divergram-logo-blue.png')} style={styles.heroLogo} contentFit="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroEyebrow, { color: colors.subText }]}>DIVERGRAM LICENSE</Text>
                <Text style={[styles.heroTitle, { color: colors.title }]}>{t('licenseManagement.title')}</Text>
                <Text style={[styles.heroSubtitle, { color: colors.subtitle }]}>
                  {t('licenseManagement.subtitle')}
                </Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={openCreate} style={styles.heroCreateButton}>
              <CirclePlus size={18} color="#fff" />
              <Text style={styles.heroCreateButtonText}>{t('licenseManagement.register')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroStats}>
            <StatCard label={t('licenseManagement.all')} value={String(stats.total)} tone="#0D5FA8" />
            <StatCard label={t('licenseManagement.active')} value={String(stats.active)} tone="#0F7A47" />
            <StatCard label={t('licenseManagement.scuba')} value={String(stats.scuba)} tone="#0D5FA8" />
            <StatCard label={t('licenseManagement.freediving')} value={String(stats.freediving)} tone="#08B7C7" />
          </View>
        </View>

        <View style={[styles.filterCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Filter size={17} color="#0D5FA8" />
              <Text style={[styles.sectionTitle, { color: colors.title }]}>{t('licenseManagement.filter')}</Text>
            </View>
            <Text style={{ color: colors.subtitle, fontSize: 12 }}>{t('licenseManagement.shownCount', { count: filteredLicenses.length })}</Text>
          </View>

          <View style={styles.chipRow}>
            <ChipButton label={t('licenseManagement.all')} active={filter === 'all'} onPress={() => setFilter('all')} />
            {DIVING_DISCIPLINE_OPTIONS.map((item) => (
              <ChipButton
                key={item}
                label={t(`licenseManagement.disciplines.${item}`)}
                active={filter === item}
                onPress={() => setFilter(item)}
                icon={item === 'freediving' ? <Fish size={12} color={filter === item ? '#fff' : '#08B7C7'} /> : <Waves size={12} color={filter === item ? '#fff' : '#0D5FA8'} />}
              />
            ))}
          </View>
        </View>

        {filteredLicenses.length ? (
          <View style={{ marginTop: 14, gap: 12 }}>
            {filteredLicenses.map((license) => (
              <TouchableOpacity key={license.id} activeOpacity={0.9} onPress={() => openDetails(license)} style={[styles.listCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={styles.listCardPreviewWrap}>
                  <View style={styles.listCardWatermarkWrap} pointerEvents="none">
                    <Waves size={180} color="#0D5FA8" style={styles.listCardWatermark} />
                  </View>
                  <View style={styles.listCardPreviewHeader}>
                    <View style={styles.listCardBrand}>
                      <View style={styles.listCardLogoWrap}>
                        <ExpoImage source={require('../../../assets/images/divergram-logo-blue.png')} style={styles.listCardLogo} contentFit="contain" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listCardBrandTitle, { color: colors.title }]} numberOfLines={1}>
                          DIVERGRAM
                        </Text>
                        <Text style={[styles.listCardBrandSubtitle, { color: colors.subText }]} numberOfLines={1}>
                          DIVE · CONNECT · EXPLORE
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.listCardTag, { color: '#0D5FA8' }]}>DIVE LICENSE</Text>
                  </View>

                  <View style={styles.listCardMetaGroup}>
                    <Text style={[styles.listCardMetaLabel, { color: colors.subText }]}>NAME</Text>
                    <Text style={[styles.listCardName, { color: colors.title }]} numberOfLines={1}>
                      {license.holderName}
                    </Text>
                  </View>

                  <View style={styles.listCardMetaGroup}>
                    <Text style={[styles.listCardMetaLabel, { color: colors.subText }]}>LICENSE LEVEL</Text>
                    <Text style={[styles.listCardLevel, { color: colors.title }]} numberOfLines={2}>
                      {license.certificationLevel}
                    </Text>
                  </View>

                  <View style={styles.listCardBadgeRow}>
                    <View style={[styles.listCardDisciplineBadgeWrap, { backgroundColor: cardAccentMap[license.discipline] }]}>
                      {license.discipline === 'freediving' ? <Fish size={14} color="#fff" /> : <Waves size={14} color="#fff" />}
                      <Text style={styles.listCardDisciplineBadgeText}>{t(`licenseManagement.disciplines.${license.discipline}`)}</Text>
                    </View>
                    <StatusChip status={license.status} />
                  </View>

                  <View style={styles.listCardMetaGrid}>
                    <View style={styles.listCardMetaBlock}>
                      <Text style={[styles.listCardMetaLabel, { color: colors.subText }]}>LICENSE NO.</Text>
                      <Text style={[styles.listCardMetaValue, { color: colors.title }]} numberOfLines={1}>
                        {license.licenseNumber}
                      </Text>
                    </View>
                    <View style={styles.listCardMetaBlock}>
                      <Text style={[styles.listCardMetaLabel, { color: colors.subText }]}>ISSUED</Text>
                      <Text style={[styles.listCardMetaValue, { color: colors.title }]} numberOfLines={1}>
                        {formatDateValue(license.issueDate)}
                      </Text>
                    </View>
                    <View style={styles.listCardMetaBlock}>
                      <Text style={[styles.listCardMetaLabel, { color: colors.subText }]}>MEMBER NO.</Text>
                      <Text style={[styles.listCardMetaValue, { color: colors.title }]} numberOfLines={1}>
                        {license.memberNumber || '-'}
                      </Text>
                    </View>
                    <View style={styles.listCardMetaBlock}>
                      <Text style={[styles.listCardMetaLabel, { color: colors.subText }]}>EXPIRES</Text>
                      <Text style={[styles.listCardMetaValue, { color: colors.title }]} numberOfLines={1}>
                        {license.hasExpiration ? formatDateValue(license.expirationDate || '') : 'NO EXPIRATION'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.listCardFooter}>
                  <Text style={[styles.listCardFooterText, { color: colors.subText }]}>{t('licenseManagement.tapForDetails')}</Text>
                  <ChevronRight size={18} color={colors.subText} />
                </View>

                <View style={styles.listCardActions}>
                  <MiniAction
                    icon={<Eye size={14} color="#0D5FA8" />}
                    label={t('licenseManagement.view')}
                    onPress={(event) => {
                      event.stopPropagation();
                      openDetails(license);
                    }}
                  />
                  <MiniAction
                    icon={<Pencil size={14} color="#0D5FA8" />}
                    label={t('licenseManagement.edit')}
                    onPress={(event) => {
                      event.stopPropagation();
                      openEdit(license);
                    }}
                  />
                  <MiniAction
                    icon={<Trash2 size={14} color="#B91C1C" />}
                    label={t('licenseManagement.delete')}
                    danger
                    onPress={(event) => {
                      event.stopPropagation();
                      handleDelete(license);
                    }}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {__DEV__ ? (
              <>
                <View style={styles.previewHeading}>
                  <View>
                    <Text style={[styles.emptyTitle, { color: colors.title, marginTop: 0 }]}>{t('licenseManagement.previewTitle')}</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.subtitle }]}>{t('licenseManagement.previewHint')}</Text>
                  </View>
                  <Text style={styles.previewSideLabel}>{selectedSide.toUpperCase()}</Text>
                </View>
                <LicenseCard
                  license={DEV_PREVIEW_LICENSE}
                  side={selectedSide}
                  onToggleSide={() => setSelectedSide((value) => (value === 'front' ? 'back' : 'front'))}
                />
              </>
            ) : (
              <>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.mutedBg, borderColor: colors.mutedBorder }]}>
                  <BadgeCheck size={28} color="#0D5FA8" />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.title }]}>{t('licenseManagement.emptyTitle')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.subtitle }]}>{t('licenseManagement.emptySubtitle')}</Text>
              </>
            )}
            <TouchableOpacity onPress={openCreate} activeOpacity={0.86} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>{t('licenseManagement.emptyAction')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity onPress={openCreate} activeOpacity={0.88} accessibilityRole="button" accessibilityLabel={t('licenseManagement.register')} style={styles.floatingCreateButton}>
        <CirclePlus size={22} color="#fff" />
        <Text style={styles.floatingCreateButtonText}>{t('licenseManagement.register')}</Text>
      </TouchableOpacity>

      <Modal visible={editorOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeEditor}>
        <Screen tone="plain">
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 44 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeEditor} activeOpacity={0.84} style={styles.backButton}>
                <ChevronLeft size={20} color="#0F172A" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{t(editingId ? 'licenseManagement.editTitle' : 'licenseManagement.createTitle')}</Text>
                <Text style={styles.modalSubtitle}>{t('licenseManagement.formSubtitle')}</Text>
              </View>
              <TouchableOpacity onPress={handleSave} activeOpacity={0.86} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>{t(saving ? 'licenseManagement.saving' : 'common.save')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <View style={styles.formSectionTitleRow}>
                <Text style={styles.formSectionTitle}>{t('licenseManagement.basicInfo')}</Text>
                <Text style={styles.formSectionHint}>{t('licenseManagement.basicHint')}</Text>
              </View>

              <Field label={t('licenseManagement.holderName')} value={draft.holderName} onChangeText={(value) => setDraft((prev) => ({ ...prev, holderName: value }))} placeholder={t('licenseManagement.holderPlaceholder')} />
              <Field label={t('licenseManagement.licenseNumber')} value={draft.licenseNumber} onChangeText={(value) => setDraft((prev) => ({ ...prev, licenseNumber: value }))} placeholder={t('licenseManagement.numberPlaceholder')} />

              <Text style={styles.fieldLabel}>{t('licenseManagement.discipline')}</Text>
              <View style={styles.segmentRow}>
                <ChipButton
                  label={t('licenseManagement.disciplines.scuba')}
                  active={draft.discipline === 'scuba'}
                  onPress={() => setDraft((prev) => ({ ...prev, discipline: 'scuba' }))}
                  icon={<Waves size={12} color={draft.discipline === 'scuba' ? '#fff' : '#0D5FA8'} />}
                />
                <ChipButton
                  label={t('licenseManagement.disciplines.freediving')}
                  active={draft.discipline === 'freediving'}
                  onPress={() => setDraft((prev) => ({ ...prev, discipline: 'freediving' }))}
                  icon={<Fish size={12} color={draft.discipline === 'freediving' ? '#fff' : '#08B7C7'} />}
                />
              </View>

              <Field label={t('licenseManagement.certificationLevel')} value={draft.certificationLevel} onChangeText={(value) => setDraft((prev) => ({ ...prev, certificationLevel: value }))} placeholder={t('licenseManagement.levelPlaceholder')} />
              <Field label={t('licenseManagement.issueDate')} value={draft.issueDate} onChangeText={(value) => setDraft((prev) => ({ ...prev, issueDate: value }))} placeholder="YYYY-MM-DD" />

              <View style={styles.inlineToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>{t('licenseManagement.hasExpiration')}</Text>
                  <Text style={styles.fieldHint}>{t('licenseManagement.expirationHint')}</Text>
                </View>
                <Switch
                  value={draft.hasExpiration}
                  onValueChange={(value) => setDraft((prev) => ({ ...prev, hasExpiration: value, expirationDate: value ? prev.expirationDate : '' }))}
                  trackColor={{ false: '#D7E4F1', true: '#0D5FA8' }}
                  thumbColor="#ffffff"
                />
              </View>
              {draft.hasExpiration ? (
                <Field
                  label={t('licenseManagement.expirationDate')}
                  value={draft.expirationDate}
                  onChangeText={(value) => setDraft((prev) => ({ ...prev, expirationDate: value }))}
                  placeholder="YYYY-MM-DD"
                />
              ) : null}

              <Field
                label={t('licenseManagement.maxDepth')}
                value={draft.maxDepth}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, maxDepth: value }))}
                placeholder={t('licenseManagement.maxDepthPlaceholder')}
                keyboardType="numeric"
                rightSlot={<Text style={{ color: '#64748B', fontWeight: '800' }}>m</Text>}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>{t('licenseManagement.verificationInfo')}</Text>
              <Field label={t('licenseManagement.trainingAgency')} value={draft.trainingAgency} onChangeText={(value) => setDraft((prev) => ({ ...prev, trainingAgency: value }))} placeholder={t('licenseManagement.agencyPlaceholder')} />
              <Field label={t('licenseManagement.instructorName')} value={draft.instructorName} onChangeText={(value) => setDraft((prev) => ({ ...prev, instructorName: value }))} placeholder={t('licenseManagement.instructorNamePlaceholder')} />
              <Field label={t('licenseManagement.instructorNumber')} value={draft.instructorNumber} onChangeText={(value) => setDraft((prev) => ({ ...prev, instructorNumber: value }))} placeholder={t('licenseManagement.instructorNumberPlaceholder')} />
              <Field label={t('licenseManagement.emergencyContact')} value={draft.emergencyContact} onChangeText={(value) => setDraft((prev) => ({ ...prev, emergencyContact: value }))} placeholder="+82 10-1234-5678" />
              <Field label={t('licenseManagement.verificationUrl')} value={draft.verificationUrl} onChangeText={(value) => setDraft((prev) => ({ ...prev, verificationUrl: value }))} placeholder="https://divergram.com/license/..." />

              <Text style={styles.fieldLabel}>{t('licenseManagement.status')}</Text>
              <View style={styles.segmentRow}>
                {DIVING_LICENSE_STATUS_OPTIONS.map((item) => (
                  <ChipButton
                    key={item}
                    label={t(`licenseManagement.statuses.${normalizeDivingLicenseStatus(item)}`)}
                    active={draft.status === item}
                    onPress={() => setDraft((prev) => ({ ...prev, status: normalizeDivingLicenseStatus(item) }))}
                  />
                ))}
              </View>

              <Field
                label={t('licenseManagement.notes')}
                value={draft.notes}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, notes: value }))}
                placeholder={t('licenseManagement.notesPlaceholder')}
                multiline
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>{t('licenseManagement.photoSection')}</Text>
              <TouchableOpacity activeOpacity={0.86} onPress={handlePickImage} style={styles.imageUploadButton}>
                {uploadingImage ? <ActivityIndicator size="small" color="#0D5FA8" /> : <ImagePlus size={17} color="#0D5FA8" />}
                <Text style={styles.imageUploadText}>{t(uploadingImage ? 'licenseManagement.analyzingPhoto' : draft.profileImageUrl ? 'licenseManagement.reselectPhoto' : 'licenseManagement.selectPhoto')}</Text>
              </TouchableOpacity>
              {ocrNotice ? <Text style={styles.fieldHint}>{ocrNotice}</Text> : null}
              {draft.profileImageUrl ? (
                <View style={styles.profilePreviewWrap}>
                  <ExpoImage source={{ uri: draft.profileImageUrl }} style={styles.profilePreview} contentFit="cover" />
                </View>
              ) : (
                <View style={styles.profilePreviewEmpty}>
                  <User size={20} color="#0D5FA8" />
                  <Text style={{ color: '#0F172A', fontWeight: '700' }}>{t('licenseManagement.noPreview')}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity activeOpacity={0.88} onPress={handleSave} style={[styles.primarySaveButton, { opacity: saving || uploadingImage ? 0.7 : 1 }]}>
              <Text style={styles.primarySaveButtonText}>{t(saving ? 'licenseManagement.saving' : editingId ? 'licenseManagement.saveEdit' : 'licenseManagement.register')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Screen>
      </Modal>

      <Modal visible={Boolean(selectedLicense)} animationType="fade" transparent onRequestClose={closeDetails}>
        <View style={styles.detailsOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDetails} />
          {selectedLicense ? (
            <View style={styles.detailsSheet}>
              <View style={styles.detailsHeader}>
                <View>
                  <Text style={styles.detailsTitle}>My Diving License</Text>
                  <Text style={styles.detailsSubtitle}>{t('licenseManagement.detailSubtitle')}</Text>
                </View>
                <TouchableOpacity onPress={closeDetails} activeOpacity={0.84} style={styles.closeButton}>
                  <X size={19} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <ScrollView ref={detailsScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsContent}>

              <View style={styles.sideSwitcher}>
                <ChipButton label="FRONT" active={selectedSide === 'front'} onPress={() => setSelectedSide('front')} />
                <ChipButton label="BACK" active={selectedSide === 'back'} onPress={() => setSelectedSide('back')} />
              </View>

              <TouchableOpacity activeOpacity={0.96} onPress={() => setSelectedSide((prev) => (prev === 'front' ? 'back' : 'front'))}>
                <LicenseCard license={selectedLicense} side={selectedSide} onToggleSide={() => setSelectedSide((prev) => (prev === 'front' ? 'back' : 'front'))} />
              </TouchableOpacity>

              <View style={styles.detailActionGrid}>
                {Platform.OS === 'ios' || Platform.OS === 'android' ? (
                  <View style={styles.walletSection}>
                    {Platform.OS === 'ios' ? (
                      <View style={[styles.walletStatus, appleWalletStatus.data?.ready ? styles.walletStatusReady : styles.walletStatusPending]}>
                        <View style={[styles.walletStatusDot, { backgroundColor: appleWalletStatus.data?.ready ? '#16A34A' : '#D97706' }]} />
                        <Text style={styles.walletStatusText}>
                          {appleWalletStatus.isLoading
                            ? t('licenseManagement.walletChecking')
                            : appleWalletStatus.data?.ready
                              ? t('licenseManagement.walletReady')
                              : t('licenseManagement.walletCertificateRequired')}
                        </Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      onPress={() => handleWallet(selectedLicense)}
                      activeOpacity={0.88}
                      disabled={walletLoadingId === selectedLicense.id || (Platform.OS === 'ios' && appleWalletStatus.data?.ready === false)}
                      style={[styles.walletButton, (walletLoadingId === selectedLicense.id || (Platform.OS === 'ios' && appleWalletStatus.data?.ready === false)) && styles.walletButtonDisabled]}
                    >
                      {walletLoadingId === selectedLicense.id ? <ActivityIndicator size="small" color="#fff" /> : <Wallet size={17} color="#fff" />}
                      <Text style={styles.walletButtonText}>
                        {walletLoadingId === selectedLicense.id
                          ? t('licenseManagement.walletPreparing')
                          : t(Platform.OS === 'ios' ? 'licenseManagement.addAppleWallet' : 'licenseManagement.addGoogleWallet')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <ActionButton
                  label={t('licenseManagement.shareLicense')}
                  onPress={() => handleShare(selectedLicense)}
                  icon={<Share2 size={16} color="#0D5FA8" />}
                />
                <ActionButton
                  label={t('licenseManagement.verifyLicense')}
                  onPress={() => handleVerify(selectedLicense)}
                  icon={<ShieldCheck size={16} color="#0D5FA8" />}
                />
                <ActionButton
                  label={t('licenseManagement.viewCertificate')}
                  onPress={() => setSelectedSide((prev) => (prev === 'front' ? 'back' : 'front'))}
                  icon={selectedSide === 'front' ? <Eye size={16} color="#0D5FA8" /> : <EyeOff size={16} color="#0D5FA8" />}
                />
                <ActionButton
                  label={t('licenseManagement.editLicense')}
                  onPress={() => {
                    const found = licenses.find((item) => item.id === selectedLicense.id);
                    if (found) {
                      closeDetails();
                      openEdit(found);
                    }
                  }}
                  icon={<Pencil size={16} color="#0D5FA8" />}
                />
                <ActionButton
                  label={t('licenseManagement.deleteLicense')}
                  onPress={() => handleDelete(selectedLicense)}
                  icon={<Trash2 size={16} color="#B91C1C" />}
                  danger
                />
              </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

function MiniAction({
  label,
  icon,
  danger = false,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  onPress: (event: any) => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={[styles.miniAction, danger ? styles.miniActionDanger : undefined]}>
      {icon}
      <Text style={[styles.miniActionText, danger ? styles.miniActionTextDanger : undefined]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#0D5FA8',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroBrand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroLogoWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#F5FAFF',
    borderWidth: 1,
    borderColor: '#DCEBFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogo: {
    width: 38,
    height: 38,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 3,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  heroCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 14,
    backgroundColor: '#0D5FA8',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  heroCreateButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  heroStats: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#F8FBFF',
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  statValue: {
    marginTop: 4,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  filterCard: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 13,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#0D5FA8',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  listCardPreviewWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EBF4',
    padding: 14,
    minHeight: 208,
  },
  listCardWatermarkWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 4,
  },
  listCardWatermark: {
    opacity: 0.08,
    transform: [{ rotate: '-12deg' }],
  },
  listCardPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  listCardBrand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listCardLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#F5FAFF',
    borderWidth: 1,
    borderColor: '#DCEBFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardLogo: {
    width: 30,
    height: 30,
  },
  listCardBrandTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listCardBrandSubtitle: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  listCardTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  listCardMetaGroup: {
    marginBottom: 14,
  },
  listCardMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  listCardName: {
    marginTop: 5,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  listCardLevel: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  listCardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  listCardDisciplineBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  listCardDisciplineBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  listCardMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  listCardMetaBlock: {
    width: '47%',
    minWidth: 0,
  },
  listCardMetaValue: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  listCardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listCardFooterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listCardActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  miniAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#F8FBFF',
    paddingVertical: 10,
  },
  miniActionDanger: {
    backgroundColor: '#FFF1F2',
    borderColor: '#F9B6C2',
  },
  miniActionText: {
    color: '#0D5FA8',
    fontSize: 11,
    fontWeight: '800',
  },
  miniActionTextDanger: {
    color: '#B91C1C',
  },
  emptyCard: {
    marginTop: 14,
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  previewHeading: {
    width: '100%',
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewSideLabel: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#EAF3FB',
    color: '#0D5FA8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '900',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#0D5FA8',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
  },
  saveButton: {
    borderRadius: 16,
    backgroundColor: '#0D5FA8',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  formSection: {
    marginBottom: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
  },
  formSectionTitleRow: {
    gap: 4,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  formSectionHint: {
    color: '#64748B',
    fontSize: 12,
  },
  fieldLabel: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
  },
  fieldHint: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    borderRadius: 18,
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    minHeight: 50,
    color: '#10213A',
    fontSize: 14,
    fontWeight: '400',
  },
  inputMultiline: {
    minHeight: 92,
    paddingTop: 14,
  },
  inputRightSlot: {
    paddingVertical: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inlineToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
  },
  imageUploadText: {
    color: '#0D5FA8',
    fontWeight: '800',
  },
  profilePreviewWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D7E4F1',
  },
  profilePreview: {
    width: '100%',
    height: 190,
    backgroundColor: '#E2E8F0',
  },
  profilePreviewEmpty: {
    height: 120,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#F8FBFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primarySaveButton: {
    borderRadius: 22,
    backgroundColor: '#0D5FA8',
    paddingVertical: 16,
    alignItems: 'center',
  },
  primarySaveButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.42)',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 58,
    paddingBottom: 22,
  },
  detailsSheet: {
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#F5F8FC',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D7E4F1',
  },
  detailsContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D7E4F1',
    backgroundColor: '#FFFFFF',
  },
  detailsTitle: {
    color: '#0F172A',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  detailsSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSwitcher: {
    flexDirection: 'row',
    gap: 10,
  },
  frontCard: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  backCard: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 9,
    overflow: 'hidden',
  },
  frontTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoImage: {
    width: 24,
    height: 24,
  },
  brandTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  brandSub: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  digitalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  digitalTagText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: '#E2E8F0',
  },
  profileAvatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarFallbackText: {
    fontSize: 19,
    fontWeight: '900',
  },
  holderName: {
    color: '#10213A',
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  holderSubName: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  certificationName: {
    marginTop: 2,
    color: '#334155',
    fontSize: 10,
    fontWeight: '700',
  },
  inlineBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  disciplineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  disciplineChipText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusChipText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  frontDataRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 9,
  },
  compactField: {
    flex: 1,
    minWidth: 0,
  },
  compactFieldLabel: {
    color: '#7C8BA1',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  compactFieldValue: {
    marginTop: 2,
    color: '#10213A',
    fontSize: 9,
    fontWeight: '800',
  },
  backBody: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  backInformation: {
    flex: 1,
    minWidth: 0,
  },
  backSectionTitle: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  backSectionValue: {
    color: '#10213A',
    marginTop: 3,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  backSectionMeta: {
    color: '#64748B',
    marginTop: 1,
    fontSize: 9,
    fontWeight: '700',
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  compactGridItem: {
    width: '47%',
  },
  compactQrWrap: {
    width: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactQrFrame: {
    width: 78,
    height: 78,
    padding: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7E4F1',
  },
  compactQrLabel: {
    marginTop: 5,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardSerial: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  detailActionGrid: {
    gap: 10,
  },
  walletSection: {
    gap: 8,
  },
  walletStatus: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 13,
    borderWidth: 1,
  },
  walletStatusReady: {
    borderColor: '#BBE5C6',
    backgroundColor: '#F0FDF4',
  },
  walletStatusPending: {
    borderColor: '#F4D39B',
    backgroundColor: '#FFFBEB',
  },
  walletStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  walletStatusText: {
    flex: 1,
    color: '#475569',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: '#111111',
    paddingVertical: 14,
  },
  walletButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  walletButtonDisabled: {
    opacity: 0.5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 13,
  },
  actionButtonText: {
    fontWeight: '900',
  },
  floatingCreateButton: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    minWidth: 104,
    height: 52,
    paddingHorizontal: 17,
    borderRadius: 18,
    backgroundColor: '#0D5FA8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#06345F',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  floatingCreateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});
