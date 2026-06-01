import Link from 'next/link';
import { Landmark, ShieldCheck, Lock, ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

const POINTS = [
  {
    icon: Landmark,
    title: 'Managed by the Trust',
    desc: 'Run directly by the DAV Khagaul Alumni Welfare Trust, a registered educational trust in Bihar, India — not a third-party service.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified before activation',
    desc: 'Every registration is reviewed by the Trust committee against school records before the account goes live, so the network stays alumni-only.',
  },
  {
    icon: Lock,
    title: 'Your data, treated with care',
    desc: 'Your details are kept private and are never sold or shown publicly. You choose what fellow alumni can see.',
  },
];

export function TrustBand() {
  return (
    <section className="relative overflow-hidden bg-[#0F2557] py-16 text-white md:py-20">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px]"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl">
              An official portal, built on trust
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-white/70">
              This portal is created and managed by the DAV Khagaul Alumni Welfare
              Trust. It exists to keep our alumni community connected — safely,
              privately, and for the long term.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {POINTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 120}>
              <div className="h-full rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <p.icon className="h-5 w-5 text-sky-300" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={360}>
          <div className="mt-10 text-center">
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              View membership guidelines
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
