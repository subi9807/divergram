import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { cn } from '../lib/utils';

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  className?: string;
}

export function LoadingOverlay({ visible, text, className }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View className={cn('absolute inset-0 z-50 items-center justify-center bg-surface-900/20', className)}>
      <View className="rounded-2xl bg-white px-5 py-4 shadow-lg shadow-surface-300">
        <ActivityIndicator size="large" color="#1198f5" />
      {text && (
          <Text className="mt-3 text-center text-surface-600">
          {text}
          </Text>
      )}
      </View>
    </View>
  );
}
