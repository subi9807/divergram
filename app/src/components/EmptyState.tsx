import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ 
  title, 
  subtitle, 
  icon, 
  actionText, 
  onAction, 
  className 
}: EmptyStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center px-8 py-12', className)}>
      {icon && (
        <View className="mb-6 rounded-2xl bg-surface-100 p-4">
          {icon}
        </View>
      )}

      <Text className="mb-2 text-center text-xl font-semibold text-surface-800">
        {title}
      </Text>

      {subtitle && (
        <Text className="mb-8 text-center leading-6 text-surface-600">
          {subtitle}
        </Text>
      )}

      {actionText && onAction && (
        <Button onPress={onAction} variant="primary" size="md" className="min-w-36">
          {actionText}
        </Button>
      )}
    </View>
  );
}
