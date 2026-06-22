import React from 'react';
import { View, SafeAreaView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../lib/utils';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
  safe?: boolean;
  tone?: 'gradient' | 'plain';
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, className, safe = true, tone = 'gradient', style }: ScreenProps) {
  const Container = safe ? SafeAreaView : View;
  const { isDark } = useResolvedTheme();

  return (
    <Container style={[styles.root, isDark ? styles.rootDark : undefined, style]} className={cn('flex-1', className)}>
      {tone === 'gradient' ? (
        <LinearGradient
          colors={isDark ? ['#08121b', '#0b1622'] : ['#fbfdff', '#eef5fb']}
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
    ...StyleSheet.absoluteFill,
  },
  topOrb: {
    position: 'absolute',
    top: -150,
    right: -120,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(17, 152, 245, 0.03)',
  },
  topOrbDark: {
    backgroundColor: 'rgba(17, 152, 245, 0.06)',
  },
  bottomOrb: {
    position: 'absolute',
    bottom: -170,
    left: -120,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(13, 95, 168, 0.02)',
  },
  bottomOrbDark: {
    backgroundColor: 'rgba(26, 117, 191, 0.06)',
  },
});
