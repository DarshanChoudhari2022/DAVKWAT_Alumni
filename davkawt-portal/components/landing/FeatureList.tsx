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
    <section className="bg-[#fafbfc] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] text-slate-900 sm:text-4xl lg:text-[44px]">
              What members can do
              <br className="hidden sm:inline" />
              on <span className="text-[#0F2557]">DAVKAWT</span>
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
              A refined institutional portal for connection, communication, membership,
              and long-term alumni welfare.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center rounded-full bg-[#0F2557] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-800"
            >
              Register as alumnus
            </Link>
          </div>
        </Reveal>

        <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <SpotlightCard className="p-8">
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${f.color} opacity-0 transition-opacity group-hover:opacity-100`}
                />
                <div className="flex items-start gap-4">
                  <div className={`grid h-12 w-12 flex-none place-items-center rounded-xl bg-gradient-to-br ${f.color} text-white shadow-md`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {f.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="h-3.5 w-3.5 flex-none text-emerald-500" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
