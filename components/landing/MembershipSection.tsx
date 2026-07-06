import Link from 'next/link';
import { ArrowRight, CheckCircle2, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Reveal } from './Reveal';
import { formatINR } from '@/lib/utils/format';

interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  amount: number | string;
  membership_type: string;
  duration_months: number | null;
}

interface MembershipSectionProps {
  plans: MembershipPlan[];
}

const SUPPORTS = [
  'Secure upkeep of the verified alumni portal and directory.',
  'Organising reunions, chapter meets, and mentorship circles.',
  'Welfare initiatives for students and alumni, run by the Trust.',
  'Keeping the network genuine, private, and well-maintained over time.',
];

function planPeriod(plan: MembershipPlan): string {
  if (plan.membership_type === 'lifetime') return 'one-time';
  if (plan.duration_months && plan.duration_months !== 12) {
    return `every ${plan.duration_months} months`;
  }
  return 'per year';
}

export function MembershipSection({ plans }: MembershipSectionProps) {
  const hasPlans = plans.length > 0;

  return (
    <section
      id="membership"
      className="scroll-lift relative overflow-hidden bg-slate-50 py-16 md:py-24"
    >
      <div aria-hidden className="absolute -right-24 top-16 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0F2557] shadow-sm">
              <HeartHandshake className="h-3.5 w-3.5" />
              Membership
            </span>
            <h2 className="mt-5 font-sans text-3xl font-bold tracking-[-0.025em] text-slate-900 sm:text-4xl lg:text-[42px]">
              Membership that gives back
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
              Membership of the DAV Khagaul alumni network is supported by a modest
              contribution. It keeps the portal running securely — and a part of it
              goes directly toward welfare initiatives for current students and
              alumni in need.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1fr_0.9fr]">
          {/* Fee */}
          <Reveal direction="left">            <div className="grid gap-5 sm:grid-cols-2">
              {hasPlans ? (
                <>
                  {plans.map((plan) => {
                    const isLifetime = plan.membership_type === 'lifetime';
                    return (
                      <div
                        key={plan.id}
                        className={`relative flex h-full flex-col rounded-3xl border bg-white p-6 shadow-sm ${isLifetime ? 'border-[#0F2557] ring-1 ring-[#0F2557]/15' : 'border-slate-200'
                          }`}
                      >
                        {isLifetime && (
                          <span className="absolute -top-2.5 right-5 rounded-full bg-[#0F2557] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            Recommended
                          </span>
                        )}
                        <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                        {plan.description && (
                          <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                        )}
                        <p className="mt-4 font-sans text-3xl font-bold text-[#0F2557]">
                          {formatINR(Number(plan.amount))}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{planPeriod(plan)}</p>
                        <p className="mt-4 text-xs text-slate-500">
                          One simple contribution. No hidden charges.
                        </p>
                        <div className="mt-auto pt-6">
                          <Link
                            href="/register"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#0F2557] px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800"
                          >
                            Register as alumnus
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                  {/* Faculty Plan Card */}
                  <div className="relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900">Faculty Membership</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Lifetime portal access for teachers and staff of DAV Khagaul.
                    </p>
                    <p className="mt-4 font-sans text-3xl font-bold text-[#0F2557]">
                      Free
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">Lifetime</p>
                    <p className="mt-4 text-xs text-slate-500">
                      Verification required by the Trust committee.
                    </p>
                    <div className="mt-auto pt-6">
                      <Link
                        href="/register/faculty"
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
                      >
                        Register as faculty
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <p className="text-base font-semibold text-slate-900">
                    Membership plans are being finalised.
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    You can register now — the Trust will share membership details
                    once your profile is verified.
                  </p>
                  <Link
                    href="/register"
                    className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0F2557] px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800"
                  >
                    Register as alumnus
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Payments are processed securely. Refunds are handled as per our{' '}
              <Link href="/refund" className="font-medium text-[#0F2557] underline hover:no-underline">
                Refund Policy
              </Link>
              .
            </p>
          </Reveal>

          {/* What it supports */}
          <Reveal direction="right" delay={120}>
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                What your contribution supports
              </h3>
              <ul className="mt-5 space-y-4">
                {SUPPORTS.map((s) => (
                  <li key={s} className="flex items-start gap-3 text-[15px] text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-500" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                Reconnecting with your batch and giving back to DAV Khagaul go hand in
                hand — your membership keeps the community thriving for the next
                generation.
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
