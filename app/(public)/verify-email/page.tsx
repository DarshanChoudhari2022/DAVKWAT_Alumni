import type { Metadata } from 'next';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Verify Your Email - DAVKAWT' };

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <Card className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <MailCheck className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-4 font-sans text-2xl font-bold tracking-[-0.02em]">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We&apos;ve sent a verification link to your email address. Please click the link to
          verify your account and complete registration. Once verified, your profile will move into
          the admin review queue for approval.
        </p>
        <div className="mt-6 space-y-3">
          <p className="text-xs text-slate-500">
            Didn&apos;t receive the email? Check your spam folder or try registering again.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Back to Login</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Register Again</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
