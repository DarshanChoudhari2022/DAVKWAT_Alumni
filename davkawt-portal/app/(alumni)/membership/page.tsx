import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2, Crown, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatINR, formatDate } from '@/lib/utils/format';
import { PayButton } from './PayButton';

export const metadata: Metadata = { title: 'Membership' };

export default async function MembershipPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: plans }, { data: payments }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email, is_paid_member, membership_type, membership_expires_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('membership_plans')
      .select('id, name, description, amount, membership_type, duration_months')
      .eq('is_active', true)
      .order('amount', { ascending: true }),
    supabase
      .from('payments')
      .select('id, txnid, amount, status, payment_mode, created_at')
      .eq('alumni_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (!profile) redirect('/login');

  const isExpiringSoon =
    profile.membership_expires_at &&
    new Date(profile.membership_expires_at).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Membership</h1>
        <p className="mt-1 text-sm text-slate-500">
          Support the Trust and enjoy exclusive member benefits.
        </p>
      </header>

      {/* Current status */}
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
                  ? 'Lifetime membership — never expires'
                  : profile.membership_expires_at
                    ? `Expires on ${formatDate(profile.membership_expires_at)}`
                    : 'Active membership'}
              </p>
              {isExpiringSoon && profile.membership_type !== 'lifetime' && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  Your membership expires soon. Consider renewing below.
                </div>
              )}
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
                Not a paying member yet
              </h2>
              <p className="mt-0.5 text-sm text-amber-700">
                Choose a plan below to become a member and support the alumni community.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Plans */}
      {(!profile.is_paid_member || isExpiringSoon) && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">Choose a Plan</h2>
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
                  <Badge
                    variant="primary"
                    className="absolute -top-2.5 right-4"
                  >
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
                    ? 'One-time payment'
                    : `Per year${plan.duration_months ? ` (${plan.duration_months} months)` : ''}`}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <BenefitItem>Full alumni directory access</BenefitItem>
                  <BenefitItem>Event registrations & RSVP</BenefitItem>
                  <BenefitItem>Forum participation</BenefitItem>
                  <BenefitItem>Verified member badge</BenefitItem>
                  {plan.membership_type === 'lifetime' && (
                    <BenefitItem>Priority support & recognition</BenefitItem>
                  )}
                </ul>
                <div className="mt-6">
                  <PayButton
                    planId={plan.id}
                    planName={plan.name}
                    amount={Number(plan.amount)}
                  />
                </div>
              </Card>
            ))}
            {(plans ?? []).length === 0 && (
              <Card className="col-span-full text-center text-sm text-slate-500">
                No membership plans available at the moment.
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Payment history */}
      {(payments ?? []).length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Payment History</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Transaction ID</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Mode</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments?.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-mono text-xs">{p.txnid}</td>
                    <td className="py-3 pr-4">{formatINR(Number(p.amount))}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          p.status === 'success'
                            ? 'success'
                            : p.status === 'failed'
                              ? 'error'
                              : 'warning'
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 capitalize">{p.payment_mode ?? '—'}</td>
                    <td className="py-3">{formatDate(p.created_at)}</td>
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
