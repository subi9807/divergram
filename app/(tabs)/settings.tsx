import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, 
  Bell, 
  Globe, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight 
} from 'lucide-react-native';

export default function SettingsScreen() {
  // 웹에서는 SafeAreaView 대신 일반 View 사용
  const Container = Platform.OS === 'web' ? View : SafeAreaView;
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  const settingsItems = [
    {
      icon: <User size={20} color="#64748b" />,
      title: '프로필 설정',
      subtitle: '개인정보 및 프로필 관리',
      hasArrow: true,
    },
    {
      icon: <Bell size={20} color="#64748b" />,
      title: '알림 설정',
      subtitle: '푸시 알림 및 이메일 설정',
      hasSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: setNotificationsEnabled,
    },
    {
      icon: <Globe size={20} color="#64748b" />,
      title: '언어 설정',
      subtitle: '한국어',
      hasArrow: true,
    },
    {
      icon: <Shield size={20} color="#64748b" />,
      title: '개인정보 보호',
      subtitle: '데이터 및 개인정보 설정',
      hasArrow: true,
    },
    {
      icon: <HelpCircle size={20} color="#64748b" />,
      title: '도움말 및 지원',
      subtitle: '자주 묻는 질문 및 고객지원',
      hasArrow: true,
    },
  ];

  return (
    <Container className="flex-1 bg-gray-50" style={Platform.OS === 'web' ? { minHeight: '100vh' } : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-800">설정</Text>
          <Text className="text-gray-600 mt-1">앱 설정 및 계정 관리</Text>
        </View>

        {/* Profile Section */}
        <View className="bg-white mt-4 mx-4 rounded-lg shadow-sm p-4">
          <View className="flex-row items-center">
            <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mr-4">
              <Text className="text-primary-600 text-xl font-bold">김</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-800">김다이버</Text>
              <Text className="text-gray-600">diver@example.com</Text>
              <Text className="text-primary-600 text-sm mt-1">프로필 편집</Text>
            </View>
          </View>
        </View>

        {/* Settings Items */}
        <View className="bg-white mt-4 mx-4 rounded-lg shadow-sm">
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className={`flex-row items-center p-4 ${
                index !== settingsItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <View className="mr-4">{item.icon}</View>
              <View className="flex-1">
                <Text className="text-gray-800 font-medium">{item.title}</Text>
                <Text className="text-gray-600 text-sm mt-1">{item.subtitle}</Text>
              </View>
              {item.hasSwitch && (
                <Switch
                  value={item.switchValue}
                  onValueChange={item.onSwitchChange}
                  trackColor={{ false: '#e2e8f0', true: '#0ea5e9' }}
                  thumbColor="#ffffff"
                />
              )}
              {item.hasArrow && <ChevronRight size={20} color="#64748b" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View className="bg-white mt-4 mx-4 rounded-lg shadow-sm p-4">
          <Text className="text-gray-800 font-medium mb-2">앱 정보</Text>
          <Text className="text-gray-600 text-sm">버전 1.0.0</Text>
          <Text className="text-gray-600 text-sm">© 2024 Divergram</Text>
        </View>

        {/* Logout Button */}
        <View className="mx-4 mt-6 mb-8">
          <TouchableOpacity className="bg-white rounded-lg shadow-sm p-4 flex-row items-center justify-center border border-red-200">
            <LogOut size={20} color="#ef4444" />
            <Text className="text-red-500 font-medium ml-2">로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}