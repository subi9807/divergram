import React from 'react';
import { Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/utils';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

interface ProfileAvatarProps {
  user: {
    name?: string;
    avatar?: string;
  } | null;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function ProfileAvatar({ user, size = 'medium', className }: ProfileAvatarProps) {
  const { isDark } = useResolvedTheme();
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-20 h-20'
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-2xl'
  };

  if (user?.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        className={cn(sizeClasses[size], 'rounded-full border', isDark ? 'border-[#2d4155]' : 'border-surface-200', className)}
      />
    );
  }

  return (
    <LinearGradient
      colors={['#0d5fa8', '#1198f5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={cn(sizeClasses[size], 'items-center justify-center rounded-full', className)}
    >
      <Text className={cn('font-semibold text-white', textSizeClasses[size])}>{user?.name?.charAt(0).toUpperCase() || '?'}</Text>
    </LinearGradient>
  );
}
