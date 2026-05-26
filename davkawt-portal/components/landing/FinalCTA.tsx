'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

export function FinalCTA() {
  const [email, setEmail] = useState('');

  return (
    <section className="relative overflow-hidden bg-[#0a1130] py-28 text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,#1e3a8a_0%,transparent_60%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {[500, 700, 900].map((s) => (
          <div
            key={s}
            className="absolute left-1/2 top-full -translate-x-1/2 rounded-full border border-white/[0.05]"
            style={{ width: s, height: s, marginTop: -s / 2 }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl lg:text-[52px] lg:leading-[1.08]">
            Stories &amp; updates that build lifelong DAV Khagaul connections
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-white/60">
            Reunion highlights, mentorship circles, batch milestones, and Trust
            announcements — sent only when it matters. Register to begin, or stay
            subscribed for updates.
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
            className="mx-auto mt-10 flex max-w-md items-center rounded-full border border-white/15 bg-white/[0.06] p-1.5 backdrop-blur-md"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email to register"
              className="min-w-0 flex-1 bg-transparent px-5 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none"
              aria-label="Email"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-400 hover:to-orange-400"
            >
              Begin registration
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-5 text-xs text-white/50">
            Already verified?{' '}
            <Link
              href="/login"
              className="underline underline-offset-4 transition hover:text-white"
            >
              Sign in
            </Link>{' '}
            to access the member dashboard.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
