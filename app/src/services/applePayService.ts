import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { authorizeAsync, isAvailableAsync } from '../../modules/divergram-apple-pay/src';
import { getApiEndpoint, type ResortBooking, type ResortPaymentConfig } from '../lib/api';
import { getSecureAuthValue } from '../lib/secureAuthStorage';

export async function canUseApplePay(config?: ResortPaymentConfig | null) {
  if (Platform.OS !== 'ios' || !config?.enabled || !config.applePay?.enabled) return false;
  return isAvailableAsync(config.applePay.supportedNetworks);
}

export async function payResortBookingWithApplePay(booking: ResortBooking, config: ResortPaymentConfig) {
  if (!await canUseApplePay(config)) throw new Error('apple_pay_unavailable');
  const authorizationToken = getSecureAuthValue('auth_token');
  if (!authorizationToken) throw new Error('unauthorized');
  const amount = Number(booking.depositAmount || 0);
  if (!Number.isFinite(amount) || amount <= 0 || booking.depositCurrency !== 'USD') {
    throw new Error('resort_booking_deposit_not_payable');
  }
  const idempotencyKey = `applepay:${booking.id}:${Crypto.randomUUID()}`;
  return authorizeAsync({
    merchantIdentifier: config.applePay.merchantIdentifier,
    countryCode: config.applePay.countryCode,
    currencyCode: 'USD',
    amount: amount.toFixed(2),
    label: booking.resortName || 'Divergram resort booking',
    bookingId: booking.id,
    authorizationUrl: getApiEndpoint(`/resort-bookings/${encodeURIComponent(booking.id)}/payments/apple-pay/authorize`),
    authorizationToken,
    idempotencyKey,
    supportedNetworks: config.applePay.supportedNetworks,
  });
}
