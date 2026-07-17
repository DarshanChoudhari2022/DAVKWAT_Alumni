import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AlertCircle, CheckCircle2, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton } from '@/components/shared/Skeleton';
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
          Receipt available for payment reference <span className="font-mono">{sp.payment}</span>.
        </Card>
      )}

      {/* Shell: status banner for active members (synchronous, auth data only) */}
      {profile.profile_type === 'faculty' ? (
        <Card className="mt-6 border-emerald-200 bg-emerald-50/50">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-emerald-800">
                Faculty Member
              </h2>
              <p className="mt-0.5 text-sm text-emerald-700">
                Faculty accounts receive complimentary lifetime membership and full portal access.
              </p>
            </div>
          </div>
        </Card>
      ) : profile.is_paid_member ? (
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
      ) : null}

      {/* Plans region (cached, ≤300s) — independent Suspense boundary */}
      {profile.profile_type !== 'faculty' && (
        <Suspense fallback={<PlansSkeleton />}>
          <PlansRegion
            isPaidMember={profile.is_paid_member}
            isExpiringSoon={isExpiringSoon}
            profileType={profile.profile_type}
          />
        </Suspense>
      )}

      {/* Payments region (fresh, identity-scoped) — independent Suspense boundary */}
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
  profileType: _profileType,
}: {
  isPaidMember: boolean;
  isExpiringSoon: boolean;
  profileType: 'alumni' | 'faculty';
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
                    Manual membership payment review
                  </h2>
                  <p className="mt-0.5 text-sm text-amber-700">
                    Select a plan below to record your membership request for admin verification.
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
                Payments are verified manually by the admin team using proof of payment.
              </p>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col justify-between ${
                    plan.membership_type === 'annual'
                      ? 'border-[#0F2557] ring-1 ring-[#0F2557]/20'
                      : ''
                  }`}
                >
                  <div>
                    {plan.membership_type === 'annual' && (
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
                      {plan.membership_type === 'annual'
                        ? `Per year${plan.duration_months ? ` (${plan.duration_months} months)` : ''}`
                        : 'One-time fee'}
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      <BenefitItem>Full alumni directory access</BenefitItem>
                      <BenefitItem>Event registrations and RSVP</BenefitItem>
                      <BenefitItem>Forum participation</BenefitItem>
                      <BenefitItem>Verified member badge</BenefitItem>
                      {plan.membership_type === 'annual' && (
                        <BenefitItem>Annual renewal reminders</BenefitItem>
                      )}
                    </ul>
                  </div>
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

              {/* Faculty Option Card */}
              <Card className="relative flex flex-col justify-between border-slate-200">
                <div>
                  <h3 className="font-display text-xl font-semibold">Faculty Membership</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Lifetime portal access for teachers and staff of DAV Khagaul.
                  </p>
                  <p className="mt-4 font-display text-3xl font-bold text-[#0F2557]">
                    Complimentary
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Lifetime
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    <BenefitItem>Full directory access</BenefitItem>
                    <BenefitItem>Event registrations and RSVP</BenefitItem>
                    <BenefitItem>Forum participation</BenefitItem>
                    <BenefitItem>Verified faculty badge</BenefitItem>
                  </ul>
                </div>
                <div className="mt-6">
                  <Badge variant="default" className="w-full justify-center py-2 text-sm">
                    Verified Faculty Only
                  </Badge>
                </div>
              </Card>

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

// ---------------------------------------------------------------------------
// Skeleton fallbacks
// ---------------------------------------------------------------------------

function PlansSkeleton() {
  return (
    <section className="mt-8">
      <div className="mb-4 h-7 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mb-2 h-4 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <CardSkeleton className="h-64" />
        <CardSkeleton className="h-64" />
        <CardSkeleton className="h-64" />
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
