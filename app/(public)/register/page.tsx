import type { Metadata } from 'next';
import { RegisterPageClient } from './RegisterPageClient';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  return <RegisterPageClient />;
}

