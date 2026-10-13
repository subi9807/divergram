import { requireOptionalNativeModule } from 'expo-modules-core';

export type ApplePayAuthorizationOptions = {
  merchantIdentifier: string;
  countryCode: string;
  currencyCode: string;
  amount: string;
  label: string;
  bookingId: string;
  authorizationUrl: string;
  authorizationToken: string;
  idempotencyKey: string;
  supportedNetworks: string[];
};

export type ApplePayAuthorizationResult = {
  status: 'succeeded';
  bookingId: string;
  paymentIntentId: string;
  receiptUrl?: string;
};

type NativeApplePayModule = {
  isAvailableAsync(networks: string[]): Promise<boolean>;
  authorizeAsync(options: ApplePayAuthorizationOptions): Promise<ApplePayAuthorizationResult>;
};

const nativeModule = requireOptionalNativeModule<NativeApplePayModule>('DivergramApplePay');

export async function isAvailableAsync(networks: string[]) {
  return nativeModule ? nativeModule.isAvailableAsync(networks) : false;
}

export async function authorizeAsync(options: ApplePayAuthorizationOptions) {
  if (!nativeModule) throw new Error('apple_pay_native_module_unavailable');
  return nativeModule.authorizeAsync(options);
}
