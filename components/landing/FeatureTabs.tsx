'use client';

import { useState } from 'react';
import {
  Users,
  MessageSquare,
  Calendar,
  Megaphone,
  GraduationCap,
  Briefcase,
  Award,
  Heart,
  CheckCircle2,
} from 'lucide-react';
import { Reveal } from './Reveal';
import { cn } from '@/lib/utils/cn';

type TabKey =
  | 'directory'
  | 'discussions'
  | 'events'
  | 'announcements'
  | 'mentorship'
  | 'careers'
  | 'recognition'
  | 'donations';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'directory', label: 'Directory', icon: Users },
  { key: 'discussions', label: 'Forum', icon: MessageSquare },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'mentorship', label: 'Mentorship', icon: GraduationCap },
  { key: 'careers', label: 'Careers', icon: Briefcase },
  { key: 'recognition', label: 'Recognition', icon: Award },
  { key: 'donations', label: 'Membership', icon: Heart },
];

const CONTENT: Record<TabKey, { title: string; bullets: string[] }> = {
  directory: {
    title: 'Find classmates and trusted DAV Khagaul alumni.',
    bullets: [
      'Search by batch year, course, city, country, and profession',
      'Committee-approved alumni profiles only',
      'Privacy controls for email and phone visibility',
      'Build city chapters and reconnect with your batch',
    ],
  },
  discussions: {
    title: 'A moderated forum for meaningful alumni conversations.',
    bullets: [
      'Discuss careers, reunions, welfare initiatives, and school memories',
      'Pinned topics and committee-moderated spaces',
      'Rich-text posts for long-form updates and replies',
      'Protected access for verified members',
    ],
  },
  events: {
    title: 'Plan reunions, webinars, and local meetups.',
    bullets: [
      'RSVP to official Trust and batch events',
      'Online, in-person, and hybrid formats',
      'Calendar-ready event details and attendee lists',
      'Event payments and membership support via Easebuzz',
    ],
  },
  announcements: {
    title: 'Official Trust communication in one place.',
    bullets: [
      'Pinned announcements from DAVKAWT administrators',
      'Updates for events, membership, approvals, and welfare activities',
      'Rich-text publishing for detailed circulars',
      'Clear archive of past notices for alumni reference',
    ],
  },
  mentorship: {
    title: 'Pay it forward through guidance and mentorship.',
    bullets: [
      'Senior alumni guide students and younger graduates',
      'Match by stream, profession, location, and interests',
      'Structured sessions, group circles, and expert talks',
      'Create measurable impact across batches',
    ],
  },
  careers: {
    title: 'Career support from within the alumni network.',
    bullets: [
      'Share job openings, referrals, and internship leads',
      'Discover alumni by industry and organisation',
      'Enable resume reviews, mock interviews, and guidance',
      'Support professional growth with verified contacts',
    ],
  },
  recognition: {
    title: 'Celebrate alumni who uphold the DAV Khagaul legacy.',
    bullets: [
      'Distinguished alumni stories and achievements',
      'Batch milestones and reunion highlights',
      'A living wall of contributions across decades',
      'Nominations and recognition managed by the Trust',
    ],
  },
  donations: {
    title: 'Manage membership and contributions securely.',
    bullets: [
      'Annual and lifetime membership plans',
      'Secure Easebuzz payment flow',
      'Receipts, renewal reminders, and payment history',
      'Transparent records for Trust administration',
    ],
  },
};

export function FeatureTabs() {
  const [active, setActive] = useState<TabKey>('directory');
  const data = CONTENT[active];

  return (
    <section className="relative overflow-hidden bg-[#070b22] py-16 md:py-24 text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,#1e2a6b_0%,transparent_70%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center">
            <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl lg:text-[44px]">
              One verified portal for every alumni need
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-[17px] leading-relaxed text-white/60">
              Built for DAVKAWT members and administrators: verified profiles,
              official communication, events, forums, membership, and governance.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-8 md:mt-12 flex items-center justify-start md:justify-center gap-2 overflow-x-auto pb-4 md:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap whitespace-nowrap">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = t.key === active;
              return (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-5 py-2 text-[15px] font-medium transition flex-shrink-0',
                    isActive
                      ? 'bg-white text-[#070b22] shadow-sm'
                      : 'text-white/55 hover:bg-white/5 hover:text-white',
                  )}
                  aria-pressed={isActive}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={200} direction="zoom">
          <div className="mt-8 md:mt-12 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-indigo-500/10 ring-1 ring-white/5">
            <div className="grid lg:grid-cols-[1fr_1.4fr]">
              <div className="bg-gradient-to-br from-indigo-50 to-sky-50 p-6 sm:p-10">
                <h3 className="font-sans text-xl sm:text-2xl font-bold tracking-[-0.02em] text-slate-900 md:text-3xl">
                  {data.title}
                </h3>
                <ul className="mt-6 space-y-3">
                  {data.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-indigo-600" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-slate-100 p-5 sm:p-8 lg:border-l lg:border-t-0">
                <MockPreview tab={active} />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MockPreview({ tab }: { tab: TabKey }) {
  if (tab === 'discussions' || tab === 'announcements') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-sky-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Aisha Khan</p>
            <p className="text-xs text-slate-500">Batch 2008 · 2h ago</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-900">Batch 2008 mentorship and reunion planning</p>
        <p className="text-sm leading-relaxed text-slate-600">
          Alumni can coordinate batch updates, share professional guidance, and discuss
          Trust-led initiatives in a protected member space.
        </p>
        <div className="aspect-[16/9] rounded-lg bg-gradient-to-br from-indigo-100 to-sky-100" />
        <div className="flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>18 replies</span>
          <span>Pinned by committee</span>
        </div>
      </div>
    );
  }

  if (tab === 'events') {
    return (
      <div className="space-y-3">
        {[
          { date: 'Dec 15', title: 'DAVKAWT Annual Alumni Meet', venue: 'Patna, Bihar' },
          { date: 'Jan 08', title: 'Career guidance session', venue: 'Online' },
          { date: 'Feb 22', title: 'Batch 1998 silver jubilee', venue: 'DAV Khagaul Campus' },
        ].map((e) => (
          <div
            key={e.title}
            className="flex items-center gap-4 rounded-lg border border-slate-100 bg-white p-3 transition hover:border-indigo-200 hover:shadow-sm"
          >
            <div className="grid h-12 w-12 flex-none place-items-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
              {e.date}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{e.title}</p>
              <p className="text-xs text-slate-500">{e.venue}</p>
            </div>
            <button className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
              RSVP
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
      {[
        { name: 'Rohan M.', role: 'Batch 2010 · Software Engineer', g: 'from-indigo-400 to-sky-500' },
        { name: 'Priya S.', role: 'Batch 2014 · Doctor', g: 'from-rose-400 to-pink-500' },
        { name: 'Amit K.', role: 'Batch 1998 · Entrepreneur', g: 'from-amber-400 to-orange-500' },
        { name: 'Neha R.', role: 'Batch 2019 · Designer', g: 'from-violet-400 to-purple-500' },
        { name: 'Rahul J.', role: 'Batch 2005 · Banker', g: 'from-emerald-400 to-teal-500' },
        { name: 'Sneha P.', role: 'Batch 2021 · Researcher', g: 'from-fuchsia-400 to-pink-500' },
      ].map((p) => (
        <div
          key={p.name}
          className="rounded-lg border border-slate-100 bg-white p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className={`mx-auto h-12 w-12 rounded-full bg-gradient-to-br ${p.g}`} />
          <p className="mt-2 text-xs font-semibold text-slate-900">{p.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{p.role}</p>
        </div>
      ))}
    </div>
  );
}
