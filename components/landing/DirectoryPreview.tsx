import Link from 'next/link';
import { Search, ShieldCheck, EyeOff, MapPin, ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

const POINTS = [
  {
    icon: Search,
    text: 'Search by batch year, course, city, country, and profession.',
  },
  {
    icon: ShieldCheck,
    text: 'See only committee-approved alumni — no public listings, no outsiders.',
  },
  {
    icon: EyeOff,
    text: 'Control whether your email and phone are visible, hidden, or shared only with your batch.',
  },
  {
    icon: MapPin,
    text: 'Build and join city chapters to meet alumni near you.',
  },
];

// Anonymised, non-identifying tiles. No real or invented alumni names.
const BATCH_TILES = ['1965', '1972', '1984', '1996', '2003', '2010', '2018', '2023'];

export function DirectoryPreview() {
  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal direction="left">
            <div>
              <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] text-slate-900 sm:text-4xl lg:text-[42px]">
                A verified directory of DAV Khagaul alumni
              </h2>
              <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-slate-600">
                Once your membership is approved, you can search a directory of fellow
                verified alumni — and decide exactly what others can see about you.
              </p>

              <ul className="mt-8 space-y-4">
                {POINTS.map((p) => (
                  <li key={p.text} className="flex items-start gap-3 text-[15px] text-slate-700">
                    <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-[#0F2557]/5 text-[#0F2557]">
                      <p.icon className="h-4 w-4" />
                    </span>
                    <span>{p.text}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-7 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                The directory is visible only to verified members after sign-in. It is
                never public.
              </p>

              <Link
                href="/register"
                className="mt-7 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-[#0F2557]/30 hover:bg-slate-50"
              >
                Register to access the directory
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          {/* Privacy-first visual — anonymised batch tiles, no named people */}
          <Reveal direction="right" delay={120}>
            <div className="relative mx-auto w-full max-w-[460px]">
              <div
                aria-hidden
                className="absolute -inset-5 rounded-[32px] bg-gradient-to-br from-indigo-100 via-blue-100/60 to-sky-100/40 blur-2xl"
              />
              <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-400">
                  <Search className="h-4 w-4" />
                  Search alumni by batch, city, profession…
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {['Batch year', 'City', 'Profession', 'Country'].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-4 gap-2.5">
                  {BATCH_TILES.map((batch) => (
                    <div
                      key={batch}
                      className="flex flex-col items-center rounded-xl bg-slate-50 p-3 text-center"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#0F2557] to-blue-600 text-white">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <p className="mt-1.5 text-[10px] font-semibold text-slate-500">
                        Batch {batch}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-[#0F2557] px-4 py-2.5 text-xs text-white">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-sky-300" />
                    Verified members only
                  </span>
                  <span className="text-sky-300">Privacy controls on</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
