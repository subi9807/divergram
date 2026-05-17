import React from 'react';
import { View, SafeAreaView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../lib/utils';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
  safe?: boolean;
  tone?: 'gradient' | 'plain';
}

export function Screen({ children, className, safe = true, tone = 'gradient' }: ScreenProps) {
  const Container = safe ? SafeAreaView : View;

  return (
    <Container style={styles.root} className={cn('flex-1', className)}>
      {tone === 'gradient' ? (
        <LinearGradient
          colors={['#f8fbff', '#eef5ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={styles.gradient}
        />
      ) : null}
      <View style={styles.content}>{children}</View>
    </Container>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#f6f9fd',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
