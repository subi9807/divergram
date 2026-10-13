import { requireNativeViewManager } from 'expo-modules-core';
import type { ComponentType } from 'react';
import { Platform, type ViewProps } from 'react-native';

type NativeApplePayButtonProps = ViewProps & {
  onButtonPress?: () => void;
};

const NativeApplePayButton = Platform.OS === 'ios'
  ? requireNativeViewManager<NativeApplePayButtonProps>('DivergramApplePay')
  : null;

export function ApplePayButton({ disabled = false, onPress }: { disabled?: boolean; onPress: () => void }) {
  if (!NativeApplePayButton) return null;
  const Button = NativeApplePayButton as ComponentType<NativeApplePayButtonProps>;
  return (
    <Button
      accessibilityLabel="Apple Pay"
      onButtonPress={disabled ? undefined : onPress}
      pointerEvents={disabled ? 'none' : 'auto'}
      style={{ marginTop: 12, width: '100%', height: 48, opacity: disabled ? 0.55 : 1 }}
    />
  );
}
