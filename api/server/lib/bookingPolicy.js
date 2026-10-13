export function getCancellationType(depositStatus) {
  return depositStatus === 'pending' ? 'pre_payment' : 'customer';
}
