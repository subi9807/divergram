import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';
import { cn } from '../lib/utils';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

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
  const { isDark } = useResolvedTheme();
  return (
    <View className={cn('flex-1 items-center justify-center px-8 py-12', className)}>
      {icon && (
        <View className="mb-6 rounded-2xl bg-surface-100 p-4">
          {icon}
        </View>
      )}

      <Text accessibilityRole="header" style={{ color: isDark ? '#e2e8f0' : '#21364d' }} className="mb-2 text-center text-xl font-semibold">
        {title}
      </Text>

      {subtitle && (
        <Text style={{ color: isDark ? '#a5b5c8' : '#657b92', fontSize: 15, lineHeight: 24 }} className="mb-8 text-center">
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
