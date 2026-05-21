import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { cn } from '../lib/utils';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

export function Card({ children, className, elevated = true }: CardProps) {
  const { isDark } = useResolvedTheme();
  return (
    <View
      style={[elevated ? styles.elevated : undefined, isDark ? styles.dark : undefined]}
      className={cn(
        'rounded-3xl border border-surface-100 bg-white/95',
        isDark ? 'border-surface-700 bg-surface-900/95' : undefined,
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
  dark: {
    shadowColor: '#020617',
    shadowOpacity: 0.35,
  },
});
