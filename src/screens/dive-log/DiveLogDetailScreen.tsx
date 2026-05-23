import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { useDiveLogStore } from '../../stores/diveLogStore';

export default function DiveLogDetailScreen() {
  const { logId } = useLocalSearchParams<{ logId?: string }>();
  const router = useRouter();
  const log = useDiveLogStore((state) => state.getLogById(String(logId || '')));
  const mediaCount = log?.media.length || 0;
  const tags = log?.tags?.length ? log.tags.join(', ') : '-';
  const entryLocation = log?.entryLocation ? `${log.entryLocation.lat}, ${log.entryLocation.lng}` : '-';
  const exitLocation = log?.exitLocation ? `${log.exitLocation.lat}, ${log.exitLocation.lng}` : '-';

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>DiveLog 상세</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>선택 로그를 확인하고 편집 화면으로 이동할 수 있습니다.</Text>

        <View style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 16 }}>
          <Text style={{ fontWeight: '800', fontSize: 18, color: '#0F172A' }}>{log?.divePointName || '-'}</Text>
          <Text style={{ marginTop: 8, color: '#475569' }}>날짜: {log?.diveDate || '-'}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>최대 수심: {log?.maxDepth ?? '-'}m</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>총 시간: {log?.totalDiveTime ?? '-'}min</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>출처: {log?.sourceType || '-'}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>버디: {log?.buddyName || '-'}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>입수 위치: {entryLocation}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>출수 위치: {exitLocation}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>시야: {log?.visibility ?? '-'}m</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>조류 강도: {log?.currentStrength ?? '-'}kt</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>메모: {log?.memo || '-'}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>공개 범위: {log?.visibilityType || '-'}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>태그: {tags}</Text>
          <Text style={{ marginTop: 4, color: '#475569' }}>미디어: {mediaCount}개</Text>
        </View>

        <TouchableOpacity
          style={{ marginTop: 14, borderRadius: 12, backgroundColor: '#0D5FA8', paddingVertical: 12, alignItems: 'center' }}
          onPress={() => router.push(`/(tabs)/dive-log-edit?logId=${encodeURIComponent(log?.id || '')}` as never)}
          activeOpacity={0.86}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>상세 편집</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
