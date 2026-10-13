import type { ResortBooking } from '../../lib/api';

export const RESORT_BOOKING_STAGES = ['received', 'payment', 'review', 'confirmed', 'completed'] as const;

export type ResortBookingStage = (typeof RESORT_BOOKING_STAGES)[number];

export function getResortBookingStage(booking: ResortBooking): ResortBookingStage {
  if (booking.status === 'completed') return 'completed';
  if (booking.status === 'confirmed' || booking.status === 'no_show') return 'confirmed';
  if (booking.status === 'rejected' || booking.status === 'cancelled') return 'received';
  if (Number(booking.depositAmount || 0) > 0 && booking.depositStatus === 'pending') return 'payment';
  return 'review';
}

export function getResortBookingStatusKey(booking: ResortBooking) {
  if (booking.status === 'cancelled' && booking.cancellationType === 'pre_payment') {
    return 'pre_payment_cancelled';
  }
  return booking.status;
}

export function canPayResortBookingDeposit(booking: ResortBooking) {
  return ['pending', 'confirmed'].includes(booking.status)
    && booking.depositStatus === 'pending'
    && Number(booking.depositAmount || 0) > 0;
}
