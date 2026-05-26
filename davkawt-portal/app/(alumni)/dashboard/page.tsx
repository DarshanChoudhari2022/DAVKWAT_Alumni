import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users, Calendar, Megaphone, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/app/(public)/login/actions';
import { formatDate } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, batch_year, course, is_paid_member, membership_expires_at, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const [batchPeers, upcomingEvents, recentAnnouncements] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('batch_year', profile.batch_year)
      .eq('approval_status', 'approved')
      .neq('id', user.id),
    supabase
      .from('events')
      .select('id, title, slug, starts_at, venue, event_type')
      .eq('is_published', true)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(2),
    supabase
      .from('announcements')
      .select('id, title, slug, published_at')
      .eq('is_published', true)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(3),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Top bar — minimal until full alumni shell is built */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Badge variant="primary">Alumni</Badge>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Welcome, {profile.full_name.split(' ')[0]}
          </h1>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label={`Alumni from Batch ${profile.batch_year}`}
          value={String(batchPeers.count ?? 0)}
          href="/directory"
        />
        <StatCard
          icon={Calendar}
          label="Upcoming events"
          value={String(upcomingEvents.data?.length ?? 0)}
          href="/events"
        />
        <StatCard
          icon={Megaphone}
          label="New announcements"
          value={String(recentAnnouncements.data?.length ?? 0)}
          href="/announcements"
        />
      </div>

      {/* Membership banner */}
      {!profile.is_paid_member && (
        <Card className="mt-6 flex flex-col items-start gap-4 bg-gradient-to-r from-[#0F2557] to-[#1a3a7a] text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Become a paying member</h2>
            <p className="mt-1 text-sm text-white/80">
              Support the Trust and unlock all member benefits.
            </p>
          </div>
          <Button asChild variant="accent">
            <Link href="/membership">View plans</Link>
          </Button>
        </Card>
      )}

      {/* Upcoming events */}
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">Upcoming events</h2>
          <Link href="/events" className="text-sm text-[#0F2557] hover:underline">
            View all &rarr;
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(upcomingEvents.data ?? []).length === 0 && (
            <Card className="text-sm text-slate-500">No upcoming events yet.</Card>
          )}
          {upcomingEvents.data?.map((e) => (
            <Card key={e.id}>
              <Badge variant="warning">{formatDate(e.starts_at)}</Badge>
              <h3 className="mt-2 line-clamp-2 font-medium">{e.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {e.event_type === 'online' ? 'Online event' : e.venue ?? 'Venue TBA'}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent announcements */}
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">Recent announcements</h2>
          <Link href="/announcements" className="text-sm text-[#0F2557] hover:underline">
            View all &rarr;
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {(recentAnnouncements.data ?? []).length === 0 && (
            <Card className="text-sm text-slate-500">No announcements yet.</Card>
          )}
          {recentAnnouncements.data?.map((a) => (
            <Card key={a.id} className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">
                  {a.published_at ? formatDate(a.published_at) : 'Draft'}
                </p>
                <h3 className="mt-1 font-medium">{a.title}</h3>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F2557]/5 text-[#0F2557]">
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </div>
        <p className="mt-4 font-display text-3xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{label}</p>
      </Card>
    </Link>
  );
}
