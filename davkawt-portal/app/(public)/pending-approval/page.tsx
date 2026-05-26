import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { logoutAction } from '../login/actions';
import { formatDate } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Pending Approval' };

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, batch_year, course, email, approval_status, rejection_reason, created_at')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  if (profile.approval_status === 'approved') {
    redirect('/dashboard');
  }

  const isRejected = profile.approval_status === 'rejected';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Card className="p-8">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              isRejected ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
            }`}
          >
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <Badge variant={isRejected ? 'error' : 'warning'}>
              {isRejected ? 'Rejected' : 'Pending Review'}
            </Badge>
            <h1 className="mt-1 font-sans text-2xl font-bold tracking-[-0.02em]">
              {isRejected ? 'Registration not approved' : 'Your registration is under review'}
            </h1>
          </div>
        </div>

        <div className="mt-6 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          <Row k="Name" v={profile.full_name} />
          <Row k="Email" v={profile.email} />
          <Row k="Batch" v={String(profile.batch_year)} />
          <Row k="Course" v={profile.course} />
          <Row k="Submitted" v={formatDate(profile.created_at)} />
        </div>

        {isRejected && profile.rejection_reason && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <strong>Reason:</strong> {profile.rejection_reason}
          </div>
        )}

        {!isRejected && (
          <p className="mt-6 text-sm text-slate-600">
            We typically review registrations within 2-3 working days. You&apos;ll receive an email
            once approved. If you have questions, write to{' '}
            <a href="mailto:contact@davkawt.org" className="text-[#0F2557] underline">
              contact@davkawt.org
            </a>
            .
          </p>
        )}

        <form action={logoutAction} className="mt-8">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-slate-900">{v}</span>
    </div>
  );
}
