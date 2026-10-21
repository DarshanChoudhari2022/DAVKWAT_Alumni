import type { Metadata } from 'next';
import { RegisterPageClient } from './RegisterPageClient';
import { requireRegistrationEnabled } from '@/lib/registration-guard';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  requireRegistrationEnabled();
  return <RegisterPageClient />;
}

