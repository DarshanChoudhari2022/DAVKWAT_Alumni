import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { resolveSignedInRedirect } from '@/lib/utils/auth-routing';
import { LoginForm } from '../login/LoginForm';

export const metadata: Metadata = { title: 'Admin Sign In' };

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approval_status')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      redirect(resolveSignedInRedirect('/admin', profile.role, profile.approval_status));
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12 sm:px-6">
      <Card className="w-full p-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0F2557]/5 text-[#0F2557]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <Badge variant="primary">Private Access</Badge>
            <h1 className="font-sans text-3xl font-bold tracking-[-0.025em]">Admin sign in</h1>
            <p className="text-sm text-slate-500">
              This route is reserved for DAVKAWT administrators and moderators.
            </p>
          </div>
        </div>
        <LoginForm redirectTo="/admin" />
      </Card>
    </div>
  );
}
