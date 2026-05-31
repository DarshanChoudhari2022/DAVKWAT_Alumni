import Link from 'next/link';
import { ArrowRight, Calendar, Bell } from 'lucide-react';
import { Reveal } from './Reveal';
import { formatDate } from '@/lib/utils/format';

interface ShowcaseEvent {
  id: string;
  title: string;
  slug: string;
  starts_at: string;
  venue: string | null;
  event_type: string;
}

interface ShowcaseAnnouncement {
  id: string;
  title: string;
  slug: string;
  published_at: string | null;
}

interface ShowcaseProps {
  events: ShowcaseEvent[];
  announcements: ShowcaseAnnouncement[];
}

export function Showcase({ events, announcements }: ShowcaseProps) {
  return (
    <section id="updates" className="scroll-lift relative overflow-hidden bg-slate-50 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
              </span>
              Live Trust Updates
            </span>
            <h2 className="mt-4 font-sans text-3xl font-bold tracking-[-0.025em] text-slate-900 sm:text-4xl lg:text-[42px]">
              Latest from the community
            </h2>
            <p className="mt-3 text-[17px] leading-relaxed text-slate-600">
              Real-time updates on upcoming events, reunions, and official Trust circulars.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <Reveal direction="left">
            <div
              id="events"
              className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Upcoming Events</h3>
                </div>
                <Link href="/events" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  View all
                </Link>
              </div>
              
              <div className="mt-8 flex-1 space-y-4">
                {events.length > 0 ? (
                  events.slice(0, 3).map((e) => (
                    <Link
                      key={e.id}
                      href={`/events/${e.slug}`}
                      className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-lg"
                    >
                      <div className="flex h-14 w-14 flex-none flex-col items-center justify-center rounded-xl bg-white text-center shadow-sm border border-slate-200">
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          {formatDate(e.starts_at).split(' ')[1]}
                        </span>
                        <span className="text-lg font-bold text-slate-900 leading-none mt-0.5">
                          {formatDate(e.starts_at).split(' ')[0]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-bold text-slate-900 transition-colors group-hover:text-blue-700">
                          {e.title}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                          <span className="truncate">{e.event_type === 'online' ? 'Online Event' : e.venue ?? 'Venue TBA'}</span>
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 flex-none self-center text-slate-300 transition-transform group-hover:-rotate-45 group-hover:text-blue-500" />
                    </Link>
                  ))
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 py-8">
                    <Calendar className="h-10 w-10 opacity-20 mb-3" />
                    <p>No upcoming events currently scheduled.</p>
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal direction="right" delay={100}>
            <div
              id="announcements"
              className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Trust Announcements</h3>
                </div>
                <Link href="/announcements" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  View all
                </Link>
              </div>

              <div className="mt-8 flex-1 space-y-4">
                {announcements.length > 0 ? (
                  announcements.slice(0, 3).map((a) => (
                    <Link
                      key={a.id}
                      href={`/announcements/${a.slug}`}
                      className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-2">
                          Circular
                        </span>
                        <p className="line-clamp-2 font-bold text-slate-900 transition-colors group-hover:text-blue-700">
                          {a.title}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {a.published_at ? formatDate(a.published_at) : ''}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 flex-none self-center text-slate-300 transition-transform group-hover:-rotate-45 group-hover:text-blue-500" />
                    </Link>
                  ))
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 py-8">
                    <Bell className="h-10 w-10 opacity-20 mb-3" />
                    <p>No recent announcements.</p>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
