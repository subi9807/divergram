import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { mockDivePoints } from '../../mock/divergramExpansionMock';
import type { MarineWeather } from '../../models';
import { generateMarineRiskDescription } from '../../services/aiService';
import { getMarineWeatherByPoint } from '../../services/stormglassService';
import { useIntegrationStore } from '../../stores/integrationStore';
import { useSettingsStore } from '../../stores/settingsStore';

const riskLabelMap: Record<MarineWeather['riskLevel'], string> = {
  good: '좋음',
  normal: '보통',
  caution: '주의',
  danger: '위험',
};

const riskColorMap: Record<MarineWeather['riskLevel'], string> = {
  good: '#166534',
  normal: '#0D5FA8',
  caution: '#D97706',
  danger: '#DC2626',
};

const confidenceLabelMap: Record<NonNullable<MarineWeather['riskConfidence']>, string> = {
  high: '높음',
  medium: '중간',
  low: '낮음',
};

export default function MarineWeatherScreen() {
  const [selectedPointId, setSelectedPointId] = useState(mockDivePoints[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<MarineWeather | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [aiRiskSummary, setAiRiskSummary] = useState('');
  const updateIntegration = useIntegrationStore((state) => state.updateIntegration);
  const aiRiskDescriptionEnabled = useSettingsStore((state) => state.aiRiskDescriptionEnabled);

  const loadWeather = useCallback(async (pointId: string) => {
    setLoading(true);
    setErrorText(null);
    try {
      const res = await getMarineWeatherByPoint(pointId);
      setWeather(res);
      if (!res) {
        setErrorText('해양 정보 없음');
        updateIntegration('stormglass', { connected: false, statusMessage: '데이터 없음' });
      } else {
        updateIntegration('stormglass', {
          connected: res.source === 'stormglass',
          statusMessage: res.source === 'stormglass' ? '실시간 조회됨' : res.source === 'cache' ? '캐시 데이터 사용' : '해양 정보 없음',
          lastSyncAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      setWeather(null);
      setErrorText(String(error));
      updateIntegration('stormglass', { connected: false, statusMessage: `오류: ${String(error)}` });
    } finally {
      setLoading(false);
    }
  }, [updateIntegration]);

  useEffect(() => {
    if (!selectedPointId) return;
    loadWeather(selectedPointId);
  }, [loadWeather, selectedPointId]);

  useEffect(() => {
    let cancelled = false;
    if (!weather) {
      setAiRiskSummary('');
      return () => {
        cancelled = true;
      };
    }
    if (!aiRiskDescriptionEnabled) {
      setAiRiskSummary(weather.summary || '');
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const text = await generateMarineRiskDescription(weather);
      if (!cancelled) setAiRiskSummary(text || weather.summary || '');
    })();

    return () => {
      cancelled = true;
    };
  }, [weather, aiRiskDescriptionEnabled]);

  const observedAgeMinutes = useMemo(() => {
    if (!weather?.observedAt) return null;
    const observed = Date.parse(weather.observedAt);
    if (!Number.isFinite(observed)) return null;
    const diff = Math.max(0, Math.round((Date.now() - observed) / 60000));
    return diff;
  }, [weather?.observedAt]);

  const observedFreshnessLabel = useMemo(() => {
    if (observedAgeMinutes == null) return '확인 불가';
    if (observedAgeMinutes < 180) return '최신';
    if (observedAgeMinutes < 720) return '보통';
    return '지연';
  }, [observedAgeMinutes]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>해양 날씨</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>Stormglass 기반 파고/조류/수온 데이터를 조회합니다.</Text>

        <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {mockDivePoints.map((point) => (
            <TouchableOpacity
              key={point.id}
              onPress={() => setSelectedPointId(point.id)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: selectedPointId === point.id ? '#0D5FA8' : '#CBD5E1',
                backgroundColor: selectedPointId === point.id ? '#EAF4FF' : '#fff',
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: selectedPointId === point.id ? '#0D5FA8' : '#334155', fontWeight: '700' }}>{point.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 16 }}>
          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 30 }}>
              <ActivityIndicator color="#0D5FA8" />
              <Text style={{ marginTop: 10, color: '#64748B' }}>해양 정보를 불러오는 중...</Text>
            </View>
          ) : errorText ? (
            <Text style={{ color: '#DC2626' }}>{errorText}</Text>
          ) : weather ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>오늘의 상태</Text>
                <Text style={{ color: riskColorMap[weather.riskLevel], fontWeight: '800' }}>{riskLabelMap[weather.riskLevel]}</Text>
              </View>
              {typeof weather.recommendationScore === 'number' ? (
                <Text style={{ marginTop: 4, color: '#334155', fontWeight: '700' }}>
                  추천도: {Math.round(weather.recommendationScore)} / 100
                </Text>
              ) : null}
              {typeof weather.dataCompletenessScore === 'number' ? (
                <Text style={{ marginTop: 2, color: '#64748B', fontSize: 12 }}>
                  데이터 완성도: {Math.round(weather.dataCompletenessScore)}% · 신뢰도: {confidenceLabelMap[weather.riskConfidence || 'low']}
                </Text>
              ) : null}
              <Text style={{ marginTop: 2, color: observedFreshnessLabel === '지연' ? '#B91C1C' : '#64748B', fontSize: 12 }}>
                관측 신선도: {observedFreshnessLabel}
                {observedAgeMinutes != null ? ` (${observedAgeMinutes}분 전)` : ''}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  color: weather.diveAllowed ? '#166534' : '#B91C1C',
                  fontWeight: '700',
                }}
              >
                입수 권장: {weather.diveAllowed ? '가능' : '주의/비권장'}
              </Text>
              {!weather.diveAllowed && weather.noDiveReason ? (
                <Text style={{ marginTop: 3, color: '#7F1D1D' }}>{weather.noDiveReason}</Text>
              ) : null}
              {weather.bestDiveTimeIso ? (
                <Text style={{ marginTop: 4, color: '#0D5FA8', fontWeight: '700' }}>
                  추천 입수 시간: {weather.bestDiveTimeIso.slice(11, 16)}
                  {typeof weather.bestDiveScore === 'number' ? ` (점수 ${Math.round(weather.bestDiveScore)})` : ''}
                </Text>
              ) : null}
              {weather.bestDiveWindowStartIso && weather.bestDiveWindowEndIso ? (
                <Text style={{ marginTop: 4, color: '#0D5FA8' }}>
                  추천 시간대: {weather.bestDiveWindowStartIso.slice(11, 16)} ~ {weather.bestDiveWindowEndIso.slice(11, 16)}
                </Text>
              ) : null}
              <Text style={{ marginTop: 6, color: '#64748B' }}>데이터 소스: {weather.source}</Text>
              <Text style={{ marginTop: 10, color: '#334155' }}>파고: {weather.waveHeightM ?? '-'}m</Text>
              <Text style={{ marginTop: 4, color: '#334155' }}>조류 속도: {weather.currentSpeedKnot ?? '-'} knot</Text>
              <Text style={{ marginTop: 4, color: '#334155' }}>수온: {weather.waterTempC ?? '-'}℃</Text>
              <Text style={{ marginTop: 4, color: '#334155' }}>시야: {weather.visibilityM ?? '-'}m</Text>
              <Text style={{ marginTop: 4, color: '#334155' }}>풍속: {weather.windSpeedMps ?? '-'} m/s</Text>
              <Text style={{ marginTop: 10, color: '#64748B' }}>{aiRiskSummary || weather.summary}</Text>
              {weather.beginnerWarning ? (
                <View style={{ marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FCD34D', backgroundColor: '#FFFBEB', padding: 10 }}>
                  <Text style={{ color: '#92400E', fontWeight: '700' }}>초보자 경고</Text>
                  <Text style={{ marginTop: 4, color: '#92400E' }}>{weather.beginnerWarning}</Text>
                </View>
              ) : null}
              {weather.warnings?.length ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ color: '#0F172A', fontWeight: '700' }}>주의 항목</Text>
                  {weather.warnings.slice(0, 4).map((row) => (
                    <Text key={row} style={{ marginTop: 4, color: '#7C2D12' }}>
                      • {row}
                    </Text>
                  ))}
                </View>
              ) : null}

              {weather.hourly?.length ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: '#0F172A', fontWeight: '700' }}>시간대별 상태 (최대 12시간)</Text>
                  {weather.hourly.slice(0, 6).map((hour) => (
                    <View key={hour.timeIso} style={{ marginTop: 7, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#64748B', flex: 1 }}>{hour.timeIso.slice(11, 16)}</Text>
                      <Text style={{ color: '#334155', flex: 2 }}>
                        파고 {hour.waveHeightM ?? '-'}m / 조류 {hour.currentSpeedKnot ?? '-'}kt / {hour.diveAllowed ? '가능' : '주의'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
