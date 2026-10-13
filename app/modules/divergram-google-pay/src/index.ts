import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import type { ComponentType } from 'react';
import { Platform, type ViewProps } from 'react-native';

export type GooglePayOptions = {
  environment: 'TEST' | 'PRODUCTION';
  merchantName: string;
  merchantId: string;
  countryCode: string;
  currencyCode: string;
  amount: string;
  bookingId: string;
  authorizationUrl: string;
  authorizationToken: string;
  idempotencyKey: string;
  supportedNetworks: string[];
  gateway: string;
  gatewayMerchantId: string;
};

export type GooglePayResult = {
  status: 'succeeded';
  bookingId: string;
  paymentIntentId: string;
  receiptUrl?: string;
};

type NativeGooglePayModule = {
  isAvailableAsync(options: GooglePayOptions): Promise<boolean>;
  authorizeAsync(options: GooglePayOptions): Promise<GooglePayResult>;
};

type NativeGooglePayButtonProps = ViewProps & { onButtonPress?: () => void };

const nativeModule = requireOptionalNativeModule<NativeGooglePayModule>('DivergramGooglePay');
export const NativeGooglePayButton = Platform.OS === 'android'
  ? requireNativeViewManager<NativeGooglePayButtonProps>('DivergramGooglePay') as ComponentType<NativeGooglePayButtonProps>
  : null;

export async function isAvailableAsync(options: GooglePayOptions) {
  return nativeModule ? nativeModule.isAvailableAsync(options) : false;
}

export async function authorizeAsync(options: GooglePayOptions) {
  if (!nativeModule) throw new Error('google_pay_native_module_unavailable');
  return nativeModule.authorizeAsync(options);
}
