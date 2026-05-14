import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { cn } from '../lib/utils';

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightComponent?: React.ReactNode;
  onPress?: () => void;
  className?: string;
}

export function ListItem({ 
  title, 
  subtitle, 
  icon, 
  rightComponent, 
  onPress, 
  className 
}: ListItemProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      className={cn('flex-row items-center px-6 py-4', className)}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && (
        <View className="mr-4">
          {icon}
        </View>
      )}
      
      <View className="flex-1">
        <Text className="text-secondary-800 font-medium text-base">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-secondary-600 text-sm mt-1">
            {subtitle}
          </Text>
        )}
      </View>
      
      {rightComponent && (
        <View className="ml-4">
          {rightComponent}
        </View>
      )}
    </Container>
  );
}