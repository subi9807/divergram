import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PhotoMetadata } from '../utils/photoGps';

export function PhotoMetadataSummary({ metadata }: { metadata?: PhotoMetadata }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (!metadata) return null;
  const unknown = t('diveReview.unknown');
  return <View style={{ paddingVertical: 6 }}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: '#0f766e', fontSize: 12 }}>{t('photoMetadata.title')} · {metadata.gps ? 'GPS' : t('photoMetadata.noGps')} · {expanded ? '−' : '+'}</Text>
    </TouchableOpacity>
    {expanded && <View style={{ gap: 4 }}>
      <Text style={{ color: '#64748b', fontSize: 12 }}>{t('photoMetadata.capture')}: {metadata.capturedLocal || unknown} {metadata.utcOffset || t('photoMetadata.noOffset')}</Text>
      <Text style={{ color: '#64748b', fontSize: 12 }}>GPS: {metadata.gps ? `${metadata.gps.lat.toFixed(6)}, ${metadata.gps.lng.toFixed(6)}` : unknown}</Text>
      <Text style={{ color: '#64748b', fontSize: 12 }}>{t('photoMetadata.camera')}: {[metadata.cameraMake, metadata.cameraModel].filter(Boolean).join(' ') || unknown}</Text>
      <Text style={{ color: '#64748b', fontSize: 12 }}>{t('photoMetadata.orientation')}: {metadata.orientation ?? unknown}</Text>
      <Text style={{ color: '#64748b', fontSize: 12 }}>{t('photoMetadata.note')}</Text>
    </View>}
  </View>;
}
