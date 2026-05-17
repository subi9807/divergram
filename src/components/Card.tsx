import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { cn } from '../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

export function Card({ children, className, elevated = true }: CardProps) {
  return (
    <View
      style={elevated ? styles.elevated : undefined}
      className={cn(
        'rounded-3xl border border-surface-100 bg-white/95',
        className
      )}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  elevated: {
    shadowColor: '#0d5fa8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: Platform.select({ android: 3, default: 0 }),
  },
});
