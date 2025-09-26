import React from 'react';
import { View } from 'react-native';
import { cn } from '../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <View className={cn('bg-white rounded-lg shadow-sm border border-secondary-200', className)}>
      {children}
    </View>
  );
}