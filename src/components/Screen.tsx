import React from 'react';
import { View, SafeAreaView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../lib/utils';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
  safe?: boolean;
  tone?: 'gradient' | 'plain';
}

export function Screen({ children, className, safe = true, tone = 'gradient' }: ScreenProps) {
  const Container = safe ? SafeAreaView : View;
  const { isDark } = useResolvedTheme();

  return (
    <Container style={[styles.root, isDark ? styles.rootDark : undefined]} className={cn('flex-1', className)}>
      {tone === 'gradient' ? (
        <LinearGradient
          colors={isDark ? ['#0a1520', '#0c1d2c'] : ['#fbfdff', '#f4f8fc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={styles.gradient}
        />
      ) : null}
      {tone === 'gradient' ? (
        <>
          <View pointerEvents="none" style={[styles.topOrb, isDark ? styles.topOrbDark : undefined]} />
          <View pointerEvents="none" style={[styles.bottomOrb, isDark ? styles.bottomOrbDark : undefined]} />
        </>
      ) : null}
      <View style={styles.content}>{children}</View>
    </Container>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#f8fbfe',
    flex: 1,
  },
  rootDark: {
    backgroundColor: '#09131d',
  },
  content: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topOrb: {
    position: 'absolute',
    top: -160,
    right: -140,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(17, 152, 245, 0.04)',
  },
  topOrbDark: {
    backgroundColor: 'rgba(17, 152, 245, 0.08)',
  },
  bottomOrb: {
    position: 'absolute',
    bottom: -180,
    left: -140,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(13, 95, 168, 0.025)',
  },
  bottomOrbDark: {
    backgroundColor: 'rgba(26, 117, 191, 0.08)',
  },
});
