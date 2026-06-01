import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0F2557] via-indigo-800 to-[#0a1130] py-20">
      <div
        aria-hidden
        className="absolute -left-20 top-1/4 h-[340px] w-[340px] rounded-[42%_58%_64%_36%/48%_38%_62%_52%] bg-blue-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-16 bottom-10 h-[280px] w-[360px] rounded-[58%_42%_36%_64%/52%_60%_40%_48%] bg-indigo-400/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="font-sans text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl lg:text-[46px]">
            Your batch is waiting.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-[17px]">
            Join the official DAV Khagaul alumni network and stay connected to the
            people, memories, and milestones that shaped you.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/register"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-400 hover:to-orange-400"
            >
              Register as alumnus
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Member sign in
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
