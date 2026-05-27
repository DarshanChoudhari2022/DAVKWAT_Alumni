import Link from 'next/link';
import {
  Users,
  MessageSquare,
  Calendar,
  GraduationCap,
  Briefcase,
  CreditCard,
  Shield,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { Reveal } from './Reveal';
import { SpotlightCard } from './SpotlightCard';

const FEATURES = [
  {
    icon: Users,
    title: 'Verified Directory',
    desc: 'Find classmates across batches and cities.',
    bullets: ['Filter by batch year and city', 'Secure, opt-in contact cards', 'Dedicated city chapters'],
    color: 'from-indigo-500 to-sky-500',
  },
  {
    icon: MessageSquare,
    title: 'Alumni Forum',
    desc: 'Engage in protected batch-level discussions.',
    bullets: ['Share school memories', 'Coordinate local gatherings', 'Spam-free, moderated threads'],
    color: 'from-violet-500 to-fuchsia-500',
  },
  {
    icon: Calendar,
    title: 'Reunions & Webinars',
    desc: 'RSVP and participate in official alumni gatherings.',
    bullets: ['Track upcoming offline reunions', 'Join career-focused webinars', 'Easy registration workflows'],
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: GraduationCap,
    title: 'Alumni Mentorship',
    desc: 'Guide students and recent graduates.',
    bullets: ['Career streams matchmaking', 'One-on-one resume reviews', 'Community impact tracking'],
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Briefcase,
    title: 'Vetted Careers',
    desc: 'Post and discover trusted job opportunities.',
    bullets: ['Internal referral channels', 'Exclusive internship leads', 'Verified alumni referrals only'],
    color: 'from-rose-500 to-pink-500',
  },
  {
    icon: CreditCard,
    title: 'Secure Membership',
    desc: 'Support the Trust through official registrations.',
    bullets: ['Easebuzz secure payment flows', 'Instant digital receipts', 'Safe welfare funding allocation'],
    color: 'from-sky-500 to-blue-600',
  },
  {
    icon: Shield,
    title: 'Private & Moderated',
    desc: 'Every registration is vetted by the committee.',
    bullets: ['Executive committee approvals', 'Strict anti-spam protocols', 'GDPR privacy compliance'],
    color: 'from-slate-600 to-slate-800',
  },
  {
    icon: Globe,
    title: 'Global Alumni Reach',
    desc: 'Brings alumni from around the world into one home.',
    bullets: ['Covering 20+ countries', 'Connecting 50+ batches', 'Mobile-first access worldwide'],
    color: 'from-cyan-500 to-indigo-500',
  },
];

export function FeatureList() {
  return (
    <section className="scroll-lift relative overflow-hidden bg-[#f6f8fb] py-16 md:py-24">
      <div aria-hidden className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-sky-200/50 blur-3xl" />
      <div aria-hidden className="absolute -right-20 bottom-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid items-end gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">
                Member experience
              </span>
              <h2 className="mt-3 max-w-xl font-sans text-3xl font-black leading-[1] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-[60px]">
                Not just features.
                <span className="block translate-x-4 md:translate-x-10 text-[#0F2557]">Useful alumni rituals.</span>
              </h2>
            </div>
            <div className="lg:justify-self-end">
              <p className="max-w-md text-base sm:text-[17px] leading-relaxed text-slate-600">
                A refined institutional portal for connection, communication, membership,
                and long-term alumni welfare — designed around how alumni actually engage.
              </p>
              <Link
                href="/register"
                className="mt-6 inline-flex items-center rounded-full bg-[#0F2557] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-800"
              >
                Register as alumnus
              </Link>
            </div>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 45}>
              <SpotlightCard
                className={`min-h-[255px] p-6 ${i % 2 === 1 ? 'lg:translate-y-10' : ''} ${
                  i === 2 || i === 5 ? 'lg:translate-y-4' : ''
                }`}
              >
                <div
                  className={`absolute inset-x-5 top-0 h-px bg-gradient-to-r ${f.color} opacity-70`}
                />
                <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${f.color} text-white shadow-md`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold leading-tight text-slate-950">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                <ul className="mt-5 space-y-1.5">
                  {f.bullets.slice(0, 3).map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-none text-emerald-500" />
                      {b}
                    </li>
                  ))}
                </ul>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
