'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Send } from 'lucide-react';
import { Reveal } from './Reveal';

export function FinalCTA() {
  const [email, setEmail] = useState('');

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F2557] via-indigo-800 to-[#0a1130] py-20">
        <div
          aria-hidden
          className="absolute -left-20 top-1/4 h-[340px] w-[340px] rounded-[42%_58%_64%_36%/48%_38%_62%_52%] bg-amber-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-16 bottom-10 h-[280px] w-[360px] rounded-[58%_42%_36%_64%/52%_60%_40%_48%] bg-indigo-400/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] text-white sm:text-4xl lg:text-[44px] lg:leading-[1.12]">
              Join our alumni network
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[16px] leading-relaxed text-white/70">
              Stay updated with reunion highlights, mentorship circles,
              batch milestones, and Trust announcements.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const url = email
                  ? `/register?email=${encodeURIComponent(email)}`
                  : '/register';
                window.location.href = url;
              }}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email for updates"
                className="min-w-0 flex-1 rounded-full border border-white/20 bg-white px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-label="Email"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/[0.12] px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Subscribe for updates
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0a1130] py-24 text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_100%,#1e3a8a_0%,transparent_55%)]"
        />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl lg:text-[48px] lg:leading-[1.08]">
              Become part of the official DAV Khagaul alumni network
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-white/60">
              Register your profile, complete Trust verification, and join a secure
              community built for alumni connection, welfare, and institutional pride.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-400 hover:to-orange-400"
              >
                Begin registration
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-white/20 bg-white/[0.06] px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                Member sign in
              </Link>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-6 text-xs text-white/50">
              Already verified? Sign in to access your member dashboard, events, and directory.
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
