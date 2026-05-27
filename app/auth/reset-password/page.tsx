import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = { title: 'Set New Password — DAVKAWT' };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-16 sm:px-6">
      <Card className="w-full p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Set new password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your new password below.
        </p>
        <ResetPasswordForm />
      </Card>
    </div>
  );
}
