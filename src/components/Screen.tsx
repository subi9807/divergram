import React from 'react';
import { View, SafeAreaView } from 'react-native';
import { cn } from '../lib/utils';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
  safe?: boolean;
}

export function Screen({ children, className, safe = true }: ScreenProps) {
  const Container = safe ? SafeAreaView : View;
  
  return (
    <Container className={cn('flex-1 bg-secondary-50', className)}>
      {children}
    </Container>
  );
}