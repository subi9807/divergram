import { Platform } from 'react-native';

// Digital memberships use the platform stores. Physical resort deposits use
// the server-configured PayPal checkout. Donations stay disabled until a
// store-policy-safe product and entitlement model is defined.
export const storeSubscriptionsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';
export const resortDepositPaymentsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';
export const donationPaymentsAvailable = false;
