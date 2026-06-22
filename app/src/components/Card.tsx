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
    borderColor: '#dce8f4',
    backgroundColor: '#ffffff',
  },
  baseDark: {
    borderColor: '#2a3e52',
    backgroundColor: '#0e1824',
  },
  elevated: {
    shadowColor: '#0d5fa8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: Platform.select({ android: 2, default: 0 }),
  },
  dark: {
    shadowColor: '#020617',
    shadowOpacity: 0.26,
  },
});
