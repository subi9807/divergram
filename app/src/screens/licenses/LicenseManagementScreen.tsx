import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Modal,
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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Fish,
  ImagePlus,
  MoreVertical,
  Pencil,
  Phone,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Wallet,
  Waves,
} from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useAuth } from '../../hooks/useAuth';
import { uploadImage } from '../../services/cloudinaryService';
import { createDivingLicense, deleteDivingLicense, listDivingLicenses, updateDivingLicense } from '../../services/divingLicenseService';
import {
  DIVING_DISCIPLINE_OPTIONS,
  DIVING_LICENSE_STATUS_OPTIONS,
  getDivingDisciplineLabel,
  getDivingLicenseStatusLabel,
  getDivingLicenseStatusTone,
  normalizeDivingDiscipline,
  normalizeDivingLicenseStatus,
  type DivingDiscipline,
  type DivingLicense,
  type DivingLicenseStatus,
} from '../../models/DivingLicense';
import { requestAppleWalletPass } from '../../services/licenseWalletService';

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

function formatDateValue(value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return '-';
  return normalized.replace(/-/g, '.');
}

function buildVerificationUrl(licenseNumber: string) {
  const trimmed = String(licenseNumber || '').trim();
  if (!trimmed) return 'https://divergram.com/license';
  return `https://divergram.com/license/${encodeURIComponent(trimmed)}`;
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

function generateQrMatrix(seed: string) {
  const size = 21;
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  const corners = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  for (const [startRow, startCol] of corners) {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const isBorder = row === 0 || row === 6 || col === 0 || col === 6;
        const isInner = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        matrix[startRow + row][startCol + col] = isBorder || isInner;
      }
    }
  }

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const inFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= size - 7) ||
        (row >= size - 7 && col < 7);
      if (inFinder) continue;
      const mix = (hash + row * 17 + col * 23 + row * col * 7) % 11;
      matrix[row][col] = mix === 0 || mix === 3 || mix === 7;
    }
  }

  return matrix;
}

function StatusChip({ status }: { status: DivingLicenseStatus }) {
  const tone = statusStyleMap[status];
  return (
    <View style={[styles.statusChip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.statusChipText, { color: tone.fg }]}>{getDivingLicenseStatusLabel(status)}</Text>
    </View>
  );
}

function DisciplineChip({ discipline }: { discipline: DivingDiscipline }) {
  const label = getDivingDisciplineLabel(discipline);
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

function QrMock({ value }: { value: string }) {
  const matrix = useMemo(() => generateQrMatrix(value), [value]);
  return (
    <View style={styles.qrCard}>
      <View style={styles.qrFrame}>
        {matrix.map((row, rowIndex) => (
          <View key={`r-${rowIndex}`} style={styles.qrRow}>
            {row.map((cell, colIndex) => (
              <View
                key={`c-${rowIndex}-${colIndex}`}
                style={[styles.qrCell, cell ? styles.qrCellDark : styles.qrCellLight]}
              />
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.qrHint}>Scan to Verify</Text>
      <Text style={styles.qrValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
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
  const { isDark } = useResolvedTheme();
  const accent = cardAccentMap[license.discipline];
  const displayName = license.holderName || 'DIVERGRAM USER';
  const verificationUrl = license.verificationUrl || buildVerificationUrl(license.licenseNumber);
  const initials = initialsFromName(displayName);
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || displayName;
  const restName = nameParts.slice(1).join(' ');

  if (side === 'back') {
    return (
      <Pressable onPress={onToggleSide} style={[styles.backCard, { borderColor: `${accent}26`, backgroundColor: isDark ? '#0D1724' : '#FFFFFF' }]}>
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

        <View style={[styles.backSection, { borderColor: `${accent}22`, backgroundColor: isDark ? 'rgba(8, 184, 199, 0.06)' : 'rgba(8, 184, 199, 0.05)' }]}>
          <Text style={styles.backSectionTitle}>License Details</Text>
          <Text style={styles.backSectionValue}>{license.certificationLevel}</Text>
          <Text style={styles.backSectionMeta}>
            {getDivingDisciplineLabel(license.discipline)} · Max Depth {license.maxDepth ? `${license.maxDepth} m` : '-'}
          </Text>
        </View>

        <View style={styles.detailGrid}>
          <DetailLine icon={<CalendarDays size={14} color={accent} />} label="Issued" value={formatDateValue(license.issueDate)} />
          <DetailLine
            icon={<CalendarDays size={14} color={accent} />}
            label="Expires"
            value={license.hasExpiration ? formatDateValue(license.expirationDate || '-') : 'NO EXPIRATION'}
          />
          <DetailLine icon={<FileText size={14} color={accent} />} label="Training Agency" value={license.trainingAgency || '-'} />
          <DetailLine icon={<User size={14} color={accent} />} label="Instructor" value={license.instructorName || '-'} />
          <DetailLine icon={<CreditCard size={14} color={accent} />} label="License No" value={license.licenseNumber} />
          <DetailLine icon={<Phone size={14} color={accent} />} label="Emergency Contact" value={license.emergencyContact || '-'} />
        </View>

        <View style={styles.qrRowWrap}>
          <QrMock value={verificationUrl} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onToggleSide} style={[styles.frontCard, { borderColor: `${accent}26`, backgroundColor: isDark ? '#0D1724' : '#FFFFFF' }]}>
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
          <Text style={styles.holderName}>{firstName}</Text>
          {restName ? <Text style={styles.holderSubName}>{restName}</Text> : null}
          <View style={styles.inlineBadges}>
            <DisciplineChip discipline={license.discipline} />
            <StatusChip status={license.status} />
          </View>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <MiniInfo icon={<CreditCard size={14} color={accent} />} label="License No" value={license.licenseNumber} />
        <MiniInfo icon={<BadgeCheck size={14} color={accent} />} label="Level" value={license.certificationLevel} />
        <MiniInfo icon={<CalendarDays size={14} color={accent} />} label="Issued" value={formatDateValue(license.issueDate)} />
        <MiniInfo
          icon={<Eye size={14} color={accent} />}
          label="Expires"
          value={license.hasExpiration ? formatDateValue(license.expirationDate || '-') : 'NO EXPIRATION'}
        />
      </View>

      <View style={styles.frontFooter}>
        <View>
          <Text style={styles.footerLabel}>Tap card to flip</Text>
          <Text style={styles.footerValue}>Verify via QR or link</Text>
        </View>
        <View style={[styles.footerIconWrap, { borderColor: `${accent}22`, backgroundColor: `${accent}10` }]}>
          <QrCode size={20} color={accent} />
        </View>
      </View>
    </Pressable>
  );
}

function DetailLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailLine}>
      <View style={styles.detailLineIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLineLabel}>{label}</Text>
        <Text style={styles.detailLineValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.miniInfo}>
      <View style={styles.miniInfoIcon}>{icon}</View>
      <Text style={styles.miniInfoLabel}>{label}</Text>
      <Text style={styles.miniInfoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function LicenseManagementScreen() {
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
  const userId = String(user?.id || 'me').trim() || 'me';
  const userName = String(user?.name || 'Divergram Diver').trim();
  const userAvatar = String(user?.avatar || '').trim();

  const query = useQuery({
    queryKey: ['diving-licenses', userId],
    queryFn: () => listDivingLicenses(userId),
  });

  const licenses = query.data || [];
  const [filter, setFilter] = useState<DisciplineFilter>('all');
  const [selectedLicense, setSelectedLicense] = useState<DivingLicense | null>(null);
  const [selectedSide, setSelectedSide] = useState<LicenseSide>('front');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draft, setDraft] = useState<LicenseDraft>(() => ({
    ...EMPTY_DRAFT,
    holderName: userName,
    profileImageUrl: userAvatar,
  }));
  const fade = useRef(new Animated.Value(1)).current;

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
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [selectedLicense, selectedSide, fade]);

  const openCreate = () => {
    setEditingId(null);
    setDraft({
      ...EMPTY_DRAFT,
      holderName: userName,
      profileImageUrl: userAvatar,
      issueDate: new Date().toISOString().slice(0, 10),
    });
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
      Alert.alert('권한 필요', '사진 접근 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      base64: false,
      quality: 0.9,
      selectionLimit: 1,
    });
    if (result.canceled || !result.assets?.length) return;

    const picked = String(result.assets[0]?.uri || '').trim();
    if (!picked) return;
    setUploadingImage(true);
    try {
      const uploaded = await uploadImage(picked);
      setDraft((prev) => ({ ...prev, profileImageUrl: uploaded.url }));
      Alert.alert('업로드 완료', uploaded.source === 'cloudinary' ? '프로필 이미지가 업로드되었습니다.' : '임시 업로드 URL로 저장됩니다.');
    } catch (error: any) {
      Alert.alert('업로드 실패', String(error?.message || error));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (saving || uploadingImage) return;
    if (!draft.holderName.trim()) {
      Alert.alert('입력 필요', '라이선스 보유자 이름을 입력해주세요.');
      return;
    }
    if (!draft.licenseNumber.trim()) {
      Alert.alert('입력 필요', '라이선스 번호를 입력해주세요.');
      return;
    }
    if (!draft.certificationLevel.trim()) {
      Alert.alert('입력 필요', '라이선스 등급을 입력해주세요.');
      return;
    }
    if (!draft.issueDate.trim()) {
      Alert.alert('입력 필요', '발급일을 입력해주세요.');
      return;
    }
    if (draft.hasExpiration && !draft.expirationDate.trim()) {
      Alert.alert('입력 필요', '만료일을 입력해주세요.');
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
      Alert.alert('저장 완료', editingId ? '라이선스 정보가 수정되었습니다.' : '라이선스가 등록되었습니다.');
    } catch (error: any) {
      Alert.alert(editingId ? '수정 실패' : '등록 실패', String(error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (license: DivingLicense) => {
    Alert.alert('라이선스 삭제', '이 라이선스를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
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
            Alert.alert('삭제 실패', String(error?.message || error));
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
      Alert.alert('공유 실패', '공유 기능을 실행할 수 없습니다.');
    }
  };

  const handleVerify = async (license: DivingLicense) => {
    const url = license.verificationUrl || buildVerificationUrl(license.licenseNumber);
    const supported = await Linking.canOpenURL(url).catch(() => false);
    if (!supported) {
      Alert.alert('검증 링크', url);
      return;
    }
    await Linking.openURL(url);
  };

  const handleWallet = async (license: DivingLicense) => {
    const result = await requestAppleWalletPass({ licenseId: license.id, userId });
    if (result.ready && result.passUrl) {
      const supported = await Linking.canOpenURL(result.passUrl).catch(() => false);
      if (supported) {
        await Linking.openURL(result.passUrl);
        return;
      }
    }
    Alert.alert('Apple Wallet', result.message || 'Apple Wallet 연동 준비 중입니다.');
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
                <Text style={[styles.heroEyebrow, { color: colors.subText }]}>Digital Diving License</Text>
                <Text style={[styles.heroTitle, { color: colors.title }]}>My Licenses</Text>
                <Text style={[styles.heroSubtitle, { color: colors.subtitle }]}>
                  라이선스 조회, 등록, 수정, 삭제를 한 화면에서 관리합니다.
                </Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={openCreate} style={styles.heroCreateButton}>
              <CirclePlus size={18} color="#fff" />
              <Text style={styles.heroCreateButtonText}>등록</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroStats}>
            <StatCard label="TOTAL" value={String(stats.total)} tone="#0D5FA8" />
            <StatCard label="ACTIVE" value={String(stats.active)} tone="#0F7A47" />
            <StatCard label="SCUBA" value={String(stats.scuba)} tone="#0D5FA8" />
            <StatCard label="FREE" value={String(stats.freediving)} tone="#08B7C7" />
          </View>
        </View>

        <View style={[styles.filterCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Filter size={17} color="#0D5FA8" />
              <Text style={[styles.sectionTitle, { color: colors.title }]}>필터</Text>
            </View>
            <Text style={{ color: colors.subtitle, fontSize: 12 }}>{filteredLicenses.length}개 표시</Text>
          </View>

          <View style={styles.chipRow}>
            <ChipButton label="ALL" active={filter === 'all'} onPress={() => setFilter('all')} />
            {DIVING_DISCIPLINE_OPTIONS.map((item) => (
              <ChipButton
                key={item}
                label={getDivingDisciplineLabel(item)}
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
                      <Text style={styles.listCardDisciplineBadgeText}>{getDivingDisciplineLabel(license.discipline)}</Text>
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
                      <Text style={[styles.listCardMetaLabel, { color: colors.subText }]}>EXPIRES</Text>
                      <Text style={[styles.listCardMetaValue, { color: colors.title }]} numberOfLines={1}>
                        {license.hasExpiration ? formatDateValue(license.expirationDate || '') : 'NO EXPIRATION'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.listCardFooter}>
                  <Text style={[styles.listCardFooterText, { color: colors.subText }]}>탭하여 상세 화면 보기</Text>
                  <ChevronRight size={18} color={colors.subText} />
                </View>

                <View style={styles.listCardActions}>
                  <MiniAction
                    icon={<Eye size={14} color="#0D5FA8" />}
                    label="조회"
                    onPress={(event) => {
                      event.stopPropagation();
                      openDetails(license);
                    }}
                  />
                  <MiniAction
                    icon={<Pencil size={14} color="#0D5FA8" />}
                    label="수정"
                    onPress={(event) => {
                      event.stopPropagation();
                      openEdit(license);
                    }}
                  />
                  <MiniAction
                    icon={<Trash2 size={14} color="#B91C1C" />}
                    label="삭제"
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
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.mutedBg, borderColor: colors.mutedBorder }]}>
              <BadgeCheck size={28} color="#0D5FA8" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.title }]}>등록된 라이선스가 없습니다</Text>
            <Text style={[styles.emptySubtitle, { color: colors.subtitle }]}>새 라이선스를 등록하면 여기에서 조회, 수정, 삭제할 수 있습니다.</Text>
            <TouchableOpacity onPress={openCreate} activeOpacity={0.86} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>첫 라이선스 등록</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={editorOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeEditor}>
        <Screen tone="plain">
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 44 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeEditor} activeOpacity={0.84} style={styles.backButton}>
                <ChevronLeft size={20} color="#0F172A" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{editingId ? '라이선스 수정' : '라이선스 등록'}</Text>
                <Text style={styles.modalSubtitle}>내 라이선스 정보를 입력하고 저장하세요.</Text>
              </View>
              <TouchableOpacity onPress={handleSave} activeOpacity={0.86} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>{saving ? '저장중...' : '저장'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <View style={styles.formSectionTitleRow}>
                <Text style={styles.formSectionTitle}>기본 정보</Text>
                <Text style={styles.formSectionHint}>필수 항목: 이름, 번호, 등급, 발급일</Text>
              </View>

              <Field label="보유자 이름" value={draft.holderName} onChangeText={(value) => setDraft((prev) => ({ ...prev, holderName: value }))} placeholder="예: KIM SEOKGEUN" />
              <Field label="라이선스 번호" value={draft.licenseNumber} onChangeText={(value) => setDraft((prev) => ({ ...prev, licenseNumber: value }))} placeholder="예: DG-2026-0001" />

              <Text style={styles.fieldLabel}>종목</Text>
              <View style={styles.segmentRow}>
                <ChipButton
                  label="SCUBA DIVING"
                  active={draft.discipline === 'scuba'}
                  onPress={() => setDraft((prev) => ({ ...prev, discipline: 'scuba' }))}
                  icon={<Waves size={12} color={draft.discipline === 'scuba' ? '#fff' : '#0D5FA8'} />}
                />
                <ChipButton
                  label="FREEDIVING"
                  active={draft.discipline === 'freediving'}
                  onPress={() => setDraft((prev) => ({ ...prev, discipline: 'freediving' }))}
                  icon={<Fish size={12} color={draft.discipline === 'freediving' ? '#fff' : '#08B7C7'} />}
                />
              </View>

              <Field label="라이선스 등급" value={draft.certificationLevel} onChangeText={(value) => setDraft((prev) => ({ ...prev, certificationLevel: value }))} placeholder="예: ADVANCED OPEN WATER DIVER" />
              <Field label="발급일" value={draft.issueDate} onChangeText={(value) => setDraft((prev) => ({ ...prev, issueDate: value }))} placeholder="YYYY-MM-DD" />

              <View style={styles.inlineToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>만료 여부</Text>
                  <Text style={styles.fieldHint}>만료일이 없으면 NO EXPIRATION으로 표시합니다.</Text>
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
                  label="만료일"
                  value={draft.expirationDate}
                  onChangeText={(value) => setDraft((prev) => ({ ...prev, expirationDate: value }))}
                  placeholder="YYYY-MM-DD"
                />
              ) : null}

              <Field
                label="최대 수심"
                value={draft.maxDepth}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, maxDepth: value }))}
                placeholder="예: 30"
                keyboardType="numeric"
                rightSlot={<Text style={{ color: '#64748B', fontWeight: '800' }}>m</Text>}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>발급/검증 정보</Text>
              <Field label="교육 기관" value={draft.trainingAgency} onChangeText={(value) => setDraft((prev) => ({ ...prev, trainingAgency: value }))} placeholder="예: DIVERGRAM EDUCATION" />
              <Field label="강사명" value={draft.instructorName} onChangeText={(value) => setDraft((prev) => ({ ...prev, instructorName: value }))} placeholder="예: KIM SEOKGEUN" />
              <Field label="강사 번호" value={draft.instructorNumber} onChangeText={(value) => setDraft((prev) => ({ ...prev, instructorNumber: value }))} placeholder="예: INST-2026-001" />
              <Field label="응급 연락처" value={draft.emergencyContact} onChangeText={(value) => setDraft((prev) => ({ ...prev, emergencyContact: value }))} placeholder="+82 10-1234-5678" />
              <Field label="검증 URL" value={draft.verificationUrl} onChangeText={(value) => setDraft((prev) => ({ ...prev, verificationUrl: value }))} placeholder="https://divergram.com/license/..." />

              <Text style={styles.fieldLabel}>상태</Text>
              <View style={styles.segmentRow}>
                {DIVING_LICENSE_STATUS_OPTIONS.map((item) => (
                  <ChipButton
                    key={item}
                    label={getDivingLicenseStatusLabel(normalizeDivingLicenseStatus(item))}
                    active={draft.status === item}
                    onPress={() => setDraft((prev) => ({ ...prev, status: normalizeDivingLicenseStatus(item) }))}
                  />
                ))}
              </View>

              <Field
                label="메모"
                value={draft.notes}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, notes: value }))}
                placeholder="예: Apple Wallet 준비 완료"
                multiline
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>사진</Text>
              <TouchableOpacity activeOpacity={0.86} onPress={handlePickImage} style={styles.imageUploadButton}>
                <ImagePlus size={17} color="#0D5FA8" />
                <Text style={styles.imageUploadText}>{draft.profileImageUrl ? '이미지 다시 선택' : '이미지 업로드'}</Text>
              </TouchableOpacity>
              {draft.profileImageUrl ? (
                <View style={styles.profilePreviewWrap}>
                  <ExpoImage source={{ uri: draft.profileImageUrl }} style={styles.profilePreview} contentFit="cover" />
                </View>
              ) : (
                <View style={styles.profilePreviewEmpty}>
                  <User size={20} color="#0D5FA8" />
                  <Text style={{ color: '#0F172A', fontWeight: '700' }}>프리뷰 없음</Text>
                </View>
              )}
            </View>

            <TouchableOpacity activeOpacity={0.88} onPress={handleSave} style={[styles.primarySaveButton, { opacity: saving || uploadingImage ? 0.7 : 1 }]}>
              <Text style={styles.primarySaveButtonText}>{saving ? '저장중...' : editingId ? '수정 저장' : '라이선스 등록'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Screen>
      </Modal>

      <Modal visible={Boolean(selectedLicense)} animationType="fade" transparent onRequestClose={closeDetails}>
        <View style={styles.detailsOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDetails} />
          {selectedLicense ? (
            <Animated.View
              style={[
                styles.detailsSheet,
                {
                  opacity: fade,
                  transform: [
                    {
                      translateY: fade.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.detailsHeader}>
                <View>
                  <Text style={styles.detailsTitle}>My Diving License</Text>
                  <Text style={styles.detailsSubtitle}>조회 · 공유 · 검증 · 저장</Text>
                </View>
                <TouchableOpacity onPress={closeDetails} activeOpacity={0.84} style={styles.closeButton}>
                  <MoreVertical size={18} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <View style={styles.sideSwitcher}>
                <ChipButton label="FRONT" active={selectedSide === 'front'} onPress={() => setSelectedSide('front')} />
                <ChipButton label="BACK" active={selectedSide === 'back'} onPress={() => setSelectedSide('back')} />
              </View>

              <TouchableOpacity activeOpacity={0.96} onPress={() => setSelectedSide((prev) => (prev === 'front' ? 'back' : 'front'))}>
                <LicenseCard license={selectedLicense} side={selectedSide} onToggleSide={() => setSelectedSide((prev) => (prev === 'front' ? 'back' : 'front'))} />
              </TouchableOpacity>

              <View style={styles.detailActionGrid}>
                <TouchableOpacity onPress={() => handleWallet(selectedLicense)} activeOpacity={0.88} style={styles.walletButton}>
                  <Wallet size={17} color="#fff" />
                  <Text style={styles.walletButtonText}>Add to Apple Wallet</Text>
                </TouchableOpacity>
                <ActionButton
                  label="Share License"
                  onPress={() => handleShare(selectedLicense)}
                  icon={<Share2 size={16} color="#0D5FA8" />}
                />
                <ActionButton
                  label="Verify License"
                  onPress={() => handleVerify(selectedLicense)}
                  icon={<ShieldCheck size={16} color="#0D5FA8" />}
                />
                <ActionButton
                  label="View Certificate Details"
                  onPress={() => setSelectedSide((prev) => (prev === 'front' ? 'back' : 'front'))}
                  icon={selectedSide === 'front' ? <Eye size={16} color="#0D5FA8" /> : <EyeOff size={16} color="#0D5FA8" />}
                />
                <ActionButton
                  label="Edit License"
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
                  label="Delete License"
                  onPress={() => handleDelete(selectedLicense)}
                  icon={<Trash2 size={16} color="#B91C1C" />}
                  danger
                />
              </View>
            </Animated.View>
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
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#FFFFFF',
    padding: 18,
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
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#F5FAFF',
    borderWidth: 1,
    borderColor: '#DCEBFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogo: {
    width: 44,
    height: 44,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  heroCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 18,
    backgroundColor: '#0D5FA8',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  heroCreateButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  heroStats: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#F8FBFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  statValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '900',
  },
  filterCard: {
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  listCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#0D5FA8',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  listCardPreviewWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EBF4',
    padding: 14,
    minHeight: 220,
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
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  listCardBrandSubtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  listCardTag: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  listCardMetaGroup: {
    marginBottom: 14,
  },
  listCardMetaLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  listCardName: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  listCardLevel: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
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
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  listCardMetaGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  listCardMetaBlock: {
    flex: 1,
    minWidth: 0,
  },
  listCardMetaValue: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
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
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
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
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  formSectionHint: {
    color: '#64748B',
    fontSize: 12,
  },
  fieldLabel: {
    color: '#334155',
    fontWeight: '800',
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
    fontWeight: '500',
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
    padding: 12,
  },
  detailsSheet: {
    borderRadius: 28,
    backgroundColor: '#F5F8FC',
    padding: 16,
    gap: 14,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailsTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
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
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 16,
  },
  backCard: {
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 16,
  },
  frontTop: {
    gap: 12,
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
    gap: 12,
    flex: 1,
  },
  brandLogo: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoImage: {
    width: 30,
    height: 30,
  },
  brandTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  brandSub: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  digitalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  digitalTagText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: '#E2E8F0',
  },
  profileAvatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarFallbackText: {
    fontSize: 24,
    fontWeight: '900',
  },
  holderName: {
    color: '#10213A',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  holderSubName: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  inlineBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  disciplineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  disciplineChipText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  miniInfo: {
    width: '48.6%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#F8FBFF',
    padding: 12,
    gap: 6,
  },
  miniInfoIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  miniInfoLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  miniInfoValue: {
    color: '#10213A',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  frontFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  footerValue: {
    marginTop: 3,
    color: '#10213A',
    fontSize: 13,
    fontWeight: '800',
  },
  footerIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  backSectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  backSectionValue: {
    color: '#10213A',
    fontSize: 18,
    fontWeight: '900',
  },
  backSectionMeta: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  detailGrid: {
    gap: 12,
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  detailLineIcon: {
    width: 24,
    height: 24,
    borderRadius: 10,
    backgroundColor: '#F5FAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  detailLineLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailLineValue: {
    marginTop: 4,
    color: '#10213A',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  qrRowWrap: {
    alignItems: 'center',
  },
  qrCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D7E4F1',
    backgroundColor: '#FFFFFF',
    padding: 16,
    alignItems: 'center',
  },
  qrFrame: {
    width: 208,
    height: 208,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D7E4F1',
  },
  qrRow: {
    flexDirection: 'row',
    flex: 1,
  },
  qrCell: {
    width: 8.8,
    height: 8.8,
    margin: 0.7,
    borderRadius: 2,
  },
  qrCellDark: {
    backgroundColor: '#0F172A',
  },
  qrCellLight: {
    backgroundColor: '#FFFFFF',
  },
  qrHint: {
    marginTop: 12,
    color: '#0D5FA8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  qrValue: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailActionGrid: {
    gap: 10,
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
});
