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
        <View className="mb-6">
          {icon}
        </View>
      )}
      
      <Text className="text-xl font-semibold text-secondary-800 text-center mb-2">
        {title}
      </Text>
      
      {subtitle && (
        <Text className="text-secondary-600 text-center mb-8 leading-6">
          {subtitle}
        </Text>
      )}
      
      {actionText && onAction && (
        <Button onPress={onAction} variant="primary">
          {actionText}
        </Button>
      )}
    </View>
  );
}