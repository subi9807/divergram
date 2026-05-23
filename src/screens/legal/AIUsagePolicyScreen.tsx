import React from 'react';
import { PolicyDocumentView } from './PolicyDocumentView';

export default function AIUsagePolicyScreen() {
  return <PolicyDocumentView type="ai_notice" titleOverride="AI 기능 안내" />;
}
