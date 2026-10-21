import { notFound } from 'next/navigation';
import { REGISTRATION_ENABLED } from './registration-status';

export function requireRegistrationEnabled() {
  if (!REGISTRATION_ENABLED) notFound();
}
