import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AlertCircle, CheckCircle2, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton, TableRowSkeleton } from '@/components/shared/Skeleton';
import { SectionError } from '@/components/shared/SectionError';
import { requireAlumniAccess } from '@/lib/auth/alumni-access';
import { getMembershipPlansForAlumni } from '@/lib/cache/admin-cache';
import { formatDate, formatINR } from '@/lib/utils/format';
import { PayButton } from './PayButton';

export const metadata: Metadata = { title: 'Membership' };

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; payment?: string }>;
}) {
  const { profile } = await requireAlumniAccess();
  const sp = await searchParams;

  const isExpiringSoon =
    profile.membership_expires_at != null &&
    new Date(profile.membership_expires_at).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Shell: heading (synchronous) */}
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Membership</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review the current alumni membership fee plans and continue to payment when the gateway
          credentials are configured.
        </p>
      </header>

      {/* Shell: query-param feedback cards (synchronous) */}
      {sp.status === 'success' && (
        <Card className="mt-6 border-emerald-200 bg-emerald-50/60 text-sm text-emerald-800">
          Your payment was successful and your membership status has been updated.
        </Card>
      )}
      {sp.status === 'failed' && (
        <Card className="mt-6 border-rose-200 bg-rose-50/60 text-sm text-rose-700">
          Payment failed or was not completed. You can retry by choosing your membership plan
          again below.
        </Card>
      )}
      {sp.error && (
        <Card className="mt-6 border-amber-200 bg-amber-50/60 text-sm text-amber-800">
          Payment could not be completed: {sp.error.replace(/_/g, ' ')}.
        </Card>
      )}
      {sp.payment && (
        <Card className="mt-6 border-slate-200 bg-slate-50 text-sm text-slate-700">
          Receipt available for payment reference <span className="font-mono">{sp.payment}</span>. You can also open it from your payment history below.
        </Card>
      )}

      {/* Shell: status banner for active members (synchronous, auth data only) */}
      {profile.is_paid_member && (
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
                {profile.membership_expires_at
                  ? `Expires on ${formatDate(profile.membership_expires_at)}`
                  : 'Lifetime membership - never expires'}
              </p>
              {isExpiringSoon && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  Your membership expires soon. You can submit a renewal request below.
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Plans region (cached, ≤300s) — independent Suspense boundary */}
      <Suspense fallback={<PlansSkeleton />}>
        <PlansRegion
          isPaidMember={profile.is_paid_member}
          isExpiringSoon={isExpiringSoon}
        />
      </Suspense>

      {/* Payments region (fresh, identity-scoped) — independent Suspense boundary */}
      <Suspense fallback={<PaymentsSkeleton />}>
        <PaymentsRegion />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Async regions
// ---------------------------------------------------------------------------

/**
 * Plans region: reads cached membership plans + fresh pending-payment IDs.
 * The plans catalog is cached (≤300s); pending IDs require a fresh RLS query
 * so the user always sees the correct PayButton state.
 */
async function PlansRegion({
  isPaidMember,
  isExpiringSoon,
}: {
  isPaidMember: boolean;
  isExpiringSoon: boolean;
}) {
  try {
    const { database, userId } = await requireAlumniAccess();

    // Fetch cached plans and fresh pending payment IDs concurrently
    const [plans, { data: pendingPayments }] = await Promise.all([
      getMembershipPlansForAlumni(),
      database
        .from('payments')
        .select('plan_id')
        .eq('alumni_id', userId)
        .eq('status', 'pending'),
    ]);

    const pendingPlanIds = new Set(
      (pendingPayments ?? [])
        .filter((p) => p.plan_id)
        .map((p) => p.plan_id as string)
    );
    const hasPendingMembershipRequest = pendingPlanIds.size > 0;

    return (
      <>
        {/* Status banner for non-paid members (needs pending payment info) */}
        {!isPaidMember && (
          hasPendingMembershipRequest ? (
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
                    Your preferred membership plan has been recorded. If the payment gateway is not yet
                    configured, an administrator will review it and share the next steps separately.
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
                    Membership payment setup is pending credentials
                  </h2>
                  <p className="mt-0.5 text-sm text-amber-700">
                    Select a plan below to proceed. If Easebuzz credentials are not configured yet, the
                    request will be recorded for admin follow-up instead of redirecting to the gateway.
                  </p>
                </div>
              </div>
            </Card>
          )
        )}

        {/* Plan cards (shown when not paid or expiring soon) */}
        {(!isPaidMember || isExpiringSoon) && (
          <section className="mt-8">
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-xl font-semibold">Choose a Plan</h2>
              <p className="text-sm text-slate-500">
                If Easebuzz is configured, you will be redirected to complete payment online. If not,
                the request will be recorded for manual follow-up.
              </p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {plans.map((plan) => (
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
              {plans.length === 0 && (
                <Card className="col-span-full text-center text-sm text-slate-500">
                  No membership plans are available at the moment.
                </Card>
              )}
            </div>
          </section>
        )}
      </>
    );
  } catch {
    return <SectionError title="Couldn't load membership plans." />;
  }
}

/**
 * Payments region: always fresh via the user's RLS-scoped client (never cached).
 * Identity-scoped data (Req 3.6, 7.1, 7.3).
 */
async function PaymentsRegion() {
  try {
    const { database, userId } = await requireAlumniAccess();

    const { data: payments } = await database
      .from('payments')
      .select('id, plan_id, txnid, amount, status, payment_mode, created_at, receipt_url')
      .eq('alumni_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!payments || payments.length === 0) {
      return null;
    }

    return (
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
                <th className="pb-2">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
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
                  <td className="py-3">
                    {payment.receipt_url ? (
                      <a
                        href={payment.receipt_url}
                        className="text-[#0F2557] underline hover:no-underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  } catch {
    return <SectionError title="Couldn't load payment history." />;
  }
}

// ---------------------------------------------------------------------------
// Skeleton fallbacks
// ---------------------------------------------------------------------------

function PlansSkeleton() {
  return (
    <section className="mt-8">
      <div className="mb-4 h-7 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mb-2 h-4 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CardSkeleton className="h-64" />
        <CardSkeleton className="h-64" />
      </div>
    </section>
  );
}

function PaymentsSkeleton() {
  return (
    <section className="mt-10">
      <div className="mb-4 h-7 w-48 animate-pulse rounded bg-slate-200" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {Array.from({ length: 6 }).map((_, i) => (
                <th key={i} className="pb-2 pr-4">
                  <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableRowSkeleton cols={6} />
            <TableRowSkeleton cols={6} />
            <TableRowSkeleton cols={6} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BenefitItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      {children}
    </li>
  );
}
