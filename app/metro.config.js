const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// 웹 플랫폼 지원을 위한 설정
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// 웹에서 사용할 수 없는 모듈들에 대한 alias 설정
config.resolver.alias = {
  'react-native-ble-plx': 'react-native-web',
  'react-native-mmkv': '@react-native-async-storage/async-storage',
};

module.exports = withNativeWind(config, { input: './global.css' });