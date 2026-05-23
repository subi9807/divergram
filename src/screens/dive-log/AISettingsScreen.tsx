import React from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { useSettingsStore } from '../../stores/settingsStore';

export default function AISettingsScreen() {
  const aiSummary = useSettingsStore((state) => state.aiSummaryEnabled);
  const aiPointRecommend = useSettingsStore((state) => state.aiPointRecommendEnabled);
  const aiCaption = useSettingsStore((state) => state.aiCaptionEnabled);
  const aiRiskDescription = useSettingsStore((state) => state.aiRiskDescriptionEnabled);
  const updateAiSetting = useSettingsStore((state) => state.updateAiSetting);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>AI 설정</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>OpenAI 기반 요약/추천 기능의 사용 여부를 설정합니다.</Text>

        <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', paddingHorizontal: 14 }}>
          <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#334155' }}>AI 로그 요약</Text>
            <Switch
              value={aiSummary}
              onValueChange={(value) => updateAiSetting('aiSummaryEnabled', value)}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
            />
          </View>
          <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#334155' }}>AI 포인트 추천</Text>
            <Switch
              value={aiPointRecommend}
              onValueChange={(value) => updateAiSetting('aiPointRecommendEnabled', value)}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
            />
          </View>
          <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#334155' }}>AI 캡션 추천</Text>
            <Switch
              value={aiCaption}
              onValueChange={(value) => updateAiSetting('aiCaptionEnabled', value)}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
            />
          </View>
          <View style={{ paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#334155' }}>AI 위험도 설명</Text>
            <Switch
              value={aiRiskDescription}
              onValueChange={(value) => updateAiSetting('aiRiskDescriptionEnabled', value)}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
