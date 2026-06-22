import React from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/Screen';
import { useSettingsStore } from '../../stores/settingsStore';
import { loadAiSettings, saveAiSettings } from '../../services/aiSettingsService';

export default function AISettingsScreen() {
  const queryClient = useQueryClient();
  const aiSummary = useSettingsStore((state) => state.aiSummaryEnabled);
  const aiPointRecommend = useSettingsStore((state) => state.aiPointRecommendEnabled);
  const aiCaption = useSettingsStore((state) => state.aiCaptionEnabled);
  const aiRiskDescription = useSettingsStore((state) => state.aiRiskDescriptionEnabled);
  const syncQuery = useQuery({
    queryKey: ['ai-settings'],
    queryFn: loadAiSettings,
  });
  const saveMutation = useMutation({
    mutationFn: saveAiSettings,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      if (result.source === 'backend') {
        await queryClient.setQueryData(['ai-settings'], result);
      }
    },
  });

  const syncSource = saveMutation.data?.source || syncQuery.data?.source || 'local';
  const syncReason = saveMutation.data?.reason || syncQuery.data?.reason || '';
  const syncLabel = syncSource === 'backend' ? '백엔드 동기화' : '로컬 fallback';

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>AI 설정</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>OpenAI 기반 요약/추천 기능의 사용 여부를 설정합니다.</Text>
        <Text style={{ marginTop: 6, color: syncSource === 'backend' ? '#0F766E' : '#B45309', fontSize: 12, fontWeight: '700' }}>
          저장 경로: {syncLabel}{syncReason ? ` (${syncReason})` : ''}
        </Text>

        <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', paddingHorizontal: 14 }}>
          <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#334155' }}>AI 로그 요약</Text>
            <Switch
              value={aiSummary}
              onValueChange={(value) => saveMutation.mutate({ aiSummaryEnabled: value })}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
              disabled={saveMutation.isPending}
            />
          </View>
          <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#334155' }}>AI 포인트 추천</Text>
            <Switch
              value={aiPointRecommend}
              onValueChange={(value) => saveMutation.mutate({ aiPointRecommendEnabled: value })}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
              disabled={saveMutation.isPending}
            />
          </View>
          <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#334155' }}>AI 캡션 추천</Text>
            <Switch
              value={aiCaption}
              onValueChange={(value) => saveMutation.mutate({ aiCaptionEnabled: value })}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
              disabled={saveMutation.isPending}
            />
          </View>
          <View style={{ paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#334155' }}>AI 위험도 설명</Text>
            <Switch
              value={aiRiskDescription}
              onValueChange={(value) => saveMutation.mutate({ aiRiskDescriptionEnabled: value })}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
              disabled={saveMutation.isPending}
            />
          </View>
        </View>
        {(syncQuery.isLoading || saveMutation.isPending) ? (
          <View style={{ marginTop: 14, alignItems: 'center' }}>
            <ActivityIndicator color="#0D5FA8" />
            <Text style={{ marginTop: 6, color: '#64748B', fontSize: 12 }}>설정을 동기화하는 중입니다.</Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
