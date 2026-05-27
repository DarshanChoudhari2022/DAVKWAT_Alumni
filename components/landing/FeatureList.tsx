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
    title: 'Verified Alumni Directory',
    desc: 'A searchable directory of committee-approved DAV Khagaul alumni with privacy-aware contact visibility.',
    bullets: ['Batch & course filters', 'City and country search', 'Privacy controls', 'Verified profiles'],
    color: 'from-indigo-500 to-sky-500',
  },
  {
    icon: MessageSquare,
    title: 'Forum & Discussions',
    desc: 'A protected forum for batch coordination, professional guidance, memories, and Trust-led conversations.',
    bullets: ['Moderated threads', 'Pinned topics', 'Rich-text posts', 'Member-only access'],
    color: 'from-violet-500 to-fuchsia-500',
  },
  {
    icon: Calendar,
    title: 'Events & Reunions',
    desc: 'Publish reunions, webinars, campus gatherings, and city meetups with clear RSVP and attendee workflows.',
    bullets: ['RSVP tracking', 'Online / hybrid / in-person', 'Attendee exports', 'Event reminders'],
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: GraduationCap,
    title: 'Mentorship & Guidance',
    desc: 'Connect experienced alumni with students and younger graduates for career, academic, and life guidance.',
    bullets: ['Senior mentors', 'Career sessions', 'Group circles', 'Impact tracking'],
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Briefcase,
    title: 'Career Network',
    desc: 'Help alumni discover trusted professional contacts, openings, referrals, internships, and industry support.',
    bullets: ['Industry search', 'Referral channels', 'Resume reviews', 'Internship leads'],
    color: 'from-rose-500 to-pink-500',
  },
  {
    icon: CreditCard,
    title: 'Membership Payments',
    desc: 'Support annual and lifetime memberships through a secure Easebuzz flow with receipts and renewal records.',
    bullets: ['Secure payments', 'Receipt records', 'Renewal reminders', 'Admin reports'],
    color: 'from-sky-500 to-blue-600',
  },
  {
    icon: Shield,
    title: 'Private & Moderated',
    desc: 'Every registration is reviewed by the Trust so the network stays relevant, respectful, and alumni-only.',
    bullets: ['Admin approvals', 'Anti-spam controls', 'Privacy-first design', 'Role-based access'],
    color: 'from-slate-600 to-slate-800',
  },
  {
    icon: Globe,
    title: 'Global Alumni Reach',
    desc: 'Bring alumni from Bihar, across India, and around the world into one official digital home.',
    bullets: ['20+ countries', '50+ batches', 'Mobile-first design', 'Fast on 4G'],
    color: 'from-cyan-500 to-indigo-500',
  },
];

export function FeatureList() {
  return (
    <section className="scroll-lift relative overflow-hidden bg-[#f6f8fb] py-24">
      <div aria-hidden className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-sky-200/50 blur-3xl" />
      <div aria-hidden className="absolute -right-20 bottom-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid items-end gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">
                Member experience
              </span>
              <h2 className="mt-3 max-w-xl font-sans text-4xl font-black leading-[1] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-[60px]">
                Not just features.
                <span className="block translate-x-10 text-[#0F2557]">Useful alumni rituals.</span>
              </h2>
            </div>
            <div className="lg:justify-self-end">
              <p className="max-w-md text-[17px] leading-relaxed text-slate-600">
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
