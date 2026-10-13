import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { apiClient, type ResortBooking, type ResortPaymentConfig } from '../lib/api';
import i18n from '../lib/i18n';

export async function canUsePayPal(config?: ResortPaymentConfig | null) {
  return Boolean(config?.enabled && config.provider === 'paypal' && config.paypal?.enabled && config.card?.enabled && config.card.mode === 'paypal_checkout');
}

export async function payResortBookingWithPayPal(booking: ResortBooking, config: ResortPaymentConfig) {
  if (!await canUsePayPal(config)) throw new Error('paypal_unavailable');
  const idempotencyKey = `paypal:${booking.id}:${Crypto.randomUUID()}`;
  const session = await apiClient.createPayPalPaymentSession(booking.id, idempotencyKey, i18n.resolvedLanguage || i18n.language || 'en');
  if (session.alreadyProcessed) return session;
  if (!session.checkoutUrl) throw new Error('paypal_checkout_url_missing');
  const result = await WebBrowser.openAuthSessionAsync(session.checkoutUrl, 'divergram://payment/paypal');
  if (result.type === 'cancel' || result.type === 'dismiss') throw new Error('paypal_checkout_cancelled');
  return session;
}
