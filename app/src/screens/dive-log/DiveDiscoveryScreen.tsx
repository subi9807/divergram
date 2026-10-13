import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Image as ExpoImage } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Eye, Fish, Play, Plus, Search as SearchIcon, Share2, Sparkles, Trash2, Video, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { apiClient, type MarineSpeciesSearchItem } from '../../lib/api';
import { uploadImage, uploadVideo } from '../../services/cloudinaryService';
import { buildDiveInsights, buildMarineLifeCollection, calculateDiveStatistics, parseDiveSearchQuery, searchDiveLogs } from '../../services/diveDiscovery';
import { useDiveLogStore } from '../../stores/diveLogStore';
import { buildShareUrl } from '../../lib/shareLinks';

type DiscoveryTab = 'collection' | 'species' | 'statistics' | 'search' | 'insights';
type AnalysisFrame = { uri: string; fileName: string; mimeType: string };
type PickedMedia = { uri: string; fileName: string; mimeType: string; type: 'image' | 'video'; previewUri: string; analysisFrames: AnalysisFrame[] };
type CandidateDetail = { name: string; category: string; scientificName: string; summary: string; habitat: string; identificationTips: string[] };
type ItemVisibility = 'inherit' | 'public' | 'followers' | 'private';

function formatMetric(value: number | null, digits = 1) {
  return value == null ? '-' : Number(value.toFixed(digits)).toLocaleString();
}

function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function errorCode(error: any) {
  return String(error?.response?.data?.error || error?.message || '');
}

export default function DiveDiscoveryScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { sightingId = '' } = useLocalSearchParams<{ sightingId?: string }>();
  const logs = useDiveLogStore(state => state.logs);
  const [tab, setTab] = useState<DiscoveryTab>('collection');
  const [query, setQuery] = useState('');
  const [speciesInput, setSpeciesInput] = useState('');
  const [speciesSearchTerm, setSpeciesSearchTerm] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [photo, setPhoto] = useState<PickedMedia | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [analysisId, setAnalysisId] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidateDetails, setCandidateDetails] = useState<CandidateDetail[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [manualName, setManualName] = useState('');
  const [observedAt, setObservedAt] = useState(todayLocal());
  const [locationName, setLocationName] = useState('');
  const [notes, setNotes] = useState('');
  const [visibilityType, setVisibilityType] = useState<ItemVisibility>('inherit');
  const [processing, setProcessing] = useState(false);

  const sightingsQuery = useQuery({
    queryKey: ['marine-life-sightings'],
    queryFn: apiClient.getMarineLifeSightings,
  });
  const allowanceQuery = useQuery({ queryKey: ['marine-ai-allowance'], queryFn: apiClient.getMarineAiAllowance });
  const sightings = useMemo(() => sightingsQuery.data || [], [sightingsQuery.data]);
  const displayedSightings = useMemo(() => {
    if (!sightingId) return sightings;
    return [...sightings].sort((left, right) => Number(String(right.id) === String(sightingId)) - Number(String(left.id) === String(sightingId)));
  }, [sightingId, sightings]);
  const visibilityQuery = useQuery({ queryKey: ['content-visibility'], queryFn: apiClient.getMyContentVisibility });
  const speciesQuery = useQuery({
    queryKey: ['marine-species-search', speciesSearchTerm, i18n.resolvedLanguage || i18n.language],
    queryFn: () => apiClient.searchMarineSpecies(speciesSearchTerm, i18n.resolvedLanguage || i18n.language),
    enabled: speciesSearchTerm.length >= 2,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  const collection = useMemo(() => buildMarineLifeCollection(logs), [logs]);
  const statistics = useMemo(() => calculateDiveStatistics(logs), [logs]);
  const insights = useMemo(() => buildDiveInsights(logs), [logs]);
  const filters = useMemo(() => parseDiveSearchQuery(query), [query]);
  const results = useMemo(() => query.trim() ? searchDiveLogs(logs, filters) : [], [filters, logs, query]);
  const tabs: DiscoveryTab[] = ['collection', 'species', 'statistics', 'search', 'insights'];
  const selectedDetails = candidateDetails.find(item => item.name.toLocaleLowerCase() === selectedName.toLocaleLowerCase());
  const submitSpeciesSearch = () => {
    const normalized = speciesInput.trim().replace(/\s+/g, ' ');
    if (normalized.length < 2) return;
    setSpeciesSearchTerm(normalized);
  };

  const resetEditor = () => {
    setPhoto(null);
    setImageUrl('');
    setMediaUrl('');
    setAnalysisId('');
    setCandidates([]);
    setCandidateDetails([]);
    setSelectedName('');
    setManualName('');
    setObservedAt(todayLocal());
    setLocationName('');
    setNotes('');
    setVisibilityType('inherit');
    setProcessing(false);
  };

  const closeEditor = () => {
    if (processing) return;
    setEditorOpen(false);
    resetEditor();
  };

  const processPhoto = async (picked: PickedMedia, analyze: boolean) => {
    setProcessing(true);
    setCandidates([]);
    setCandidateDetails([]);
    setSelectedName('');
    setAnalysisId('');
    try {
      const originalUpload = picked.type === 'video' ? uploadVideo(picked.uri) : uploadImage(picked.uri);
      const previewUpload = picked.type === 'video' ? uploadImage(picked.previewUri) : originalUpload;
      const [uploaded, preview, analysis] = await Promise.all([
        originalUpload,
        previewUpload,
        analyze ? apiClient.analyzeMarineLifePhoto(
          picked.analysisFrames[0].uri,
          picked.analysisFrames[0].fileName,
          picked.analysisFrames[0].mimeType,
          i18n.resolvedLanguage || i18n.language,
          picked.analysisFrames.slice(1),
          picked.type,
        ) : Promise.resolve(null),
      ]);
      setImageUrl(preview.url);
      setMediaUrl(uploaded.url);
      if (analysis) {
        setCandidates(analysis.marineLifeCandidates);
        setCandidateDetails(analysis.candidateDetails);
        setAnalysisId(analysis.analysisId);
        await queryClient.invalidateQueries({ queryKey: ['marine-ai-allowance'] });
        if (analysis.marineLifeCandidates.length === 1) setSelectedName(analysis.marineLifeCandidates[0]);
        if (!analysis.marineLifeCandidates.length) Alert.alert(t('marineLife.noCandidateTitle'), t('marineLife.noCandidateBody'));
      }
    } catch (error: any) {
      const code = errorCode(error);
      if (code === 'ai_quota_exceeded') {
        await queryClient.invalidateQueries({ queryKey: ['marine-ai-allowance'] });
        Alert.alert(t('marineLife.quota.exhaustedTitle'), t('marineLife.quota.exhaustedBody'));
      } else {
        Alert.alert(t('marineLife.analysisFailedTitle'), t(code === 'ai_not_configured' ? 'marineLife.aiNotConfigured' : 'marineLife.analysisFailedBody'));
      }
    } finally {
      setProcessing(false);
    }
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('marineLife.permissionTitle'), t('marineLife.permissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
      selectionLimit: 1,
      shouldDownloadFromNetwork: true,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.uri) return;
    const isVideo = asset.type === 'video';
    let previewUri = asset.uri;
    let analysisFrames: AnalysisFrame[] = [{ uri: asset.uri, fileName: asset.fileName || `marine-life-${Date.now()}.jpg`, mimeType: asset.mimeType || 'image/jpeg' }];
    if (isVideo) {
      try {
        const duration = Math.max(0, Number(asset.duration || 0));
        const times = duration > 1200
          ? [Math.max(100, duration * 0.15), duration * 0.5, Math.min(duration - 100, duration * 0.85)]
          : [Math.min(500, Math.max(0, duration / 2))];
        const frames = await Promise.all(times.map((time, index) => VideoThumbnails.getThumbnailAsync(asset.uri, { time: Math.round(time), quality: 0.8 }).then(result => ({
          uri: result.uri,
          fileName: `marine-life-frame-${Date.now()}-${index + 1}.jpg`,
          mimeType: 'image/jpeg',
        }))));
        analysisFrames = frames;
        previewUri = frames[Math.floor(frames.length / 2)].uri;
      } catch {
        Alert.alert(t('marineLife.videoFrameFailedTitle'), t('marineLife.videoFrameFailedBody'));
        return;
      }
    }
    const picked: PickedMedia = {
      uri: asset.uri,
      fileName: asset.fileName || `marine-life-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
      mimeType: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
      type: isVideo ? 'video' : 'image',
      previewUri,
      analysisFrames,
    };
    setPhoto(picked);
    setImageUrl('');
    setMediaUrl('');
    const requiredCredits = isVideo ? 5 : 1;
    if (allowanceQuery.data && allowanceQuery.data.remainingCredits < requiredCredits) {
      Alert.alert(t('marineLife.quota.exhaustedTitle'), t('marineLife.quota.exhaustedBody'), [
        { text: t('common.confirm'), onPress: () => void processPhoto(picked, false) },
      ]);
      return;
    }
    Alert.alert(t('marineLife.consentTitle'), t('marineLife.consentBody'), [
      { text: t('marineLife.manualOnly'), onPress: () => void processPhoto(picked, false) },
      { text: t('marineLife.analyze'), onPress: () => void processPhoto(picked, true) },
    ]);
  };

  const saveSighting = async () => {
    const speciesName = (selectedName || manualName).trim();
    if (!photo || !speciesName) {
      Alert.alert(t('marineLife.requiredTitle'), t('marineLife.requiredBody'));
      return;
    }
    setProcessing(true);
    try {
      let uploadedUrl = imageUrl;
      let uploadedMediaUrl = mediaUrl;
      if (!uploadedUrl || !uploadedMediaUrl) {
        const originalUpload = photo.type === 'video' ? uploadVideo(photo.uri) : uploadImage(photo.uri);
        const previewUpload = photo.type === 'video' ? uploadImage(photo.previewUri) : originalUpload;
        const [uploaded, preview] = await Promise.all([originalUpload, previewUpload]);
        uploadedUrl = preview.url;
        uploadedMediaUrl = uploaded.url;
        setImageUrl(uploadedUrl);
        setMediaUrl(uploadedMediaUrl);
      }
      const confirmedByAi = candidates.some(item => item.toLocaleLowerCase() === speciesName.toLocaleLowerCase());
      await apiClient.createMarineLifeSighting({
        speciesName,
        imageUrl: uploadedUrl,
        mediaType: photo.type,
        mediaUrl: uploadedMediaUrl,
        category: selectedDetails?.category || 'other',
        observedAt,
        locationName,
        notes,
        visibilityType,
        ...(confirmedByAi && analysisId ? { analysisId } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ['marine-life-sightings'] });
      setEditorOpen(false);
      resetEditor();
    } catch (error: any) {
      const code = errorCode(error);
      Alert.alert(t('marineLife.saveFailedTitle'), t(code === 'marine_life_duplicate' ? 'marineLife.duplicate' : 'marineLife.saveFailedBody'));
    } finally {
      setProcessing(false);
    }
  };

  const removeSighting = (id: string) => {
    Alert.alert(t('marineLife.deleteTitle'), t('marineLife.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try {
          await apiClient.deleteMarineLifeSighting(id);
          await queryClient.invalidateQueries({ queryKey: ['marine-life-sightings'] });
        } catch {
          Alert.alert(t('marineLife.deleteFailedTitle'), t('marineLife.deleteFailedBody'));
        }
      } },
    ]);
  };

  const pickSightingVisibility = (id: string, current: ItemVisibility) => {
    const actions = (['inherit', 'public', 'followers', 'private'] as const).map(value => ({
      text: `${current === value ? '✓ ' : ''}${t(`marineLife.visibility.${value}`)}`,
      onPress: async () => {
        try {
          await apiClient.updateMarineLifeVisibility(id, value);
          await queryClient.invalidateQueries({ queryKey: ['marine-life-sightings'] });
        } catch {
          Alert.alert(t('marineLife.saveFailedTitle'), t('marineLife.visibilitySaveFailed'));
        }
      },
    }));
    Alert.alert(t('marineLife.visibilityTitle'), t('marineLife.visibilityDescription'), [...actions, { text: t('common.cancel'), style: 'cancel' }]);
  };

  const shareSighting = async (item: any) => {
    const effectiveVisibility = (item.visibilityType || 'inherit') === 'inherit' ? visibilityQuery.data?.marineLife : item.visibilityType;
    if (effectiveVisibility !== 'public') {
      Alert.alert(t('marineLife.shareRestrictedTitle'), t('marineLife.shareRestrictedBody'));
      return;
    }
    const sharedUrl = buildShareUrl('marine-life', item.id);
    const message = [item.speciesName, item.summary, item.locationName, sharedUrl].filter(Boolean).join('\n\n');
    await Share.share({ title: item.speciesName, message, url: sharedUrl });
  };

  return <Screen>
    <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={sightingsQuery.isRefetching} onRefresh={() => void sightingsQuery.refetch()} />} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={styles.flex}><Text style={styles.title}>{t('marineLifeGuide')}</Text><Text style={styles.description}>{t('diveDiscovery.description')}</Text></View>
        <TouchableOpacity accessibilityRole="button" onPress={() => setEditorOpen(true)} style={styles.addButton}><Plus size={18} color="#FFFFFF" /><Text style={styles.addButtonText}>{t('marineLife.add')}</Text></TouchableOpacity>
      </View>

      {allowanceQuery.data && <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/membership')} style={styles.quotaCard}>
        <View style={styles.flex}>
          <Text style={styles.quotaPlan}>{t(`marineLife.quota.plan.${allowanceQuery.data.plan}`)}</Text>
          <Text style={styles.quotaDescription}>{t('marineLife.quota.description')}</Text>
        </View>
        <Text style={styles.quotaRemaining}>{t('marineLife.quota.remaining', { remaining: allowanceQuery.data.remainingCredits, limit: allowanceQuery.data.monthlyLimit })}</Text>
      </TouchableOpacity>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {tabs.map(item => <TouchableOpacity key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{t(`diveDiscovery.tabs.${item}`)}</Text></TouchableOpacity>)}
      </ScrollView>

      {tab === 'collection' && <View style={styles.section}>
        <View style={styles.sectionTitleRow}><Text style={styles.heading}>{t('marineLife.myCollection')}</Text><Text style={styles.countBadge}>{t('marineLife.speciesCount', { count: new Set(sightings.map(item => item.speciesName.toLocaleLowerCase())).size })}</Text></View>
        <Text style={styles.description}>{t('marineLife.collectionNote')}</Text>
        {sightingsQuery.isLoading && <ActivityIndicator color="#0D5FA8" style={styles.loader} />}
        {sightingsQuery.isError && <View style={styles.empty}><Text style={styles.description}>{t('marineLife.loadFailed')}</Text><TouchableOpacity onPress={() => void sightingsQuery.refetch()}><Text style={styles.retryText}>{t('common.retry')}</Text></TouchableOpacity></View>}
        {!sightingsQuery.isLoading && !sightingsQuery.isError && !sightings.length && <Empty text={t('marineLife.empty')} />}
        {!!sightings.length && <View style={styles.cardGrid}>
          {displayedSightings.map(item => <View key={item.id} style={[styles.photoCard, String(item.id) === String(sightingId) && styles.photoCardTarget]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${item.speciesName} ${t('marineLife.detail.open')}`} onPress={() => router.push({ pathname: '/(tabs)/marine-life-detail', params: { sightingId: item.id } } as never)} style={styles.cardMedia}>
              <ExpoImage source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" transition={150} />
              {item.mediaType === 'video' && <View style={styles.videoBadge}><Play size={16} color="#FFFFFF" fill="#FFFFFF" /><Text style={styles.videoBadgeText}>{t('marineLife.video')}</Text></View>}
            </TouchableOpacity>
            <View style={styles.cardBody}>
              <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: '/(tabs)/marine-life-detail', params: { sightingId: item.id } } as never)}>
                <Text numberOfLines={2} style={styles.cardTitle}>{item.speciesName}</Text>
              </TouchableOpacity>
              <Text style={styles.categoryText}>{t(`marineLife.category.${item.category || 'other'}`)}</Text>
              {!!item.scientificName && <Text numberOfLines={1} style={styles.scientificName}>{item.scientificName}</Text>}
              <Text numberOfLines={1} style={styles.meta}>{item.observedAt || item.createdAt?.slice(0, 10) || '-'}</Text>
              {!!item.locationName && <Text numberOfLines={1} style={styles.meta}>{item.locationName}</Text>}
              <View style={styles.sourceRow}>
                {item.source === 'AI_CONFIRMED' ? <Sparkles size={12} color="#0D5FA8" /> : <Fish size={12} color="#64748B" />}
                <Text style={styles.sourceText}>{t(`marineLife.source.${item.source}`)}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity accessibilityLabel={t('marineLife.visibilityTitle')} onPress={() => pickSightingVisibility(item.id, item.visibilityType || 'inherit')} style={styles.cardAction}><Eye size={14} color="#0D5FA8" /><Text style={styles.cardActionText}>{t(`marineLife.visibility.${item.visibilityType || 'inherit'}`)}</Text></TouchableOpacity>
                <TouchableOpacity accessibilityLabel={t('marineLife.share')} onPress={() => void shareSighting(item)} style={styles.iconAction}><Share2 size={14} color="#0D5FA8" /></TouchableOpacity>
                <TouchableOpacity accessibilityLabel={t('marineLife.deleteTitle')} onPress={() => removeSighting(item.id)} style={styles.deleteButton}><Trash2 size={14} color="#DC2626" /></TouchableOpacity>
              </View>
            </View>
          </View>)}
        </View>}
        {!!collection.length && <View style={styles.logCollection}>
          <Text style={styles.subheading}>{t('marineLife.logCollection')}</Text><Text style={styles.description}>{t('diveDiscovery.collectionNote')}</Text>
          {collection.map(item => <View key={item.name.toLocaleLowerCase()} style={styles.row}><View style={styles.flex}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.meta}>{t('diveDiscovery.firstLast', { first: item.firstSeen ?? '-', last: item.lastSeen ?? '-' })}</Text></View><Text style={styles.badge}>{t('diveDiscovery.sightings', { count: item.sightings })}</Text></View>)}
        </View>}
      </View>}

      {tab === 'species' && <View style={styles.section}>
        <Text style={styles.heading}>{t('marineLife.search.title')}</Text>
        <Text style={styles.description}>{t('marineLife.search.description')}</Text>
        <View style={styles.speciesSearchRow}>
          <TextInput
            accessibilityLabel={t('marineLife.search.title')}
            value={speciesInput}
            onChangeText={setSpeciesInput}
            onSubmitEditing={submitSpeciesSearch}
            placeholder={t('marineLife.search.placeholder')}
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            style={[styles.input, styles.speciesSearchInput]}
            maxLength={80}
          />
          <TouchableOpacity accessibilityRole="button" disabled={speciesInput.trim().length < 2} onPress={submitSpeciesSearch} style={[styles.searchButton, speciesInput.trim().length < 2 && styles.disabledButton]}>
            <SearchIcon size={18} color="#FFFFFF" />
            <Text style={styles.searchButtonText}>{t('marineLife.search.action')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.providerNote}>{t('marineLife.search.providerNote')}</Text>
        {speciesQuery.isFetching && <ActivityIndicator color="#0D5FA8" style={styles.loader} />}
        {speciesQuery.isError && <View style={styles.empty}><Text style={styles.description}>{t('marineLife.search.failed')}</Text><TouchableOpacity onPress={() => void speciesQuery.refetch()}><Text style={styles.retryText}>{t('common.retry')}</Text></TouchableOpacity></View>}
        {!speciesQuery.isFetching && !speciesQuery.isError && !!speciesSearchTerm && !speciesQuery.data?.length && <Empty text={t('marineLife.search.empty')} />}
        {!!speciesQuery.data?.length && <View style={styles.speciesResults}>
          {speciesQuery.data.map(item => <SpeciesResultCard key={item.id} item={item} />)}
        </View>}
      </View>}

      {tab === 'statistics' && <View style={styles.section}>
        <Text style={styles.heading}>{t('diveDiscovery.statisticsTitle')}</Text>
        <View style={styles.metricGrid}>
          <Metric label={t('diveDiscovery.metrics.dives')} value={String(statistics.diveCount)} />
          <Metric label={t('diveDiscovery.metrics.sites')} value={String(statistics.siteCount)} />
          <Metric label={t('diveDiscovery.metrics.deepest')} value={`${formatMetric(statistics.deepestM)} m`} evidence={statistics.measuredDepthCount} />
          <Metric label={t('diveDiscovery.metrics.avgDepth')} value={`${formatMetric(statistics.averageDepthM)} m`} evidence={statistics.measuredDepthCount} />
          <Metric label={t('diveDiscovery.metrics.totalTime')} value={`${formatMetric(statistics.totalDurationMin, 0)} min`} evidence={statistics.measuredDurationCount} />
          <Metric label={t('diveDiscovery.metrics.species')} value={String(new Set([...collection.map(item => item.name.toLocaleLowerCase()), ...sightings.map(item => item.speciesName.toLocaleLowerCase())]).size)} />
        </View><Text style={styles.meta}>{t('diveDiscovery.sampleNote')}</Text>
      </View>}

      {tab === 'search' && <View style={styles.section}>
        <Text style={styles.heading}>{t('diveDiscovery.searchTitle')}</Text>
        <TextInput accessibilityLabel={t('diveDiscovery.searchTitle')} value={query} onChangeText={setQuery} placeholder={t('diveDiscovery.searchPlaceholder')} placeholderTextColor="#94A3B8" style={styles.input} />
        {!!query.trim() && <Text style={styles.meta}>{t('diveDiscovery.resultCount', { count: results.length })}</Text>}
        {!!query.trim() && !results.length && <Empty text={t('diveDiscovery.searchEmpty')} />}
        {results.map(log => <View key={log.id} style={styles.row}><View style={styles.flex}><Text style={styles.rowTitle}>{log.divePointName || t('diveDiscovery.unknownSite')}</Text><Text style={styles.meta}>{log.diveDate || '-'} · {log.maxDepth == null ? '-' : `${log.maxDepth} m`}</Text></View></View>)}
      </View>}

      {tab === 'insights' && <View style={styles.section}>
        <Text style={styles.heading}>{t('diveDiscovery.insightsTitle')}</Text><Text style={styles.description}>{t('diveDiscovery.insightsNote')}</Text>
        {!insights.length && <Empty text={t('diveDiscovery.insightsEmpty')} />}
        {insights.map(item => <View key={item.key} style={styles.insight}><Text style={styles.rowTitle}>{t(`diveDiscovery.insights.${item.key}`, { value: item.value })}</Text><Text style={styles.meta}>{t('diveDiscovery.evidence', { count: item.sampleSize })}</Text></View>)}
      </View>}
    </ScrollView>

    <Modal transparent visible={editorOpen} animationType="slide" onRequestClose={closeEditor}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeEditor} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}><View style={styles.flex}><Text style={styles.modalTitle}>{t('marineLife.addTitle')}</Text><Text style={styles.description}>{t('marineLife.addSubtitle')}</Text></View><TouchableOpacity accessibilityLabel={t('common.close')} onPress={closeEditor} style={styles.closeButton}><X size={20} color="#334155" /></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <TouchableOpacity onPress={() => void choosePhoto()} disabled={processing} style={styles.photoPicker}>
              {photo ? <><ExpoImage source={{ uri: photo.previewUri }} style={styles.pickedImage} contentFit="cover" />{photo.type === 'video' && <View style={styles.pickedVideoBadge}><Video size={18} color="#FFFFFF" /><Text style={styles.videoBadgeText}>{t('marineLife.videoSelected')}</Text></View>}</> : <><Fish size={34} color="#0D5FA8" /><Text style={styles.photoPickerTitle}>{t('marineLife.chooseMedia')}</Text><Text style={styles.meta}>{t('marineLife.mediaRequired')}</Text></>}
              {processing && <View style={styles.processingOverlay}><ActivityIndicator color="#FFFFFF" /><Text style={styles.processingText}>{t('marineLife.processing')}</Text></View>}
            </TouchableOpacity>
            {!!candidates.length && <View style={styles.candidateSection}>
              <View style={styles.candidateTitleRow}><Sparkles size={16} color="#0D5FA8" /><Text style={styles.subheading}>{t('marineLife.aiCandidates')}</Text></View><Text style={styles.description}>{t('marineLife.confirmCandidate')}</Text>
              <View style={styles.candidateList}>{candidates.map(candidate => <TouchableOpacity key={candidate} onPress={() => { setSelectedName(candidate); setManualName(candidate); }} style={[styles.candidate, selectedName === candidate && styles.candidateSelected]}><Text style={[styles.candidateText, selectedName === candidate && styles.candidateTextSelected]}>{candidate}</Text></TouchableOpacity>)}</View>
              {!!selectedDetails && <View style={styles.candidateInfo}>
                <Text style={styles.categoryText}>{t(`marineLife.category.${selectedDetails.category || 'other'}`)}</Text>
                {!!selectedDetails.scientificName && <Text style={styles.scientificName}>{selectedDetails.scientificName}</Text>}
                {!!selectedDetails.summary && <Text style={styles.cardSummary}>{selectedDetails.summary}</Text>}
                {!!selectedDetails.habitat && <Text style={styles.infoLine}><Text style={styles.infoLabel}>{t('marineLife.habitat')} </Text>{selectedDetails.habitat}</Text>}
                {!!selectedDetails.identificationTips.length && <Text style={styles.infoLine}><Text style={styles.infoLabel}>{t('marineLife.identificationTips')} </Text>{selectedDetails.identificationTips.join(' · ')}</Text>}
                <Text style={styles.aiInfoNotice}>{t('marineLife.aiInfoNotice')}</Text>
              </View>}
            </View>}
            <View style={styles.field}><Text style={styles.label}>{t('marineLife.speciesName')}</Text><TextInput value={manualName} onChangeText={value => { setManualName(value); if (value) setSelectedName(''); }} placeholder={t('marineLife.speciesPlaceholder')} placeholderTextColor="#94A3B8" style={styles.input} maxLength={120} /><Text style={styles.meta}>{t('marineLife.manualHint')}</Text></View>
            <View style={styles.field}><Text style={styles.label}>{t('marineLife.observedAt')}</Text><TextInput value={observedAt} onChangeText={setObservedAt} placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" style={styles.input} maxLength={10} /></View>
            <View style={styles.field}><Text style={styles.label}>{t('marineLife.location')}</Text><TextInput value={locationName} onChangeText={setLocationName} placeholder={t('marineLife.locationPlaceholder')} placeholderTextColor="#94A3B8" style={styles.input} maxLength={200} /></View>
            <View style={styles.field}><Text style={styles.label}>{t('marineLife.notes')}</Text><TextInput value={notes} onChangeText={setNotes} placeholder={t('marineLife.notesPlaceholder')} placeholderTextColor="#94A3B8" multiline style={[styles.input, styles.notesInput]} maxLength={1000} /></View>
            <View style={styles.field}><Text style={styles.label}>{t('marineLife.visibilityTitle')}</Text><View style={styles.visibilityRow}>{(['inherit', 'public', 'followers', 'private'] as const).map(value => <TouchableOpacity key={value} onPress={() => setVisibilityType(value)} style={[styles.visibilityOption, visibilityType === value && styles.visibilityOptionActive]}><Text style={[styles.visibilityOptionText, visibilityType === value && styles.visibilityOptionTextActive]}>{t(`marineLife.visibility.${value}`)}</Text></TouchableOpacity>)}</View></View>
            <TouchableOpacity disabled={processing} onPress={() => void saveSighting()} style={[styles.saveButton, processing && styles.disabledButton]}>{processing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>{t('marineLife.save')}</Text>}</TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </Screen>;
}

function Empty({ text }: { text: string }) { return <View style={styles.empty}><Text style={styles.description}>{text}</Text></View>; }
function Metric({ label, value, evidence }: { label: string; value: string; evidence?: number }) { const { t } = useTranslation(); return <View style={styles.metric}><Text style={styles.meta}>{label}</Text><Text style={styles.metricValue}>{value}</Text>{evidence != null && <Text style={styles.evidence}>{t('diveDiscovery.evidence', { count: evidence })}</Text>}</View>; }
function SpeciesResultCard({ item }: { item: MarineSpeciesSearchItem }) {
  const { t } = useTranslation();
  const taxonomy = [
    item.taxonomy.family ? `${t('marineLife.search.family')}: ${item.taxonomy.family}` : '',
    item.taxonomy.genus ? `${t('marineLife.search.genus')}: ${item.taxonomy.genus}` : '',
  ].filter(Boolean).join(' · ');
  return <View style={styles.speciesCard}>
    {item.photo ? <TouchableOpacity onPress={() => void Linking.openURL(item.photo?.sourceUrl || item.providerUrl)}><ExpoImage source={{ uri: item.photo.url }} style={styles.speciesImage} contentFit="cover" transition={180} /></TouchableOpacity> : <View style={styles.speciesImageFallback}><Fish size={38} color="#5C86A6" /><Text style={styles.meta}>{t('marineLife.search.noPhoto')}</Text></View>}
    <View style={styles.speciesBody}>
      <View style={styles.speciesTitleRow}><View style={styles.flex}><Text style={styles.speciesTitle}>{item.commonName}</Text><Text style={styles.speciesScientific}>{item.scientificName}</Text></View><Text style={styles.rankBadge}>{t(`marineLife.search.ranks.${item.rank}`, { defaultValue: item.rank })}</Text></View>
      {!!taxonomy && <Text style={styles.speciesTaxonomy}>{taxonomy}</Text>}
      <Text style={styles.meta}>{t('marineLife.search.observations', { count: item.observationsCount.toLocaleString() })}</Text>
      {item.photo && <Text numberOfLines={2} style={styles.attribution}>{t('marineLife.search.photoCredit', { attribution: item.photo.attribution || 'Wikimedia Commons', license: item.photo.license })}</Text>}
      <View style={styles.speciesLinks}>
        <TouchableOpacity onPress={() => void Linking.openURL(item.providerUrl)} style={styles.sourceLink}><Text style={styles.sourceLinkText}>iNaturalist</Text><ExternalLink size={13} color="#0D5FA8" /></TouchableOpacity>
        {!!item.wikipediaUrl && <TouchableOpacity onPress={() => void Linking.openURL(item.wikipediaUrl)} style={styles.sourceLink}><Text style={styles.sourceLinkText}>{t('marineLife.search.wikipedia')}</Text><ExternalLink size={13} color="#0D5FA8" /></TouchableOpacity>}
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60, gap: 12 },
  flex: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  heading: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  subheading: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  description: { color: '#475569', lineHeight: 21 },
  addButton: { minHeight: 42, borderRadius: 13, backgroundColor: '#0D5FA8', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, justifyContent: 'center' },
  addButtonText: { color: '#FFFFFF', fontWeight: '800' },
  tabs: { gap: 8, paddingVertical: 2 },
  tab: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#FFFFFF' },
  tabActive: { borderColor: '#0D5FA8', backgroundColor: '#EAF4FF' },
  tabText: { color: '#475569', fontWeight: '700' },
  tabTextActive: { color: '#0D5FA8' },
  section: { gap: 10, padding: 16, borderWidth: 1, borderColor: '#D7E4F1', borderRadius: 18, backgroundColor: '#FFFFFF' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  countBadge: { color: '#0D5FA8', backgroundColor: '#EAF4FF', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontWeight: '800', fontSize: 12 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCard: { width: '48%', flexGrow: 1, maxWidth: '49%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#FFFFFF' },
  photoCardTarget: { borderWidth: 3, borderColor: '#0D75BD' },
  cardMedia: { position: 'relative', backgroundColor: '#E2E8F0' },
  cardImage: { width: '100%', aspectRatio: 1.15, backgroundColor: '#E2E8F0' },
  videoBadge: { position: 'absolute', right: 8, bottom: 8, minHeight: 30, borderRadius: 999, backgroundColor: 'rgba(3,32,58,0.82)', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9 },
  videoBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  cardBody: { padding: 10, gap: 4 },
  cardTitle: { color: '#0F172A', fontSize: 15, lineHeight: 19, fontWeight: '800' },
  scientificName: { color: '#475569', fontSize: 11, lineHeight: 16, fontStyle: 'italic' },
  categoryText: { color: '#0D5FA8', fontSize: 11, lineHeight: 16, fontWeight: '800' },
  cardSummary: { color: '#334155', fontSize: 12, lineHeight: 18 },
  infoLine: { color: '#475569', fontSize: 11, lineHeight: 17 },
  infoLabel: { color: '#0F172A', fontWeight: '800' },
  aiInfoNotice: { color: '#64748B', fontSize: 10, lineHeight: 14 },
  sourceRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  sourceText: { flex: 1, color: '#64748B', fontSize: 10, fontWeight: '700' },
  cardActions: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardAction: { minHeight: 28, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 9, backgroundColor: '#EFF8FF', paddingHorizontal: 6 },
  cardActionText: { color: '#0D5FA8', fontSize: 9, fontWeight: '800' },
  iconAction: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#EFF8FF' },
  deleteButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#FEF2F2' },
  logCollection: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#CBD5E1', marginTop: 6, paddingTop: 14, gap: 7 },
  quotaCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 15, borderWidth: 1, borderColor: '#B9D8F0', backgroundColor: '#EFF8FF', padding: 13 },
  quotaPlan: { color: '#0D5FA8', fontSize: 13, fontWeight: '900' },
  quotaDescription: { color: '#64748B', fontSize: 10, lineHeight: 15, marginTop: 2 },
  quotaRemaining: { color: '#0F172A', fontSize: 14, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D7E4F1' },
  rowTitle: { color: '#0F172A', fontWeight: '700', lineHeight: 20 },
  meta: { color: '#64748B', fontSize: 12, lineHeight: 17 },
  badge: { color: '#0D5FA8', backgroundColor: '#EAF4FF', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontWeight: '700', fontSize: 12 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '47%', minWidth: 130, flexGrow: 1, borderRadius: 14, backgroundColor: '#F8FAFC', padding: 12, gap: 4 },
  metricValue: { color: '#0F172A', fontSize: 21, fontWeight: '800' },
  evidence: { color: '#64748B', fontSize: 10 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#FFFFFF', color: '#0F172A', paddingHorizontal: 12, paddingVertical: 12 },
  speciesSearchRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  speciesSearchInput: { flex: 1, minWidth: 0 },
  searchButton: { minHeight: 46, borderRadius: 12, backgroundColor: '#0D5FA8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14 },
  searchButtonText: { color: '#FFFFFF', fontWeight: '800' },
  providerNote: { color: '#64748B', fontSize: 11, lineHeight: 16 },
  speciesResults: { gap: 14, marginTop: 3 },
  speciesCard: { overflow: 'hidden', borderWidth: 1, borderColor: '#D7E4F1', borderRadius: 18, backgroundColor: '#FFFFFF' },
  speciesImage: { width: '100%', height: 210, backgroundColor: '#E2E8F0' },
  speciesImageFallback: { height: 150, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EDF6FA' },
  speciesBody: { padding: 14, gap: 7 },
  speciesTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  speciesTitle: { color: '#0F172A', fontSize: 18, lineHeight: 23, fontWeight: '900' },
  speciesScientific: { color: '#475569', fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  rankBadge: { overflow: 'hidden', borderRadius: 999, backgroundColor: '#E6F6F3', color: '#08786E', fontSize: 11, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 5 },
  speciesTaxonomy: { color: '#334155', fontSize: 12, lineHeight: 18 },
  attribution: { color: '#64748B', fontSize: 10, lineHeight: 15 },
  speciesLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 3 },
  sourceLink: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 30, borderRadius: 999, backgroundColor: '#EFF8FF', paddingHorizontal: 10 },
  sourceLinkText: { color: '#0D5FA8', fontSize: 11, fontWeight: '800' },
  empty: { paddingVertical: 22, alignItems: 'center', gap: 8 },
  retryText: { color: '#0D5FA8', fontWeight: '800' },
  loader: { marginVertical: 24 },
  insight: { borderRadius: 14, backgroundColor: '#F0F9FF', padding: 14, gap: 5 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.48)' },
  modalSheet: { maxHeight: '92%', borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#F8FAFC', paddingTop: 16 },
  modalHeader: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modalTitle: { color: '#0F172A', fontSize: 21, fontWeight: '900' },
  closeButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7E4F1', alignItems: 'center', justifyContent: 'center' },
  modalContent: { paddingHorizontal: 20, paddingBottom: 36, gap: 15 },
  photoPicker: { minHeight: 210, overflow: 'hidden', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#8CB7DA', borderRadius: 18, backgroundColor: '#EFF8FF', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pickedImage: { width: '100%', height: 240 },
  pickedVideoBadge: { position: 'absolute', right: 12, bottom: 12, minHeight: 34, borderRadius: 999, backgroundColor: 'rgba(3,32,58,0.84)', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11 },
  photoPickerTitle: { color: '#0D5FA8', fontWeight: '900', fontSize: 16 },
  processingOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(3,32,58,0.64)', alignItems: 'center', justifyContent: 'center', gap: 9 },
  processingText: { color: '#FFFFFF', fontWeight: '800' },
  candidateSection: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#B9D8F0', backgroundColor: '#F0F9FF', gap: 9 },
  candidateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  candidateList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  candidate: { borderWidth: 1, borderColor: '#8CB7DA', borderRadius: 999, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 9 },
  candidateSelected: { backgroundColor: '#0D5FA8', borderColor: '#0D5FA8' },
  candidateText: { color: '#0D5FA8', fontWeight: '800' },
  candidateTextSelected: { color: '#FFFFFF' },
  candidateInfo: { gap: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#8CB7DA', paddingTop: 10 },
  field: { gap: 7 },
  label: { color: '#0F172A', fontWeight: '800' },
  notesInput: { minHeight: 90, textAlignVertical: 'top' },
  visibilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  visibilityOption: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  visibilityOptionActive: { borderColor: '#0D5FA8', backgroundColor: '#EAF4FF' },
  visibilityOptionText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  visibilityOptionTextActive: { color: '#0D5FA8' },
  saveButton: { minHeight: 50, borderRadius: 15, backgroundColor: '#0D5FA8', alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  disabledButton: { opacity: 0.55 },
});
