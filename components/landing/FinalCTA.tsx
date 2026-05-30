'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { Reveal } from './Reveal';

export function FinalCTA() {
  const [email, setEmail] = useState('');

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0F2557] via-indigo-800 to-[#0a1130] py-16">
      <div
        aria-hidden
        className="absolute -left-20 top-1/4 h-[340px] w-[340px] rounded-[42%_58%_64%_36%/48%_38%_62%_52%] bg-blue-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-16 bottom-10 h-[280px] w-[360px] rounded-[58%_42%_36%_64%/52%_60%_40%_48%] bg-indigo-400/20 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <Reveal>
          <div>
            <h2 className="font-sans text-2xl font-bold tracking-[-0.025em] text-white sm:text-3xl">
              Stay close to DAV Khagaul updates
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Reunion highlights, mentorship circles, batch milestones, and Trust announcements.
            </p>
          </div>
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
            className="flex flex-col gap-3 sm:flex-row lg:justify-end"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email for updates"
              className="min-w-0 flex-1 rounded-full border border-white/20 bg-white px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 lg:max-w-[280px]"
              aria-label="Email"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/[0.12] px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Subscribe
              <Send className="h-3.5 w-3.5" />
            </button>
            <p className="mt-2 text-xs text-white/50 lg:hidden">
              We hate spam. Your email is encrypted and never shared. Unsubscribe anytime in one click.
            </p>
          </form>
          <p className="mt-2 text-right text-xs text-white/50 hidden lg:block">
            We hate spam. Your email is encrypted and never shared. Unsubscribe anytime.
          </p>
        </Reveal>

        <Link href="/register" className="sr-only">
          Register as alumnus
        </Link>
      </div>
    </section>
  );
}
