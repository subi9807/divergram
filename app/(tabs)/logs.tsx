import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, MapPin, Clock, Thermometer } from 'lucide-react-native';

export default function LogsScreen() {
  // 웹에서는 SafeAreaView 대신 일반 View 사용
  const Container = Platform.OS === 'web' ? View : SafeAreaView;

  const dummyLogs = [
    {
      id: 1,
      title: '제주도 서귀포 다이빙',
      location: '서귀포 해양공원',
      date: '2024-01-15',
      duration: 45,
      maxDepth: 18,
      temperature: 16,
    },
    {
      id: 2,
      title: '부산 태종대 야간 다이빙',
      location: '태종대 해안',
      date: '2024-01-10',
      duration: 35,
      maxDepth: 12,
      temperature: 14,
    },
    {
      id: 3,
      title: '울릉도 관음도 다이빙',
      location: '관음도 포인트',
      date: '2024-01-05',
      duration: 52,
      maxDepth: 25,
      temperature: 18,
    },
  ];

  return (
    <Container className="flex-1 bg-gray-50" style={Platform.OS === 'web' ? { minHeight: '100vh' } : undefined}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-800">다이빙 로그</Text>
              <Text className="text-gray-600 mt-1">나의 다이빙 기록</Text>
            </View>
            <TouchableOpacity className="bg-primary-500 px-4 py-2 rounded-lg flex-row items-center">
              <Plus size={16} color="white" />
              <Text className="text-white font-medium ml-2">작성</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logs List */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 py-4">
            {dummyLogs.map((log) => (
              <TouchableOpacity
                key={log.id}
                className="bg-white rounded-lg shadow-sm p-4 mb-4"
              >
                <Text className="text-lg font-semibold text-gray-800 mb-2">
                  {log.title}
                </Text>
                
                <View className="flex-row items-center mb-2">
                  <MapPin size={16} color="#64748b" />
                  <Text className="text-gray-600 ml-2">{log.location}</Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Clock size={16} color="#64748b" />
                    <Text className="text-gray-600 ml-2">{log.duration}분</Text>
                  </View>
                  
                  <View className="flex-row items-center">
                    <Text className="text-primary-600 font-medium">
                      최대 {log.maxDepth}m
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center">
                    <Thermometer size={16} color="#64748b" />
                    <Text className="text-gray-600 ml-1">{log.temperature}°C</Text>
                  </View>
                </View>

                <View className="mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-gray-500 text-sm">{log.date}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}