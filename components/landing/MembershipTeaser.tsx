import Link from 'next/link';
import { ArrowRight, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Reveal } from './Reveal';

export function MembershipTeaser() {
  return (
    <section className="relative overflow-hidden bg-slate-50 py-14 md:py-20">
      <div aria-hidden className="absolute -right-24 top-10 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
            <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0F2557]">
                  <HeartHandshake className="h-3.5 w-3.5" />
                  Membership
                </span>
                <h2 className="mt-4 font-sans text-2xl font-bold tracking-[-0.025em] text-slate-900 sm:text-3xl">
                  Membership that gives back
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600 sm:text-base">
                  A modest contribution keeps the portal running securely — and part
                  of it goes directly toward welfare initiatives for current students
                  and alumni. See how membership works and what your contribution
                  supports.
                </p>
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Reviewed by the Trust committee before activation.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
                <Link
                  href="/membership-plans"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#0F2557] px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 sm:w-auto"
                >
                  View membership &amp; Fee
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
                >
                  Register as alumnus
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
