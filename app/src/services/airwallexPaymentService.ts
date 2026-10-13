import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { apiClient, type ResortBooking, type ResortPaymentConfig } from '../lib/api';
import i18n from '../lib/i18n';

export async function canUseAirwallex(config?: ResortPaymentConfig | null) {
  return Boolean(config?.enabled && config.provider === 'airwallex' && config.card?.enabled && config.card.mode === 'airwallex_hpp');
}

export async function payResortBookingWithAirwallex(booking: ResortBooking, config: ResortPaymentConfig) {
  if (!await canUseAirwallex(config)) throw new Error('airwallex_unavailable');
  const idempotencyKey = `airwallex:${booking.id}:${Crypto.randomUUID()}`;
  const session = await apiClient.createAirwallexPaymentSession(booking.id, idempotencyKey, i18n.resolvedLanguage || i18n.language || 'en');
  if (session.alreadyProcessed) return session;
  if (!session.checkoutUrl) throw new Error('airwallex_checkout_url_missing');
  const result = await WebBrowser.openAuthSessionAsync(session.checkoutUrl, 'divergram://payment/airwallex');
  if (result.type === 'cancel' || result.type === 'dismiss') throw new Error('airwallex_checkout_cancelled');
  return session;
}
