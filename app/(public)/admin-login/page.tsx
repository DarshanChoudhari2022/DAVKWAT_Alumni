import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAdminAccess } from '@/lib/auth/admin-access';
import { isLocalAdminLoginConfigured } from '@/lib/auth/local-admin';
import { LoginForm } from '../login/LoginForm';
import { AdminLoginForm } from './AdminLoginForm';

export const metadata: Metadata = { title: 'Admin Sign In' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const adminAccess = await getAdminAccess();
  if (adminAccess) {
    redirect('/admin');
  }

  const sp = await searchParams;
  const redirectTo = sp.redirect?.startsWith('/admin') ? sp.redirect : '/admin';
  const useLocalAdminLogin = isLocalAdminLoginConfigured();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12 sm:px-6">
      <Card className="w-full p-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0F2557]/5 text-[#0F2557]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <Badge variant="primary">
              {useLocalAdminLogin ? 'Standalone Admin Access' : 'Private Access'}
            </Badge>
            <h1 className="font-sans text-3xl font-bold tracking-[-0.025em]">Admin sign in</h1>
            <p className="text-sm text-slate-500">
              {useLocalAdminLogin
                ? 'Use the dedicated admin credentials from your environment to open the admin dashboard.'
                : 'This route is reserved for DAVKAWT administrators and moderators.'}
            </p>
          </div>
        </div>
        {useLocalAdminLogin ? (
          <AdminLoginForm redirectTo={redirectTo} />
        ) : (
          <LoginForm redirectTo={redirectTo} />
        )}
      </Card>
    </div>
  );
}
