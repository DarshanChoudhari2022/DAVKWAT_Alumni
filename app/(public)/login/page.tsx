import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './LoginForm';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Sign In' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12 sm:px-6">
      <Card className="w-full p-8">
        <div className="space-y-1 text-center">
          <h1 className="font-sans text-3xl font-bold tracking-[-0.025em]">Member sign in</h1>
          <p className="text-sm text-slate-500">
            Approved alumni and Trust admins sign in here.
          </p>
        </div>
        <LoginForm redirectTo={redirect} />
        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-[#0F2557] hover:underline">
            Register for verification
          </Link>
        </p>
      </Card>
    </div>
  );
}
