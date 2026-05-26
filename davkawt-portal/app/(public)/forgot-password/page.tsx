import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ForgotForm } from './ForgotForm';

export const metadata: Metadata = { title: 'Reset Password' };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12 sm:px-6">
      <Card className="w-full p-8">
        <h1 className="font-sans text-3xl font-bold tracking-[-0.025em]">Reset password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your email and we&apos;ll send you a reset link.
        </p>
        <ForgotForm />
        <p className="mt-6 text-center text-sm text-slate-600">
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-[#0F2557] hover:underline">
            Back to login
          </Link>
        </p>
      </Card>
    </div>
  );
}
