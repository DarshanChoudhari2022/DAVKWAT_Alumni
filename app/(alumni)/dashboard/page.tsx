import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Users, Calendar, Megaphone, ArrowRight, CreditCard, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCardSkeleton } from '@/components/shared/Skeleton';
import { SectionError } from '@/components/shared/SectionError';
import { requireAlumniAccess } from '@/lib/auth/alumni-access';
import { logoutAction } from '@/app/(public)/login/actions';
import { formatDate, formatINR } from '@/lib/utils/format';
import { SignOutButton } from '@/components/shared/SignOutButton';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { profile, database, userId } = await requireAlumniAccess();

  // Throttled presence update for "active users" analytics. Writing on every
  // navigation is wasteful; once per hour is enough and keeps navigation fast.
  // Fire-and-forget: do not block rendering.
  void (async () => {
    try {
      const { data: presenceData } = await database
        .from('profiles')
        .select('last_seen_at')
        .eq('id', userId)
        .single();
      const lastSeen = presenceData?.last_seen_at
        ? new Date(presenceData.last_seen_at).getTime()
        : 0;
      if (Date.now() - lastSeen > 60 * 60 * 1000) {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        await createAdminClient()
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', userId);
      }
    } catch (err) {
      console.error('[dashboard] last_seen_at update failed:', err);
    }
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Shell: heading + welcome (synchronous) */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Badge variant="primary">
            {profile.profile_type === 'faculty' ? 'Faculty' : 'Alumni'}
          </Badge>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Welcome, {profile.full_name.split(' ')[0]}
          </h1>
        </div>
        <SignOutButton action={logoutAction} variant="outline" size="sm">
          Sign out
        </SignOutButton>
      </div>

      {/* Stats region (async) */}
      <Suspense fallback={<StatsRegionSkeleton />}>
        <StatsRegion batchYear={profile.batch_year} userId={userId} database={database} />
      </Suspense>

      <Suspense fallback={null}>
        <PaymentSummaryRegion
          database={database}
          userId={userId}
          membershipType={profile.membership_type}
          membershipExpiresAt={profile.membership_expires_at}
          isPaidMember={profile.is_paid_member}
          profileType={profile.profile_type}
        />
      </Suspense>

      {/* Upcoming events region (async) */}
      <Suspense fallback={<EventsRegionSkeleton />}>
        <EventsRegion database={database} />
      </Suspense>

      {/* Recent announcements region (async) */}
      <Suspense fallback={<AnnouncementsRegionSkeleton />}>
        <AnnouncementsRegion database={database} />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Async regions
// ---------------------------------------------------------------------------

async function StatsRegion({
  batchYear,
  userId,
  database,
}: {
  batchYear: number;
  userId: string;
  database: Awaited<ReturnType<typeof requireAlumniAccess>>['database'];
}) {
  try {
    const now = new Date().toISOString();

    const [batchPeers, upcomingEvents, recentAnnouncements] = await Promise.all([
      database
        .from('profiles')
        .select('id', { count: 'estimated', head: true })
        .eq('batch_year', batchYear)
        .eq('approval_status', 'approved')
        .neq('id', userId),
      database
        .from('events')
        .select('id', { count: 'estimated', head: true })
        .eq('is_published', true)
        .gte('starts_at', now),
      database
        .from('announcements')
        .select('id', { count: 'estimated', head: true })
        .eq('is_published', true)
        .or(`scheduled_for.is.null,scheduled_for.lte.${now}`),
    ]);

    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label={`Alumni from Batch ${batchYear}`}
          value={String(batchPeers.count ?? 0)}
          href="/directory"
        />
        <StatCard
          icon={Calendar}
          label="Upcoming events"
          value={String(upcomingEvents.count ?? 0)}
          href="/events"
        />
        <StatCard
          icon={Megaphone}
          label="New announcements"
          value={String(recentAnnouncements.count ?? 0)}
          href="/announcements"
        />
      </div>
    );
  } catch {
    return <SectionError title="Couldn't load stats." />;
  }
}

async function PaymentSummaryRegion({
  database,
  userId,
  membershipType,
  membershipExpiresAt,
  isPaidMember,
  profileType,
}: {
  database: Awaited<ReturnType<typeof requireAlumniAccess>>['database'];
  userId: string;
  membershipType: 'annual' | 'lifetime' | null;
  membershipExpiresAt: string | null;
  isPaidMember: boolean;
  profileType: 'alumni' | 'faculty';
}) {
  try {
    const { data } = await database
      .from('payments')
      .select('id, amount, status, receipt_url, created_at, membership_plans(name, membership_type, duration_months)')
      .eq('alumni_id', userId)
      .in('status', ['pending', 'success'])
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1);

    const payment = data?.[0];
    if (!payment) {
      if (profileType === 'faculty' || isPaidMember) return null;
      return (
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
      );
    }

    const plan = Array.isArray(payment.membership_plans)
      ? payment.membership_plans[0]
      : payment.membership_plans;
    const effectiveType = membershipType ?? plan?.membership_type ?? null;
    const isVerified = isPaidMember || payment.status === 'success';
    const paidDate = formatDate(payment.created_at);
    const validUntil = effectiveType === 'annual' && membershipExpiresAt
      ? formatDate(membershipExpiresAt)
      : null;

    return (
      <Card className="mt-6 border-emerald-200 bg-emerald-50/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-emerald-900">
                {isVerified ? 'Membership payment recorded' : 'Membership payment under review'}
              </h2>
              <p className="mt-1 text-sm text-emerald-800">
                {formatINR(Number(payment.amount))} paid on {paidDate}
                {effectiveType ? ` · ${effectiveType === 'annual' ? 'Annual' : 'Lifetime'} membership` : ''}
                {validUntil ? ` · valid ${paidDate} to ${validUntil}` : ''}
              </p>
            </div>
          </div>
          {payment.receipt_url && (
            <a
              href={payment.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
            >
              View proof
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </Card>
    );
  } catch {
    return null;
  }
}

async function EventsRegion({ database }: { database: Awaited<ReturnType<typeof requireAlumniAccess>>['database'] }) {
  try {
    const now = new Date().toISOString();

    const { data: upcomingEvents } = await database
      .from('events')
      .select('id, title, slug, starts_at, venue, event_type')
      .eq('is_published', true)
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(2);

    return (
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">Upcoming events</h2>
          <Link href="/events" className="text-sm text-[#0F2557] hover:underline">
            View all &rarr;
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(upcomingEvents ?? []).length === 0 && (
            <Card className="text-sm text-slate-500">No upcoming events yet.</Card>
          )}
          {upcomingEvents?.map((e) => (
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
    );
  } catch {
    return <SectionError title="Couldn't load upcoming events." />;
  }
}

async function AnnouncementsRegion({ database }: { database: Awaited<ReturnType<typeof requireAlumniAccess>>['database'] }) {
  try {
    const now = new Date().toISOString();

    const { data: recentAnnouncements } = await database
      .from('announcements')
      .select('id, title, slug, published_at')
      .eq('is_published', true)
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(3);

    return (
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">Recent announcements</h2>
          <Link href="/announcements" className="text-sm text-[#0F2557] hover:underline">
            View all &rarr;
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {(recentAnnouncements ?? []).length === 0 && (
            <Card className="text-sm text-slate-500">No announcements yet.</Card>
          )}
          {recentAnnouncements?.map((a) => (
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
    );
  } catch {
    return <SectionError title="Couldn't load announcements." />;
  }
}

// ---------------------------------------------------------------------------
// Skeleton fallbacks
// ---------------------------------------------------------------------------

function StatsRegionSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}

function EventsRegionSkeleton() {
  return (
    <section className="mt-10">
      <div className="mb-4 h-7 w-40 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-5">
          <div className="mb-2 h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-5">
          <div className="mb-2 h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </section>
  );
}

function AnnouncementsRegionSkeleton() {
  return (
    <section className="mt-10">
      <div className="mb-4 h-7 w-52 animate-pulse rounded bg-slate-200" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-white p-5">
            <div className="mb-1 h-3 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
