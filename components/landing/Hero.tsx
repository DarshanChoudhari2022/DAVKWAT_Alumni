'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles, Users, Calendar, MessageCircle } from 'lucide-react';
import { Reveal } from './Reveal';
import { BatchMarquee } from './StatsStrip';
import { TextGenerateEffect } from './TextGenerateEffect';
import { useScrollParallax } from '@/lib/hooks/useScrollParallax';

interface HeroProps {
  alumniCount: number;
}

export function Hero({ alumniCount }: HeroProps) {
  const display = alumniCount > 0 ? `${alumniCount.toLocaleString('en-IN')}+` : '10,000+';
  const slowOffset = useScrollParallax(0.05);
  const cardOffset = useScrollParallax(0.035);

  return (
    <section className="relative overflow-hidden bg-[#0a1130] text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_15%_-10%,#1e3a8a_0%,#0a1130_55%,#070b22_100%)]"
      />
      <div
        aria-hidden
        className="animate-aurora absolute -left-40 top-20 h-[460px] w-[460px] rounded-[42%_58%_64%_36%/48%_38%_62%_52%] bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.55),transparent_65%)] blur-3xl"
        style={{ transform: `translate3d(0, ${slowOffset}px, 0)` }}
      />
      <div
        aria-hidden
        className="animate-aurora absolute -right-32 top-44 h-[420px] w-[520px] rounded-[58%_42%_36%_64%/52%_60%_40%_48%] bg-[radial-gradient(circle_at_70%_40%,rgba(245,158,11,0.32),transparent_65%)] blur-3xl [animation-delay:-6s]"
        style={{ transform: `translate3d(0, ${slowOffset * -0.7}px, 0)` }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pt-20 md:pb-20 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.95fr] lg:gap-14">
          <div className="max-w-2xl">
            <Reveal direction="zoom">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur">
                <span className="text-xs font-semibold tracking-wide text-white/80 flex items-center gap-1.5">
                  🛡️ Official Trust-Led Portal · Fully Verified & Secure
                </span>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-7 font-sans text-4xl font-black leading-[1.06] tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
                Reunite with your
                <span className="block text-gradient-blue">DAV Khagaul batch.</span>
                <span className="block text-white text-3xl sm:text-4xl lg:text-[44px] mt-2 font-bold tracking-tight">Secure your official alumni access.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <div className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-[17px]">
                <p>
                  Created and managed by the <strong>DAV Khagaul Alumni Welfare Trust</strong>. Connect with verified peers, access official circulars, explore mentorship, and support welfare initiatives in a private, mobile-first network.
                </p>
              </div>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex flex-col items-start gap-1">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-400 hover:to-orange-400"
                  >
                    Register as alumnus
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="text-[10px] text-white/50 pl-1 font-medium tracking-wide mt-1">Takes under 3 minutes · Vetted by Trust Committee</span>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
                >
                  Member sign in
                </Link>
              </div>
              <p className="mt-4 text-[11px] text-white/40 italic pl-1">
                Exclusively open to DAV Khagaul former students (matric/plus-two) and ex-teachers.
              </p>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-8 flex items-center gap-4 text-xs text-white/60">
                <div className="flex -space-x-2">
                  {[
                    'from-amber-400 to-orange-500',
                    'from-sky-400 to-indigo-500',
                    'from-rose-400 to-pink-500',
                    'from-emerald-400 to-teal-500',
                  ].map((g, i) => (
                    <span
                      key={i}
                      className={`inline-block h-7 w-7 rounded-full border-2 border-[#0a1130] bg-gradient-to-br ${g}`}
                    />
                  ))}
                </div>
                <span><strong>10,240+ verified alumni</strong> · 50+ batches · 20+ countries</span>
              </div>
            </Reveal>
          </div>

          <Reveal direction="right" delay={120} className="hidden md:block">
            <div style={{ transform: `translate3d(0, ${cardOffset}px, 0)` }}>
            <HeroPreview />
            </div>
          </Reveal>
        </div>

        <Reveal delay={400} className="hidden md:block">
          <div className="mt-14">
            <p className="text-center text-xs uppercase tracking-[0.22em] text-white/40">
              Serving generations of DAV Khagaul alumni
            </p>
            <BatchMarquee />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-500/30 via-blue-500/20 to-amber-400/20 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 shadow-2xl shadow-indigo-900/40 backdrop-blur-xl">
        <div className="flex items-center gap-1.5 pb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-[11px] font-medium text-white/50">davkawt.org / dashboard</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-5">
          <div className="sm:col-span-3 rounded-2xl bg-white p-4 text-slate-800 shadow-md">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" /> Welcome back
            </div>
            <p className="mt-1.5 text-base font-bold leading-snug text-slate-900">
              Reunion 2026 — Batch of 1996 · Patna
            </p>
            <p className="mt-1 text-xs text-slate-500">12 Dec · 142 RSVPs · 8 city chapters</p>
            <div className="mt-3 flex -space-x-2">
              {['from-amber-400 to-orange-500', 'from-sky-400 to-indigo-500', 'from-rose-400 to-pink-500', 'from-emerald-400 to-teal-500', 'from-violet-400 to-fuchsia-500'].map((g, i) => (
                <span
                  key={i}
                  className={`inline-block h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br ${g}`}
                />
              ))}
              <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-slate-900 text-[10px] font-bold text-white">
                +24
              </span>
            </div>
          </div>

          <div className="sm:col-span-2 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-4 text-white shadow-md">
            <Users className="h-4 w-4 text-white/80" />
            <p className="mt-2 font-sans text-2xl font-bold tracking-[-0.02em]">10,240</p>
            <p className="text-[11px] text-white/70">Verified alumni</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-3/4 rounded-full bg-amber-400" />
            </div>
          </div>

          <div className="sm:col-span-2 rounded-2xl bg-white p-3.5 text-slate-800 shadow-md">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
              <Calendar className="h-3.5 w-3.5" /> Next event
            </div>
            <p className="mt-1 text-xs font-bold text-slate-900">Career mentorship circle</p>
            <p className="text-[10px] text-slate-500">Sat · Online · 18 mentors</p>
          </div>

          <div className="sm:col-span-3 rounded-2xl bg-white p-3.5 text-slate-800 shadow-md">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-violet-700">
              <MessageCircle className="h-3.5 w-3.5" /> Forum activity
            </div>
            <p className="mt-1 text-xs font-bold text-slate-900">
              &ldquo;Khagaul memories — share your favourite teacher story&rdquo;
            </p>
            <p className="text-[10px] text-slate-500">42 replies · pinned by Trust</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            Trust-verified · Privacy-first
          </span>
          <span className="font-medium text-white/60">Mobile-first · Fast on 4G</span>
        </div>
      </div>
    </div>
  );
}
