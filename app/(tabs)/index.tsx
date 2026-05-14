import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Waves, MapPin, Clock, Users, BookOpen } from 'lucide-react-native';

export default function HomeScreen() {
  // 웹에서는 SafeAreaView 대신 일반 View 사용
  const Container = Platform.OS === 'web' ? View : SafeAreaView;

  return (
    <Container className="flex-1 bg-gray-50" style={Platform.OS === 'web' ? { minHeight: '100vh' } : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-primary-500 px-6 py-8">
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 bg-white rounded-full items-center justify-center mr-4">
              <Waves size={24} color="#0ea5e9" />
            </View>
            <View>
              <Text className="text-white text-2xl font-bold">Divergram</Text>
              <Text className="text-primary-100">다이빙 커뮤니티</Text>
            </View>
          </View>
          <Text className="text-primary-100 text-lg">
            다이빙 경험을 기록하고 공유하세요
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-6">
          <Text className="text-xl font-bold text-gray-800 mb-4">빠른 액션</Text>
          <View className="flex-row justify-between">
            <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm flex-1 mr-2 items-center">
              <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-2">
                <BookOpen size={24} color="#0ea5e9" />
              </View>
              <Text className="text-gray-800 font-medium">로그 작성</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm flex-1 mx-1 items-center">
              <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mb-2">
                <MapPin size={24} color="#10b981" />
              </View>
              <Text className="text-gray-800 font-medium">다이빙 사이트</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm flex-1 ml-2 items-center">
              <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-2">
                <Users size={24} color="#8b5cf6" />
              </View>
              <Text className="text-gray-800 font-medium">커뮤니티</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="px-6 pb-6">
          <Text className="text-xl font-bold text-gray-800 mb-4">최근 활동</Text>
          <View className="bg-white rounded-lg shadow-sm p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-800 font-medium">제주도 서귀포 다이빙</Text>
              <Text className="text-gray-500 text-sm">2일 전</Text>
            </View>
            <View className="flex-row items-center mb-2">
              <MapPin size={16} color="#64748b" />
              <Text className="text-gray-600 ml-2">서귀포 해양공원</Text>
            </View>
            <View className="flex-row items-center">
              <Clock size={16} color="#64748b" />
              <Text className="text-gray-600 ml-2">45분 • 최대 깊이 18m</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View className="px-6 pb-8">
          <Text className="text-xl font-bold text-gray-800 mb-4">나의 통계</Text>
          <View className="bg-white rounded-lg shadow-sm p-6">
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-2xl font-bold text-primary-600">12</Text>
                <Text className="text-gray-600 text-sm">총 다이빙</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-primary-600">25.5m</Text>
                <Text className="text-gray-600 text-sm">최대 깊이</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-primary-600">8.5h</Text>
                <Text className="text-gray-600 text-sm">총 시간</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Container>
  );
}