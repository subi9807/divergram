import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type SocialProvider = 'google' | 'apple' | 'instagram';

type SocialBrandIconProps = {
  provider: SocialProvider;
  size?: number;
};

export function SocialBrandIcon({ provider, size = 24 }: SocialBrandIconProps) {
  if (provider === 'google') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Google">
        <Path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.2-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.34 2.98-7.39Z" />
        <Path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.43l-3.24-2.53c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
        <Path fill="#FBBC05" d="M6.39 13.87A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.52H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.48l3.35-2.61Z" />
        <Path fill="#EA4335" d="M12 6c1.47 0 2.78.5 3.82 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.61C7.18 7.76 9.39 6 12 6Z" />
      </Svg>
    );
  }

  if (provider === 'apple') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Apple">
        <Path
          fill="#000000"
          d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.32.03-1.75-.79-3.27-.79-1.53 0-2 .77-3.25.82-1.3.05-2.29-1.32-3.13-2.55-1.7-2.46-3-6.95-1.25-9.99.87-1.51 2.43-2.47 4.12-2.5 1.28-.02 2.5.87 3.27.87.76 0 2.2-1.07 3.71-.91.63.03 2.4.25 3.54 1.92-.09.06-2.11 1.24-2.09 3.75.03 3 2.63 4 2.66 4.01-.03.07-.41 1.42-1.26 2.9M13.15 3.69c.64-.73 1.69-1.28 2.61-1.32.12 1.08-.28 2.16-.9 2.93-.61.78-1.62 1.38-2.62 1.3-.14-1.06.36-2.16.91-2.91Z"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Instagram">
      <Defs>
        <LinearGradient id="instagramGradient" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFDC80" />
          <Stop offset="0.28" stopColor="#F77737" />
          <Stop offset="0.52" stopColor="#E1306C" />
          <Stop offset="0.76" stopColor="#C13584" />
          <Stop offset="1" stopColor="#405DE6" />
        </LinearGradient>
      </Defs>
      <Rect width="24" height="24" rx="6" fill="url(#instagramGradient)" />
      <Rect x="5.1" y="5.1" width="13.8" height="13.8" rx="4.1" fill="none" stroke="#ffffff" strokeWidth="1.9" />
      <Circle cx="12" cy="12" r="3.25" fill="none" stroke="#ffffff" strokeWidth="1.9" />
      <Circle cx="16.95" cy="7.25" r="1.15" fill="#ffffff" />
    </Svg>
  );
}
