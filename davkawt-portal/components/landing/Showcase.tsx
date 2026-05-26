import Link from 'next/link';
import { Sparkles, MapPin, Calendar, MessageCircle, Award } from 'lucide-react';
import { Reveal } from './Reveal';
import { formatDate } from '@/lib/utils/format';

interface ShowcaseEvent {
  id: string;
  title: string;
  starts_at: string;
  venue: string | null;
  event_type: string;
}

interface ShowcaseAnnouncement {
  id: string;
  title: string;
  published_at: string | null;
}

interface ShowcaseProps {
  events: ShowcaseEvent[];
  announcements: ShowcaseAnnouncement[];
}

export function Showcase({ events, announcements }: ShowcaseProps) {
  return (
    <section id="events" className="relative overflow-hidden bg-[#070b22] py-16 text-white">
      <div aria-hidden className="aceternity-grid absolute inset-0 opacity-60" />
      <div aria-hidden className="animate-beam absolute left-1/4 top-0 h-[140%] w-24 bg-gradient-to-b from-transparent via-sky-400/20 to-transparent blur-xl" />
      <div aria-hidden className="animate-beam absolute right-1/4 top-0 h-[140%] w-24 bg-gradient-to-b from-transparent via-amber-300/15 to-transparent blur-xl [animation-delay:-4s]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Official Trust updates
            </span>
            <h2 className="mt-4 font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl lg:text-[42px]">
              Events &amp; announcements
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/60">
              Stay informed about reunions, webinars, circulars, and Trust initiatives.
            </p>
          </div>
        </Reveal>

        <div className="relative mt-9 grid gap-5 lg:grid-cols-[0.9fr_1.35fr]">
          <Reveal direction="left">
            <div className="moving-border-card relative overflow-hidden rounded-2xl bg-[#0b1230] shadow-2xl shadow-blue-950/40">
              <div className="relative z-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-7 text-white">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                <span className="relative rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  Member journey
                </span>
                <h3 className="relative mt-4 font-sans text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl">
                  Register, verify,
                  <br />
                  and connect
                </h3>
                <div className="relative mt-5 h-28">
                  <span className="absolute right-2 top-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-800 shadow-md">
                    Profile submitted
                  </span>
                  <span className="absolute right-12 top-10 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-800 shadow-md">
                    Committee review
                  </span>
                  <span className="absolute right-0 top-20 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-800 shadow-md">
                    Verified access
                  </span>
                  <span className="animate-float absolute right-32 top-5 grid h-12 w-12 place-items-center rounded-xl bg-white/20 backdrop-blur">
                    <Sparkles className="h-6 w-6 text-white" />
                  </span>
                </div>
              </div>

              <div className="space-y-2 bg-white p-4 text-slate-700">
                <SidebarItem icon={MessageCircle} label="Forum discussions" badge="24" />
                <SidebarItem icon={Calendar} label="Events & reunions" badge="3" active />
                <SidebarItem icon={Award} label="Alumni recognitions" />
                <SidebarItem icon={MapPin} label="City chapters" />
              </div>
              </div>
            </div>
          </Reveal>

          <Reveal direction="right" delay={100}>
            <div className="space-y-3">
              {events.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                  <h4 className="text-sm font-semibold text-white/90">Upcoming events</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {events.slice(0, 4).map((e) => (
                      <Link
                        key={e.id}
                        href="/events"
                        className="group rounded-xl bg-white p-3.5 text-slate-800 transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-indigo-50 text-[11px] font-bold text-indigo-700">
                            {formatDate(e.starts_at).split(' ').slice(0, 2).join(' ')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                              {e.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {e.event_type === 'online' ? 'Online' : e.venue ?? 'Venue TBA'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {announcements.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                  <h4 className="text-sm font-semibold text-white/90">Latest announcements</h4>
                  <div className="mt-3 space-y-2">
                    {announcements.slice(0, 4).map((a) => (
                      <Link
                        key={a.id}
                        href="/announcements"
                        className="flex items-center gap-3 rounded-lg bg-white px-4 py-2.5 text-slate-800 transition hover:bg-slate-50"
                      >
                        <span className="h-2 w-2 flex-none rounded-full bg-amber-500" />
                        <p className="line-clamp-1 flex-1 text-sm font-medium text-slate-900">
                          {a.title}
                        </p>
                        <span className="text-xs text-slate-500">
                          {a.published_at ? formatDate(a.published_at) : ''}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {events.length === 0 && announcements.length === 0 && <FallbackUpdates />}

              <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-sky-500/10 p-4 backdrop-blur-xl">
                <p className="text-sm text-white/70">
                  Verified access · Privacy controls · Admin moderation · Mobile-first experience
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FallbackUpdates() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        {
          title: 'Annual alumni meet',
          meta: 'Patna · Reunion planning',
          label: 'Event',
          color: 'from-amber-400 to-orange-500',
        },
        {
          title: 'Mentorship circle',
          meta: 'Career guidance · Online',
          label: 'Program',
          color: 'from-sky-400 to-indigo-500',
        },
        {
          title: 'Trust circulars',
          meta: 'Official announcements',
          label: 'Notice',
          color: 'from-emerald-400 to-teal-500',
        },
        {
          title: 'Batch milestones',
          meta: 'Stories and recognitions',
          label: 'Community',
          color: 'from-rose-400 to-pink-500',
        },
      ].map((item) => (
        <div
          key={item.title}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.09]"
        >
          <div
            aria-hidden
            className={`absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gradient-to-br ${item.color} opacity-20 blur-2xl transition group-hover:opacity-35`}
          />
          <span className="relative inline-flex rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/65">
            {item.label}
          </span>
          <h4 className="relative mt-4 text-sm font-semibold text-white">{item.title}</h4>
          <p className="relative mt-1 text-xs text-white/55">{item.meta}</p>
          <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full w-2/3 rounded-full bg-gradient-to-r ${item.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  badge,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  active?: boolean;
}) {
  return (
    <div
      className={
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ' +
        (active ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50')
      }
    >
      <Icon className="h-4 w-4 flex-none" />
      <span className="flex-1 font-medium">{label}</span>
      {badge && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {badge}
        </span>
      )}
    </div>
  );
}
