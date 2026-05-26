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
    <section id="events" className="relative overflow-hidden bg-[#070b22] pb-24 pt-4 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Official Trust updates
            </span>
            <h2 className="mt-5 font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl lg:text-[44px]">
              Events, announcements, and member activity in one place
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-white/60">
              The portal keeps alumni informed about reunions, webinars, circulars,
              committee notices, and opportunities to participate in Trust initiatives.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <Reveal direction="left">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-xl">
              <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-8 text-white">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  Member journey
                </span>
                <h3 className="mt-4 font-sans text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl">
                  Register, verify,
                  <br />
                  and connect
                </h3>
                <div className="relative mt-6 h-32">
                  <span className="absolute right-2 top-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-md">
                    Profile submitted
                  </span>
                  <span className="absolute right-12 top-12 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-md">
                    Committee review
                  </span>
                  <span className="absolute right-0 top-24 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-md">
                    Verified access
                  </span>
                  <span className="absolute right-32 top-6 grid h-12 w-12 place-items-center rounded-xl bg-white/20 backdrop-blur">
                    <Sparkles className="h-6 w-6 text-white" />
                  </span>
                </div>
              </div>

              <div className="space-y-2 p-5 text-slate-700">
                <SidebarItem icon={MessageCircle} label="Forum discussions" badge="24" />
                <SidebarItem icon={Calendar} label="Events & reunions" badge="3" active />
                <SidebarItem icon={Award} label="Alumni recognitions" />
                <SidebarItem icon={MapPin} label="City chapters" />
              </div>
            </div>
          </Reveal>

          <Reveal direction="right" delay={100}>
            <div className="space-y-4">
              {events.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                  <h4 className="text-sm font-semibold text-white/90">Upcoming events</h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {events.slice(0, 4).map((e) => (
                      <Link
                        key={e.id}
                        href="/events"
                        className="group rounded-xl bg-white p-4 text-slate-800 transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className="grid h-12 w-12 flex-none place-items-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
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
                  <div className="mt-4 space-y-2">
                    {announcements.slice(0, 4).map((a) => (
                      <Link
                        key={a.id}
                        href="/announcements"
                        className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-slate-800 transition hover:bg-slate-50"
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

              {events.length === 0 && announcements.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
                  <p className="text-sm text-white/70">
                    Official events and announcements will appear here as the Trust publishes them.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-sky-500/10 p-6 backdrop-blur">
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
