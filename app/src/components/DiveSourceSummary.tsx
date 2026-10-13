import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DiveLog } from '../models';
import { initialDiveSources, sourceForDiveImport } from '../utils/diveProvenance';

export function DiveSourceSummary({ log }: { log?: DiveLog }) {
  const { t } = useTranslation();
  if (!log) return null;
  const sources = Object.values(log.fieldSources ?? initialDiveSources(log, sourceForDiveImport(log.sourceType)));
  return <View style={{ gap: 4, paddingVertical: 8 }}>
    <Text style={{ color: '#475569', fontSize: 12 }}>{t('diveSource.counts', {
      imported: sources.filter(value => value === 'IMPORT' || value === 'DIVE_COMPUTER').length,
      user: sources.filter(value => value === 'USER').length,
      ai: sources.filter(value => value === 'AI_IMAGE_ANALYSIS' || value === 'DERIVED').length,
    })}</Text>
    <Text style={{ color: '#64748b', fontSize: 12 }}>{t(log.originalSource ? 'diveSource.originalKept' : 'diveSource.originalMissing')}</Text>
  </View>;
}
