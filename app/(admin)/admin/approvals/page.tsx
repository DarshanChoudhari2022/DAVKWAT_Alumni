import type { Metadata } from 'next';
import { Avatar } from '@/components/shared/Avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { ApprovalActions } from './ApprovalActions';

export const metadata: Metadata = { title: 'Pending Approvals - Admin' };

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const supabase = await createClient();
  let query = supabase
    .from('profiles')
    .select(
      'id, full_name, email, batch_year, course, current_city, phone, created_at, avatar_url'
    )
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true });

  if (sp.filter === 'today') {
    query = query.gte('created_at', startOfToday);
  } else if (sp.filter === 'week') {
    query = query.gte('created_at', oneWeekAgo);
  } else if (sp.filter === 'older') {
    query = query.lt('created_at', oneWeekAgo);
  }

  const { data: pending, error } = await query;
  const pendingProfiles = pending ?? [];

  if (error) {
    console.error('[admin/approvals] failed to load pending registrations:', error);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Pending Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pendingProfiles.length} alumni waiting for approval.
          </p>
        </div>
        <nav
          className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
          aria-label="Filter"
        >
          {[
            { label: 'All', value: '' },
            { label: 'Today', value: 'today' },
            { label: 'This Week', value: 'week' },
            { label: 'Older', value: 'older' },
          ].map((filter) => (
            <a
              key={filter.value}
              href={
                filter.value ? `/admin/approvals?filter=${filter.value}` : '/admin/approvals'
              }
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                (sp.filter ?? '') === filter.value
                  ? 'bg-[#0F2557] text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {filter.label}
            </a>
          ))}
        </nav>
      </header>

      <ul className="mt-6 space-y-3">
        {error && (
          <li>
            <Card className="text-center text-sm text-rose-600">
              We could not load the approval queue right now. Please refresh and try again.
            </Card>
          </li>
        )}
        {pendingProfiles.map((profile) => (
          <li key={profile.id}>
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Avatar src={profile.avatar_url} name={profile.full_name} size="md" />
                  <div className="min-w-0">
                    <h3 className="font-medium">{profile.full_name}</h3>
                    <p className="text-sm text-slate-500">{profile.email}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="primary">Batch {profile.batch_year}</Badge>
                      <Badge variant="default">{profile.course}</Badge>
                      {profile.current_city && (
                        <Badge variant="default">{profile.current_city}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Registered {formatDate(profile.created_at)}
                    </p>
                  </div>
                </div>
                <ApprovalActions alumniId={profile.id} alumniName={profile.full_name} />
              </div>
            </Card>
          </li>
        ))}
        {!error && pendingProfiles.length === 0 && (
          <li>
            <Card className="text-center text-sm text-slate-500">
              No pending approvals. All caught up!
            </Card>
          </li>
        )}
      </ul>
    </div>
  );
}
