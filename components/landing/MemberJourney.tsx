import Link from 'next/link';
import { Reveal } from './Reveal';
import { UserPlus, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    header: 'Complete your registration',
    detail: 'Share your batch year, course, and contact details. It takes only a few minutes.',
  },
  {
    icon: ShieldCheck,
    header: 'Trust committee review',
    detail: 'The Trust verifies your details against school records to keep the network alumni-only. This may take a little time.',
  },
  {
    icon: KeyRound,
    header: 'Activate your membership',
    detail: 'Once approved, complete your membership contribution through our secure payment partner and sign in to access the full network.',
  },
];

export function MemberJourney() {
  return (
    <section className="bg-[#070b22] py-16 text-white md:py-24 relative overflow-hidden">
      <div aria-hidden className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl lg:text-[42px]">
              How membership works
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-white/60">
              A simple, vetted process that keeps the network genuine and alumni-only.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal key={step.header} delay={index * 150}>
              <div className="relative flex flex-col items-center text-center">
                {index !== steps.length - 1 && (
                  <div
                    className="absolute left-[60%] top-[30px] hidden w-[80%] border-t border-dashed border-white/20 md:block"
                    aria-hidden="true"
                  />
                )}
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 shadow-lg shadow-indigo-500/10 border border-white/10 backdrop-blur-md">
                  <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-sky-400 text-[11px] font-bold text-[#070b22]">
                    {index + 1}
                  </span>
                  <step.icon className="h-7 w-7 text-indigo-400" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">{step.header}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/60 px-4">
                  {step.detail}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <div className="mt-14 flex flex-col items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-400 hover:to-orange-400"
            >
              Register as alumnus
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-white/50">
              Payments are secure and covered by our{' '}
              <Link href="/refund" className="underline hover:no-underline">
                Refund Policy
              </Link>
              . Already a member?{' '}
              <Link href="/login" className="text-white/80 underline hover:no-underline">
                Member sign in
              </Link>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
