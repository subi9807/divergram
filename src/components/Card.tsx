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
      style={[
        styles.base,
        isDark ? styles.baseDark : styles.baseLight,
        elevated ? styles.elevated : undefined,
        isDark ? styles.dark : undefined,
      ]}
      className={cn(
        'rounded-3xl',
        className
      )}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
  baseLight: {
    borderColor: '#e6edf6',
    backgroundColor: '#ffffff',
  },
  baseDark: {
    borderColor: '#243447',
    backgroundColor: '#0f1b2a',
  },
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
