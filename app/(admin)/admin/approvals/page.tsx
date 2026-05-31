import type { Metadata } from 'next';
import { getPrisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/shared/Avatar';
import { formatDate } from '@/lib/utils/format';
import { ApprovalActions } from './ApprovalActions';

export const metadata: Metadata = { title: 'Pending Approvals — Admin' };

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;

  // Build Prisma where clause with optional time filter
  const now = new Date();
  let createdAtFilter: { gte?: Date; lt?: Date } | undefined;

  if (sp.filter === 'today') {
    createdAtFilter = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
  } else if (sp.filter === 'week') {
    createdAtFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
  } else if (sp.filter === 'older') {
    createdAtFilter = { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
  }

  const prisma = getPrisma();
  const pending = await prisma.profiles.findMany({
    where: {
      approval_status: 'pending',
      ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
    },
    select: {
      id: true,
      full_name: true,
      email: true,
      batch_year: true,
      course: true,
      current_city: true,
      phone: true,
      created_at: true,
      avatar_url: true,
    },
    orderBy: { created_at: 'asc' },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Pending Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pending.length} alumni waiting for approval.
          </p>
        </div>
        <nav className="inline-flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Filter">
          {[
            { label: 'All', value: '' },
            { label: 'Today', value: 'today' },
            { label: 'This Week', value: 'week' },
            { label: 'Older', value: 'older' },
          ].map((f) => (
            <a
              key={f.value}
              href={f.value ? `/admin/approvals?filter=${f.value}` : '/admin/approvals'}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                (sp.filter ?? '') === f.value
                  ? 'bg-[#0F2557] text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </a>
          ))}
        </nav>
      </header>

      <ul className="mt-6 space-y-3">
        {pending.map((p) => (
          <li key={p.id}>
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Avatar src={p.avatar_url} name={p.full_name} size="md" />
                  <div className="min-w-0">
                    <h3 className="font-medium">{p.full_name}</h3>
                    <p className="text-sm text-slate-500">{p.email}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="primary">Batch {p.batch_year}</Badge>
                      <Badge variant="default">{p.course}</Badge>
                      {p.current_city && <Badge variant="default">{p.current_city}</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Registered {formatDate(p.created_at.toISOString())}
                    </p>
                  </div>
                </div>
                <ApprovalActions alumniId={p.id} alumniName={p.full_name} />
              </div>
            </Card>
          </li>
        ))}
        {pending.length === 0 && (
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
