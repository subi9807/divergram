import React from 'react';
import { View, Text, Image } from 'react-native';
import { cn } from '../../lib/utils';

interface ProfileAvatarProps {
  user: {
    name?: string;
    avatar?: string;
  } | null;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function ProfileAvatar({ user, size = 'medium', className }: ProfileAvatarProps) {
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
        className={cn(sizeClasses[size], 'rounded-full', className)}
      />
    );
  }

  return (
    <View className={cn(
      sizeClasses[size], 
      'bg-primary-100 rounded-full items-center justify-center',
      className
    )}>
      <Text className={cn('text-primary-600 font-semibold', textSizeClasses[size])}>
        {user?.name?.charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}