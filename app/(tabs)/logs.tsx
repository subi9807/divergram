import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { Calendar, Camera, Droplets, Gauge, MapPin, Search, Thermometer, Timer, UserRound, Waves } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { useToast } from '../../src/components/Toast';
import { apiClient } from '../../src/lib/api';
import { buildGoogleStaticMapUrl, isGoogleMapsApiConfigured, reverseGooglePoint, searchGooglePoint, type GooglePointResult } from '../../src/lib/googleMapSearch';

type DiveType = 'scuba' | 'freediving';
type GasType = 'air' | 'nitrox' | 'heliox';

type DiveLogForm = {
  title: string;
  diveType: DiveType;
  gasType: GasType;
  gasPercent: string;
  pointName: string;
  pointAddress: string;
  locationLat: string;
  locationLng: string;
  resortName: string;
  depth: string;
  duration: string;
  temperature: string;
  visibility: string;
  buddy: string;
  notes: string;
  photoUri: string;
};

const initialForm: DiveLogForm = {
  title: '',
  diveType: 'freediving',
  gasType: 'air',
  gasPercent: '',
  pointName: '',
  pointAddress: '',
  locationLat: '',
  locationLng: '',
  resortName: '',
  depth: '',
  duration: '',
  temperature: '',
  visibility: '',
  buddy: '',
  notes: '',
  photoUri: '',
};

function toNumber(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function exifSignedValue(value: number, ref: unknown, positiveRef: string, negativeRef: string) {
  if (typeof ref !== 'string') return value;
  if (ref.toUpperCase() === negativeRef) return -Math.abs(value);
  if (ref.toUpperCase() === positiveRef) return Math.abs(value);
  return value;
}

function parseExifCoordinate(raw: unknown, ref: unknown, positiveRef: string, negativeRef: string): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return exifSignedValue(raw, ref, positiveRef, negativeRef);
  }
  if (Array.isArray(raw) && raw.length >= 3) {
    const d = Number(raw[0]);
    const m = Number(raw[1]);
    const s = Number(raw[2]);
    if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(s)) return null;
    const decimal = d + m / 60 + s / 3600;
    return exifSignedValue(decimal, ref, positiveRef, negativeRef);
  }
  if (typeof raw === 'string') {
    const parts = raw
      .split(/[,\s/]+/)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));
    if (!parts.length) return null;
    if (parts.length === 1) return exifSignedValue(parts[0], ref, positiveRef, negativeRef);
    const d = parts[0];
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    return exifSignedValue(d + m / 60 + s / 3600, ref, positiveRef, negativeRef);
  }
  return null;
}

function parseExifGps(exif: Record<string, unknown> | null | undefined): { lat: number; lng: number } | null {
  if (!exif) return null;
  const lat = parseExifCoordinate(exif.GPSLatitude, exif.GPSLatitudeRef, 'N', 'S');
  const lng = parseExifCoordinate(exif.GPSLongitude, exif.GPSLongitudeRef, 'E', 'W');
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export default function LogsScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DiveLogForm>(initialForm);
  const [pointQuery, setPointQuery] = useState('');
  const [pointSearchPending, setPointSearchPending] = useState(false);
  const [pointSearchError, setPointSearchError] = useState('');
  const [pointResults, setPointResults] = useState<GooglePointResult[]>([]);
  const [resortQuery, setResortQuery] = useState('');
  const [resortFocus, setResortFocus] = useState(false);

  const { data: resorts = [] } = useQuery({ queryKey: ['logs-resorts'], queryFn: apiClient.getResorts });

  const resortCandidates = useMemo(() => {
    const keyword = resortQuery.trim().toLowerCase();
    if (!keyword) return resorts.slice(0, 8);
    return resorts.filter((item: any) => `${item.name || ''} ${item.area || ''}`.toLowerCase().includes(keyword)).slice(0, 8);
  }, [resorts, resortQuery]);

  const needsGasPercent = form.diveType === 'scuba' && form.gasType !== 'air';
  const latNum = toNumber(form.locationLat);
  const lngNum = toNumber(form.locationLng);
  const mapPreview = buildGoogleStaticMapUrl(latNum ?? undefined, lngNum ?? undefined);
  const hasPointLocation = Boolean(form.pointAddress.trim() || form.pointName.trim());
  const canSubmit = Boolean(form.title.trim() && hasPointLocation && (!needsGasPercent || form.gasPercent.trim()));

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.createLog({
        title: form.title.trim(),
        diveType: form.diveType,
        gasType: form.gasType,
        gasPercent: form.gasPercent.trim(),
        location: form.pointAddress.trim() || form.pointName.trim(),
        pointName: form.pointName.trim(),
        depth: form.depth.trim(),
        duration: form.duration.trim(),
        temperature: form.temperature.trim(),
        visibility: form.visibility.trim(),
        buddy: form.buddy.trim(),
        notes: form.notes.trim(),
        resortName: form.resortName.trim(),
        latitude: latNum,
        longitude: lngNum,
        imageUri: form.photoUri || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['logs'] });
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
      await queryClient.invalidateQueries({ queryKey: ['explore'] });
      await queryClient.invalidateQueries({ queryKey: ['location-feed'] });
      setForm(initialForm);
      setPointQuery('');
      setPointResults([]);
      setResortQuery('');
      Alert.alert(t('logsForm.saveSuccessTitle'), t('logsForm.saveSuccessMessage'));
    },
    onError: (error: any) => {
      const msg = String(error?.response?.data?.error || error?.message || '');
      if (msg.includes('gas_percent')) {
        Alert.alert(t('logsForm.saveFailTitle'), t('logsForm.validation.gasPercentRequired'));
        return;
      }
      Alert.alert(t('logsForm.saveFailTitle'), t('logsForm.saveFailMessage'));
    },
  });

  const update = <K extends keyof DiveLogForm>(key: K, value: DiveLogForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const choosePoint = (item: GooglePointResult) => {
    setForm((prev) => ({
      ...prev,
      pointName: prev.pointName.trim() || item.name,
      pointAddress: item.address,
      locationLat: String(item.lat),
      locationLng: String(item.lng),
    }));
    setPointResults([]);
    setPointQuery(item.address);
    setPointSearchError('');
  };

  const runPointSearch = async () => {
    Keyboard.dismiss();
    if (!isGoogleMapsApiConfigured()) {
      const message = t('logsForm.map.apiKeyMissing');
      setPointSearchError(message);
      showToast({ type: 'error', title: message });
      return;
    }
    const keyword = pointQuery.trim();
    if (!keyword) {
      const message = t('logsForm.map.queryRequired');
      setPointSearchError(message);
      showToast({ type: 'info', title: message });
      return;
    }
    setPointSearchPending(true);
    setPointSearchError('');
    setPointResults([]);
    try {
      const rows = await searchGooglePoint(keyword);
      setPointResults(rows);
      if (!rows.length) {
        const message = t('logsForm.map.noResult');
        setPointSearchError(message);
        showToast({ type: 'info', title: message });
      } else {
        showToast({ type: 'success', title: t('logsForm.map.resultFound', { count: rows.length }) });
      }
    } catch {
      const message = t('logsForm.map.searchFailed');
      setPointSearchError(message);
      showToast({ type: 'error', title: message });
    } finally {
      setPointSearchPending(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('logsForm.photo.permissionTitle'), t('logsForm.photo.permissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.95,
      exif: true,
    });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setForm((prev) => ({ ...prev, photoUri: asset.uri || '' }));

    const gps = parseExifGps(asset.exif as Record<string, unknown> | null | undefined);
    if (!gps) {
      Alert.alert(t('logsForm.photo.gpsNotFoundTitle'), t('logsForm.photo.gpsNotFoundMessage'));
      return;
    }

    let address = '';
    try {
      address = await reverseGooglePoint(gps.lat, gps.lng);
    } catch {
      address = '';
    }

    const locationLabel = address || `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`;
    setForm((prev) => ({
      ...prev,
      pointAddress: locationLabel,
      pointName: prev.pointName.trim() || locationLabel.split(',')[0].trim(),
      locationLat: String(gps.lat),
      locationLng: String(gps.lng),
    }));
    setPointQuery(locationLabel);
    Alert.alert(t('logsForm.photo.gpsAppliedTitle'), t('logsForm.photo.gpsAppliedMessage'));
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pb-5 pt-4">
          <Text className="text-2xl font-bold text-surface-900">{t('logsForm.title')}</Text>
          <Text className="mt-1 text-surface-500">{t('logsForm.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          <View className="rounded-3xl bg-brand-700 p-5">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/90">
                <Calendar size={24} color="#0d5fa8" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xl font-bold text-white">{t('logsForm.heroTitle')}</Text>
                <Text className="mt-1 text-blue-100">{t('logsForm.heroSubtitle')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5">
          <Text className="mb-2 text-sm font-semibold text-surface-700">{t('logsForm.fields.titleLabel')}</Text>
          <TextInput
            className="mb-4 rounded-2xl border border-surface-200 bg-white px-4 py-4 text-base text-surface-900"
            placeholder={t('logsForm.fields.titlePlaceholder')}
            placeholderTextColor="#9ca3af"
            value={form.title}
            onChangeText={(value) => update('title', value)}
          />

          <View className="mb-4 rounded-2xl border border-surface-200 bg-white p-4">
            <Text className="mb-3 text-xs font-semibold text-surface-500">{t('logsForm.fields.diveTypeLabel')}</Text>
            <View className="flex-row">
              <ChoiceChip
                active={form.diveType === 'freediving'}
                label={t('logsForm.diveTypes.freediving')}
                onPress={() => update('diveType', 'freediving')}
              />
              <ChoiceChip
                active={form.diveType === 'scuba'}
                label={t('logsForm.diveTypes.scuba')}
                onPress={() => update('diveType', 'scuba')}
              />
            </View>

            {form.diveType === 'scuba' ? (
              <>
                <Text className="mb-2 mt-4 text-xs font-semibold text-surface-500">{t('logsForm.fields.gasTypeLabel')}</Text>
                <View className="flex-row flex-wrap">
                  <ChoiceChip active={form.gasType === 'air'} label={t('logsForm.gasTypes.air')} onPress={() => update('gasType', 'air')} />
                  <ChoiceChip active={form.gasType === 'nitrox'} label={t('logsForm.gasTypes.nitrox')} onPress={() => update('gasType', 'nitrox')} />
                  <ChoiceChip active={form.gasType === 'heliox'} label={t('logsForm.gasTypes.heliox')} onPress={() => update('gasType', 'heliox')} />
                </View>

                {needsGasPercent ? (
                  <View className="mt-3 rounded-xl border border-surface-200 bg-surface-50 px-3 py-2">
                    <Text className="text-xs font-semibold text-surface-500">{t('logsForm.fields.gasPercentLabel')}</Text>
                    <View className="mt-1 flex-row items-center">
                      <Droplets size={15} color="#64748b" />
                      <TextInput
                        className="ml-2 flex-1 py-1 text-base font-semibold text-surface-900"
                        placeholder="32"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={form.gasPercent}
                        onChangeText={(value) => update('gasPercent', value)}
                      />
                      <Text className="text-sm text-surface-500">%</Text>
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          <View className="mb-4 rounded-2xl border border-surface-200 bg-white p-4">
            <Text className="mb-2 text-xs font-semibold text-surface-500">{t('logsForm.fields.pointNameLabel')}</Text>
            <TextInput
              className="mb-3 rounded-xl border border-surface-200 bg-surface-50 px-3 py-3 text-base text-surface-900"
              placeholder={t('logsForm.fields.pointNamePlaceholder')}
              placeholderTextColor="#9ca3af"
              value={form.pointName}
              onChangeText={(value) => update('pointName', value)}
            />

            <Text className="mb-2 text-xs font-semibold text-surface-500">{t('logsForm.fields.pointSearchLabel')}</Text>
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 rounded-xl border border-surface-200 bg-surface-50 px-3 py-3 text-base text-surface-900"
                placeholder={t('logsForm.fields.pointSearchPlaceholder')}
                placeholderTextColor="#9ca3af"
                value={pointQuery}
                onChangeText={setPointQuery}
                onSubmitEditing={runPointSearch}
              />
              <TouchableOpacity
                className="ml-2 h-12 w-12 items-center justify-center rounded-xl bg-brand-600"
                onPress={runPointSearch}
                activeOpacity={0.88}
              >
                {pointSearchPending ? <ActivityIndicator color="#ffffff" /> : <Search size={19} color="#ffffff" />}
              </TouchableOpacity>
            </View>

            {pointSearchError ? <Text className="mt-2 text-xs text-red-500">{pointSearchError}</Text> : null}

            {pointResults.length ? (
              <View className="mt-3 rounded-xl border border-surface-200 bg-surface-50">
                {pointResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.86}
                    onPress={() => choosePoint(item)}
                    className="border-b border-surface-200 px-3 py-3 last:border-b-0"
                  >
                    <Text className="text-sm font-semibold text-surface-900">{item.name}</Text>
                    <Text className="mt-1 text-xs text-surface-500">{item.address}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text className="mb-2 mt-4 text-xs font-semibold text-surface-500">{t('logsForm.fields.selectedPointLabel')}</Text>
            <View className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-3">
              <Text className="text-sm text-surface-700">{form.pointAddress || t('logsForm.fields.selectedPointPlaceholder')}</Text>
              {latNum != null && lngNum != null ? (
                <Text className="mt-1 text-xs text-surface-500">{latNum.toFixed(6)}, {lngNum.toFixed(6)}</Text>
              ) : null}
            </View>

            {mapPreview ? (
              <ExpoImage source={{ uri: mapPreview }} className="mt-3 h-40 w-full rounded-2xl" contentFit="cover" />
            ) : (
              <View className="mt-3 h-24 w-full items-center justify-center rounded-2xl bg-surface-50">
                <MapPin size={22} color="#64748b" />
                <Text className="mt-1 text-xs text-surface-500">{t('logsForm.map.previewPlaceholder')}</Text>
              </View>
            )}
          </View>

          <View className="mb-4 rounded-2xl border border-surface-200 bg-white p-4">
            <Text className="mb-2 text-xs font-semibold text-surface-500">{t('logsForm.fields.resortLabel')}</Text>
            <TextInput
              className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-3 text-base text-surface-900"
              placeholder={t('logsForm.fields.resortPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={resortQuery}
              onFocus={() => setResortFocus(true)}
              onBlur={() => setTimeout(() => setResortFocus(false), 120)}
              onChangeText={(value) => {
                setResortQuery(value);
                update('resortName', value);
              }}
            />

            {resortFocus && resortCandidates.length ? (
              <View className="mt-2 rounded-xl border border-surface-200 bg-surface-50">
                {resortCandidates.map((item: any) => (
                  <TouchableOpacity
                    key={String(item.id)}
                    className="border-b border-surface-200 px-3 py-3 last:border-b-0"
                    onPress={() => {
                      const text = String(item.name || '').trim();
                      setResortQuery(text);
                      update('resortName', text);
                      setResortFocus(false);
                    }}
                  >
                    <Text className="text-sm font-semibold text-surface-900">{item.name}</Text>
                    <Text className="mt-1 text-xs text-surface-500">{item.area}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={pickPhoto}
            className="mb-4 flex-row items-center justify-center rounded-2xl border border-surface-200 bg-white px-4 py-4"
          >
            <Camera size={20} color="#0d5fa8" />
            <Text className="ml-2 font-semibold text-brand-700">{t('logsForm.photo.select')}</Text>
          </TouchableOpacity>

          {form.photoUri ? (
            <View className="mb-4 overflow-hidden rounded-2xl border border-surface-200 bg-white">
              <ExpoImage source={{ uri: form.photoUri }} className="h-56 w-full" contentFit="cover" />
              <View className="px-3 py-2">
                <Text className="text-xs text-surface-500">{t('logsForm.photo.gpsHint')}</Text>
              </View>
            </View>
          ) : null}

          <View className="flex-row flex-wrap -mx-1">
            <FieldCard
              icon={<Gauge size={16} color="#64748b" />}
              label={t('logsForm.fields.depthLabel')}
              value={form.depth}
              placeholder="18"
              suffix="m"
              keyboardType="numeric"
              onChangeText={(value) => update('depth', value)}
            />
            <FieldCard
              icon={<Timer size={16} color="#64748b" />}
              label={t('logsForm.fields.durationLabel')}
              value={form.duration}
              placeholder="45"
              suffix={t('logsForm.units.minute')}
              keyboardType="numeric"
              onChangeText={(value) => update('duration', value)}
            />
            <FieldCard
              icon={<Thermometer size={16} color="#64748b" />}
              label={t('logsForm.fields.temperatureLabel')}
              value={form.temperature}
              placeholder="18"
              suffix="°C"
              keyboardType="numeric"
              onChangeText={(value) => update('temperature', value)}
            />
            <FieldCard
              icon={<Waves size={16} color="#64748b" />}
              label={t('logsForm.fields.visibilityLabel')}
              value={form.visibility}
              placeholder="12"
              suffix="m"
              keyboardType="numeric"
              onChangeText={(value) => update('visibility', value)}
            />
            <FieldCard
              icon={<UserRound size={16} color="#64748b" />}
              label={t('logsForm.fields.buddyLabel')}
              value={form.buddy}
              placeholder={t('logsForm.fields.buddyPlaceholder')}
              keyboardType="default"
              onChangeText={(value) => update('buddy', value)}
            />
          </View>

          <Text className="mb-2 mt-4 text-sm font-semibold text-surface-700">{t('logsForm.fields.notesLabel')}</Text>
          <TextInput
            className="min-h-28 rounded-2xl border border-surface-200 bg-white px-4 py-4 text-base text-surface-900"
            multiline
            textAlignVertical="top"
            placeholder={t('logsForm.fields.notesPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={form.notes}
            onChangeText={(value) => update('notes', value)}
          />

          {!isGoogleMapsApiConfigured() ? (
            <Text className="mt-3 text-xs text-amber-600">{t('logsForm.map.apiKeyGuide')}</Text>
          ) : null}

          <TouchableOpacity
            disabled={!canSubmit || mutation.isPending}
            className={`mt-5 h-14 items-center justify-center rounded-2xl ${canSubmit && !mutation.isPending ? 'bg-brand-600' : 'bg-surface-300'}`}
            onPress={() => mutation.mutate()}
          >
            <Text className="font-semibold text-white">{mutation.isPending ? t('logsForm.buttons.saving') : t('logsForm.buttons.save')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ChoiceChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      className={`mb-2 mr-2 rounded-full px-4 py-2 ${active ? 'bg-brand-600' : 'border border-surface-200 bg-surface-50'}`}
    >
      <Text className={`font-semibold ${active ? 'text-white' : 'text-surface-700'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function FieldCard({
  icon,
  label,
  value,
  placeholder,
  suffix,
  keyboardType = 'numeric',
  onChangeText,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  suffix?: string;
  keyboardType?: 'default' | 'numeric';
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="w-1/2 p-1">
      <View className="rounded-2xl border border-surface-200 bg-white p-3">
        <View className="mb-2 flex-row items-center">
          {icon}
          <Text className="ml-1 text-xs font-semibold text-surface-500">{label}</Text>
        </View>
        <View className="flex-row items-center">
          <TextInput
            className="flex-1 py-1 text-base font-semibold text-surface-900"
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            keyboardType={keyboardType}
            value={value}
            onChangeText={onChangeText}
          />
          {suffix ? <Text className="ml-1 text-sm text-surface-500">{suffix}</Text> : null}
        </View>
      </View>
    </View>
  );
}
