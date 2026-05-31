import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlertCircle, CheckCircle2, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatINR } from '@/lib/utils/format';
import { PayButton } from './PayButton';

export const metadata: Metadata = { title: 'Membership' };

export default async function MembershipPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: profile }, { data: plans }, { data: payments }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email, is_paid_member, membership_type, membership_expires_at')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('membership_plans')
      .select('id, name, description, amount, membership_type, duration_months')
      .eq('is_active', true)
      .order('amount', { ascending: true }),
    supabase
      .from('payments')
      .select('id, plan_id, txnid, amount, status, payment_mode, created_at')
      .eq('alumni_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (!profile) {
    redirect('/login');
  }

  const isExpiringSoon =
    profile.membership_expires_at != null &&
    new Date(profile.membership_expires_at).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
  const pendingPlanIds = new Set(
    (payments ?? [])
      .filter((payment) => payment.status === 'pending' && payment.plan_id)
      .map((payment) => payment.plan_id as string)
  );
  const hasPendingMembershipRequest = pendingPlanIds.size > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Membership</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review the current alumni membership fee plans and notify the admin team which one you
          want to take up.
        </p>
      </header>

      {profile.is_paid_member ? (
        <Card className="mt-6 border-emerald-200 bg-emerald-50/50">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-emerald-800">
                Active Member
              </h2>
              <p className="mt-0.5 text-sm text-emerald-700">
                {profile.membership_type === 'lifetime'
                  ? 'Lifetime membership - never expires'
                  : profile.membership_expires_at
                    ? `Expires on ${formatDate(profile.membership_expires_at)}`
                    : 'Active membership'}
              </p>
              {isExpiringSoon && profile.membership_type !== 'lifetime' && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  Your membership expires soon. You can submit a renewal request below.
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : hasPendingMembershipRequest ? (
        <Card className="mt-6 border-blue-200 bg-blue-50/60">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-blue-900">
                Membership request received
              </h2>
              <p className="mt-0.5 text-sm text-blue-800">
                Your preferred membership plan has been recorded. An administrator will review it
                and share payment instructions separately while the online gateway remains offline.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mt-6 border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-amber-800">
                Membership fee collection is in manual review mode
              </h2>
              <p className="mt-0.5 text-sm text-amber-700">
                Select a plan below to notify the DAVKAWT admin team. They will confirm the next
                steps and activate payment processing separately.
              </p>
            </div>
          </div>
        </Card>
      )}

      {(!profile.is_paid_member || isExpiringSoon) && (
        <section className="mt-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-semibold">Choose a Plan</h2>
            <p className="text-sm text-slate-500">
              The payment gateway is temporarily disabled. Submitting a plan records your request
              for admin follow-up.
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(plans ?? []).map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.membership_type === 'lifetime'
                    ? 'border-[#0F2557] ring-1 ring-[#0F2557]/20'
                    : ''
                }`}
              >
                {plan.membership_type === 'lifetime' && (
                  <Badge variant="primary" className="absolute -top-2.5 right-4">
                    Recommended
                  </Badge>
                )}
                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                {plan.description && (
                  <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                )}
                <p className="mt-4 font-display text-3xl font-bold text-[#0F2557]">
                  {formatINR(Number(plan.amount))}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {plan.membership_type === 'lifetime'
                    ? 'One-time fee'
                    : `Per year${plan.duration_months ? ` (${plan.duration_months} months)` : ''}`}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <BenefitItem>Full alumni directory access</BenefitItem>
                  <BenefitItem>Event registrations and RSVP</BenefitItem>
                  <BenefitItem>Forum participation</BenefitItem>
                  <BenefitItem>Verified member badge</BenefitItem>
                  {plan.membership_type === 'lifetime' && (
                    <BenefitItem>Priority support and recognition</BenefitItem>
                  )}
                </ul>
                <div className="mt-6">
                  <PayButton
                    planId={plan.id}
                    planName={plan.name}
                    amount={Number(plan.amount)}
                    hasPendingRequest={pendingPlanIds.has(plan.id)}
                  />
                </div>
              </Card>
            ))}
            {(plans ?? []).length === 0 && (
              <Card className="col-span-full text-center text-sm text-slate-500">
                No membership plans are available at the moment.
              </Card>
            )}
          </div>
        </section>
      )}

      {(payments ?? []).length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Membership Requests</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Reference</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Mode</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments?.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-mono text-xs">{payment.txnid}</td>
                    <td className="py-3 pr-4">{formatINR(Number(payment.amount))}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          payment.status === 'success'
                            ? 'success'
                            : payment.status === 'failed'
                              ? 'error'
                              : 'warning'
                        }
                      >
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 capitalize">
                      {payment.payment_mode?.replace(/_/g, ' ') ?? 'manual review'}
                    </td>
                    <td className="py-3">{formatDate(payment.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function BenefitItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      {children}
    </li>
  );
}
