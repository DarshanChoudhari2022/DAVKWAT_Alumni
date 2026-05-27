import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

const POINTS = [
  'Searchable, committee-verified directory across every batch',
  'Targeted Trust announcements and event invitations',
  'Privacy-aware contact visibility, controlled by each member',
  'City chapters, mentorship circles, and forum threads',
];

export function ManageEngage() {
  return (
    <section className="scroll-lift relative overflow-hidden bg-[#fbfaf7] py-12 md:py-20">
      <div aria-hidden className="absolute left-0 top-0 h-[45%] lg:h-full w-full lg:w-[38%] bg-[#f1efe8]" />
      <div aria-hidden className="absolute right-10 top-16 h-28 w-28 rounded-full bg-amber-300/30 blur-2xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.86fr_1.14fr]">
          <Reveal direction="left">
            <div className="relative z-10 lg:pl-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0F2557] shadow-sm">
                For the Trust & members
              </span>
              <h2 className="mt-5 max-w-[520px] font-sans text-3xl font-black leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-[64px]">
                Alumni engagement,
                <span className="block translate-x-4 md:translate-x-8 text-[#0F2557]">with a human pulse.</span>
              </h2>
              <p className="mt-6 max-w-md text-base sm:text-[17px] leading-relaxed text-slate-600">
                Effortlessly keep track of every alumnus and send targeted communication —
                from reunion invites and welfare circulars to mentorship calls and Trust
                updates — without losing the warmth of a Khagaul classroom.
              </p>

              <ul className="mt-7 space-y-3 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
                {POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0F2557] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-800"
                >
                  Register as alumnus
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  About the Trust
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal direction="right" delay={120}>
            <div className="relative mx-auto h-[480px] sm:h-[560px] w-full max-w-[620px] overflow-hidden sm:overflow-visible">
              <div
                aria-hidden
                className="absolute left-6 top-8 h-[300px] w-[300px] sm:left-10 sm:h-[430px] sm:w-[430px] rotate-[-10deg] rounded-[58%_42%_36%_64%/52%_60%_40%_48%] bg-gradient-to-br from-[#0F2557] via-indigo-700 to-blue-600 shadow-2xl shadow-indigo-900/30"
              />
              <div
                aria-hidden
                className="absolute bottom-6 right-6 h-[180px] w-[180px] sm:h-[290px] sm:w-[290px] rotate-12 rounded-[42%_58%_64%_36%/48%_38%_62%_52%] bg-gradient-to-br from-amber-300 to-orange-400 shadow-2xl shadow-amber-500/20"
              />

              <div className="absolute left-2 top-14 sm:top-20 w-[90%] sm:w-[78%] rotate-[-2deg] rounded-[28px] bg-white p-4 shadow-2xl shadow-indigo-900/20 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Alumni directory
                  </p>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Verified
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { name: 'A. Kumar', batch: '1996', g: 'from-amber-400 to-orange-500' },
                    { name: 'P. Singh', batch: '2003', g: 'from-sky-400 to-indigo-500' },
                    { name: 'R. Verma', batch: '1984', g: 'from-rose-400 to-pink-500' },
                    { name: 'S. Mishra', batch: '2010', g: 'from-emerald-400 to-teal-500' },
                    { name: 'M. Raj', batch: '1972', g: 'from-violet-400 to-fuchsia-500' },
                    { name: 'D. Jha', batch: '2018', g: 'from-cyan-400 to-blue-500' },
                  ].map((m) => (
                    <div
                      key={m.name}
                      className="flex flex-col items-center rounded-xl bg-slate-50 p-2 text-center"
                    >
                      <span
                        className={`grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-gradient-to-br ${m.g} text-[10px] sm:text-[11px] font-bold text-white`}
                      >
                        {m.name.split(' ').map((s) => s[0]).join('')}
                      </span>
                      <p className="mt-1.5 truncate w-full text-[10px] sm:text-[11px] font-semibold text-slate-800">{m.name}</p>
                      <p className="text-[8px] sm:text-[9px] text-slate-500">Batch {m.batch}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-[10px] sm:text-[11px] text-white">
                  <span>10,240 verified alumni</span>
                  <span className="text-amber-300">View directory →</span>
                </div>
              </div>

              <div className="absolute bottom-8 right-2 w-[180px] sm:w-[250px] rotate-3 rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-2xl shadow-amber-900/10">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Targeted update
                </p>
                <p className="mt-1 sm:mt-2 text-xs sm:text-lg font-bold leading-tight text-slate-950">
                  Batch 1998 silver jubilee invites ready
                </p>
                <div className="mt-3 sm:mt-4 flex -space-x-2">
                  {['bg-amber-400', 'bg-sky-400', 'bg-emerald-400', 'bg-rose-400'].map((c) => (
                    <span key={c} className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full border-2 border-white ${c}`} />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
