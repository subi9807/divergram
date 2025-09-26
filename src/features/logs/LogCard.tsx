import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { formatDate, formatDepth } from '../../lib/utils';
import { MapPin, Clock } from 'lucide-react-native';

interface LogCardProps {
  log: {
    id: string;
    title: string;
    location?: string;
    depth: number;
    duration: number;
    createdAt: string;
  };
}

export function LogCard({ log }: LogCardProps) {
  return (
    <TouchableOpacity className="px-4 mb-3">
      <Card className="p-4">
        <Text className="text-lg font-semibold text-secondary-800 mb-2">
          {log.title}
        </Text>
        
        {log.location && (
          <View className="flex-row items-center mb-2">
            <MapPin size={16} color="#64748b" />
            <Text className="text-secondary-600 ml-2">
              {log.location}
            </Text>
          </View>
        )}

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-secondary-700 font-medium">
              {formatDepth(log.depth)}
            </Text>
            <View className="w-px h-4 bg-secondary-300 mx-3" />
            <View className="flex-row items-center">
              <Clock size={16} color="#64748b" />
              <Text className="text-secondary-600 ml-1">
                {log.duration}min
              </Text>
            </View>
          </View>
          
          <Text className="text-secondary-500 text-sm">
            {formatDate(log.createdAt)}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}