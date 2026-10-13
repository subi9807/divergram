import React, { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../lib/api';

export function VoiceMemoInput({ onAccept }: { onAccept: (text: string) => void }) {
  const { t } = useTranslation();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [audioUri, setAudioUri] = useState('');
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const start = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return Alert.alert(t('voiceMemo.permissionTitle'), t('voiceMemo.permissionMessage'));
    setTranscript(''); setAudioUri('');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync(); recorder.record({ forDuration: 180 });
  };
  const stop = async () => { await recorder.stop(); setAudioUri(recorder.uri || ''); await setAudioModeAsync({ allowsRecording: false }); };
  const transcribe = () => Alert.alert(t('voiceMemo.consentTitle'), t('voiceMemo.consentMessage'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('voiceMemo.transcribe'), onPress: async () => { if (!audioUri) return; setTranscribing(true); try { setTranscript((await apiClient.transcribeDiveVoice(audioUri)).transcript); } catch { Alert.alert(t('voiceMemo.failedTitle'), t('voiceMemo.failed')); } finally { setTranscribing(false); } } },
  ]);
  return <View style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: '#cbd5e1', padding: 12, gap: 9 }}>
    <Text style={{ color: '#0f172a', fontWeight: '800' }}>{t('voiceMemo.title')}</Text><Text style={{ color: '#64748b', fontSize: 12 }}>{t('voiceMemo.guide')}</Text>
    <TouchableOpacity accessibilityRole="button" onPress={state.isRecording ? stop : start} style={{ minHeight: 44, borderRadius: 12, backgroundColor: state.isRecording ? '#b91c1c' : '#0d5fa8', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{state.isRecording ? t('voiceMemo.stop', { seconds: Math.round(state.durationMillis / 1000) }) : t('voiceMemo.record')}</Text></TouchableOpacity>
    {audioUri && !state.isRecording ? <TouchableOpacity accessibilityRole="button" disabled={transcribing} onPress={transcribe}><Text style={{ color: '#7c3aed', fontWeight: '700' }}>{transcribing ? t('voiceMemo.transcribing') : t('voiceMemo.transcribe')}</Text></TouchableOpacity> : null}
    {transcript ? <><TextInput accessibilityLabel={t('voiceMemo.transcript')} multiline value={transcript} onChangeText={setTranscript} style={{ minHeight: 90, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10 }} /><TouchableOpacity accessibilityRole="button" onPress={() => onAccept(transcript)}><Text style={{ color: '#0f766e', fontWeight: '800' }}>{t('voiceMemo.addMemo')}</Text></TouchableOpacity></> : null}
  </View>;
}
