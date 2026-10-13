import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { mockDivePoints } from '../../mock/divergramExpansionMock';
import type { DivePoint, MarineWeather } from '../../models';
import { generateMarineRiskDescription } from '../../services/aiService';
import { getDivePoints } from '../../services/googleMapService';
import { getMarineWeatherByLatLng } from '../../services/stormglassService';
import { useIntegrationStore } from '../../stores/integrationStore';
import { type MarineWeatherLocation, useSettingsFeatureStore } from '../../stores/settingsFeatureStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTranslation } from 'react-i18next';

const NEARBY_SEA_LIMIT_KM = 10;

const riskColorMap: Record<MarineWeather['riskLevel'], string> = {
  good: '#166534',
  normal: '#0D5FA8',
  caution: '#D97706',
  danger: '#DC2626',
};

function toLocation(point: DivePoint): MarineWeatherLocation {
  return {
    id: point.id,
    name: point.name,
    latitude: point.lat,
    longitude: point.lng,
    region: point.region || point.address,
  };
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MarineWeatherScreen() {
  const { t, i18n } = useTranslation();
  const savedLocations = useSettingsFeatureStore((state) => state.marineWeatherLocations);
  const addLocation = useSettingsFeatureStore((state) => state.addMarineWeatherLocation);
  const removeLocation = useSettingsFeatureStore((state) => state.removeMarineWeatherLocation);
  const [availablePoints, setAvailablePoints] = useState<DivePoint[]>(mockDivePoints);
  const [selectedLocation, setSelectedLocation] = useState<MarineWeatherLocation | null>(savedLocations[0] || null);
  const [nearbySea, setNearbySea] = useState<(MarineWeatherLocation & { distanceKm: number }) | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<MarineWeather | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [aiRiskSummary, setAiRiskSummary] = useState('');
  const updateIntegration = useIntegrationStore((state) => state.updateIntegration);
  const aiRiskDescriptionEnabled = useSettingsStore((state) => state.aiRiskDescriptionEnabled);

  useEffect(() => {
    let cancelled = false;
    void getDivePoints().then((points) => {
      if (cancelled) return;
      const merged = [...points, ...mockDivePoints].filter((point, index, rows) =>
        Number.isFinite(point.lat) && Number.isFinite(point.lng)
        && !(point.lat === 0 && point.lng === 0)
        && rows.findIndex((item) => item.id === point.id) === index
      );
      setAvailablePoints(merged);

      void Location.requestForegroundPermissionsAsync().then((permission) => {
        if (permission.status !== 'granted' || cancelled) return;
        void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((position) => {
          if (cancelled) return;
          const nearest = merged
            .map((point) => ({ ...toLocation(point), distanceKm: distanceKm(
              position.coords.latitude,
              position.coords.longitude,
              point.lat,
              point.lng
            ) }))
            .sort((a, b) => a.distanceKm - b.distanceKm)[0];
          setNearbySea(nearest && nearest.distanceKm <= NEARBY_SEA_LIMIT_KM ? nearest : null);
        }).catch(() => undefined);
      }).catch(() => undefined);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedLocation && savedLocations.some((item) => item.id === selectedLocation.id)) return;
    setSelectedLocation(savedLocations[0] || nearbySea || null);
  }, [nearbySea, savedLocations, selectedLocation]);

  const loadWeather = useCallback(async (location: MarineWeatherLocation) => {
    setLoading(true);
    setErrorText(null);
    try {
      const res = await getMarineWeatherByLatLng(location.latitude, location.longitude);
      setWeather(res ? { ...res, pointId: location.id } : null);
      if (!res) {
        setErrorText(t('marineWeather.noData'));
        updateIntegration('stormglass', { connected: false, statusMessage: t('marineWeather.integration.noData') });
      } else {
        updateIntegration('stormglass', {
          connected: res.source === 'stormglass',
          statusMessage: res.source === 'stormglass' ? t('marineWeather.integration.live') : res.source === 'cache' ? t('marineWeather.integration.cache') : t('marineWeather.noData'),
          lastSyncAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      setWeather(null);
      setErrorText(String(error));
      updateIntegration('stormglass', { connected: false, statusMessage: t('marineWeather.integration.error', { error: String(error) }) });
    } finally {
      setLoading(false);
    }
  }, [t, updateIntegration]);

  useEffect(() => {
    if (!selectedLocation) {
      setWeather(null);
      return;
    }
    void loadWeather(selectedLocation);
  }, [loadWeather, selectedLocation]);

  useEffect(() => {
    let cancelled = false;
    if (!weather) {
      setAiRiskSummary('');
      return () => {
        cancelled = true;
      };
    }
    if (!aiRiskDescriptionEnabled || weather.source === 'none') {
      setAiRiskSummary(weather.summary || '');
      return () => {
        cancelled = true;
      };
    }
    const locale = i18n.resolvedLanguage || i18n.language || 'en';
    const fallback = t('marineWeather.aiFallback', { wave: weather.waveHeightM ?? '-', current: weather.currentSpeedKnot ?? '-' });
    void generateMarineRiskDescription(weather, locale, fallback).then((text) => {
      if (!cancelled) setAiRiskSummary(text || weather.summary || '');
    });
    return () => {
      cancelled = true;
    };
  }, [weather, aiRiskDescriptionEnabled, i18n.language, i18n.resolvedLanguage, t]);

  const observedAgeMinutes = useMemo(() => {
    if (!weather?.observedAt) return null;
    const observed = Date.parse(weather.observedAt);
    if (!Number.isFinite(observed)) return null;
    return Math.max(0, Math.round((Date.now() - observed) / 60000));
  }, [weather?.observedAt]);

  const observedFreshnessKey = observedAgeMinutes == null
    ? 'unknown'
    : observedAgeMinutes < 180 ? 'latest' : observedAgeMinutes < 720 ? 'normal' : 'delayed';
  const observedFreshnessLabel = t(`marineWeather.fresh.${observedFreshnessKey}`);
  const addablePoints = availablePoints.filter((point) => !savedLocations.some((item) => item.id === point.id));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>{t('marineWeather.title')}</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>{t('marineWeather.description')}</Text>

        {nearbySea ? (
          <TouchableOpacity
            onPress={() => setSelectedLocation(nearbySea)}
            style={{ marginTop: 18, borderRadius: 16, backgroundColor: '#EAF7FF', padding: 15, flexDirection: 'row', alignItems: 'center' }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#0D5FA8', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="navigate" size={20} color="#fff" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>{t('marineWeather.nearby')}</Text>
              <Text style={{ marginTop: 3, color: '#334155', fontWeight: '700' }}>{nearbySea.name} · {nearbySea.distanceKm.toFixed(1)}km</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#0D5FA8" />
          </TouchableOpacity>
        ) : null}

        <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#0F172A', fontSize: 17, fontWeight: '800' }}>{t('marineWeather.locations')}</Text>
          <TouchableOpacity
            onPress={() => setShowLocationPicker(true)}
            style={{ borderRadius: 999, backgroundColor: '#0D5FA8', paddingHorizontal: 13, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="add" size={17} color="#fff" />
            <Text style={{ marginLeft: 3, color: '#fff', fontWeight: '800' }}>{t('marineWeather.add')}</Text>
          </TouchableOpacity>
        </View>

        {savedLocations.length ? (
          <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {savedLocations.map((location) => (
              <TouchableOpacity
                key={location.id}
                onPress={() => setSelectedLocation(location)}
                style={{ borderRadius: 999, borderWidth: 1, borderColor: selectedLocation?.id === location.id ? '#0D5FA8' : '#CBD5E1', backgroundColor: selectedLocation?.id === location.id ? '#EAF4FF' : '#fff', paddingLeft: 14, paddingRight: 8, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}
              >
                <Text style={{ color: selectedLocation?.id === location.id ? '#0D5FA8' : '#334155', fontWeight: '700' }}>{location.name}</Text>
                <TouchableOpacity
                  accessibilityLabel={t('marineWeather.remove', { name: location.name })}
                  onPress={() => removeLocation(location.id)}
                  hitSlop={8}
                  style={{ marginLeft: 7 }}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={{ marginTop: 12, color: '#94A3B8' }}>{t('marineWeather.emptyLocations')}</Text>
        )}

        <View style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 16 }}>
          {selectedLocation ? <Text style={{ marginBottom: 10, color: '#0F172A', fontSize: 18, fontWeight: '800' }}>{selectedLocation.name}</Text> : null}
          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 30 }}>
              <ActivityIndicator color="#0D5FA8" />
              <Text style={{ marginTop: 10, color: '#64748B' }}>{t('marineWeather.loading')}</Text>
            </View>
          ) : !selectedLocation ? (
            <Text style={{ color: '#64748B' }}>{t('marineWeather.selectLocation')}</Text>
          ) : errorText ? (
            <Text style={{ color: '#DC2626' }}>{errorText}</Text>
          ) : weather ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>{t('marineWeather.today')}</Text>
                <Text style={{ color: riskColorMap[weather.riskLevel], fontWeight: '800' }}>{t(`marineWeather.risk.${weather.riskLevel}`)}</Text>
              </View>
              {typeof weather.recommendationScore === 'number' ? <Text style={{ marginTop: 4, color: '#334155', fontWeight: '700' }}>{t('marineWeather.recommendation', { score: Math.round(weather.recommendationScore) })}</Text> : null}
              {typeof weather.dataCompletenessScore === 'number' ? <Text style={{ marginTop: 2, color: '#64748B', fontSize: 12 }}>{t('marineWeather.dataQuality', { score: Math.round(weather.dataCompletenessScore), confidence: t(`marineWeather.confidence.${weather.riskConfidence || 'low'}`) })}</Text> : null}
              <Text style={{ marginTop: 2, color: observedFreshnessKey === 'delayed' ? '#B91C1C' : '#64748B', fontSize: 12 }}>{t('marineWeather.freshness', { status: observedFreshnessLabel })}{observedAgeMinutes != null ? ` (${t('marineWeather.minutesAgo', { minutes: observedAgeMinutes })})` : ''}</Text>
              <Text style={{ marginTop: 4, color: weather.diveAllowed ? '#166534' : '#B91C1C', fontWeight: '700' }}>{t('marineWeather.diveAdvice', { status: t(weather.diveAllowed ? 'marineWeather.allowed' : 'marineWeather.notRecommended') })}</Text>
              {!weather.diveAllowed && weather.noDiveReason ? <Text style={{ marginTop: 3, color: '#7F1D1D' }}>{weather.noDiveReason}</Text> : null}
              {weather.bestDiveTimeIso ? <Text style={{ marginTop: 4, color: '#0D5FA8', fontWeight: '700' }}>{t('marineWeather.bestTime', { time: weather.bestDiveTimeIso.slice(11, 16) })}{typeof weather.bestDiveScore === 'number' ? ` (${t('marineWeather.score', { score: Math.round(weather.bestDiveScore) })})` : ''}</Text> : null}
              {weather.bestDiveWindowStartIso && weather.bestDiveWindowEndIso ? <Text style={{ marginTop: 4, color: '#0D5FA8' }}>{t('marineWeather.bestWindow', { start: weather.bestDiveWindowStartIso.slice(11, 16), end: weather.bestDiveWindowEndIso.slice(11, 16) })}</Text> : null}
              <Text style={{ marginTop: 6, color: '#64748B' }}>{t('marineWeather.source', { source: weather.source })}</Text>
              <Text style={{ marginTop: 10, color: '#334155' }}>{t('marineWeather.wave', { value: weather.waveHeightM ?? '-' })}</Text>
              <Text style={{ marginTop: 4, color: '#334155' }}>{t('marineWeather.current', { value: weather.currentSpeedKnot ?? '-' })}</Text>
              <Text style={{ marginTop: 4, color: '#334155' }}>{t('marineWeather.temperature', { value: weather.waterTempC ?? '-' })}</Text>
              <Text style={{ marginTop: 4, color: '#334155' }}>{t('marineWeather.visibility', { value: weather.visibilityM ?? '-' })}</Text>
              <Text style={{ marginTop: 4, color: '#334155' }}>{t('marineWeather.wind', { value: weather.windSpeedMps ?? '-' })}</Text>
              <Text style={{ marginTop: 10, color: '#64748B' }}>{aiRiskSummary || weather.summary}</Text>
              {weather.beginnerWarning ? <View style={{ marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FCD34D', backgroundColor: '#FFFBEB', padding: 10 }}><Text style={{ color: '#92400E', fontWeight: '700' }}>{t('marineWeather.beginnerWarning')}</Text><Text style={{ marginTop: 4, color: '#92400E' }}>{weather.beginnerWarning}</Text></View> : null}
              {weather.warnings?.length ? <View style={{ marginTop: 10 }}><Text style={{ color: '#0F172A', fontWeight: '700' }}>{t('marineWeather.warnings')}</Text>{weather.warnings.slice(0, 4).map((row) => <Text key={row} style={{ marginTop: 4, color: '#7C2D12' }}>• {row}</Text>)}</View> : null}
              {weather.hourly?.length ? <View style={{ marginTop: 12 }}><Text style={{ color: '#0F172A', fontWeight: '700' }}>{t('marineWeather.hourly')}</Text>{weather.hourly.slice(0, 6).map((hour) => <View key={hour.timeIso} style={{ marginTop: 7, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#64748B', flex: 1 }}>{hour.timeIso.slice(11, 16)}</Text><Text style={{ color: '#334155', flex: 2 }}>{t('marineWeather.hourRow', { wave: hour.waveHeightM ?? '-', current: hour.currentSpeedKnot ?? '-', status: t(hour.diveAllowed ? 'marineWeather.allowed' : 'marineWeather.risk.caution') })}</Text></View>)}</View> : null}
            </>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={showLocationPicker} transparent animationType="slide" onRequestClose={() => setShowLocationPicker(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.35)' }}>
          <View style={{ maxHeight: '72%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#fff', padding: 20, paddingBottom: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View><Text style={{ color: '#0F172A', fontSize: 20, fontWeight: '800' }}>{t('marineWeather.pickerTitle')}</Text><Text style={{ marginTop: 4, color: '#64748B' }}>{t('marineWeather.pickerDescription')}</Text></View>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)} hitSlop={10}><Ionicons name="close" size={25} color="#334155" /></TouchableOpacity>
            </View>
            <ScrollView style={{ marginTop: 16 }}>
              {addablePoints.length ? addablePoints.map((point) => (
                <TouchableOpacity
                  key={point.id}
                  onPress={() => {
                    const location = toLocation(point);
                    addLocation(location);
                    setSelectedLocation(location);
                    setShowLocationPicker(false);
                  }}
                  style={{ borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Ionicons name="water-outline" size={22} color="#0D5FA8" />
                  <View style={{ marginLeft: 12, flex: 1 }}><Text style={{ color: '#0F172A', fontWeight: '800' }}>{point.name}</Text>{point.region || point.address ? <Text style={{ marginTop: 3, color: '#64748B' }}>{point.region || point.address}</Text> : null}</View>
                  <Ionicons name="add-circle-outline" size={23} color="#0D5FA8" />
                </TouchableOpacity>
              )) : <Text style={{ paddingVertical: 24, textAlign: 'center', color: '#64748B' }}>{t('marineWeather.noAddable')}</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
