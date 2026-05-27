import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl">
          Register for DAVKAWT verification
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Share your academic, contact, and professional details so the Trust can
          verify your DAV Khagaul alumni status.
        </p>
      </div>
      <Card className="mt-8 p-6 sm:p-10">
        <RegisterForm />
      </Card>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[#0F2557] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
