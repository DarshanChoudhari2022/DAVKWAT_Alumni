'use client';

import { AnimatedNumber } from './AnimatedNumber';
import { Reveal } from './Reveal';

const BATCHES = ['1965', '1972', '1984', '1996', '2003', '2010', '2014', '2018', '2021', '2023'];

export function BatchMarquee() {
  const badges = [...BATCHES, ...BATCHES];

  return (
    <div className="mt-16 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] py-5 backdrop-blur">
      <div className="flex animate-marquee gap-3 whitespace-nowrap">
        {badges.map((batch, index) => (
          <span
            key={`${batch}-${index}`}
            className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2 text-sm font-semibold text-white/70 shadow-sm"
          >
            Batch {batch}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GlobalReachStats() {
  return (
    <section className="relative overflow-hidden bg-[#070b22] py-20 text-white">
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_50%,rgba(59,130,246,0.22),transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur md:grid-cols-3 md:p-8">
            <Metric value={20} label="Countries represented" />
            <Metric value={50} label="Batches connected" />
            <Metric value={10000} label="Alumni network potential" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 text-center transition hover:-translate-y-1 hover:bg-white/[0.08]">
      <AnimatedNumber value={value} className="font-sans text-4xl font-bold tracking-[-0.025em] text-white sm:text-5xl" />
      <p className="mt-2 text-sm font-medium text-white/60">{label}</p>
    </div>
  );
}
