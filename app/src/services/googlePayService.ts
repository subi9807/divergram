import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  authorizeAsync,
  isAvailableAsync,
  type GooglePayOptions,
} from '../../modules/divergram-google-pay/src';
import { getApiEndpoint, type ResortBooking, type ResortPaymentConfig } from '../lib/api';
import { getSecureAuthValue } from '../lib/secureAuthStorage';

function optionsForBooking(booking: ResortBooking, config: ResortPaymentConfig): GooglePayOptions {
  const authorizationToken = getSecureAuthValue('auth_token');
  if (!authorizationToken) throw new Error('unauthorized');
  const amount = Number(booking.depositAmount || 0);
  if (!Number.isFinite(amount) || amount <= 0 || booking.depositCurrency !== 'USD') {
    throw new Error('resort_booking_deposit_not_payable');
  }
  return {
    ...config.googlePay,
    currencyCode: 'USD',
    amount: amount.toFixed(2),
    bookingId: booking.id,
    authorizationUrl: getApiEndpoint(`/resort-bookings/${encodeURIComponent(booking.id)}/payments/google-pay/authorize`),
    authorizationToken,
    idempotencyKey: `googlepay:${booking.id}:${Crypto.randomUUID()}`,
  };
}

export async function canUseGooglePay(config?: ResortPaymentConfig | null) {
  if (Platform.OS !== 'android' || !config?.enabled || !config.googlePay?.enabled) return false;
  return isAvailableAsync({
    ...config.googlePay,
    currencyCode: 'USD',
    amount: '0.01',
    bookingId: 'availability',
    authorizationUrl: '',
    authorizationToken: '',
    idempotencyKey: '',
  });
}

export async function payResortBookingWithGooglePay(booking: ResortBooking, config: ResortPaymentConfig) {
  if (Platform.OS !== 'android' || !config.googlePay?.enabled) throw new Error('google_pay_unavailable');
  return authorizeAsync(optionsForBooking(booking, config));
}
