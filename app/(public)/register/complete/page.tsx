import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/card';
import { RegisterCompleteForm } from './RegisterCompleteForm';
import { requireRegistrationEnabled } from '@/lib/registration-guard';

export const metadata: Metadata = { title: 'Complete Registration - DAVKAWT' };

export default async function RegisterCompletePage() {
  requireRegistrationEnabled();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Double check if profile exists
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) {
    redirect('/dashboard');
  }

  const initialData = {
    email: user.email ?? '',
    full_name: user.user_metadata?.full_name ?? '',
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-xl p-8">
        <div className="space-y-2 text-center mb-8">
          <h1 className="font-sans text-3xl font-bold tracking-[-0.025em] text-[#0F2557]">
            Complete Registration
          </h1>
          <p className="text-sm text-slate-500">
            Welcome! Please complete your academic and contact details to submit your profile for admin verification.
          </p>
        </div>
        <RegisterCompleteForm initialData={initialData} />
      </Card>
    </div>
  );
}
