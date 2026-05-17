import React from 'react';
import { View } from 'react-native';
import { cn } from '../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

export function Card({ children, className, elevated = true }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-3xl border border-surface-200 bg-white',
        elevated ? 'shadow-sm shadow-surface-200' : '',
        className
      )}
    >
      {children}
    </View>
  );
}
