import Link from 'next/link';
import { Eye, ShieldOff, Lock, ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

const POINTS = [
  {
    icon: Eye,
    title: 'You decide what is visible',
    desc: 'Choose what fellow alumni can see, and update it anytime.',
  },
  {
    icon: ShieldOff,
    title: 'Never sold, never public',
    desc: 'Your data is not sold, advertised, or shown to anyone outside the verified network.',
  },
  {
    icon: Lock,
    title: 'Alumni-only access',
    desc: 'Only members approved by the Trust can view the directory.',
  },
];

export function PrivacyData() {
  return (
    <section className="relative overflow-hidden bg-slate-50 py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] text-slate-900 sm:text-4xl">
              Your privacy comes first
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
              We know your contact details are personal. This portal is designed so
              you stay in control — your information is used only to keep you connected
              to the DAV Khagaul alumni community.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {POINTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 120}>
              <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-base font-bold text-slate-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={360}>
          <div className="mt-10 text-center">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F2557] hover:underline"
            >
              Read our Privacy Policy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
