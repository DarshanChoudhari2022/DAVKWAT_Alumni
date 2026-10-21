import { notFound } from 'next/navigation';
import { REGISTRATION_PAYMENT_ENABLED } from './registration-status';

export function requireRegistrationPaymentEnabled() {
  if (!REGISTRATION_PAYMENT_ENABLED) notFound();
}
