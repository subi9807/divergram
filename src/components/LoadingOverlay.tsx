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
    <View className={cn('absolute inset-0 bg-white/80 items-center justify-center z-50', className)}>
      <ActivityIndicator size="large" color="#0ea5e9" />
      {text && (
        <Text className="text-secondary-600 mt-4 text-center">
          {text}
        </Text>
      )}
    </View>
  );
}