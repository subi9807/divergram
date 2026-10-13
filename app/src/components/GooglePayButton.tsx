import { NativeGooglePayButton } from '../../modules/divergram-google-pay/src';

export function GooglePayButton({ disabled = false, onPress }: { disabled?: boolean; onPress: () => void }) {
  if (!NativeGooglePayButton) return null;
  const Button = NativeGooglePayButton;
  return (
    <Button
      accessibilityLabel="Google Pay"
      onButtonPress={disabled ? undefined : onPress}
      pointerEvents={disabled ? 'none' : 'auto'}
      style={{ marginTop: 12, width: '100%', height: 48, opacity: disabled ? 0.55 : 1 }}
    />
  );
}
