import React from 'react';
import { Platform } from 'react-native';

/* eslint-disable @typescript-eslint/no-require-imports -- 플랫폼별 구현을 런타임에 분기하기 위해 require를 사용한다 */
type FeedAdSlotProps = {
  label?: string;
  subtitle?: string;
  ctaLabel?: string;
  onPress?: () => void;
};

const FeedAdSlotImpl =
  Platform.OS === 'web'
    ? require('./FeedAdSlot.web').FeedAdSlot
    : require('./FeedAdSlot.native').FeedAdSlot;

export function FeedAdSlot(props: FeedAdSlotProps) {
  return <FeedAdSlotImpl {...props} />;
}
