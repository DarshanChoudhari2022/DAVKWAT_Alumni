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
    <section className="relative overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          {/* LEFT: copy */}
          <Reveal direction="left">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0F2557]">
                For the Trust & members
              </span>
              <h2 className="mt-5 font-sans text-3xl font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:text-4xl lg:text-[44px]">
                Manage and engage <br />
                <span className="text-[#0F2557]">every batch</span> — with intent
              </h2>
              <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-slate-600">
                Effortlessly keep track of every alumnus and send targeted communication —
                from reunion invites and welfare circulars to mentorship calls and Trust
                updates — without losing the warmth of a Khagaul classroom.
              </p>

              <ul className="mt-7 space-y-3">
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

          {/* RIGHT: organic shape illustration with directory mock */}
          <Reveal direction="right" delay={120}>
            <div className="relative mx-auto aspect-square w-full max-w-[520px]">
              {/* navy organic blob */}
              <div
                aria-hidden
                className="absolute inset-x-6 top-2 bottom-10 rounded-[58%_42%_36%_64%/52%_60%_40%_48%] bg-gradient-to-br from-[#0F2557] via-indigo-700 to-blue-600"
              />
              {/* amber organic blob */}
              <div
                aria-hidden
                className="absolute -bottom-4 -right-2 h-2/3 w-2/3 rounded-[42%_58%_64%_36%/48%_38%_62%_52%] bg-gradient-to-br from-amber-300 to-orange-400"
              />

              {/* directory card on top */}
              <div className="absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-4 shadow-2xl shadow-indigo-900/20 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Alumni directory
                  </p>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Verified
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2.5">
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
                      className="flex flex-col items-center rounded-xl bg-slate-50 p-2.5 text-center"
                    >
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br ${m.g} text-[11px] font-bold text-white`}
                      >
                        {m.name.split(' ').map((s) => s[0]).join('')}
                      </span>
                      <p className="mt-1.5 text-[11px] font-semibold text-slate-800">{m.name}</p>
                      <p className="text-[9px] text-slate-500">Batch {m.batch}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-[11px] text-white">
                  <span>10,240 verified alumni</span>
                  <span className="text-amber-300">View directory →</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
