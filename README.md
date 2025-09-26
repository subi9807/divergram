# Divergram - Korean Diving Community App

A production-ready mobile application for the Korean diving community built with Expo, TypeScript, and React Native. Features Korean OAuth providers (Kakao, Naver) alongside international options.

## 🏗️ Tech Stack

- **Framework**: Expo SDK (latest)
- **Language**: TypeScript
- **Navigation**: Expo Router with Tabs
- **State Management**: Zustand + React Query
- **Styling**: NativeWind (Tailwind CSS)
- **Storage**: MMKV (secure), SQLite (offline caching)
- **Internationalization**: i18next (Korean, English, Japanese)
- **Authentication**: OAuth (Google, Apple, Facebook) + Email/Password

## 🚀 Features

### Core Functionality
- **Authentication**: Social login (Google, Apple, Facebook, Kakao, Naver) and email/password
- **Dive Logging**: Create and manage diving logs with GPS tracking
- **Social Feed**: Community posts and diving experiences
- **Device Integration**: BLE connection to diving equipment
- **Offline Support**: SQLite caching for offline usage
- **Multi-language**: Korean, English, Japanese support

### Technical Features
- **Push Notifications**: Expo Notifications with FCM/APNs
- **GPS Tracking**: High-accuracy location for dive logs
- **BLE Integration**: Connect to diving computers and sensors
- **Deep Linking**: Universal links and custom scheme support
- **Error Handling**: Global error boundary and toast notifications
- **Permission Management**: Runtime permission requests

## 📱 Setup Instructions

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd divergram
npm install
```

2. **Environment Configuration:**
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

Required environment variables:
```env
DIVERGRAM_API_BASE=https://divergram.com
EXPO_PUBLIC_API_BASE_URL=https://divergram.com

# OAuth Configuration
GOOGLE_CLIENT_ID_IOS=your-google-client-id-ios
GOOGLE_CLIENT_ID_ANDROID=your-google-client-id-android
GOOGLE_CLIENT_ID_WEB=your-google-client-id-web

APPLE_SERVICE_ID=your-apple-service-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id

FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

KAKAO_REST_API_KEY=your-kakao-rest-api-key
KAKAO_JAVASCRIPT_KEY=your-kakao-javascript-key
KAKAO_NATIVE_APP_KEY=your-kakao-native-app-key
KAKAO_REDIRECT_URI=divergram://auth/kakao

NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
NAVER_REDIRECT_URI=divergram://auth/naver
```

3. **Start Development Server:**
```bash
npm run dev
```

### OAuth Configuration

#### Kakao OAuth Setup
1. Go to [Kakao Developers](https://developers.kakao.com/)
2. Create new application
3. Configure platform settings:
   - **iOS**: Bundle ID `com.divergram.app`
   - **Android**: Package name `com.divergram.app` + Key Hash
   - **Web**: Domain `divergram.com`
4. Set redirect URIs:
   - `divergram://auth/kakao`
   - `https://divergram.com/auth/callback/kakao`
5. Enable required scopes: profile_nickname, profile_image, account_email

#### Naver OAuth Setup
1. Go to [Naver Developers](https://developers.naver.com/)
2. Create new application
3. Configure service settings:
   - **Service Name**: Divergram
   - **Service URL**: https://divergram.com
4. Set redirect URIs:
   - `divergram://auth/naver`
   - `https://divergram.com/auth/callback/naver`
5. Enable required APIs: 회원프로필 조회

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create credentials (OAuth 2.0 Client IDs) for:
   - **iOS**: Bundle ID `com.divergram.app`
   - **Android**: Package name `com.divergram.app` + SHA-1 certificate
   - **Web**: Authorized redirect URIs:
     - `https://divergram.com/auth/callback`
     - Your development URL

#### Apple Sign In Setup
1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Create App ID with Sign In with Apple capability
3. Create Service ID with domain verification
4. Configure redirect URLs:
   - `https://divergram.com/auth/callback`
5. Generate private key for server-to-server authentication

#### Facebook Login Setup
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs:
   - `divergram://auth`
   - `https://divergram.com/auth/callback`

### Deep Linking Setup

#### Universal Links (iOS)
Add to your domain's `/.well-known/apple-app-site-association`:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.divergram.app",
        "paths": ["/auth/*", "/dive/*"]
      }
    ]
  }
}
```

#### App Links (Android)
Add to your domain's `/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.divergram.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

## 🏗️ Build & Deploy

### EAS Build Setup

1. **Install EAS CLI:**
```bash
npm install -g eas-cli
```

2. **Login to Expo:**
```bash
eas login
```

3. **Configure EAS:**
```bash
eas build:configure
```

4. **Build for Development:**
```bash
# iOS
eas build --platform ios --profile development

# Android  
eas build --platform android --profile development
```

5. **Build for Production:**
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### Push Notifications Setup

#### iOS (APNs)
1. Generate APNs key in Apple Developer Console
2. Upload to EAS credentials:
```bash
eas credentials
```

#### Android (FCM)
1. Create Firebase project
2. Download `google-services.json`
3. Upload to EAS credentials

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Testing
```bash
# Install Maestro (recommended)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run E2E tests
maestro test .maestro/
```

### Device Testing

#### BLE Testing
- Use BLE scanner apps to verify device discovery
- Test with actual diving computers if available
- Mock data is provided for development

#### GPS Testing  
- Test location permissions on both platforms
- Verify background location works (Android 10+)
- Test in different location accuracy scenarios

#### Push Notifications
```bash
# Send test notification
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[your-token]",
    "title": "Test",
    "body": "Testing push notifications"
  }'
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Screen.tsx
│   ├── Card.tsx
│   └── ...
├── features/           # Feature-specific components
│   ├── auth/
│   ├── feed/
│   ├── logs/
│   ├── devices/
│   └── profile/
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   ├── useBle.ts
│   └── ...
├── lib/                # Utility libraries
│   ├── api.ts
│   ├── i18n.ts
│   └── utils.ts
├── providers/          # React context providers
├── stores/             # Zustand stores
├── types/              # TypeScript type definitions
└── locales/            # i18n translation files
    ├── ko.json
    ├── en.json
    └── ja.json

app/                    # Expo Router pages
├── (auth)/             # Authentication flow
├── (tabs)/             # Main app tabs
└── _layout.tsx         # Root layout
```

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run lint             # Run linting
npm run test             # Run unit tests

# Building
npm run build:web        # Build for web
eas build --platform ios # Build for iOS
eas build --platform android # Build for Android

# Utilities
npx expo install         # Install compatible dependencies
npx expo doctor          # Check project health
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npx expo start -c  # Clear cache
```

**iOS build issues:**
```bash
cd ios && pod install  # Reinstall pods
```

**Android build issues:**
```bash
cd android && ./gradlew clean  # Clean Android build
```

**Permission issues:**
- Ensure Info.plist descriptions are added
- Check AndroidManifest.xml permissions
- Test on physical devices for accurate results

### Support

For issues and questions:
- Check [Expo Documentation](https://docs.expo.dev/)
- Visit [React Native Documentation](https://reactnative.dev/)
- Open issue in repository
- Contact: support@divergram.com

---

**Made with ❤️ for the Korean diving community**